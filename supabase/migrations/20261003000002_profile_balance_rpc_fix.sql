-- User-editable profile fields remain writable, but system fields are controlled by trusted RPCs.
revoke insert, update on public.ss_profiles from public, anon, authenticated;
grant insert (
  id, display_name, avatar_url, bio, education, skills, learning_skills, certifications
) on public.ss_profiles to authenticated;
grant update (
  id, display_name, avatar_url, bio, education, skills, learning_skills, certifications
) on public.ss_profiles to authenticated;

-- Do not undo credits_balance/BDT changes made inside SECURITY DEFINER RPCs.
-- Direct client writes to those fields are denied by the column-level grants above.
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