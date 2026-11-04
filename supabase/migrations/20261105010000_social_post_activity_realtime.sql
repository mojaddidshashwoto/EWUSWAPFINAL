do $$
begin
  if not exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;

  if to_regclass('public.ss_social_posts') is not null
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'ss_social_posts'
     ) then
    alter publication supabase_realtime add table public.ss_social_posts;
  end if;
end;
$$;
