-- =========================================================================
-- EwuSwap Migration: Single BDT Currency as Source of Truth & Escrow Engine
-- Timestamp: 20261003000005
-- =========================================================================

-- 1. Mark credits_balance as deprecated (do not drop column yet for safety)
comment on column public.ss_profiles.credits_balance is 'DEPRECATED: Legacy credit balance. All transactions and platform pricing now use bdt_balance as single source of truth.';
comment on column public.ss_profiles.bdt_balance is 'PRIMARY SOURCE OF TRUTH: Available wallet balance in Bangladeshi Taka (BDT ৳).';

-- 2. Add BDT price to ss_courses and BDT monetary columns to ss_escrow_transactions
alter table public.ss_courses
  add column if not exists price_bdt numeric(12, 2) default 500.00 check (price_bdt >= 50.00);

alter table public.ss_escrow_transactions
  add column if not exists amount_bdt numeric(12, 2),
  add column if not exists gross_amount_bdt numeric(12, 2),
  add column if not exists platform_fee_bdt numeric(12, 2),
  add column if not exists net_amount_bdt numeric(12, 2);

-- Backfill price_bdt for existing courses based on credit_cost (1 Credit = 120 BDT or minimum 120)
update public.ss_courses
set price_bdt = greatest(120.00, coalesce(credit_cost, 10) * 120.00)
where price_bdt is null or price_bdt = 500.00;

-- 3. Update ss_handle_new_user trigger to initialize starting bonus in bdt_balance
create or replace function public.ss_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ss_profiles (id, display_name, avatar_url, bdt_balance, credits_balance)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'New member'), '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    500.00, -- ৳500 initial bonus balance
    500     -- Legacy compatibility mirror
  )
  on conflict (id) do nothing;

  insert into public.ss_profile_privacy (user_id, message_policy, call_policy, show_skills)
  values (new.id, 'everyone', 'everyone', true)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- 4. Single-source BDT Escrow Creation RPC
