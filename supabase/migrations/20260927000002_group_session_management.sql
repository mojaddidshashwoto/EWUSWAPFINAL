insert into public.ss_skill_categories (slug, name, description, sort_order)
values
  ('arts', 'Arts', 'Creative practice and visual arts.', 5),
  ('business', 'Business', 'Entrepreneurship, operations, and strategy.', 6),
  ('career', 'Career', 'Professional development and job skills.', 7),
  ('finance', 'Finance', 'Personal finance, accounting, and investment basics.', 8),
  ('languages', 'Languages', 'Language learning and conversation practice.', 9),
  ('music', 'Music', 'Instruments, production, and music theory.', 10),
  ('photography', 'Photography', 'Photography, lighting, and editing.', 11),
  ('productivity', 'Productivity', 'Tools and practices for focused work.', 12),
  ('science', 'Science', 'Scientific subjects and research methods.', 13),
  ('writing', 'Writing', 'Creative, academic, and professional writing.', 14)
on conflict (slug) do update set name = excluded.name, description = excluded.description;

alter table public.ss_group_sessions
  add column if not exists description text,
  add column if not exists learning_outcomes text,
  add column if not exists category_id uuid references public.ss_skill_categories(id) on delete set null,
  add column if not exists credit_cost integer not null default 0 check (credit_cost >= 0),
  add column if not exists max_students integer not null default 20 check (max_students > 0);

drop policy if exists ss_group_sessions_select_member on public.ss_group_sessions;
create policy ss_group_sessions_select_member on public.ss_group_sessions
  for select using (
    exists (
      select 1 from public.ss_learning_groups g
      where g.id = group_id
        and (not g.is_private or g.owner_id = auth.uid()
          or exists (select 1 from public.ss_group_members gm where gm.group_id = g.id and gm.user_id = auth.uid()))
    )
  );

