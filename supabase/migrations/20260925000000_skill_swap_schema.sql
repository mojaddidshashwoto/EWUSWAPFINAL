-- Skill Swap domain schema
-- Apply with Supabase migrations. Auth identities live in auth.users; app data lives in public.

create extension if not exists pgcrypto;

do $$ begin
  create type public.ss_profile_role as enum ('user', 'moderator', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ss_course_type as enum ('course', 'service');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ss_course_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ss_escrow_status as enum ('pending', 'submitted', 'verified', 'released', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.ss_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'New member',
  avatar_url text,
  bio text,
  role public.ss_profile_role not null default 'user',
  credits_balance integer not null default 0 check (credits_balance >= 0),
  trust_score numeric(3,2) not null default 0 check (trust_score >= 0 and trust_score <= 5),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ss_skill_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon_name text,
  accent_color text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ss_courses (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.ss_profiles(id) on delete cascade,
  category_id uuid not null references public.ss_skill_categories(id) on delete restrict,
  title text not null,
  slug text not null unique,
  description text,
  type public.ss_course_type not null default 'course',
  status public.ss_course_status not null default 'draft',
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  credit_cost integer not null default 1 check (credit_cost > 0),
  max_learners integer check (max_learners is null or max_learners > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ss_course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.ss_courses(id) on delete cascade,
  reviewer_id uuid not null references public.ss_profiles(id) on delete cascade,
  reviewee_id uuid not null references public.ss_profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  headline text,
  body text,
  is_published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint course_reviews_distinct_people check (reviewer_id <> reviewee_id),
  constraint course_reviews_one_per_reviewer unique (course_id, reviewer_id)
);

create table if not exists public.ss_escrow_transactions (
  id uuid primary key default gen_random_uuid(),
  payer_id uuid not null references public.ss_profiles(id) on delete restrict,
  payee_id uuid not null references public.ss_profiles(id) on delete restrict,
  course_id uuid references public.ss_courses(id) on delete set null,
  amount_credits integer not null check (amount_credits > 0),
  status public.ss_escrow_status not null default 'pending',
  proof_reference text,
  payer_note text,
  moderator_note text,
  verified_by uuid references public.ss_profiles(id) on delete set null,
  submitted_at timestamptz,
  verified_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint escrow_distinct_people check (payer_id <> payee_id)
);

create index if not exists ss_courses_category_status_idx on public.ss_courses(category_id, status);
create index if not exists ss_courses_instructor_idx on public.ss_courses(instructor_id);
create index if not exists ss_reviews_reviewee_idx on public.ss_course_reviews(reviewee_id, created_at desc);
create index if not exists ss_escrow_participants_idx on public.ss_escrow_transactions(payer_id, payee_id, created_at desc);
create index if not exists ss_escrow_status_idx on public.ss_escrow_transactions(status, created_at desc);

create or replace function public.ss_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists ss_profiles_set_updated_at on public.ss_profiles;
create trigger ss_profiles_set_updated_at before update on public.ss_profiles
for each row execute function public.ss_set_updated_at();

drop trigger if exists ss_courses_set_updated_at on public.ss_courses;
create trigger ss_courses_set_updated_at before update on public.ss_courses
for each row execute function public.ss_set_updated_at();

drop trigger if exists ss_reviews_set_updated_at on public.ss_course_reviews;
create trigger ss_reviews_set_updated_at before update on public.ss_course_reviews
for each row execute function public.ss_set_updated_at();

drop trigger if exists ss_escrow_set_updated_at on public.ss_escrow_transactions;
create trigger ss_escrow_set_updated_at before update on public.ss_escrow_transactions
for each row execute function public.ss_set_updated_at();

create or replace function public.ss_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ss_profiles
    where id = auth.uid() and role in ('moderator', 'admin')
  );
$$;

create or replace function public.ss_has_completed_exchange(p_reviewer_id uuid, p_reviewee_id uuid, p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ss_escrow_transactions
    where course_id = p_course_id
      and status in ('verified', 'released')
      and ((payer_id = p_reviewer_id and payee_id = p_reviewee_id)
        or (payer_id = p_reviewee_id and payee_id = p_reviewer_id))
  );
$$;

create or replace function public.ss_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ss_profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'New member'), '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ss_on_auth_user_created on auth.users;
create trigger ss_on_auth_user_created
  after insert on auth.users
  for each row execute function public.ss_handle_new_user();

-- Do not allow ordinary members to self-promote or change balances/trust scores.
create or replace function public.ss_ss_protect_profile_system_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.ss_is_staff() then
    new.role := old.role;
    new.credits_balance := old.credits_balance;
    new.trust_score := old.trust_score;
  end if;
  return new;
end;
$$;

drop trigger if exists ss_protect_profile_system_fields on public.ss_profiles;
create trigger ss_protect_profile_system_fields
  before update on public.ss_profiles
  for each row execute function public.ss_ss_protect_profile_system_fields();

alter table public.ss_profiles enable row level security;
alter table public.ss_skill_categories enable row level security;
alter table public.ss_courses enable row level security;
alter table public.ss_course_reviews enable row level security;
alter table public.ss_escrow_transactions enable row level security;

drop policy if exists ss_profiles_select_public on public.ss_profiles;
create policy ss_profiles_select_public on public.ss_profiles for select using (true);
drop policy if exists ss_profiles_insert_self on public.ss_profiles;
create policy ss_profiles_insert_self on public.ss_profiles for insert with check (auth.uid() = id);
drop policy if exists ss_profiles_update_self on public.ss_profiles;
create policy ss_profiles_update_self on public.ss_profiles for update using (auth.uid() = id or public.ss_is_staff()) with check (auth.uid() = id or public.ss_is_staff());

drop policy if exists ss_categories_select_public on public.ss_skill_categories;
create policy ss_categories_select_public on public.ss_skill_categories for select using (true);
drop policy if exists ss_categories_manage_staff on public.ss_skill_categories;
create policy ss_categories_manage_staff on public.ss_skill_categories for all using (public.ss_is_staff()) with check (public.ss_is_staff());

drop policy if exists ss_courses_select_published on public.ss_courses;
create policy ss_courses_select_published on public.ss_courses for select using (status = 'published' or instructor_id = auth.uid() or public.ss_is_staff());
drop policy if exists ss_courses_insert_instructor on public.ss_courses;
create policy ss_courses_insert_instructor on public.ss_courses for insert with check (instructor_id = auth.uid());
drop policy if exists ss_courses_update_instructor on public.ss_courses;
create policy ss_courses_update_instructor on public.ss_courses for update using (instructor_id = auth.uid() or public.ss_is_staff()) with check (instructor_id = auth.uid() or public.ss_is_staff());
drop policy if exists ss_courses_delete_instructor on public.ss_courses;
create policy ss_courses_delete_instructor on public.ss_courses for delete using (instructor_id = auth.uid() or public.ss_is_staff());

drop policy if exists ss_reviews_select_published on public.ss_course_reviews;
create policy ss_reviews_select_published on public.ss_course_reviews for select using (is_published = true or reviewer_id = auth.uid() or reviewee_id = auth.uid() or public.ss_is_staff());
drop policy if exists ss_reviews_insert_after_exchange on public.ss_course_reviews;
create policy ss_reviews_insert_after_exchange on public.ss_course_reviews for insert with check (reviewer_id = auth.uid() and public.ss_has_completed_exchange(reviewer_id, reviewee_id, course_id));
drop policy if exists ss_reviews_update_own on public.ss_course_reviews;
create policy ss_reviews_update_own on public.ss_course_reviews for update using (reviewer_id = auth.uid() or public.ss_is_staff()) with check (reviewer_id = auth.uid() or public.ss_is_staff());
drop policy if exists ss_reviews_delete_own on public.ss_course_reviews;
create policy ss_reviews_delete_own on public.ss_course_reviews for delete using (reviewer_id = auth.uid() or public.ss_is_staff());

drop policy if exists ss_escrow_select_participant on public.ss_escrow_transactions;
create policy ss_escrow_select_participant on public.ss_escrow_transactions for select using (payer_id = auth.uid() or payee_id = auth.uid() or public.ss_is_staff());
-- Inserts and state changes happen through the locked SECURITY DEFINER functions below.

create or replace function public.ss_create_escrow(
  p_payee_id uuid,
  p_course_id uuid,
  p_amount_credits integer,
  p_payer_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payer_id uuid := auth.uid();
  v_balance integer;
  v_instructor_id uuid;
  v_transaction_id uuid;
begin
  if v_payer_id is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if p_payee_id is null or p_amount_credits is null or p_amount_credits <= 0 then raise exception 'invalid escrow request'; end if;
  if v_payer_id = p_payee_id then raise exception 'payer and payee must be different'; end if;

  if p_course_id is not null then
    select instructor_id into v_instructor_id from public.ss_courses where id = p_course_id and status = 'published';
    if v_instructor_id is null or v_instructor_id <> p_payee_id then raise exception 'course is not available for this payee'; end if;
  end if;

  select credits_balance into v_balance from public.ss_profiles where id = v_payer_id for update;
  if v_balance is null then raise exception 'payer profile not found'; end if;
  if v_balance < p_amount_credits then raise exception 'insufficient credits'; end if;

  update public.ss_profiles set credits_balance = credits_balance - p_amount_credits where id = v_payer_id;
  insert into public.ss_escrow_transactions (payer_id, payee_id, course_id, amount_credits, payer_note)
  values (v_payer_id, p_payee_id, p_course_id, p_amount_credits, p_payer_note)
  returning id into v_transaction_id;
  return v_transaction_id;
end;
$$;

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
  set status = 'submitted', proof_reference = nullif(trim(p_proof_reference), ''), payer_note = coalesce(p_payer_note, payer_note), submitted_at = timezone('utc', now())
  where id = p_transaction_id and payer_id = auth.uid() and status in ('pending', 'rejected')
  returning * into v_row;
  if v_row.id is null then raise exception 'escrow cannot be submitted'; end if;
  return v_row;
end;
$$;

create or replace function public.ss_verify_escrow_payment(
  p_transaction_id uuid,
  p_decision text,
  p_moderator_note text default null
)
returns public.ss_escrow_transactions
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.ss_escrow_transactions;
begin
  if not public.ss_is_staff() then raise exception 'moderator access required' using errcode = '42501'; end if;
  if p_decision not in ('verify', 'reject') then raise exception 'decision must be verify or reject'; end if;

  update public.ss_escrow_transactions
  set status = case when p_decision = 'verify' then 'verified'::public.ss_escrow_status else 'rejected'::public.ss_escrow_status end,
      moderator_note = p_moderator_note,
      verified_by = auth.uid(),
      verified_at = timezone('utc', now())
  where id = p_transaction_id and status = 'submitted'
  returning * into v_row;
  if v_row.id is null then raise exception 'escrow is not awaiting verification'; end if;

  if p_decision = 'reject' then
    update public.ss_profiles set credits_balance = credits_balance + v_row.amount_credits where id = v_row.payer_id;
  end if;
  return v_row;
end;
$$;

create or replace function public.ss_release_escrow_payment(p_transaction_id uuid)
returns public.ss_escrow_transactions
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.ss_escrow_transactions;
begin
  if not public.ss_is_staff() then raise exception 'moderator access required' using errcode = '42501'; end if;
  update public.ss_escrow_transactions
  set status = 'released', released_at = timezone('utc', now())
  where id = p_transaction_id and status = 'verified'
  returning * into v_row;
  if v_row.id is null then raise exception 'escrow must be verified before release'; end if;
  update public.ss_profiles set credits_balance = credits_balance + v_row.amount_credits where id = v_row.payee_id;
  return v_row;
end;
$$;

insert into public.ss_skill_categories (slug, name, description, icon_name, accent_color, sort_order)
values
  ('design', 'Design', 'Make ideas clearer and more useful.', 'sparkles', '#e6ddff', 1),
  ('marketing', 'Marketing', 'Build a signal people can find.', 'arrow-up-right', '#d9f39a', 2),
  ('technology', 'Technology', 'Ship with confidence and curiosity.', 'command', '#f7c7ad', 3),
  ('wellness', 'Wellness', 'Create sustainable energy for the work.', 'circle', '#cde9dc', 4)
on conflict (slug) do update set name = excluded.name, description = excluded.description, icon_name = excluded.icon_name, accent_color = excluded.accent_color, sort_order = excluded.sort_order;

comment on table public.ss_escrow_transactions is 'Manual verification flow: create_escrow -> submit_escrow_proof -> verify_escrow_payment -> release_escrow_payment.';
comment on function public.ss_verify_escrow_payment(uuid, text, text) is 'Moderator-only manual escrow decision; rejection refunds payer credits, verification holds funds until explicit release.';
