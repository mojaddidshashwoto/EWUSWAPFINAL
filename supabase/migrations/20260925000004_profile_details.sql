-- Extended profile details for identity and skill discovery.
-- Depends on the Skill Swap profile schema.

do $$ begin
  alter table public.ss_profiles add column education text;
  alter table public.ss_profiles add column skills text;
  alter table public.ss_profiles add column certifications text;
exception when duplicate_column then null; end $$;
