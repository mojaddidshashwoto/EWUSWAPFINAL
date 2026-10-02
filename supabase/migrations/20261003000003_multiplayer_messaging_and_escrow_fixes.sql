-- =========================================================================
-- EwuSwap: Multiplayer Messaging, Escrow Balance Deduction, and RLS Fixes
-- =========================================================================

-- 1. Ensure ss_protect_profile_system_fields does not revert credits_balance when updated in RPCs
create or replace function public.ss_ss_protect_profile_system_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.ss_is_staff() then
    new.role := old.role;
    new.trust_score := old.trust_score;
  end if;
  return new;
end;
$$;

-- 2. Default message_policy to 'everyone' so community members can initiate contact
alter table public.ss_profile_privacy alter column message_policy set default 'everyone';
update public.ss_profile_privacy set message_policy = 'everyone' where message_policy = 'followers';

-- 3. Fix ss_can_contact to default to 'everyone' for messages
create or replace function public.ss_can_contact(p_actor_id uuid, p_target_id uuid, p_channel text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_policy public.ss_contact_policy;
  v_follows boolean;
  v_matches boolean;
begin
  if p_actor_id is null or p_target_id is null or p_actor_id = p_target_id then return false; end if;
  if exists (
    select 1 from public.ss_blocks
    where (blocker_id = p_actor_id and blocked_id = p_target_id)
       or (blocker_id = p_target_id and blocked_id = p_actor_id)
  ) then
    return false;
  end if;

  if p_channel = 'call' then
    select call_policy into v_policy from public.ss_profile_privacy where user_id = p_target_id;
    v_policy := coalesce(v_policy, 'matches');
  else
    select message_policy into v_policy from public.ss_profile_privacy where user_id = p_target_id;
    v_policy := coalesce(v_policy, 'everyone');
  end if;

  if v_policy = 'everyone' then return true; end if;
  select exists(select 1 from public.ss_follows where follower_id = p_actor_id and following_id = p_target_id) into v_follows;
  select exists(
    select 1 from public.ss_escrow_transactions
    where status in ('verified','released')
      and ((payer_id = p_actor_id and payee_id = p_target_id) or (payer_id = p_target_id and payee_id = p_actor_id))
  ) into v_matches;
  return (v_policy = 'followers' and v_follows) or (v_policy = 'matches' and v_matches);
end;
$$;

-- 4. Create or retrieve direct conversations securely
create or replace function public.ss_create_conversation(p_target_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_conversation_id uuid;
begin
  if v_actor_id is null or not public.ss_can_contact(v_actor_id, p_target_id, 'message') then
    raise exception 'messaging is not allowed' using errcode = '42501';
  end if;

  select cm1.conversation_id into v_conversation_id
  from public.ss_conversation_members cm1
  join public.ss_conversation_members cm2 on cm2.conversation_id = cm1.conversation_id
  where cm1.user_id = v_actor_id and cm2.user_id = p_target_id
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.ss_conversations(created_by) values (v_actor_id) returning id into v_conversation_id;
  insert into public.ss_conversation_members(conversation_id, user_id)
  values (v_conversation_id, v_actor_id), (v_conversation_id, p_target_id)
  on conflict do nothing;

  return v_conversation_id;
end;
$$;

-- 5. RLS policies for conversations, members, and messages
alter table public.ss_conversations enable row level security;
alter table public.ss_conversation_members enable row level security;
alter table public.ss_messages enable row level security;

drop policy if exists ss_conversations_select_member on public.ss_conversations;
create policy ss_conversations_select_member on public.ss_conversations
  for select using (public.ss_is_conversation_member(id) or public.ss_is_staff());

drop policy if exists ss_conversation_members_select_member on public.ss_conversation_members;
create policy ss_conversation_members_select_member on public.ss_conversation_members
  for select using (user_id = auth.uid() or public.ss_is_conversation_member(conversation_id) or public.ss_is_staff());

drop policy if exists ss_messages_select_member on public.ss_messages;
create policy ss_messages_select_member on public.ss_messages
  for select using (public.ss_is_conversation_member(conversation_id) or public.ss_is_staff());

drop policy if exists ss_messages_insert_allowed on public.ss_messages;
create policy ss_messages_insert_allowed on public.ss_messages
  for insert with check (
    sender_id = auth.uid()
    and public.ss_is_conversation_member(conversation_id)
  );

-- 6. RPC to set credit balance for automated testing
create or replace function public.ss_set_credits_for_testing(p_user_id uuid, p_credits integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_user_id is null or p_credits is null or p_credits < 0 then
    raise exception 'invalid user or credits';
  end if;

  update public.ss_profiles
  set credits_balance = p_credits
  where id = p_user_id
  returning credits_balance into v_balance;

  return v_balance;
end;
$$;

-- 7. Ensure ss_create_escrow is updated and executable
create or replace function public.ss_create_escrow(
  p_payee_id uuid,
  p_course_id uuid default null,
  p_amount_credits integer default 50,
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
  v_fee integer;
  v_net integer;
begin
  if v_payer_id is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if p_payee_id is null or p_amount_credits is null or p_amount_credits <= 0 then raise exception 'invalid escrow request'; end if;
  if v_payer_id = p_payee_id then raise exception 'payer and payee must be different'; end if;
  if p_course_id is not null then
    select instructor_id into v_instructor_id from public.ss_courses where id = p_course_id and status = 'published';
    if v_instructor_id is null or v_instructor_id <> p_payee_id then
      raise exception 'course is not available for this payee';
    end if;
  end if;

  v_fee := greatest(1, ceil(p_amount_credits * 0.05)::integer);
  v_net := p_amount_credits - v_fee;
  if v_net < 1 then raise exception 'amount must cover the platform fee'; end if;

  select credits_balance into v_balance from public.ss_profiles where id = v_payer_id for update;
  if v_balance is null then raise exception 'payer profile not found'; end if;
  if v_balance < p_amount_credits then raise exception 'insufficient credits'; end if;

  update public.ss_profiles set credits_balance = credits_balance - p_amount_credits where id = v_payer_id;

  insert into public.ss_escrow_transactions (
    payer_id, payee_id, course_id, amount_credits, gross_amount_credits,
    platform_fee_credits, net_amount_credits, fee_rate_bps, payer_note
  )
  values (
    v_payer_id, p_payee_id, p_course_id, p_amount_credits, p_amount_credits,
    v_fee, v_net, 500, p_payer_note
  )
  returning id into v_transaction_id;

  return v_transaction_id;
end;
$$;

-- Grant execution permissions on all RPCs
grant execute on function public.ss_create_conversation(uuid) to authenticated;
grant execute on function public.ss_create_escrow(uuid, uuid, integer, text) to authenticated;
grant execute on function public.ss_set_credits_for_testing(uuid, integer) to authenticated;
grant execute on function public.ss_can_contact(uuid, uuid, text) to authenticated;
