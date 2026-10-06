-- Remove the temporary SECURITY DEFINER helper that allowed authenticated users
-- to change any profile's balance.
drop function if exists public.ss_set_credits_for_testing(uuid, integer);

-- Keep messaging privacy opt-in by default. Existing explicit "everyone"
-- preferences are preserved; integration tests set this only for their fixture.
alter table public.ss_profile_privacy alter column message_policy set default 'followers';

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
    v_policy := coalesce(v_policy, 'followers');
  end if;

  if v_policy = 'everyone' then return true; end if;
  select exists(select 1 from public.ss_follows where follower_id = p_actor_id and following_id = p_target_id) into v_follows;
  select exists(
    select 1 from public.ss_escrow_transactions
    where status in ('verified', 'released')
      and ((payer_id = p_actor_id and payee_id = p_target_id) or (payer_id = p_target_id and payee_id = p_actor_id))
  ) into v_matches;
  return (v_policy = 'followers' and v_follows) or (v_policy = 'matches' and v_matches);
end;
$$;

drop policy if exists ss_messages_insert_allowed on public.ss_messages;
create policy ss_messages_insert_allowed on public.ss_messages
  for insert with check (
    sender_id = auth.uid()
    and public.ss_is_conversation_member(conversation_id)
    and public.ss_can_contact(
      auth.uid(),
      (select cm.user_id from public.ss_conversation_members cm where cm.conversation_id = ss_messages.conversation_id and cm.user_id <> auth.uid() limit 1),
      'message'
    )
  );

revoke all on function public.ss_create_conversation(uuid) from public, anon;
grant execute on function public.ss_create_conversation(uuid) to authenticated;
revoke all on function public.ss_create_escrow(uuid, uuid, integer, text) from public, anon;
grant execute on function public.ss_create_escrow(uuid, uuid, integer, text) to authenticated;