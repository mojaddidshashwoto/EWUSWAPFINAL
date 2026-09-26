-- Migration: 20260925000005_ewuswap_backend_updates.sql
-- Description: Adapt backend and database for EwuSwap features (Availability status, Private contact info, Phone verification, Leaderboard view update, and Group learning policies).

-- 1. Availability Status Enum and Column on ss_profiles
do $$ begin
  create type public.ss_availability_status as enum ('available', 'busy', 'vacation', 'unavailable');
exception when duplicate_object then null; end $$;

alter table public.ss_profiles 
  add column if not exists availability_status public.ss_availability_status not null default 'available',
  add column if not exists is_verified boolean not null default false;

-- 2. Private Contact Details on ss_profile_privacy (strictly private via existing RLS: user_id = auth.uid() or ss_is_staff())
alter table public.ss_profile_privacy
  add column if not exists phone_number text,
  add column if not exists address text;

-- 3. Verification Method update to support Phone verification
alter type public.ss_verification_method add value if not exists 'phone';

-- Trigger to automatically update is_verified on ss_profiles when verification is approved
create or replace function public.ss_sync_profile_verification_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'verified' then
    update public.ss_profiles set is_verified = true where id = new.user_id;
  elsif old.status = 'verified' and new.status <> 'verified' then
    update public.ss_profiles set is_verified = (
      exists (
        select 1 from public.ss_verification_requests 
        where user_id = new.user_id and status = 'verified' and id <> new.id
      )
    ) where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists ss_sync_verification_trigger on public.ss_verification_requests;
create trigger ss_sync_verification_trigger
  after insert or update of status on public.ss_verification_requests
  for each row execute function public.ss_sync_profile_verification_status();

-- 4. Group Learning: Verify & ensure RLS policies for multi-student teaching
alter table public.ss_learning_groups enable row level security;
alter table public.ss_group_members enable row level security;
alter table public.ss_group_sessions enable row level security;

-- Drop and recreate group learning policies to ensure multi-student teaching capability
drop policy if exists ss_groups_select_public on public.ss_learning_groups;
create policy ss_groups_select_public on public.ss_learning_groups 
  for select using (not is_private or owner_id = auth.uid() or exists(select 1 from public.ss_group_members gm where gm.group_id = id and gm.user_id = auth.uid()));

drop policy if exists ss_groups_insert_self on public.ss_learning_groups;
create policy ss_groups_insert_self on public.ss_learning_groups 
  for insert with check (owner_id = auth.uid());

drop policy if exists ss_group_members_select_member on public.ss_group_members;
create policy ss_group_members_select_member on public.ss_group_members 
  for select using (user_id = auth.uid() or exists(select 1 from public.ss_group_members gm where gm.group_id = group_id and gm.user_id = auth.uid()) or exists(select 1 from public.ss_learning_groups g where g.id = group_id and not g.is_private));

drop policy if exists ss_group_members_insert_owner_or_self on public.ss_group_members;
create policy ss_group_members_insert_owner_or_self on public.ss_group_members 
  for insert with check (user_id = auth.uid() or exists(select 1 from public.ss_learning_groups g where g.id = group_id and g.owner_id = auth.uid()));

drop policy if exists ss_group_sessions_select_member on public.ss_group_sessions;
create policy ss_group_sessions_select_member on public.ss_group_sessions 
  for select using (exists(select 1 from public.ss_group_members gm where gm.group_id = group_id and gm.user_id = auth.uid()) or exists(select 1 from public.ss_learning_groups g where g.id = group_id and g.owner_id = auth.uid()));

drop policy if exists ss_group_sessions_insert_host on public.ss_group_sessions;
create policy ss_group_sessions_insert_host on public.ss_group_sessions 
  for insert with check (host_id = auth.uid() and exists(select 1 from public.ss_learning_groups g where g.id = group_id and g.owner_id = auth.uid()));

-- 5. Leaderboard View: Ranked by Ratings, Number of Completed Services, and Review Sentiment
drop view if exists public.ss_leaderboard_top_providers;
create view public.ss_leaderboard_top_providers as
select
  p.id as provider_id,
  p.display_name,
  p.avatar_url,
  p.availability_status,
  p.is_verified,
  coalesce(avg(r.rating), 0)::numeric(3,2) as average_rating,
  count(r.id)::integer as review_count,
  count(distinct case when e.status in ('verified', 'released') then e.id end)::integer as completed_services_count,
  count(distinct c.id)::integer as course_count,
  coalesce(sum(case when e.status = 'released' then e.net_amount_credits else 0 end), 0)::integer as credits_earned,
  coalesce(round((count(case when r.rating >= 4 then 1 end)::numeric / nullif(count(r.id), 0)) * 100, 2), 0.00)::numeric(5,2) as sentiment_score,
  rank() over (
    order by 
      coalesce(avg(r.rating), 0) desc, 
      count(distinct case when e.status in ('verified', 'released') then e.id end) desc, 
      coalesce((count(case when r.rating >= 4 then 1 end)::numeric / nullif(count(r.id), 0)), 0) desc,
      count(r.id) desc
  ) as rank
from public.ss_profiles p
left join public.ss_courses c on c.instructor_id = p.id and c.status = 'published'
left join public.ss_course_reviews r on r.reviewee_id = p.id and r.is_published = true
left join public.ss_escrow_transactions e on e.payee_id = p.id
where p.role in ('user', 'moderator', 'admin')
group by p.id, p.display_name, p.avatar_url, p.availability_status, p.is_verified;

comment on view public.ss_leaderboard_top_providers is 'EwuSwap Provider ranking by average rating, number of completed services (escrow verified/released), and review sentiment score (% 4+ star reviews).';
