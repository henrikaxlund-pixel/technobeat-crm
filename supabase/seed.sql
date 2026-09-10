-- Seed: Henrik's initial contacts (batch 1)
-- Run AFTER schema.sql / the company migration.
-- Re-runnable: skips a contact that already exists for the same company.

insert into deals (company, client_name, contact_person, owner, stage, engagement_type, next_action)
select v.company, v.company, v.contact_person, 'Henrik Axlund', 'Lead',
       'Project based / Fractional', 'Henrik to reach out — wait for now'
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
