alter table public.ss_courses
  add column if not exists learning_outcomes text[] not null default '{}';
