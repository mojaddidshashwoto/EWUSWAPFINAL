create or replace function public.ss_create_free_skill_swap_proposal(
  p_course_id uuid,
  p_offered_skill text,
  p_note text default null,
  p_amount_bdt numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_course public.ss_courses%rowtype;
  v_conversation_id uuid;
  v_offered_skill text := btrim(coalesce(p_offered_skill, ''));
  v_note text := btrim(coalesce(p_note, ''));
  v_message text;
begin
  if v_actor_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if p_amount_bdt is distinct from 0 then
    raise exception 'free skill swap proposals must have a zero BDT amount' using errcode = '22023';
  end if;

  if p_course_id is null or length(v_offered_skill) = 0 or length(v_offered_skill) > 120 then
    raise exception 'provide a valid course and a skill to offer (up to 120 characters)' using errcode = '22023';
  end if;

  if length(v_note) > 1500 then
    raise exception 'proposal note cannot exceed 1500 characters' using errcode = '22023';
  end if;

  select *
  into v_course
  from public.ss_courses
  where id = p_course_id
    and status = 'published';

  if v_course.id is null then
    raise exception 'course is not available for a skill swap' using errcode = '22023';
  end if;

  if v_course.instructor_id = v_actor_id then
    raise exception 'you cannot propose a swap for your own course' using errcode = '22023';
  end if;

  v_message := format(
    'I would like to propose a free skill swap for "%s". I can offer: %s.',
    left(v_course.title, 250),
    v_offered_skill
  );
  if v_note <> '' then
    v_message := v_message || E'\n\n' || v_note;
  end if;

  if length(v_message) > 2000 then
    raise exception 'proposal message is too long' using errcode = '22023';
  end if;

  v_conversation_id := public.ss_create_conversation(v_course.instructor_id);

  insert into public.ss_messages (conversation_id, sender_id, body)
  values (v_conversation_id, v_actor_id, v_message);

  return v_conversation_id;
end;
$$;

revoke all on function public.ss_create_free_skill_swap_proposal(uuid, text, text, numeric) from public, anon;
grant execute on function public.ss_create_free_skill_swap_proposal(uuid, text, text, numeric) to authenticated;
