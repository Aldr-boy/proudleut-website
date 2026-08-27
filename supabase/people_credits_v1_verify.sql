-- ============================================================
-- people_credits_v1_verify.sql
--
-- Eigenstaendige, ausschliesslich lesende Verifikation zu
-- people_credits_v1.sql. Identisches Muster wie
-- people_links_v1_verify.sql: eine Zeile pro Pruefpunkt mit
-- report_section/key/expected/actual/match, kein INSERT/UPDATE/DELETE.
--
-- Ein Lauf gilt als vollstaendig gruen, wenn ALLE Zeilen match = true
-- zeigen.
-- ============================================================

with checks as (

  select 'person_credits_exists'::text as report_section, 'person_credits'::text as key,
    'Tabelle existiert'::text as expected,
    case when to_regclass('public.person_credits') is null then 'NICHT GEFUNDEN' else 'gefunden' end as actual,
    to_regclass('public.person_credits') is not null as match

  union all
  select 'columns', 'person_credits.person_id',
    'uuid, not null',
    coalesce((select data_type || ', ' || is_nullable from information_schema.columns where table_schema='public' and table_name='person_credits' and column_name='person_id'), '(nicht gefunden)'),
    coalesce((select data_type='uuid' and is_nullable='NO' from information_schema.columns where table_schema='public' and table_name='person_credits' and column_name='person_id'), false)

  union all
  select 'columns', 'person_credits.name',
    'text, not null',
    coalesce((select data_type || ', ' || is_nullable from information_schema.columns where table_schema='public' and table_name='person_credits' and column_name='name'), '(nicht gefunden)'),
    coalesce((select data_type='text' and is_nullable='NO' from information_schema.columns where table_schema='public' and table_name='person_credits' and column_name='name'), false)

  union all
  select 'columns', 'person_credits.sort_order',
    'integer, not null, default 0',
    coalesce((select data_type || ', ' || is_nullable from information_schema.columns where table_schema='public' and table_name='person_credits' and column_name='sort_order'), '(nicht gefunden)'),
    coalesce((select data_type='integer' and is_nullable='NO' from information_schema.columns where table_schema='public' and table_name='person_credits' and column_name='sort_order'), false)

  union all
  select 'columns', 'person_credits.is_public',
    'boolean, not null, default false',
    coalesce((select data_type || ', ' || is_nullable || ', default=' || column_default from information_schema.columns where table_schema='public' and table_name='person_credits' and column_name='is_public'), '(nicht gefunden)'),
    coalesce((select data_type='boolean' and is_nullable='NO' and column_default='false' from information_schema.columns where table_schema='public' and table_name='person_credits' and column_name='is_public'), false)

  union all
  select 'fk_cascade', 'person_credits_person_id_fkey',
    'ON DELETE CASCADE -> people(id)',
    coalesce((select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.person_credits'::regclass and contype='f'), '(nicht gefunden)'),
    coalesce((select pg_get_constraintdef(oid) ILIKE '%REFERENCES people(id)%ON DELETE CASCADE%' from pg_constraint where conrelid='public.person_credits'::regclass and contype='f'), false)

  union all
  select 'unique_constraint', 'person_credits(person_id, name)',
    'UNIQUE (person_id, name)',
    coalesce((select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.person_credits'::regclass and contype='u'), '(nicht gefunden)'),
    coalesce((select pg_get_constraintdef(oid) = 'UNIQUE (person_id, name)' from pg_constraint where conrelid='public.person_credits'::regclass and contype='u'), false)

  union all
  select 'name_check', 'person_credits_name_check',
    'CHECK enthaelt btrim/char_length und max. 80 Zeichen',
    coalesce((select string_agg(pg_get_constraintdef(oid), ' | ') from pg_constraint where conrelid='public.person_credits'::regclass and contype='c' and pg_get_constraintdef(oid) ILIKE '%name%'), '(nicht gefunden)'),
    coalesce((select bool_or(pg_get_constraintdef(oid) ILIKE '%btrim%' and pg_get_constraintdef(oid) ILIKE '%80%') from pg_constraint where conrelid='public.person_credits'::regclass and contype='c' and pg_get_constraintdef(oid) ILIKE '%name%'), false)

  union all
  select 'rls_enabled', 'person_credits', 'relrowsecurity = true', pg_class.relrowsecurity::text,
    pg_class.relrowsecurity
  from pg_class
  where pg_class.relname = 'person_credits' and pg_class.relnamespace = 'public'::regnamespace

  union all
  select 'policy_exists', 'person_credits:person_credits_public_read', 'Policy vorhanden', 'gefunden',
    exists (select 1 from pg_policies where schemaname='public' and tablename='person_credits' and policyname='person_credits_public_read')

  union all
  select 'service_role_crud', 'person_credits:' || priv, 'vorhanden', 'geprueft',
    has_table_privilege('service_role', 'public.person_credits', priv)
  from (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) as t(priv)

  union all
  select 'service_role_no_structural', 'person_credits:' || priv, 'nicht mehr vorhanden', 'geprueft',
    not has_table_privilege('service_role', 'public.person_credits', priv)
  from (values ('TRUNCATE'),('REFERENCES'),('TRIGGER')) as t(priv)

  union all
  select 'anon_no_write', 'person_credits:' || priv, 'kein Schreibrecht', 'geprueft',
    not has_table_privilege('anon', 'public.person_credits', priv)
  from (values ('INSERT'),('UPDATE'),('DELETE')) as t(priv)

  union all
  select 'anon_select', 'person_credits', 'SELECT vorhanden', 'geprueft',
    has_table_privilege('anon', 'public.person_credits', 'SELECT')

  union all
  select 'authenticated_no_access', 'person_credits:' || priv, 'kein Zugriff', 'geprueft',
    not has_table_privilege('authenticated', 'public.person_credits', priv)
  from (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) as t(priv)

  union all
  select 'trigger_exists', 'trg_person_credits_updated_at', 'Trigger vorhanden', 'gefunden',
    exists (select 1 from pg_trigger where tgname = 'trg_person_credits_updated_at' and tgrelid = 'public.person_credits'::regclass)

  union all
  select 'index_exists', 'idx_person_credits_person', 'Index vorhanden', 'gefunden',
    exists (select 1 from pg_indexes where schemaname='public' and tablename='person_credits' and indexname='idx_person_credits_person')

)
select report_section, key, expected, actual, match from checks
order by report_section, key;
