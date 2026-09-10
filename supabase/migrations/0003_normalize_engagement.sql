-- Migration: normalize engagement type on existing rows.
-- Old rows stored engagement info in `opportunity` (e.g. "Project based",
-- "Project / fractional"). This moves that into engagement_type and collapses
-- every value to the fixed set: 'Project', 'Fractional', 'Both'.
-- Real opportunities (e.g. "Scanning / content strategy") are left untouched.

-- 1. Move engagement-looking text out of opportunity into engagement_type.
update deals
set engagement_type = coalesce(engagement_type, opportunity),
    opportunity     = null
where opportunity is not null
  and opportunity ~* '(fractional|project based|project / fractional|^project$|^both$)';

-- 2. Collapse engagement_type to the three allowed values.
update deals set engagement_type = case
  when engagement_type is null                                        then null
  when engagement_type ~* 'both'                                      then 'Both'
  when engagement_type ~* 'fractional' and engagement_type ~* 'project' then 'Both'
  when engagement_type ~* 'fractional'                                then 'Fractional'
  when engagement_type ~* 'project'                                   then 'Project'
  else engagement_type
end;
