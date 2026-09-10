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
