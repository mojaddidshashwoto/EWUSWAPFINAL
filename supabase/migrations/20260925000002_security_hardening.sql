-- Security hardening for the Skill Swap namespace.
-- Depends on 20260925000000_skill_swap_schema.sql and 20260925000001_platform_architecture.sql.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ss_escrow_fee_math') then
    alter table public.ss_escrow_transactions add constraint ss_escrow_fee_math
      check (platform_fee_credits >= 0 and net_amount_credits >= 0 and gross_amount_credits = amount_credits and platform_fee_credits + net_amount_credits = gross_amount_credits);
  end if;
end $$;

create or replace function public.ss_is_conversation_member(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ss_conversation_members where conversation_id = p_conversation_id and user_id = auth.uid());
$$;

create or replace function public.ss_is_group_member(p_group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ss_group_members where group_id = p_group_id and user_id = auth.uid());
$$;

create or replace function public.ss_create_conversation(p_target_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_actor_id uuid := auth.uid(); v_conversation_id uuid;
begin
  if v_actor_id is null or not public.ss_can_contact(v_actor_id, p_target_id, 'message') then raise exception 'messaging is not allowed'; end if;
  select cm1.conversation_id into v_conversation_id
  from public.ss_conversation_members cm1
  join public.ss_conversation_members cm2 on cm2.conversation_id = cm1.conversation_id
  where cm1.user_id = v_actor_id and cm2.user_id = p_target_id
  limit 1;
  if v_conversation_id is not null then return v_conversation_id; end if;
  insert into public.ss_conversations(created_by) values (v_actor_id) returning id into v_conversation_id;
  insert into public.ss_conversation_members(conversation_id, user_id) values (v_conversation_id, v_actor_id), (v_conversation_id, p_target_id);
  return v_conversation_id;
end;
$$;

create or replace function public.ss_update_call_status(p_call_id uuid, p_status public.ss_call_status)
returns public.ss_call_sessions language plpgsql security definer set search_path = public as $$
declare v_row public.ss_call_sessions;
begin
  update public.ss_call_sessions
  set status = p_status,
      started_at = case when p_status = 'active' then coalesce(started_at, timezone('utc', now())) else started_at end,
      ended_at = case when p_status in ('ended', 'declined', 'missed') then timezone('utc', now()) else ended_at end
  where id = p_call_id and (caller_id = auth.uid() or callee_id = auth.uid())
  returning * into v_row;
  if v_row.id is null then raise exception 'call session not found'; end if;
  return v_row;
end;
$$;

drop policy if exists ss_conversation_members_select_member on public.ss_conversation_members;
create policy ss_conversation_members_select_member on public.ss_conversation_members for select using (user_id = auth.uid() or public.ss_is_conversation_member(conversation_id));
drop policy if exists ss_group_members_select_member on public.ss_group_members;
create policy ss_group_members_select_member on public.ss_group_members for select using (user_id = auth.uid() or public.ss_is_group_member(group_id));
drop policy if exists ss_messages_insert_allowed on public.ss_messages;
create policy ss_messages_insert_allowed on public.ss_messages for insert with check (
  sender_id = auth.uid()
  and public.ss_is_conversation_member(conversation_id)
  and public.ss_can_contact(auth.uid(), (select cm.user_id from public.ss_conversation_members cm where cm.conversation_id = ss_messages.conversation_id and cm.user_id <> auth.uid() limit 1), 'message')
);
drop policy if exists ss_posts_select_visible on public.ss_social_posts;
create policy ss_posts_select_visible on public.ss_social_posts for select using (
  deleted_at is null and (
    visibility = 'everyone'
    or author_id = auth.uid()
    or (visibility = 'followers' and exists (select 1 from public.ss_follows f where f.follower_id = auth.uid() and f.following_id = author_id))
    or (visibility = 'matches' and public.ss_has_completed_exchange(auth.uid(), author_id, null))
  )
);
drop policy if exists ss_dispute_events_select_participant_or_staff on public.ss_dispute_events;
create policy ss_dispute_events_select_participant_or_staff on public.ss_dispute_events for select using (
  public.ss_is_staff() or exists (
    select 1 from public.ss_disputes d
    join public.ss_escrow_transactions e on e.id = d.escrow_transaction_id
    where d.id = dispute_id and (d.opened_by = auth.uid() or e.payer_id = auth.uid() or e.payee_id = auth.uid())
  )
);

comment on function public.ss_create_conversation(uuid) is 'Creates or reuses a two-person conversation only when the target privacy policy allows messaging.';
comment on function public.ss_update_call_status(uuid, public.ss_call_status) is 'Participant-only call status transition for signaling metadata; media is handled outside Postgres.';