create or replace function public.ss_create_escrow(
  p_payee_id uuid,
  p_course_id uuid default null,
  p_amount_credits integer default null, -- legacy parameter for backward-compatibility
  p_payer_note text default null,
  p_amount_bdt numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payer_id uuid := auth.uid();
  v_balance numeric(12, 2);
  v_instructor_id uuid;
  v_transaction_id uuid;
  v_charge_bdt numeric(12, 2);
  v_fee_bdt numeric(12, 2);
  v_net_bdt numeric(12, 2);
begin
  if v_payer_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if p_payee_id is null then
    raise exception 'invalid payee' using errcode = '22023';
  end if;

  if v_payer_id = p_payee_id then
    raise exception 'payer and payee must be different' using errcode = '22023';
  end if;

  -- Determine BDT charge amount (prefer explicit p_amount_bdt, fallback to course price or legacy credits * 120)
  if p_amount_bdt is not null and p_amount_bdt > 0 then
    v_charge_bdt := round(p_amount_bdt, 2);
  elsif p_course_id is not null then
    select instructor_id, coalesce(price_bdt, credit_cost * 120.00, 500.00)
    into v_instructor_id, v_charge_bdt
    from public.ss_courses
    where id = p_course_id and status = 'published';

    if v_instructor_id is null or v_instructor_id <> p_payee_id then
      raise exception 'course is not available for this payee' using errcode = '22023';
    end if;
  elsif p_amount_credits is not null and p_amount_credits > 0 then
    v_charge_bdt := round(p_amount_credits * 120.00, 2);
  else
    v_charge_bdt := 500.00;
  end if;

  if v_charge_bdt < 10.00 then
    raise exception 'minimum exchange amount is 10 BDT' using errcode = '22023';
  end if;

  -- Calculate 5% Platform Fee (500 bps)
  v_fee_bdt := round(v_charge_bdt * 0.05, 2);
  if v_fee_bdt < 1.00 and v_charge_bdt >= 20.00 then
    v_fee_bdt := 1.00;
  end if;
  v_net_bdt := v_charge_bdt - v_fee_bdt;

  -- Strict FOR UPDATE lock on payer profile
  select bdt_balance into v_balance
  from public.ss_profiles
  where id = v_payer_id
  for update;

  if v_balance is null then
    raise exception 'payer profile not found' using errcode = '22023';
  end if;

  if v_balance < v_charge_bdt then
    raise exception 'insufficient BDT balance (available: ৳%, required: ৳%)', v_balance, v_charge_bdt
      using errcode = '22023';
  end if;

  -- Atomic Balance Deduction
  update public.ss_profiles
  set bdt_balance = bdt_balance - v_charge_bdt,
      credits_balance = greatest(0, (bdt_balance - v_charge_bdt)::integer / 120)
  where id = v_payer_id;

  -- Record Escrow Transaction with status 'pending' (Held in escrow)
  insert into public.ss_escrow_transactions (
    payer_id,
    payee_id,
    course_id,
    amount_credits,
    gross_amount_credits,
    platform_fee_credits,
    net_amount_credits,
    amount_bdt,
    gross_amount_bdt,
    platform_fee_bdt,
    net_amount_bdt,
    fee_rate_bps,
    payer_note,
    status
  )
  values (
    v_payer_id,
    p_payee_id,
    p_course_id,
    ceil(v_charge_bdt / 120.00)::integer,
    ceil(v_charge_bdt / 120.00)::integer,
    ceil(v_fee_bdt / 120.00)::integer,
    floor(v_net_bdt / 120.00)::integer,
    v_charge_bdt,
    v_charge_bdt,
    v_fee_bdt,
    v_net_bdt,
    500,
    p_payer_note,
    'pending'
  )
  returning id into v_transaction_id;

  return v_transaction_id;
end;
$$;

-- 5. Direct Peer-to-Peer Escrow Release by Payer (Buyer Satisfaction)
create or replace function public.ss_release_escrow_by_payer(p_transaction_id uuid)
returns public.ss_escrow_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payer_id uuid := auth.uid();
  v_row public.ss_escrow_transactions;
  v_payout_bdt numeric(12, 2);
begin
  if v_payer_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_row
  from public.ss_escrow_transactions
  where id = p_transaction_id
  for update;

  if v_row.id is null then
    raise exception 'escrow transaction not found' using errcode = '22023';
  end if;

  if v_row.payer_id <> v_payer_id and not public.ss_is_staff() then
    raise exception 'only the payer or platform staff can release this escrow' using errcode = '42501';
  end if;

  if v_row.status not in ('pending', 'submitted', 'verified') then
    raise exception 'escrow is not eligible for release (current status: %)', v_row.status using errcode = '22023';
  end if;

  v_payout_bdt := coalesce(v_row.net_amount_bdt, v_row.net_amount_credits * 120.00, v_row.amount_credits * 120.00 * 0.95);

  -- Settle net funds to payee
  update public.ss_profiles
  set bdt_balance = bdt_balance + v_payout_bdt,
      credits_balance = greatest(0, (bdt_balance + v_payout_bdt)::integer / 120)
  where id = v_row.payee_id;

  -- Mark transaction as released
  update public.ss_escrow_transactions
  set status = 'released',
      released_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = p_transaction_id
  returning * into v_row;

  return v_row;
end;
$$;

-- 6. Escrow Release by Staff / Moderator
create or replace function public.ss_release_escrow_payment(p_transaction_id uuid)
returns public.ss_escrow_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.ss_escrow_transactions;
  v_payout_bdt numeric(12, 2);
begin
  if not public.ss_is_staff() then
    raise exception 'moderator access required' using errcode = '42501';
  end if;

  select * into v_row
  from public.ss_escrow_transactions
  where id = p_transaction_id
  for update;

  if v_row.id is null or v_row.status not in ('pending', 'submitted', 'verified') then
    raise exception 'escrow transaction is not in a releasable state' using errcode = '22023';
  end if;

  v_payout_bdt := coalesce(v_row.net_amount_bdt, v_row.net_amount_credits * 120.00, v_row.amount_credits * 120.00 * 0.95);

  update public.ss_profiles
  set bdt_balance = bdt_balance + v_payout_bdt,
      credits_balance = greatest(0, (bdt_balance + v_payout_bdt)::integer / 120)
  where id = v_row.payee_id;

  update public.ss_escrow_transactions
  set status = 'released',
      released_at = timezone('utc', now()),
      verified_by = auth.uid(),
      verified_at = coalesce(verified_at, timezone('utc', now())),
      updated_at = timezone('utc', now())
  where id = p_transaction_id
  returning * into v_row;

  return v_row;
end;
$$;

-- 7. Dispute Resolution with BDT Money Conservation
create or replace function public.ss_resolve_dispute(
  p_dispute_id uuid,
  p_resolution public.ss_dispute_resolution,
  p_note text
)
returns public.ss_disputes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dispute public.ss_disputes;
  v_escrow public.ss_escrow_transactions;
  v_gross_bdt numeric(12, 2);
  v_net_bdt numeric(12, 2);
  v_provider_split numeric(12, 2);
begin
  if not public.ss_is_staff() then
    raise exception 'moderator access required' using errcode = '42501';
  end if;

  select * into v_dispute from public.ss_disputes where id = p_dispute_id for update;
  if v_dispute.id is null or v_dispute.status not in ('open', 'under_review', 'appealed') then
    raise exception 'dispute is not actionable' using errcode = '22023';
  end if;

  select * into v_escrow from public.ss_escrow_transactions where id = v_dispute.escrow_transaction_id for update;
  if v_escrow.id is null or v_escrow.status not in ('pending', 'submitted', 'verified') then
    raise exception 'escrow is not actionable' using errcode = '22023';
  end if;

  v_gross_bdt := coalesce(v_escrow.gross_amount_bdt, v_escrow.amount_credits * 120.00);
  v_net_bdt := coalesce(v_escrow.net_amount_bdt, v_escrow.net_amount_credits * 120.00, v_gross_bdt * 0.95);

  if p_resolution = 'refund_payer' then
    update public.ss_profiles set bdt_balance = bdt_balance + v_gross_bdt where id = v_escrow.payer_id;
    update public.ss_escrow_transactions
    set status = 'rejected', moderator_note = p_note, verified_by = auth.uid(), verified_at = timezone('utc', now())
    where id = v_escrow.id;
  elsif p_resolution = 'release_provider' then
    update public.ss_profiles set bdt_balance = bdt_balance + v_net_bdt where id = v_escrow.payee_id;
    update public.ss_escrow_transactions
    set status = 'released', moderator_note = p_note, released_at = timezone('utc', now()), verified_by = auth.uid(), verified_at = coalesce(verified_at, timezone('utc', now()))
    where id = v_escrow.id;
  elsif p_resolution = 'split' then
    v_provider_split := round(v_net_bdt / 2.0, 2);
    update public.ss_profiles set bdt_balance = bdt_balance + v_provider_split where id = v_escrow.payee_id;
    update public.ss_profiles set bdt_balance = bdt_balance + (v_gross_bdt - v_provider_split) where id = v_escrow.payer_id;
    update public.ss_escrow_transactions
    set status = 'released', moderator_note = p_note, released_at = timezone('utc', now()), verified_by = auth.uid(), verified_at = coalesce(verified_at, timezone('utc', now()))
    where id = v_escrow.id;
  end if;

  update public.ss_disputes
  set status = 'resolved', resolution = p_resolution, resolution_note = p_note, assigned_to = auth.uid(), resolved_at = timezone('utc', now())
  where id = p_dispute_id
  returning * into v_dispute;

  insert into public.ss_dispute_events (dispute_id, actor_id, event_type, note)
  values (p_dispute_id, auth.uid(), 'resolution_recorded', p_resolution::text || coalesce(': ' || p_note, ''));

  return v_dispute;
end;
$$;

-- 8. Admin BDT Deposit Function
create or replace function public.ss_admin_deposit_bdt(
  p_user_id uuid,
  p_amount_bdt numeric,
  p_note text default 'Manual BDT deposit'
)
returns table (
  transaction_id uuid,
  user_id uuid,
  amount_bdt numeric,
  balance_after numeric,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance numeric(12, 2);
  v_tx_id uuid := gen_random_uuid();
begin
  if not public.ss_is_staff() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  if p_user_id is null or p_amount_bdt is null or p_amount_bdt <= 0 then
    raise exception 'invalid user or deposit amount' using errcode = '22023';
  end if;

  update public.ss_profiles
  set bdt_balance = bdt_balance + p_amount_bdt,
      credits_balance = greatest(0, (bdt_balance + p_amount_bdt)::integer / 120)
  where id = p_user_id
  returning bdt_balance into v_new_balance;

  return query
  select v_tx_id, p_user_id, p_amount_bdt, v_new_balance, timezone('utc', now());
end;
$$;

-- 9. Testing helper to set BDT balance safely for SDET integration tests
create or replace function public.ss_set_bdt_balance_for_testing(
  p_user_id uuid,
  p_bdt numeric
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric(12, 2);
begin
  if p_user_id is null or p_bdt is null or p_bdt < 0 then
    raise exception 'invalid user or bdt amount';
  end if;

  update public.ss_profiles
  set bdt_balance = p_bdt,
      credits_balance = greatest(0, p_bdt::integer / 120)
  where id = p_user_id
  returning bdt_balance into v_balance;

  return v_balance;
end;
$$;

-- 10. Grant Execution Permissions
grant execute on function public.ss_create_escrow(uuid, uuid, integer, text, numeric) to authenticated;
grant execute on function public.ss_release_escrow_by_payer(uuid) to authenticated;
grant execute on function public.ss_release_escrow_payment(uuid) to authenticated;
grant execute on function public.ss_resolve_dispute(uuid, public.ss_dispute_resolution, text) to authenticated;
grant execute on function public.ss_admin_deposit_bdt(uuid, numeric, text) to authenticated;
grant execute on function public.ss_set_bdt_balance_for_testing(uuid, numeric) to authenticated;
