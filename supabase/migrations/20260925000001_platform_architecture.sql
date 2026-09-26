-- Skill Swap platform architecture extension.
-- Depends on 20260925000000_skill_swap_schema.sql.

create type public.ss_verification_method as enum ('nid', 'student_id');
create type public.ss_verification_status as enum ('pending', 'in_review', 'verified', 'rejected');
create type public.ss_contact_policy as enum ('everyone', 'followers', 'matches', 'nobody');
create type public.ss_call_status as enum ('requested', 'ringing', 'active', 'ended', 'declined', 'missed');
create type public.ss_dispute_status as enum ('open', 'under_review', 'resolved', 'appealed', 'closed');
create type public.ss_dispute_resolution as enum ('refund_payer', 'release_provider', 'split', 'no_action');

do $$ begin
  alter table public.ss_escrow_transactions add column gross_amount_credits integer;
  alter table public.ss_escrow_transactions add column platform_fee_credits integer not null default 0;
  alter table public.ss_escrow_transactions add column net_amount_credits integer;
  alter table public.ss_escrow_transactions add column fee_rate_bps integer not null default 500;
  alter table public.ss_escrow_transactions add column verification_method text;
exception when duplicate_column then null; end $$;

update public.ss_escrow_transactions
set gross_amount_credits = coalesce(gross_amount_credits, amount_credits),
    net_amount_credits = coalesce(net_amount_credits, amount_credits - platform_fee_credits)
where gross_amount_credits is null or net_amount_credits is null;

alter table public.ss_escrow_transactions alter column gross_amount_credits set default 0;
alter table public.ss_escrow_transactions alter column net_amount_credits set default 0;
alter table public.ss_escrow_transactions add constraint escrow_fee_math check (platform_fee_credits >= 0 and net_amount_credits >= 0 and gross_amount_credits = amount_credits and platform_fee_credits + net_amount_credits = gross_amount_credits);

create table if not exists public.ss_verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ss_profiles(id) on delete cascade,
  method public.ss_verification_method not null,
  document_last4 text check (document_last4 is null or length(document_last4) between 2 and 4),
  document_hash text not null,
  storage_path text,
  status public.ss_verification_status not null default 'pending',
  reviewer_id uuid references public.ss_profiles(id) on delete set null,
  reviewer_note text,
  submitted_at timestamptz not null default timezone('utc', now()),
  decided_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create unique index if not exists ss_one_active_verification_per_user on public.ss_verification_requests(user_id) where status in ('pending', 'in_review');

create table if not exists public.ss_profile_privacy (
  user_id uuid primary key references public.ss_profiles(id) on delete cascade,
  message_policy public.ss_contact_policy not null default 'followers',
  call_policy public.ss_contact_policy not null default 'matches',
  show_online boolean not null default true,
  show_activity boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ss_blocks (
  blocker_id uuid not null references public.ss_profiles(id) on delete cascade,
  blocked_id uuid not null references public.ss_profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_id, blocked_id),
  constraint blocks_distinct check (blocker_id <> blocked_id)
);

create table if not exists public.ss_conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.ss_profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.ss_conversation_members (
  conversation_id uuid not null references public.ss_conversations(id) on delete cascade,
  user_id uuid not null references public.ss_profiles(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);
create table if not exists public.ss_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ss_conversations(id) on delete cascade,
  sender_id uuid not null references public.ss_profiles(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default timezone('utc', now()),
  edited_at timestamptz,
  deleted_at timestamptz
);
create index if not exists ss_messages_conversation_created_idx on public.ss_messages(conversation_id, created_at desc);
create table if not exists public.ss_call_sessions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ss_conversations(id) on delete cascade,
  caller_id uuid not null references public.ss_profiles(id) on delete cascade,
  callee_id uuid not null references public.ss_profiles(id) on delete cascade,
  status public.ss_call_status not null default 'requested',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint calls_distinct check (caller_id <> callee_id)
);

