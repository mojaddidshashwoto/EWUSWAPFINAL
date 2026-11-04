alter table public.ss_call_sessions
  add column if not exists offer jsonb,
  add column if not exists answer jsonb,
  add column if not exists caller_ice_candidates jsonb not null default '[]'::jsonb,
  add column if not exists callee_ice_candidates jsonb not null default '[]'::jsonb;

create or replace function public.ss_update_call_signaling(
  p_call_id uuid,
  p_signal_type text,
  p_payload jsonb
)
returns public.ss_call_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_call public.ss_call_sessions;
begin
  if v_actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_payload is null or octet_length(p_payload::text) > 262144 then
    raise exception 'invalid or oversized call signal';
  end if;

  select *
  into v_call
  from public.ss_call_sessions
  where id = p_call_id
    and (caller_id = v_actor_id or callee_id = v_actor_id)
  for update;

  if not found then
    raise exception 'call session not found' using errcode = '42501';
  end if;
  if v_call.status in ('ended', 'declined', 'missed') then
    raise exception 'call session is no longer active';
  end if;

  case p_signal_type
    when 'offer' then
      if v_call.caller_id <> v_actor_id
         or jsonb_typeof(p_payload) <> 'object'
         or p_payload->>'type' <> 'offer'
         or nullif(p_payload->>'sdp', '') is null then
        raise exception 'invalid offer signal' using errcode = '42501';
      end if;
      if v_call.offer is not null then
        raise exception 'call offer has already been submitted';
      end if;
      update public.ss_call_sessions set offer = p_payload where id = p_call_id returning * into v_call;
    when 'answer' then
      if v_call.callee_id <> v_actor_id
         or jsonb_typeof(p_payload) <> 'object'
         or p_payload->>'type' <> 'answer'
         or nullif(p_payload->>'sdp', '') is null then
        raise exception 'invalid answer signal' using errcode = '42501';
      end if;
      if v_call.answer is not null then
        raise exception 'call answer has already been submitted';
      end if;
      update public.ss_call_sessions set answer = p_payload where id = p_call_id returning * into v_call;
    when 'ice' then
      if jsonb_typeof(p_payload) <> 'object'
         or not (p_payload ? 'candidate')
         or length(coalesce(p_payload->>'candidate', '')) > 8192 then
        raise exception 'invalid ICE candidate signal' using errcode = '42501';
      end if;
      if v_call.caller_id = v_actor_id then
        if jsonb_array_length(v_call.caller_ice_candidates) >= 256 then
          raise exception 'too many ICE candidates for this call';
        end if;
        if v_call.caller_ice_candidates @> jsonb_build_array(p_payload) then
          return v_call;
        end if;
        update public.ss_call_sessions
        set caller_ice_candidates = caller_ice_candidates || jsonb_build_array(p_payload)
        where id = p_call_id returning * into v_call;
      else
        if jsonb_array_length(v_call.callee_ice_candidates) >= 256 then
          raise exception 'too many ICE candidates for this call';
        end if;
        if v_call.callee_ice_candidates @> jsonb_build_array(p_payload) then
          return v_call;
        end if;
        update public.ss_call_sessions
        set callee_ice_candidates = callee_ice_candidates || jsonb_build_array(p_payload)
        where id = p_call_id returning * into v_call;
      end if;
    else
      raise exception 'unsupported call signal type';
  end case;

  return v_call;
end;
$$;

revoke all on function public.ss_update_call_signaling(uuid, text, jsonb) from public, anon;
grant execute on function public.ss_update_call_signaling(uuid, text, jsonb) to authenticated;
