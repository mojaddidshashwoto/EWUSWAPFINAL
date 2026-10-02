-- Restrict wallet balances to their owner while preserving safe public profile reads.
drop policy if exists ss_profiles_select_public on public.ss_profiles;
drop policy if exists ss_profiles_select_self on public.ss_profiles;
create policy ss_profiles_select_self on public.ss_profiles
  for select using (id = auth.uid() or public.ss_is_staff());

revoke select on public.ss_profiles from anon, authenticated;
grant select (
  id, display_name, avatar_url, bio, role, credits_balance, trust_score,
  created_at, updated_at, bdt_balance, education, skills, certifications,
  availability_status, is_verified, learning_skills
) on public.ss_profiles to authenticated;

create or replace view public.ss_public_profiles
with (security_barrier = true)
as
select
  p.id,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.education,
  p.skills,
  p.learning_skills,
  p.certifications,
  p.availability_status,
  p.is_verified,
  p.trust_score,
  coalesce(privacy.show_skills, true) as show_skills
from public.ss_profiles p
left join public.ss_profile_privacy privacy on privacy.user_id = p.id;

revoke all on public.ss_public_profiles from public, anon;
grant select on public.ss_public_profiles to authenticated;

-- Only the trusted payment service may call this SECURITY DEFINER RPC.
create table if not exists public.ss_payment_webhook_receipts (
  gateway text not null,
  transaction_id text not null,
  user_id uuid not null references public.ss_profiles(id) on delete restrict,
  amount_bdt numeric(12, 2) not null check (amount_bdt > 0),
  processed_at timestamptz not null default timezone('utc', now()),
  primary key (gateway, transaction_id)
);
alter table public.ss_payment_webhook_receipts enable row level security;
revoke all on public.ss_payment_webhook_receipts from public, anon, authenticated;

create or replace function public.ss_process_payment_webhook(
  p_user_id uuid,
  p_amount_bdt numeric,
  p_tran_id text,
  p_gateway text,
  p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credits_to_add integer;
  v_new_credits integer;
  v_new_bdt numeric;
  v_rows integer;
  v_receipt public.ss_payment_webhook_receipts;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'trusted payment service required' using errcode = '42501';
  end if;
  if p_user_id is null or p_amount_bdt is null or p_amount_bdt <= 0 then
    raise exception 'invalid payment amount or user';
  end if;
  if nullif(trim(p_tran_id), '') is null or nullif(trim(p_gateway), '') is null or nullif(trim(p_signature), '') is null then
    raise exception 'payment transaction, gateway, and verified signature are required';
  end if;

  insert into public.ss_payment_webhook_receipts (gateway, transaction_id, user_id, amount_bdt)
  values (lower(trim(p_gateway)), trim(p_tran_id), p_user_id, p_amount_bdt)
  on conflict (gateway, transaction_id) do nothing;
  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    select * into v_receipt
    from public.ss_payment_webhook_receipts
    where gateway = lower(trim(p_gateway)) and transaction_id = trim(p_tran_id);
    if v_receipt.user_id <> p_user_id or v_receipt.amount_bdt <> p_amount_bdt then
      raise exception 'payment transaction ID was already used with different details';
    end if;
    select credits_balance, bdt_balance into v_new_credits, v_new_bdt
    from public.ss_profiles where id = p_user_id;
    return jsonb_build_object(
      'success', true,
      'duplicate', true,
      'user_id', p_user_id,
      'transaction_id', trim(p_tran_id),
      'new_credits_balance', v_new_credits,
      'new_bdt_balance', v_new_bdt
    );
  end if;

  v_credits_to_add := floor(p_amount_bdt / 120)::integer;
  if v_credits_to_add <= 0 then
    raise exception 'transaction amount does not meet minimum credit threshold (120 BDT)';
  end if;

  update public.ss_profiles
  set credits_balance = credits_balance + v_credits_to_add,
      bdt_balance = bdt_balance + p_amount_bdt
  where id = p_user_id
  returning credits_balance, bdt_balance into v_new_credits, v_new_bdt;
  if not found then raise exception 'user profile not found'; end if;

  insert into public.ss_notifications (user_id, type, title, message, metadata)
  values (
    p_user_id,
    'wallet',
    'Wallet Top-Up Confirmed',
    'Payment ' || trim(p_tran_id) || ' added via ' || upper(trim(p_gateway)) || '.',
    jsonb_build_object('tran_id', trim(p_tran_id), 'gateway', lower(trim(p_gateway)), 'credits_credited', v_credits_to_add)
  );

  return jsonb_build_object(
    'success', true,
    'duplicate', false,
    'user_id', p_user_id,
    'transaction_id', trim(p_tran_id),
    'amount_bdt', p_amount_bdt,
    'credits_credited', v_credits_to_add,
    'new_credits_balance', v_new_credits,
    'new_bdt_balance', v_new_bdt
  );
end;
$$;

revoke all on function public.ss_process_payment_webhook(uuid, numeric, text, text, text) from public, anon, authenticated;
grant execute on function public.ss_process_payment_webhook(uuid, numeric, text, text, text) to service_role;

-- Rejected escrows are refunded and must not be resubmitted without creating a new escrow.
create or replace function public.ss_submit_escrow_proof(
  p_transaction_id uuid,
  p_proof_reference text,
  p_payer_note text default null
)
returns public.ss_escrow_transactions
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.ss_escrow_transactions;
begin
  update public.ss_escrow_transactions
  set status = 'submitted',
      proof_reference = nullif(trim(p_proof_reference), ''),
      payer_note = coalesce(p_payer_note, payer_note),
      submitted_at = timezone('utc', now())
  where id = p_transaction_id and payer_id = auth.uid() and status = 'pending'
  returning * into v_row;
  if v_row.id is null then raise exception 'escrow cannot be submitted'; end if;
  return v_row;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ss_profiles'
  ) then
    alter publication supabase_realtime add table public.ss_profiles;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ss_escrow_transactions'
  ) then
    alter publication supabase_realtime add table public.ss_escrow_transactions;
  end if;
end;
$$;