-- =========================================================================
-- EwuSwap Migration: Support p_admin_notes parameter in ss_resolve_dispute
-- Timestamp: 20261004000001
-- =========================================================================

drop function if exists public.ss_resolve_dispute(uuid, public.ss_dispute_resolution, text);

create or replace function public.ss_resolve_dispute(
  p_dispute_id uuid,
  p_resolution public.ss_dispute_resolution,
  p_admin_notes text default null,
  p_note text default null
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
  v_final_note text;
begin
  if not public.ss_is_staff() then
    raise exception 'moderator access required' using errcode = '42501';
  end if;

  v_final_note := coalesce(p_admin_notes, p_note);

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
    set status = 'rejected', moderator_note = v_final_note, verified_by = auth.uid(), verified_at = timezone('utc', now())
    where id = v_escrow.id;
  elsif p_resolution = 'release_provider' then
    update public.ss_profiles set bdt_balance = bdt_balance + v_net_bdt where id = v_escrow.payee_id;
    update public.ss_escrow_transactions
    set status = 'released', moderator_note = v_final_note, released_at = timezone('utc', now()), verified_by = auth.uid(), verified_at = coalesce(verified_at, timezone('utc', now()))
    where id = v_escrow.id;
  elsif p_resolution = 'split' then
    v_provider_split := round(v_net_bdt / 2.0, 2);
    update public.ss_profiles set bdt_balance = bdt_balance + v_provider_split where id = v_escrow.payee_id;
    update public.ss_profiles set bdt_balance = bdt_balance + (v_gross_bdt - v_provider_split) where id = v_escrow.payer_id;
    update public.ss_escrow_transactions
    set status = 'released', moderator_note = v_final_note, released_at = timezone('utc', now()), verified_by = auth.uid(), verified_at = coalesce(verified_at, timezone('utc', now()))
    where id = v_escrow.id;
  end if;

  update public.ss_disputes
  set status = 'resolved', resolution = p_resolution, resolution_note = v_final_note, assigned_to = auth.uid(), resolved_at = timezone('utc', now())
  where id = p_dispute_id
  returning * into v_dispute;

  insert into public.ss_dispute_events (dispute_id, actor_id, event_type, note)
  values (p_dispute_id, auth.uid(), 'resolution_recorded', p_resolution::text || coalesce(': ' || v_final_note, ''));

  return v_dispute;
end;
$$;

grant execute on function public.ss_resolve_dispute(uuid, public.ss_dispute_resolution, text, text) to authenticated;
