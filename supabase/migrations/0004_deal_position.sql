-- Migration: manual priority ordering for deals.
-- Adds a `position` column and seeds it from the current created_at order.
-- Safe to run on an existing database. Idempotent.

alter table deals add column if not exists position double precision;

with ordered as (
  select id, row_number() over (order by created_at) as rn from deals
)
update deals d set position = o.rn from ordered o
where d.id = o.id and d.position is null;

create index if not exists deals_position_idx on deals (position);
