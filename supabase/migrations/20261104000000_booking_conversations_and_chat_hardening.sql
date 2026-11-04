alter table public.ss_escrow_transactions
  add column if not exists conversation_id uuid references public.ss_conversations(id) on delete restrict;

create or replace function public.ss_ensure_escrow_conversation(
  p_payer_id uuid,
  p_payee_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
begin
  if p_payer_id is null or p_payee_id is null or p_payer_id = p_payee_id then
    raise exception 'invalid escrow participants' using errcode = '22023';
  end if;

  insert into public.ss_conversations(created_by)
  values (p_payer_id)
  returning id into v_conversation_id;

  insert into public.ss_conversation_members(conversation_id, user_id)
  values (v_conversation_id, p_payer_id), (v_conversation_id, p_payee_id);

  return v_conversation_id;
end;
$$;

create or replace function public.ss_link_escrow_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.conversation_id is null then
    new.conversation_id := public.ss_ensure_escrow_conversation(new.payer_id, new.payee_id);
  end if;
  return new;
end;
$$;

do $$
declare
  v_escrow record;
  v_conversation_id uuid;
begin
  for v_escrow in
    select id, payer_id, payee_id
    from public.ss_escrow_transactions
    where conversation_id is null
    for update
  loop
    v_conversation_id := public.ss_ensure_escrow_conversation(v_escrow.payer_id, v_escrow.payee_id);
    update public.ss_escrow_transactions
    set conversation_id = v_conversation_id
    where id = v_escrow.id;
  end loop;
end;
$$;

alter table public.ss_escrow_transactions
  alter column conversation_id set not null;

create unique index if not exists ss_escrow_conversation_id_idx
  on public.ss_escrow_transactions(conversation_id);

drop trigger if exists ss_link_escrow_conversation on public.ss_escrow_transactions;
create trigger ss_link_escrow_conversation
  before insert on public.ss_escrow_transactions
  for each row execute function public.ss_link_escrow_conversation();

create or replace function public.ss_can_contact(
  p_actor_id uuid,
  p_target_id uuid,
  p_channel text
)
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
  if p_actor_id is null or p_target_id is null or p_actor_id = p_target_id then
    return false;
  end if;

  if exists (
    select 1
    from public.ss_blocks
    where (blocker_id = p_actor_id and blocked_id = p_target_id)
       or (blocker_id = p_target_id and blocked_id = p_actor_id)
  ) then
    return false;
  end if;

  if p_channel <> 'call' and exists (
    select 1
    from public.ss_escrow_transactions
    where status <> 'rejected'
      and (
        (payer_id = p_actor_id and payee_id = p_target_id)
        or (payer_id = p_target_id and payee_id = p_actor_id)
      )
  ) then
    return true;
  end if;

  if p_channel = 'call' then
    select call_policy into v_policy
    from public.ss_profile_privacy
    where user_id = p_target_id;
    v_policy := coalesce(v_policy, 'matches');
  else
    select message_policy into v_policy
    from public.ss_profile_privacy
    where user_id = p_target_id;
    v_policy := coalesce(v_policy, 'followers');
  end if;

  if v_policy = 'everyone' then
    return true;
  end if;

  select exists (
    select 1
    from public.ss_follows
    where follower_id = p_actor_id and following_id = p_target_id
  ) into v_follows;

  select exists (
    select 1
    from public.ss_escrow_transactions
    where status in ('verified', 'released')
      and (
        (payer_id = p_actor_id and payee_id = p_target_id)
        or (payer_id = p_target_id and payee_id = p_actor_id)
      )
  ) into v_matches;

  return (v_policy = 'followers' and v_follows)
      or (v_policy = 'matches' and v_matches);
end;
$$;

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
    and public.ss_can_contact(
      auth.uid(),
      (
        select cm.user_id
        from public.ss_conversation_members cm
        where cm.conversation_id = ss_messages.conversation_id
          and cm.user_id <> auth.uid()
        limit 1
      ),
      'message'
    )
  );

