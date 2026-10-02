create or replace view public.ss_public_profiles
with (security_barrier = true)
as
select
  p.id,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.education,
  case when coalesce(privacy.show_skills, true) then p.skills else null end as skills,
  p.learning_skills,
  p.certifications,
  p.availability_status,
  p.is_verified,
  p.trust_score,
  coalesce(privacy.show_skills, true) as show_skills
from public.ss_profiles p
left join public.ss_profile_privacy privacy on privacy.user_id = p.id;