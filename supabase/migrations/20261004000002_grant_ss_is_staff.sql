-- Grant execute permission on ss_is_staff() to authenticated and anon so RLS policies can evaluate it
grant execute on function public.ss_is_staff() to authenticated, anon;
