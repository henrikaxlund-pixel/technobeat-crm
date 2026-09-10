-- Migration: add the projects table (company-level project history).
-- Safe to run on an existing database. Idempotent.

create table if not exists projects (
  id          uuid          default gen_random_uuid() primary key,
  created_at  timestamptz   default now(),
  company     text          not null,
  name        text          not null,
  value       numeric(12,2) default 0,
  year        int,
  notes       text
);

create index if not exists projects_company_idx on projects (company);

alter table projects enable row level security;

do $$ begin
  create policy "Authenticated users manage projects"
    on projects for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table projects;
exception when duplicate_object then null; end $$;