revoke all on public.ss_messages from anon;
grant select, insert on public.ss_messages to authenticated;
revoke all on public.ss_conversations from anon;
grant select on public.ss_conversations to authenticated;
revoke all on public.ss_conversation_members from anon;
grant select on public.ss_conversation_members to authenticated;
revoke all on public.ss_escrow_transactions from anon;
grant select on public.ss_escrow_transactions to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ss_messages'
  ) then
    alter publication supabase_realtime add table public.ss_messages;
  end if;
end;
$$;

drop function if exists public.ss_admin_list_wallet_users();
create function public.ss_admin_list_wallet_users()
returns table (
  id uuid,
  display_name text,
  email text,
  bdt_balance numeric
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not exists (
    select 1
    from public.ss_profiles actor
    where actor.id = auth.uid() and actor.role = 'admin'
  ) then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return query
  select p.id, p.display_name, u.email::text, p.bdt_balance
  from public.ss_profiles p
  join auth.users u on u.id = p.id
  order by lower(p.display_name), lower(u.email);
end;
$$;

do $$
declare
  v_permission record;
  v_function regprocedure;
begin
  for v_permission in
    select *
    from (values
      ('public.ss_ensure_escrow_conversation(uuid, uuid)', 'public, anon, authenticated', null::text),
      ('public.ss_link_escrow_conversation()', 'public, anon, authenticated', null::text),
      ('public.ss_create_escrow(uuid, uuid, integer, text)', 'public, anon, authenticated', null::text),
      ('public.ss_create_escrow(uuid, uuid, integer, text, numeric)', 'public, anon', 'authenticated'),
      ('public.ss_create_conversation(uuid)', 'public, anon', 'authenticated'),
      ('public.ss_is_conversation_member(uuid)', 'public, anon', 'authenticated'),
      ('public.ss_can_contact(uuid, uuid, text)', 'public, anon', 'authenticated'),
      ('public.ss_update_call_status(uuid, public.ss_call_status)', 'public, anon', 'authenticated'),
      ('public.ss_update_escrow_meeting_details(uuid, text)', 'public, anon', 'authenticated'),
      ('public.ss_submit_escrow_proof(uuid, text, text)', 'public, anon', 'authenticated'),
      ('public.ss_release_escrow_by_payer(uuid)', 'public, anon', 'authenticated'),
      ('public.ss_resolve_dispute(uuid, public.ss_dispute_resolution, text, text)', 'public, anon', 'authenticated'),
      ('public.ss_admin_list_wallet_users()', 'public, anon', 'authenticated'),
      ('public.ss_admin_deposit_bdt(uuid, numeric, text)', 'public, anon', 'authenticated'),
      ('public.ss_list_group_sessions()', 'public, anon', 'authenticated'),
      ('public.ss_create_group_session(text, text, text, text, timestamptz, timestamptz, integer, integer)', 'public, anon', 'authenticated'),
      ('public.ss_join_group_session(uuid, boolean)', 'public, anon', 'authenticated'),
      ('public.ss_update_group_session(uuid, text, text, text, text, timestamptz, timestamptz, integer, integer)', 'public, anon', 'authenticated'),
      ('public.ss_set_bdt_balance_for_testing(uuid, numeric)', 'public, anon, authenticated', 'service_role'),
      ('public.ss_is_staff()', 'public', 'authenticated, anon')
    ) as permissions(signature, revoke_roles, grant_roles)
  loop
    v_function := to_regprocedure(v_permission.signature);
    if v_function is null then
      raise notice 'Skipping permissions for missing function %', v_permission.signature;
      continue;
    end if;

    if v_permission.revoke_roles is not null then
      execute format('revoke all on function %s from %s', v_function, v_permission.revoke_roles);
    end if;
    if v_permission.grant_roles is not null then
      execute format('grant execute on function %s to %s', v_function, v_permission.grant_roles);
    end if;
  end loop;
end;
$$;