create or replace function public.ss_list_group_sessions()
returns table (
  session_id uuid,
  group_id uuid,
  host_id uuid,
  title text,
  category text,
  description text,
  learning_outcomes text,
  starts_at timestamptz,
  ends_at timestamptz,
  credit_cost integer,
  max_students integer,
  enrolled_students bigint,
  host_name text,
  host_avatar text,
  is_verified boolean,
  is_owner boolean,
  is_joined boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.group_id,
    s.host_id,
    s.title,
    coalesce(c.name, 'General'),
    coalesce(s.description, g.description, ''),
    coalesce(s.learning_outcomes, ''),
    s.starts_at,
    s.ends_at,
    s.credit_cost,
    s.max_students,
    (select count(*) from public.ss_group_members gm where gm.group_id = s.group_id),
    p.display_name,
    p.avatar_url,
    p.is_verified,
    s.host_id = auth.uid(),
    exists (select 1 from public.ss_group_members gm where gm.group_id = s.group_id and gm.user_id = auth.uid())
  from public.ss_group_sessions s
  join public.ss_learning_groups g on g.id = s.group_id
  left join public.ss_skill_categories c on c.id = coalesce(s.category_id, g.category_id)
  join public.ss_profiles p on p.id = s.host_id
  where not g.is_private or g.owner_id = auth.uid()
    or exists (select 1 from public.ss_group_members gm where gm.group_id = g.id and gm.user_id = auth.uid())
  order by s.starts_at asc;
$$;

create or replace function public.ss_create_group_session(
  p_title text,
  p_description text,
  p_learning_outcomes text,
  p_category_slug text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_credit_cost integer,
  p_max_students integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
  v_session_id uuid;
  v_category_id uuid;
begin
  if v_user_id is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if length(trim(p_title)) < 5 then raise exception 'title must be at least 5 characters'; end if;
  if length(trim(p_description)) < 20 then raise exception 'description must be at least 20 characters'; end if;
  if length(trim(p_learning_outcomes)) < 10 then raise exception 'learning outcomes must be at least 10 characters'; end if;
  if p_starts_at <= timezone('utc', now()) or p_ends_at <= p_starts_at then raise exception 'choose a valid future start and end time'; end if;
  if p_credit_cost < 0 or p_max_students < 2 then raise exception 'invalid price or capacity'; end if;

  select id into v_category_id from public.ss_skill_categories where slug = p_category_slug;
  if v_category_id is null then raise exception 'unknown category'; end if;

  insert into public.ss_learning_groups (owner_id, name, description, category_id, is_private)
  values (v_user_id, trim(p_title), trim(p_description), v_category_id, false)
  returning id into v_group_id;

  insert into public.ss_group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'user');

  insert into public.ss_group_sessions (
    group_id, host_id, title, description, learning_outcomes,
    category_id, starts_at, ends_at, credit_cost, max_students
  ) values (
    v_group_id, v_user_id, trim(p_title), trim(p_description), trim(p_learning_outcomes),
    v_category_id, p_starts_at, p_ends_at, p_credit_cost, p_max_students
  ) returning id into v_session_id;

  return v_session_id;
end;
$$;

create or replace function public.ss_join_group_session(p_session_id uuid, p_join boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
  v_host_id uuid;
  v_max_students integer;
  v_is_private boolean;
begin
  if v_user_id is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  select s.group_id, s.host_id, s.max_students, g.is_private
    into v_group_id, v_host_id, v_max_students, v_is_private
  from public.ss_group_sessions s
  join public.ss_learning_groups g on g.id = s.group_id
  where s.id = p_session_id;
  if v_group_id is null then raise exception 'session not found'; end if;
  if v_host_id = v_user_id then raise exception 'hosts manage their own session'; end if;
  if v_is_private then raise exception 'this session is private'; end if;

  if p_join then
    if (select count(*) from public.ss_group_members where group_id = v_group_id) >= v_max_students then
      raise exception 'this session is full';
    end if;
    insert into public.ss_group_members (group_id, user_id, role)
    values (v_group_id, v_user_id, 'user')
    on conflict (group_id, user_id) do nothing;
  else
    delete from public.ss_group_members where group_id = v_group_id and user_id = v_user_id;
  end if;
end;
$$;

create or replace function public.ss_update_group_session(
  p_session_id uuid,
  p_title text,
  p_description text,
  p_learning_outcomes text,
  p_category_slug text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_credit_cost integer,
  p_max_students integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_category_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if length(trim(p_title)) < 5 or length(trim(p_description)) < 20 or length(trim(p_learning_outcomes)) < 10 then
    raise exception 'provide a valid title, description, and learning outcomes';
  end if;
  if p_starts_at <= timezone('utc', now()) or p_ends_at <= p_starts_at then raise exception 'choose a valid future start and end time'; end if;
  if p_credit_cost < 0 or p_max_students < 2 then raise exception 'invalid price or capacity'; end if;

  select group_id into v_group_id from public.ss_group_sessions where id = p_session_id and host_id = auth.uid();
  if v_group_id is null then raise exception 'only the host can edit this session' using errcode = '42501'; end if;
  select id into v_category_id from public.ss_skill_categories where slug = p_category_slug;
  if v_category_id is null then raise exception 'unknown category'; end if;

  update public.ss_group_sessions
  set title = trim(p_title), description = trim(p_description), learning_outcomes = trim(p_learning_outcomes),
      category_id = v_category_id, starts_at = p_starts_at, ends_at = p_ends_at,
      credit_cost = p_credit_cost, max_students = p_max_students
  where id = p_session_id and host_id = auth.uid();

  update public.ss_learning_groups
  set name = trim(p_title), description = trim(p_description), category_id = v_category_id
  where id = v_group_id and owner_id = auth.uid();
end;
$$;

revoke all on function public.ss_list_group_sessions() from public;
revoke all on function public.ss_create_group_session(text, text, text, text, timestamptz, timestamptz, integer, integer) from public;
revoke all on function public.ss_join_group_session(uuid, boolean) from public;
revoke all on function public.ss_update_group_session(uuid, text, text, text, text, timestamptz, timestamptz, integer, integer) from public;
grant execute on function public.ss_list_group_sessions() to authenticated;
grant execute on function public.ss_create_group_session(text, text, text, text, timestamptz, timestamptz, integer, integer) to authenticated;
grant execute on function public.ss_join_group_session(uuid, boolean) to authenticated;
grant execute on function public.ss_update_group_session(uuid, text, text, text, text, timestamptz, timestamptz, integer, integer) to authenticated;