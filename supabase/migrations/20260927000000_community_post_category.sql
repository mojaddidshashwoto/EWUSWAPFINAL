alter table public.ss_social_posts
  add column if not exists category text not null default 'General';