create table if not exists public.ss_social_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.ss_profiles(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 2000),
  visibility public.ss_contact_policy not null default 'everyone',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);
create index if not exists ss_posts_author_created_idx on public.ss_social_posts(author_id, created_at desc);
create table if not exists public.ss_post_likes (
  post_id uuid not null references public.ss_social_posts(id) on delete cascade,
  user_id uuid not null references public.ss_profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);
create table if not exists public.ss_follows (
  follower_id uuid not null references public.ss_profiles(id) on delete cascade,
  following_id uuid not null references public.ss_profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (follower_id, following_id),
  constraint follows_distinct check (follower_id <> following_id)
);

create table if not exists public.ss_learning_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.ss_profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 80),
  description text,
  category_id uuid references public.ss_skill_categories(id) on delete set null,
  is_private boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.ss_group_members (
  group_id uuid not null references public.ss_learning_groups(id) on delete cascade,
  user_id uuid not null references public.ss_profiles(id) on delete cascade,
  role public.ss_profile_role not null default 'user',
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (group_id, user_id)
);
create table if not exists public.ss_group_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.ss_learning_groups(id) on delete cascade,
  host_id uuid not null references public.ss_profiles(id) on delete restrict,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  meeting_reference text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ss_disputes (
  id uuid primary key default gen_random_uuid(),
  escrow_transaction_id uuid not null unique references public.ss_escrow_transactions(id) on delete restrict,
  opened_by uuid not null references public.ss_profiles(id) on delete restrict,
  reason text not null check (length(trim(reason)) between 10 and 2000),
  status public.ss_dispute_status not null default 'open',
  resolution public.ss_dispute_resolution,
  resolution_note text,
  assigned_to uuid references public.ss_profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.ss_dispute_events (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.ss_disputes(id) on delete cascade,
  actor_id uuid not null references public.ss_profiles(id) on delete restrict,
  event_type text not null,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace view public.ss_leaderboard_top_providers as
select
  p.id as provider_id,
  p.display_name,
  p.avatar_url,
  coalesce(avg(r.rating), 0)::numeric(3,2) as average_rating,
  count(r.id)::integer as review_count,
  count(distinct c.id)::integer as course_count,
  coalesce(sum(case when e.status = 'released' then e.net_amount_credits else 0 end), 0)::integer as credits_earned,
  rank() over (order by coalesce(avg(r.rating), 0) desc, count(r.id) desc, count(distinct c.id) desc) as rank
from public.ss_profiles p
left join public.ss_courses c on c.instructor_id = p.id and c.status = 'published'
left join public.ss_course_reviews r on r.reviewee_id = p.id and r.is_published = true
left join public.ss_escrow_transactions e on e.payee_id = p.id
where p.role in ('user', 'moderator', 'admin')
group by p.id, p.display_name, p.avatar_url;

create or replace function public.ss_can_contact(p_actor_id uuid, p_target_id uuid, p_channel text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_policy public.ss_contact_policy; v_follows boolean; v_matches boolean;
begin
  if p_actor_id is null or p_target_id is null or p_actor_id = p_target_id then return false; end if;
  if exists (select 1 from public.ss_blocks where (blocker_id = p_actor_id and blocked_id = p_target_id) or (blocker_id = p_target_id and blocked_id = p_actor_id)) then return false; end if;
  if p_channel = 'call' then select call_policy into v_policy from public.ss_profile_privacy where user_id = p_target_id; else select message_policy into v_policy from public.ss_profile_privacy where user_id = p_target_id; end if;
  v_policy := coalesce(v_policy, 'followers');
  if v_policy = 'everyone' then return true; end if;
  select exists(select 1 from public.ss_follows where follower_id = p_actor_id and following_id = p_target_id) into v_follows;
  select exists(select 1 from public.ss_escrow_transactions where status in ('verified','released') and ((payer_id = p_actor_id and payee_id = p_target_id) or (payer_id = p_target_id and payee_id = p_actor_id))) into v_matches;
  return (v_policy = 'followers' and v_follows) or (v_policy = 'matches' and v_matches);
end;
$$;

create or replace function public.ss_create_escrow(p_payee_id uuid, p_course_id uuid, p_amount_credits integer, p_payer_note text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_payer_id uuid := auth.uid(); v_balance integer; v_instructor_id uuid; v_transaction_id uuid; v_fee integer; v_net integer;
begin
  if v_payer_id is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if p_payee_id is null or p_amount_credits is null or p_amount_credits <= 0 then raise exception 'invalid escrow request'; end if;
  if v_payer_id = p_payee_id then raise exception 'payer and payee must be different'; end if;
  if p_course_id is not null then select instructor_id into v_instructor_id from public.ss_courses where id = p_course_id and status = 'published'; if v_instructor_id is null or v_instructor_id <> p_payee_id then raise exception 'course is not available for this payee'; end if; end if;
  v_fee := greatest(1, ceil(p_amount_credits * 0.05)::integer);
  v_net := p_amount_credits - v_fee;
  if v_net < 1 then raise exception 'amount must cover the platform fee'; end if;
  select credits_balance into v_balance from public.ss_profiles where id = v_payer_id for update;
  if v_balance is null then raise exception 'payer profile not found'; end if;
  if v_balance < p_amount_credits then raise exception 'insufficient credits'; end if;
  update public.ss_profiles set credits_balance = credits_balance - p_amount_credits where id = v_payer_id;
  insert into public.ss_escrow_transactions (payer_id, payee_id, course_id, amount_credits, gross_amount_credits, platform_fee_credits, net_amount_credits, fee_rate_bps, payer_note)
  values (v_payer_id, p_payee_id, p_course_id, p_amount_credits, p_amount_credits, v_fee, v_net, 500, p_payer_note)
  returning id into v_transaction_id;
  return v_transaction_id;
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
  update public.ss_escrow_transactions set status = 'released', released_at = timezone('utc', now()) where id = p_transaction_id and status = 'verified' returning * into v_row;
  if v_row.id is null then raise exception 'escrow must be verified before release'; end if;
  update public.ss_profiles set credits_balance = credits_balance + v_row.net_amount_credits where id = v_row.payee_id;
  return v_row;
end;
$$;

create or replace function public.ss_resolve_dispute(p_dispute_id uuid, p_resolution public.ss_dispute_resolution, p_note text)
returns public.ss_disputes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dispute public.ss_disputes;
  v_escrow public.ss_escrow_transactions;
  v_provider_award integer;
begin
  if not public.ss_is_staff() then raise exception 'moderator access required' using errcode = '42501'; end if;
  select * into v_dispute from public.ss_disputes where id = p_dispute_id for update;
  if v_dispute.id is null or v_dispute.status not in ('open', 'under_review', 'appealed') then raise exception 'dispute is not actionable'; end if;
  select * into v_escrow from public.ss_escrow_transactions where id = v_dispute.escrow_transaction_id for update;
  if v_escrow.id is null or v_escrow.status not in ('submitted', 'verified') then raise exception 'escrow is not actionable'; end if;

  if p_resolution = 'refund_payer' then
    update public.ss_profiles set credits_balance = credits_balance + v_escrow.gross_amount_credits where id = v_escrow.payer_id;
    update public.ss_escrow_transactions set status = 'rejected', moderator_note = p_note, verified_by = auth.uid(), verified_at = timezone('utc', now()) where id = v_escrow.id;
  elsif p_resolution = 'release_provider' then
    update public.ss_profiles set credits_balance = credits_balance + v_escrow.net_amount_credits where id = v_escrow.payee_id;
    update public.ss_escrow_transactions set status = 'released', moderator_note = p_note, released_at = timezone('utc', now()), verified_by = auth.uid(), verified_at = coalesce(verified_at, timezone('utc', now())) where id = v_escrow.id;
  elsif p_resolution = 'split' then
    v_provider_award := floor(v_escrow.net_amount_credits / 2.0)::integer;
    update public.ss_profiles set credits_balance = credits_balance + v_provider_award where id = v_escrow.payee_id;
    update public.ss_profiles set credits_balance = credits_balance + (v_escrow.gross_amount_credits - v_provider_award) where id = v_escrow.payer_id;
    update public.ss_escrow_transactions set status = 'released', moderator_note = p_note, released_at = timezone('utc', now()), verified_by = auth.uid(), verified_at = coalesce(verified_at, timezone('utc', now())) where id = v_escrow.id;
  end if;

  update public.ss_disputes set status = 'resolved', resolution = p_resolution, resolution_note = p_note, assigned_to = auth.uid(), resolved_at = timezone('utc', now()) where id = p_dispute_id returning * into v_dispute;
  insert into public.ss_dispute_events (dispute_id, actor_id, event_type, note) values (p_dispute_id, auth.uid(), 'resolution_recorded', p_resolution::text || coalesce(': ' || p_note, ''));
  return v_dispute;
end;
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
  insert into public.ss_profile_privacy (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

alter table public.ss_verification_requests enable row level security;
alter table public.ss_profile_privacy enable row level security;
alter table public.ss_blocks enable row level security;
alter table public.ss_conversations enable row level security;
alter table public.ss_conversation_members enable row level security;
alter table public.ss_messages enable row level security;
alter table public.ss_call_sessions enable row level security;
alter table public.ss_social_posts enable row level security;
alter table public.ss_post_likes enable row level security;
alter table public.ss_follows enable row level security;
alter table public.ss_learning_groups enable row level security;
alter table public.ss_group_members enable row level security;
alter table public.ss_group_sessions enable row level security;
alter table public.ss_disputes enable row level security;
alter table public.ss_dispute_events enable row level security;

-- Identity proof is private to the applicant and staff. Raw NID/student-ID files should live in a private storage bucket;
-- this table stores only a one-way hash, last four characters, and a storage reference.
create policy ss_verification_select_private on public.ss_verification_requests for select using (user_id = auth.uid() or public.ss_is_staff());
create policy ss_verification_insert_self on public.ss_verification_requests for insert with check (user_id = auth.uid());
create policy ss_verification_update_staff on public.ss_verification_requests for update using (public.ss_is_staff()) with check (public.ss_is_staff());
create policy ss_privacy_select_self on public.ss_profile_privacy for select using (user_id = auth.uid() or public.ss_is_staff());
create policy ss_privacy_manage_self on public.ss_profile_privacy for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ss_blocks_manage_self on public.ss_blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy ss_follows_select_public on public.ss_follows for select using (true);
create policy ss_follows_manage_self on public.ss_follows for all using (follower_id = auth.uid()) with check (follower_id = auth.uid() and follower_id <> following_id);

create policy ss_conversations_select_member on public.ss_conversations for select using (exists(select 1 from public.ss_conversation_members cm where cm.conversation_id = public.ss_conversations.id and cm.user_id = auth.uid()));
create policy ss_conversation_members_select_member on public.ss_conversation_members for select using (user_id = auth.uid() or exists(select 1 from public.ss_conversation_members cm where cm.conversation_id = public.ss_conversation_members.conversation_id and cm.user_id = auth.uid()));
create policy ss_messages_select_member on public.ss_messages for select using (exists(select 1 from public.ss_conversation_members cm where cm.conversation_id = public.ss_messages.conversation_id and cm.user_id = auth.uid()));
create policy ss_messages_insert_allowed on public.ss_messages for insert with check (sender_id = auth.uid() and exists(select 1 from public.ss_conversation_members cm where cm.conversation_id = public.ss_messages.conversation_id and cm.user_id = auth.uid()) and public.ss_can_contact(auth.uid(), (select cm2.user_id from public.ss_conversation_members cm2 where cm2.conversation_id = public.ss_messages.conversation_id and cm2.user_id <> auth.uid() limit 1), 'message'));
create policy ss_call_select_participant on public.ss_call_sessions for select using (caller_id = auth.uid() or callee_id = auth.uid());
create policy ss_call_insert_allowed on public.ss_call_sessions for insert with check (caller_id = auth.uid() and public.ss_can_contact(auth.uid(), callee_id, 'call'));

create policy ss_posts_select_visible on public.ss_social_posts for select using (deleted_at is null and (visibility = 'everyone' or author_id = auth.uid() or (visibility = 'followers' and exists(select 1 from public.ss_follows f where f.follower_id = auth.uid() and f.following_id = author_id))));
create policy ss_posts_insert_self on public.ss_social_posts for insert with check (author_id = auth.uid());
create policy ss_posts_update_self on public.ss_social_posts for update using (author_id = auth.uid() or public.ss_is_staff()) with check (author_id = auth.uid() or public.ss_is_staff());
create policy ss_post_likes_select_public on public.ss_post_likes for select using (true);
create policy ss_post_likes_manage_self on public.ss_post_likes for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy ss_groups_select_public on public.ss_learning_groups for select using (not is_private or owner_id = auth.uid() or exists(select 1 from public.ss_group_members gm where gm.group_id = id and gm.user_id = auth.uid()));
create policy ss_groups_insert_self on public.ss_learning_groups for insert with check (owner_id = auth.uid());
create policy ss_groups_update_owner on public.ss_learning_groups for update using (owner_id = auth.uid() or public.ss_is_staff()) with check (owner_id = auth.uid() or public.ss_is_staff());
create policy ss_group_members_select_member on public.ss_group_members for select using (user_id = auth.uid() or exists(select 1 from public.ss_group_members gm where gm.group_id = group_id and gm.user_id = auth.uid()));
create policy ss_group_members_insert_owner on public.ss_group_members for insert with check (user_id = auth.uid() or exists(select 1 from public.ss_learning_groups g where g.id = group_id and g.owner_id = auth.uid()));
create policy ss_group_members_delete_self_or_owner on public.ss_group_members for delete using (user_id = auth.uid() or exists(select 1 from public.ss_learning_groups g where g.id = group_id and g.owner_id = auth.uid()));
create policy ss_group_sessions_select_member on public.ss_group_sessions for select using (exists(select 1 from public.ss_group_members gm where gm.group_id = group_id and gm.user_id = auth.uid()));
create policy ss_group_sessions_insert_host on public.ss_group_sessions for insert with check (host_id = auth.uid() and exists(select 1 from public.ss_group_members gm where gm.group_id = group_id and gm.user_id = auth.uid()));

create policy ss_disputes_select_participant_or_staff on public.ss_disputes for select using (opened_by = auth.uid() or public.ss_is_staff() or exists(select 1 from public.ss_escrow_transactions e where e.id = escrow_transaction_id and (e.payer_id = auth.uid() or e.payee_id = auth.uid())));
create policy ss_disputes_insert_participant on public.ss_disputes for insert with check (opened_by = auth.uid() and exists(select 1 from public.ss_escrow_transactions e where e.id = escrow_transaction_id and (e.payer_id = auth.uid() or e.payee_id = auth.uid()) and e.status in ('submitted', 'verified')));
create policy ss_dispute_events_select_participant_or_staff on public.ss_dispute_events for select using (public.ss_is_staff() or exists(select 1 from public.ss_disputes d where d.id = dispute_id and (d.opened_by = auth.uid() or exists(select 1 from public.ss_escrow_transactions e where e.id = d.escrow_transaction_id and (e.payer_id = auth.uid() or e.payee_id = auth.uid())))));
create policy ss_dispute_events_insert_staff on public.ss_dispute_events for insert with check (actor_id = auth.uid() and public.ss_is_staff());

comment on table public.ss_verification_requests is 'NID/student-ID verification metadata only; never store raw identity numbers in Postgres.';
comment on table public.ss_escrow_transactions is '5% platform fee is reserved at escrow creation; provider receives net_amount_credits after manual verification and release.';
comment on view public.ss_leaderboard_top_providers is 'Provider ranking by average published rating, review volume, courses, then released net credits.';
