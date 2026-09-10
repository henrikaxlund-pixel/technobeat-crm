-- Migration: add company + engagement_type to deals
-- Safe to run on an existing database. Idempotent.

alter table deals add column if not exists company         text;
alter table deals add column if not exists engagement_type text;

-- Backfill company from the old client_name headline.
update deals set company = client_name where company is null;

create index if not exists deals_company_idx on deals (company);
