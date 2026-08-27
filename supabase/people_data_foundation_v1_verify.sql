-- ============================================================
-- people_data_foundation_v1_verify.sql
--
-- Eigenstaendige, ausschliesslich lesende Verifikation zu
-- people_data_foundation_v1.sql. Identisches Muster wie
-- band_documents_migration_verify.sql: eine Zeile pro Pruefpunkt mit
-- report_section/key/expected/actual/match, kein INSERT/UPDATE/DELETE.
--
-- Ein Lauf gilt als vollstaendig gruen, wenn ALLE Zeilen match = true
-- zeigen.
-- ============================================================

with checks as (

  select 'people_exists'::text as report_section, 'people'::text as key,
    'Tabelle existiert'::text as expected,
    case when to_regclass('public.people') is null then 'NICHT GEFUNDEN' else 'gefunden' end as actual,
    to_regclass('public.people') is not null as match

  union all
  select 'people_approved_at', 'people.approved_at',
    'Spalte existiert (timestamptz, nullable)',
    coalesce((select data_type || ', ' || is_nullable from information_schema.columns where table_schema='public' and table_name='people' and column_name='approved_at'), '(nicht gefunden)'),
    coalesce((select data_type='timestamp with time zone' and is_nullable='YES' from information_schema.columns where table_schema='public' and table_name='people' and column_name='approved_at'), false)

  union all
  select 'people_status_check', 'people.status',
    'CHECK draft/active/archived (unveraendert)',
    coalesce((select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.people'::regclass and conname='people_status_check'), '(nicht gefunden)'),
    coalesce((select pg_get_constraintdef(oid) = 'CHECK ((status = ANY (ARRAY[''active''::text, ''draft''::text, ''archived''::text])))' from pg_constraint where conrelid='public.people'::regclass and conname='people_status_check'), false)

  union all
  select 'membership_is_active_removed', 'band_memberships.is_active',
    'Spalte existiert NICHT mehr',
    case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='band_memberships' and column_name='is_active') then 'existiert noch' else 'entfernt' end,
    not exists (select 1 from information_schema.columns where table_schema='public' and table_name='band_memberships' and column_name='is_active')

  union all
  select 'membership_instrument_removed', 'band_memberships.instrument',
    'Spalte existiert NICHT mehr',
    case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='band_memberships' and column_name='instrument') then 'existiert noch' else 'entfernt' end,
    not exists (select 1 from information_schema.columns where table_schema='public' and table_name='band_memberships' and column_name='instrument')

  union all
  select 'membership_band_fk_cascade', 'band_memberships_band_id_fkey',
    'ON DELETE CASCADE',
    coalesce((select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.band_memberships'::regclass and conname='band_memberships_band_id_fkey'), '(nicht gefunden)'),
    coalesce((select pg_get_constraintdef(oid) ILIKE '%ON DELETE CASCADE%' from pg_constraint where conrelid='public.band_memberships'::regclass and conname='band_memberships_band_id_fkey'), false)

  union all
  select 'membership_person_fk_cascade', 'band_memberships_person_id_fkey',
    'ON DELETE CASCADE',
    coalesce((select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.band_memberships'::regclass and conname='band_memberships_person_id_fkey'), '(nicht gefunden)'),
    coalesce((select pg_get_constraintdef(oid) ILIKE '%ON DELETE CASCADE%' from pg_constraint where conrelid='public.band_memberships'::regclass and conname='band_memberships_person_id_fkey'), false)

  union all
  select 'instruments_exists', 'instruments',
    'Tabelle existiert',
    case when to_regclass('public.instruments') is null then 'NICHT GEFUNDEN' else 'gefunden' end,
    to_regclass('public.instruments') is not null

  union all
  select 'bmi_exists', 'band_membership_instruments',
    'Tabelle existiert',
    case when to_regclass('public.band_membership_instruments') is null then 'NICHT GEFUNDEN' else 'gefunden' end,
    to_regclass('public.band_membership_instruments') is not null

  union all
  select 'bmi_unique', 'band_membership_instruments PK',
    'PRIMARY KEY (membership_id, instrument_id)',
    coalesce((select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.band_membership_instruments'::regclass and contype='p'), '(nicht gefunden)'),
    coalesce((select pg_get_constraintdef(oid) = 'PRIMARY KEY (membership_id, instrument_id)' from pg_constraint where conrelid='public.band_membership_instruments'::regclass and contype='p'), false)

  union all
  select 'rls_enabled', tbl, 'relrowsecurity = true', pg_class.relrowsecurity::text,
    pg_class.relrowsecurity
  from (values ('people'),('band_memberships'),('instruments'),('band_membership_instruments')) as t(tbl)
  join pg_class on pg_class.relname = t.tbl and pg_class.relnamespace = 'public'::regnamespace

  union all
  select 'policy_exists', tbl || ':' || pol, 'Policy vorhanden', 'gefunden',
    exists (select 1 from pg_policies where schemaname='public' and tablename=tbl and policyname=pol)
  from (values
    ('people', 'people_public_read'),
    ('band_memberships', 'band_memberships_public_read'),
    ('instruments', 'instruments_public_read'),
    ('band_membership_instruments', 'band_membership_instruments_public_read')
  ) as t(tbl, pol)

  union all
  select 'service_role_crud', tbl || ':' || priv, 'vorhanden', 'geprueft',
    has_table_privilege('service_role', 'public.' || tbl, priv)
  from (values ('people'),('band_memberships'),('instruments'),('band_membership_instruments')) as t1(tbl)
  cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) as t2(priv)

  union all
  select 'service_role_no_structural', tbl || ':' || priv, 'nicht mehr vorhanden', 'geprueft',
    not has_table_privilege('service_role', 'public.' || tbl, priv)
  from (values ('people'),('band_memberships'),('instruments'),('band_membership_instruments')) as t1(tbl)
  cross join (values ('TRUNCATE'),('REFERENCES'),('TRIGGER')) as t2(priv)

  union all
  select 'anon_no_write', tbl || ':' || priv, 'kein Schreibrecht', 'geprueft',
    not has_table_privilege('anon', 'public.' || tbl, priv)
  from (values ('people'),('band_memberships'),('instruments'),('band_membership_instruments')) as t1(tbl)
  cross join (values ('INSERT'),('UPDATE'),('DELETE')) as t2(priv)

  union all
  select 'anon_select', tbl, 'SELECT vorhanden', 'geprueft',
    has_table_privilege('anon', 'public.' || tbl, 'SELECT')
  from (values ('people'),('band_memberships'),('instruments'),('band_membership_instruments')) as t(tbl)

  union all
  select 'authenticated_no_access', tbl || ':' || priv, 'kein Zugriff', 'geprueft',
    not has_table_privilege('authenticated', 'public.' || tbl, priv)
  from (values ('people'),('band_memberships'),('instruments'),('band_membership_instruments')) as t1(tbl)
  cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) as t2(priv)

)
select report_section, key, expected, actual, match from checks
order by report_section, key;
