alter table public.ss_profiles
  add column if not exists bdt_balance numeric(12, 2) not null default 0;