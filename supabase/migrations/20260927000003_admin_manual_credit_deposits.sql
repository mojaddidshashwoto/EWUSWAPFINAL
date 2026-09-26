create table if not exists public.ss_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ss_profiles(id) on delete cascade,
  actor_id uuid not null references public.ss_profiles(id) on delete restrict,
  type text not null check (type = 'deposit'),
  amount_credits integer not null check (amount_credits > 0),
  balance_after integer not null check (balance_after >= 0),
  status text not null default 'completed' check (status = 'completed'),
  note text not null default 'Manual cash deposit',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ss_wallet_transactions_user_created_idx
  on public.ss_wallet_transactions(user_id, created_at desc);

alter table public.ss_wallet_transactions enable row level security;

drop policy if exists ss_wallet_transactions_select_owner_or_staff on public.ss_wallet_transactions;
create policy ss_wallet_transactions_select_owner_or_staff
  on public.ss_wallet_transactions
  for select
  using (user_id = auth.uid() or public.ss_is_staff());

create or replace function public.ss_admin_list_wallet_users()
returns table (
  id uuid,
  display_name text,
  email text,
  credits_balance integer
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not exists (
    select 1 from public.ss_profiles actor
    where actor.id = auth.uid() and actor.role = 'admin'
  ) then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return query
  select p.id, p.display_name, u.email::text, p.credits_balance
  from public.ss_profiles p
  join auth.users u on u.id = p.id
  order by lower(p.display_name), lower(u.email);
end;
$$;

create or replace function public.ss_admin_deposit_credits(
  p_user_id uuid,
  p_amount_credits integer,
  p_note text default 'Manual cash deposit'
)
returns table (
  transaction_id uuid,
  user_id uuid,
  amount_credits integer,
  balance_after integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_balance integer;
  v_transaction_id uuid;
  v_created_at timestamptz := timezone('utc', now());
begin
  if v_actor_id is null or not exists (
    select 1 from public.ss_profiles actor
    where actor.id = v_actor_id and actor.role = 'admin'
  ) then
    raise exception 'admin access required' using errcode = '42501';
  end if;
  if p_user_id is null then raise exception 'user is required'; end if;
  if p_amount_credits is null or p_amount_credits <= 0 then raise exception 'deposit must be a positive whole number of credits'; end if;
  if p_amount_credits > 100000 then raise exception 'deposit exceeds the per-transaction limit'; end if;

  update public.ss_profiles
  set credits_balance = credits_balance + p_amount_credits
  where id = p_user_id
  returning credits_balance into v_balance;
  if not found then raise exception 'user profile not found'; end if;

  insert into public.ss_wallet_transactions (
    user_id, actor_id, type, amount_credits, balance_after, status, note, created_at
  ) values (
    p_user_id, v_actor_id, 'deposit', p_amount_credits, v_balance, 'completed',
    coalesce(nullif(trim(p_note), ''), 'Manual cash deposit'), v_created_at
  ) returning id into v_transaction_id;

  return query select v_transaction_id, p_user_id, p_amount_credits, v_balance, v_created_at;
end;
$$;

revoke all on function public.ss_admin_list_wallet_users() from public, anon;
revoke all on function public.ss_admin_deposit_credits(uuid, integer, text) from public, anon;
grant execute on function public.ss_admin_list_wallet_users() to authenticated;
grant execute on function public.ss_admin_deposit_credits(uuid, integer, text) to authenticated;

grant select on public.ss_wallet_transactions to authenticated;
revoke insert, update, delete on public.ss_wallet_transactions from anon, authenticated;