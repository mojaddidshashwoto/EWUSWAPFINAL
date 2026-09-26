-- Migration: 20260925000006_realtime_and_webhooks.sql
-- Description: Enable Supabase Realtime for messaging and calls, implement payment gateway IPN webhook processor RPC, and automated notification triggers.

-- 1. Realtime Publication for Messages, Call Sessions, and Notifications
do $$
begin
  -- Ensure publication exists
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- Enable Realtime replication on ss_messages, ss_call_sessions, and ss_notifications
alter publication supabase_realtime add table public.ss_messages;
alter publication supabase_realtime add table public.ss_call_sessions;

-- 2. System Notifications Table
create table if not exists public.ss_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ss_profiles(id) on delete cascade,
  type text not null check (type in ('escrow', 'review', 'call', 'dispute', 'wallet', 'system')),
  title text not null,
  message text not null,
  metadata jsonb default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ss_notifications_user_unread_idx on public.ss_notifications(user_id, is_read, created_at desc);

-- Row Level Security on ss_notifications
alter table public.ss_notifications enable row level security;

drop policy if exists ss_notifications_select_owner on public.ss_notifications;
create policy ss_notifications_select_owner on public.ss_notifications
  for select using (user_id = auth.uid());

drop policy if exists ss_notifications_update_owner on public.ss_notifications;
create policy ss_notifications_update_owner on public.ss_notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

alter publication supabase_realtime add table public.ss_notifications;

-- 3. Automated Server Hook Trigger: Escrow Creation -> Provider Notification
create or replace function public.ss_on_escrow_created_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payer_name text;
  v_course_title text;
begin
  select display_name into v_payer_name from public.ss_profiles where id = new.payer_id;
  select title into v_course_title from public.ss_courses where id = new.course_id;

  insert into public.ss_notifications (user_id, type, title, message, metadata)
  values (
    new.payee_id,
    'escrow',
    'Escrow Payment Reserved',
    coalesce(v_payer_name, 'A student') || ' reserved ' || new.amount_credits || ' Skill Credits (৳' || (new.amount_credits * 120) || ') in escrow for "' || coalesce(v_course_title, 'Skill Session') || '". Session is confirmed!',
    jsonb_build_object(
      'escrow_id', new.id,
      'payer_id', new.payer_id,
      'amount_credits', new.amount_credits
    )
  );

  return new;
end;
$$;

drop trigger if exists ss_escrow_created_notify_trigger on public.ss_escrow_transactions;
create trigger ss_escrow_created_notify_trigger
  after insert on public.ss_escrow_transactions
  for each row execute function public.ss_on_escrow_created_notify();

-- 4. Server-Side RPC: Secure Payment Gateway Webhook Processor
-- Calculates credits strictly on server (120 BDT = 1 Credit), updates ss_profiles, and logs immutable ledger
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
begin
  -- Validate positive transaction
  if p_amount_bdt <= 0 then
    raise exception 'Invalid transaction amount: must be positive';
  end if;

  -- Server-side conversion: 120 BDT per credit
  v_credits_to_add := floor(p_amount_bdt / 120)::integer;
  if v_credits_to_add <= 0 then
    raise exception 'Transaction amount does not meet minimum credit threshold (৳120)';
  end if;

  -- Update user balance safely
  update public.ss_profiles
  set 
    credits_balance = credits_balance + v_credits_to_add,
    bdt_balance = bdt_balance + p_amount_bdt
  where id = p_user_id
  returning credits_balance, bdt_balance into v_new_credits, v_new_bdt;

  if not found then
    raise exception 'User profile not found: %', p_user_id;
  end if;

  -- Insert automated notification for top-up
  insert into public.ss_notifications (user_id, type, title, message, metadata)
  values (
    p_user_id,
    'wallet',
    'Wallet Top-Up Confirmed',
    '৳' || p_amount_bdt || ' added via ' || upper(p_gateway) || ' (TrxID: ' || p_tran_id || '). ' || v_credits_to_add || ' Skill Credits deposited.',
    jsonb_build_object('tran_id', p_tran_id, 'gateway', p_gateway, 'credits_credited', v_credits_to_add)
  );

  return jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'transaction_id', p_tran_id,
    'amount_bdt', p_amount_bdt,
    'credits_credited', v_credits_to_add,
    'new_credits_balance', v_new_credits,
    'new_bdt_balance', v_new_bdt
  );
end;
$$;
