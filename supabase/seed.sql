-- Seed: Henrik's contacts.
-- Run AFTER schema.sql / the migrations.
-- Re-runnable: skips a contact that already exists for the same company.
-- New rows are appended to the bottom of the Lead column via `position`.

-- ── Batch 1 ──
insert into deals (company, client_name, contact_person, owner, stage, engagement_type, next_action, position)
select v.company, v.company, v.contact_person, 'Henrik Axlund', 'Lead', 'Both',
       'Henrik to reach out — wait for now',
       (select coalesce(max(position), 0) from deals) + row_number() over ()
from (values
  ('sarilainen oy',   'Sari Kola'),
  ('Growthbay',       'Arto Luukkainen'),
  ('Dream Machines',  'Pasi Järvenpää'),
  ('LDC',             'Raun Forsyth'),
  ('HMD',             'Ming Li'),
  ('Atomontage',      'Daniel Tabar'),
  ('ALLU',            'Juha Werkalla'),
  ('ICEYE',           'Hina Atta')
) as v(company, contact_person)
where not exists (
  select 1 from deals d
  where d.company = v.company and d.contact_person = v.contact_person
);

-- ── Batch 2 ──
insert into deals (company, client_name, contact_person, owner, stage, engagement_type, next_action, position)
select v.company, v.company, v.contact_person, 'Henrik Axlund', 'Lead', 'Both',
       'Henrik to reach out — wait for now',
       (select coalesce(max(position), 0) from deals) + row_number() over ()
from (values
  ('Finnair',                    'Justin Chacona'),
  ('IXI',                        'Tim McDonald'),
  ('Reality Crisis',             'Sami Syrjä'),
  ('ORAFOL Fresnel Optics GmbH', 'Marco Mildenberger'),
  ('Surgical Science',           'Niclas Olsson'),
  ('Canatu',                     'Ilkka Varjos'),
  ('GE health',                  'Anne Hyttinen'),
  ('swarovski optik',            'Petra Kregelius-Schmidt'),
  ('Raybrowser',                 'Antti Jäderholm')
) as v(company, contact_person)
where not exists (
  select 1 from deals d
  where d.company = v.company and d.contact_person = v.contact_person
);
