-- Service Fulfillment Delivery Modality and Meeting Details Migration
-- 1. Add delivery_mode column to ss_courses ('on_campus' | 'online')
alter table public.ss_courses
add column if not exists delivery_mode text not null default 'online';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ss_courses_delivery_mode_check'
  ) then
    alter table public.ss_courses
    add constraint ss_courses_delivery_mode_check
    check (delivery_mode in ('on_campus', 'online', 'both'));
  end if;
end $$;

-- 2. Add meeting_details column to ss_escrow_transactions
alter table public.ss_escrow_transactions
add column if not exists meeting_details text;

-- 3. Security definer function for updating meeting details
create or replace function public.ss_update_escrow_meeting_details(
  p_transaction_id uuid,
  p_meeting_details text
)
returns public.ss_escrow_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.ss_escrow_transactions;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_row
  from public.ss_escrow_transactions
  where id = p_transaction_id;

  if not found then
    raise exception 'Escrow transaction not found.';
  end if;

  if v_row.payee_id <> v_user_id and v_row.payer_id <> v_user_id and not public.ss_is_staff() then
    raise exception 'You are not a participant in this exchange.' using errcode = '42501';
  end if;

  update public.ss_escrow_transactions
  set meeting_details = trim(p_meeting_details),
      updated_at = timezone('utc', now())
  where id = p_transaction_id
  returning * into v_row;

  return v_row;
end;
$$;

-- Grant execution to authenticated users
grant execute on function public.ss_update_escrow_meeting_details(uuid, text) to authenticated;
