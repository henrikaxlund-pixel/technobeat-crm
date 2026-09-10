-- Techno Beat CRM — Supabase schema
-- Run this in the Supabase SQL editor after creating your project

-- Deals table
-- A "deal" is one contact/opportunity. Multiple deals can share a `company`,
-- which is the grouping key for seeing every contact at the same company.
create table if not exists deals (
  id            uuid        default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  company        text,
  client_name   text        not null,   -- legacy headline; kept = company for back-compat
  opportunity   text,
  contact_person text,
  engagement_type text,                 -- e.g. "Project based / Fractional", "Retainer"
  owner         text        not null check (owner in ('Henrik Axlund', 'Riina Rinkinen')),
  stage         text        not null default 'Lead'
                check (stage in ('Lead', 'Contacted', 'Proposal sent', 'Negotiation', 'Active client', 'Archived')),
  last_contacted date,
  next_action   text,
  projected_value numeric(12,2) default 0,
  sold_value      numeric(12,2) default 0
);

-- Additive columns for projects created before company/engagement existed.
alter table deals add column if not exists company         text;
alter table deals add column if not exists engagement_type text;

-- Backfill company from the old client_name for any existing rows.
update deals set company = client_name where company is null;

-- Index to make company grouping/filtering fast.
create index if not exists deals_company_idx on deals (company);

-- Manual priority ordering within a stage (drag-to-reorder, persisted).
alter table deals add column if not exists position double precision;
with ordered as (
  select id, row_number() over (order by created_at) as rn from deals
)
update deals d set position = o.rn from ordered o where d.id = o.id and d.position is null;
create index if not exists deals_position_idx on deals (position);

-- Auto-update updated_at on row changes
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger deals_updated_at
  before update on deals
  for each row execute function update_updated_at();

-- Row-level security: all authenticated users share the board
alter table deals enable row level security;

create policy "Authenticated users can select"  on deals for select  to authenticated using (true);
create policy "Authenticated users can insert"  on deals for insert  to authenticated with check (true);
create policy "Authenticated users can update"  on deals for update  to authenticated using (true) with check (true);
create policy "Authenticated users can delete"  on deals for delete  to authenticated using (true);

-- Enable realtime so both users see changes instantly
alter publication supabase_realtime add table deals;

-- ── PROJECTS ──
-- Work delivered for a company. Linked to deals by the `company` text value,
-- so project history is shared across every contact at that company.
-- engagement_type on deals is one of: 'Project', 'Fractional', 'Both'.
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
