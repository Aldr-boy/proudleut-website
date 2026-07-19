-- ============================================================
-- admin_moods_management_verify.sql
--
-- Eigenstaendige, ausschliesslich lesende Verifikation zu Paket 1
-- ("Klingt nach" im Admin). Nach den vier Setup-Dateien auszufuehren:
--   1. fn_set_band_moods.sql
--   2. band_moods_admin_write_lockdown.sql
--   3. fn_moods_catalog_admin.sql
--   4. moods_admin_write_lockdown.sql
--
-- SEPARAT im Supabase SQL Editor auszufuehren -- kein Teil der
-- Migrationen selbst, beliebig oft wiederholbar. Vollstaendig
-- read-only: kein INSERT/UPDATE/DELETE, keine Sequence-Seiteneffekte,
-- keine temporaeren Tabellen. Stil identisch zu den bestehenden
-- Verify-Dateien im Repo (siehe supabase/moods_b2_verify.sql,
-- supabase/band_moods_klingt_nach_final_verify.sql): CTE pro
-- Pruefzeile mit (report_section, key, expected, actual, match),
-- am Ende per UNION ALL zusammengefuehrt.
--
-- Ein Lauf gilt als vollstaendig gruen, wenn ALLE Zeilen match = true
-- zeigen. Jede Zeile mit match = false (oder NULL) muss vor dem
-- naechsten Schritt geklaert werden.
-- ============================================================

with fn_signatures (fn_name, fn_signature) as (
  values
    ('set_band_moods',   'public.set_band_moods(uuid, uuid[])'),
    ('create_mood',      'public.create_mood(text, text, text)'),
    ('update_mood',      'public.update_mood(uuid, text, text)'),
    ('archive_mood',     'public.archive_mood(uuid)'),
    ('reactivate_mood',  'public.reactivate_mood(uuid)')
),
fn_resolved as (
  select
    fn_name,
    fn_signature,
    to_regprocedure(fn_signature) as fn_oid
  from fn_signatures
),

-- ---- Funktionen: Existenz mit exakt erwarteter Signatur ----
fn_exists_rows as (
  select
    'function_exists'::text as report_section,
    fn_name as key,
    ('genau diese Signatur existiert: ' || fn_signature) as expected,
    case when fn_oid is not null
      then 'gefunden (oid ' || fn_oid::oid::text || ')'
      else 'NICHT GEFUNDEN'
    end as actual,
    fn_oid is not null as match
  from fn_resolved
),

-- ---- Funktionen: SECURITY DEFINER ----
fn_secdef_rows as (
  select
    'function_security_definer'::text as report_section,
    r.fn_name as key,
    'prosecdef = true'::text as expected,
    case when p.oid is null then '(Funktion nicht gefunden)' else p.prosecdef::text end as actual,
    coalesce(p.prosecdef, false) as match
  from fn_resolved r
  left join pg_proc p on p.oid = r.fn_oid::oid
),

-- ---- Funktionen: fester sicherer search_path ----
fn_search_path_rows as (
  select
    'function_search_path'::text as report_section,
    r.fn_name as key,
    'search_path=pg_catalog, pg_temp'::text as expected,
    coalesce(
      (select s from unnest(p.proconfig) as s where s like 'search_path=%'),
      '(nicht gesetzt oder Funktion nicht gefunden)'
    ) as actual,
    exists (
      select 1 from unnest(p.proconfig) as s where s = 'search_path=pg_catalog, pg_temp'
    ) as match
  from fn_resolved r
  left join pg_proc p on p.oid = r.fn_oid::oid
),

-- ---- Funktionen: keine unerwartete Ueberladung mit gleichem Namen ----
fn_no_overload_rows as (
  select
    'function_no_unexpected_overload'::text as report_section,
    r.fn_name as key,
    'genau 1 Funktion mit diesem Namen in public'::text as expected,
    count(p2.oid)::text as actual,
    count(p2.oid) = 1 as match
  from fn_resolved r
  left join pg_proc p2 on p2.proname = r.fn_name and p2.pronamespace = 'public'::regnamespace
  group by r.fn_name
),

-- ---- Funktionen: EXECUTE fuer service_role ----
fn_grant_service_role_rows as (
  select
    'function_execute_service_role'::text as report_section,
    r.fn_name as key,
    'EXECUTE fuer service_role vorhanden'::text as expected,
    coalesce(has_function_privilege('service_role', r.fn_oid::oid, 'EXECUTE')::text, '(Funktion nicht gefunden)') as actual,
    coalesce(has_function_privilege('service_role', r.fn_oid::oid, 'EXECUTE'), false) as match
  from fn_resolved r
),

-- ---- Funktionen: kein EXECUTE fuer PUBLIC/anon/authenticated ----
fn_grant_public_blocked_rows as (
  select
    'function_execute_public_blocked'::text as report_section,
    r.fn_name as key,
    'kein EXECUTE fuer PUBLIC'::text as expected,
    coalesce(has_function_privilege('public', r.fn_oid::oid, 'EXECUTE')::text, '(Funktion nicht gefunden)') as actual,
    coalesce(not has_function_privilege('public', r.fn_oid::oid, 'EXECUTE'), false) as match
  from fn_resolved r
),
fn_grant_anon_blocked_rows as (
  select
    'function_execute_anon_blocked'::text as report_section,
    r.fn_name as key,
    'kein EXECUTE fuer anon'::text as expected,
    coalesce(has_function_privilege('anon', r.fn_oid::oid, 'EXECUTE')::text, '(Funktion nicht gefunden)') as actual,
    coalesce(not has_function_privilege('anon', r.fn_oid::oid, 'EXECUTE'), false) as match
  from fn_resolved r
),
fn_grant_authenticated_blocked_rows as (
  select
    'function_execute_authenticated_blocked'::text as report_section,
    r.fn_name as key,
    'kein EXECUTE fuer authenticated'::text as expected,
    coalesce(has_function_privilege('authenticated', r.fn_oid::oid, 'EXECUTE')::text, '(Funktion nicht gefunden)') as actual,
    coalesce(not has_function_privilege('authenticated', r.fn_oid::oid, 'EXECUTE'), false) as match
  from fn_resolved r
),

-- ---- Tabellengrants: service_role SELECT vorhanden ----
table_names (table_name) as (
  values ('band_moods'), ('moods')
),
table_grant_select_service_role_rows as (
  select
    'table_select_service_role'::text as report_section,
    t.table_name as key,
    'SELECT fuer service_role vorhanden'::text as expected,
    has_table_privilege('service_role', 'public.' || t.table_name, 'SELECT')::text as actual,
    has_table_privilege('service_role', 'public.' || t.table_name, 'SELECT') as match
  from table_names t
),

-- ---- Tabellengrants: service_role KEIN direktes INSERT/UPDATE/DELETE ----
table_grant_write_blocked_service_role_rows as (
  select
    'table_write_blocked_service_role'::text as report_section,
    (t.table_name || ':' || p.priv) as key,
    ('kein ' || p.priv || ' fuer service_role (Schreiben laeuft ueber die RPCs)') as expected,
    has_table_privilege('service_role', 'public.' || t.table_name, p.priv)::text as actual,
    not has_table_privilege('service_role', 'public.' || t.table_name, p.priv) as match
  from table_names t
  cross join (values ('INSERT'), ('UPDATE'), ('DELETE')) as p(priv)
),

-- ---- Tabellengrants: anon/authenticated ohne neu eingefuehrte Schreibrechte ----
-- (anon/authenticated hatten schon vor Paket 1 nie INSERT/UPDATE/DELETE auf
-- diese beiden Tabellen -- dieses Paket aendert daran nichts, siehe Repo-Suche
-- im Completion Report. Diese Zeilen bestaetigen nur den unveraenderten
-- Ist-Zustand, kein neues Grant wurde hier vergeben.)
table_grant_anon_write_blocked_rows as (
  select
    'table_write_blocked_anon'::text as report_section,
    (t.table_name || ':' || p.priv) as key,
    ('kein ' || p.priv || ' fuer anon') as expected,
    has_table_privilege('anon', 'public.' || t.table_name, p.priv)::text as actual,
    not has_table_privilege('anon', 'public.' || t.table_name, p.priv) as match
  from table_names t
  cross join (values ('INSERT'), ('UPDATE'), ('DELETE')) as p(priv)
),
table_grant_authenticated_write_blocked_rows as (
  select
    'table_write_blocked_authenticated'::text as report_section,
    (t.table_name || ':' || p.priv) as key,
    ('kein ' || p.priv || ' fuer authenticated') as expected,
    has_table_privilege('authenticated', 'public.' || t.table_name, p.priv)::text as actual,
    not has_table_privilege('authenticated', 'public.' || t.table_name, p.priv) as match
  from table_names t
  cross join (values ('INSERT'), ('UPDATE'), ('DELETE')) as p(priv)
),

-- ---- band_moods: unveraenderte Datenstruktur ----
band_moods_pk_row as (
  select
    'band_moods_primary_key'::text as report_section,
    'band_moods'::text as key,
    'PRIMARY KEY (band_id, mood_id)'::text as expected,
    coalesce(
      (select pg_get_constraintdef(oid) from pg_constraint
        where conrelid = 'public.band_moods'::regclass and contype = 'p'),
      '(keine PK gefunden)'
    ) as actual,
    coalesce(
      (select pg_get_constraintdef(oid) from pg_constraint
        where conrelid = 'public.band_moods'::regclass and contype = 'p') = 'PRIMARY KEY (band_id, mood_id)',
      false
    ) as match
),
band_moods_sort_order_not_null_row as (
  select
    'band_moods_sort_order_not_null'::text as report_section,
    'band_moods.sort_order'::text as key,
    'NOT NULL'::text as expected,
    coalesce((select is_nullable from information_schema.columns
      where table_schema = 'public' and table_name = 'band_moods' and column_name = 'sort_order'), '(Spalte nicht gefunden)') as actual,
    coalesce((select is_nullable = 'NO' from information_schema.columns
      where table_schema = 'public' and table_name = 'band_moods' and column_name = 'sort_order'), false) as match
),
band_moods_sort_order_check_row as (
  select
    'band_moods_sort_order_check'::text as report_section,
    'band_moods.sort_order'::text as key,
    'CHECK-Constraint referenziert sort_order >= 0'::text as expected,
    coalesce(
      (select string_agg(pg_get_constraintdef(oid), ' | ') from pg_constraint
        where conrelid = 'public.band_moods'::regclass and contype = 'c'),
      '(kein CHECK gefunden)'
    ) as actual,
    exists (
      select 1 from pg_constraint
      where conrelid = 'public.band_moods'::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) ~* 'sort_order\s*>=\s*0'
    ) as match
),
band_moods_no_new_unique_on_sort_order_row as (
  select
    'band_moods_no_unexpected_unique_on_sort_order'::text as report_section,
    'band_moods'::text as key,
    'keine UNIQUE-Constraint enthaelt die Spalte sort_order'::text as expected,
    coalesce(
      (select string_agg(c.conname, ', ')
        from pg_constraint c
        where c.conrelid = 'public.band_moods'::regclass
          and c.contype = 'u'
          and c.conkey @> (
            select array_agg(attnum) from pg_attribute
            where attrelid = 'public.band_moods'::regclass and attname = 'sort_order'
          )
      ),
      '(keine gefunden)'
    ) as actual,
    not exists (
      select 1 from pg_constraint c
      where c.conrelid = 'public.band_moods'::regclass
        and c.contype = 'u'
        and c.conkey @> (
          select array_agg(attnum) from pg_attribute
          where attrelid = 'public.band_moods'::regclass and attname = 'sort_order'
        )
    ) as match
),

-- ---- moods: Slug- und Statusstruktur entspricht RPC-Annahmen ----
moods_slug_not_null_row as (
  select
    'moods_slug_not_null'::text as report_section,
    'moods.slug'::text as key,
    'NOT NULL'::text as expected,
    coalesce((select is_nullable from information_schema.columns
      where table_schema = 'public' and table_name = 'moods' and column_name = 'slug'), '(Spalte nicht gefunden)') as actual,
    coalesce((select is_nullable = 'NO' from information_schema.columns
      where table_schema = 'public' and table_name = 'moods' and column_name = 'slug'), false) as match
),
moods_slug_unique_row as (
  select
    'moods_slug_unique'::text as report_section,
    'moods.slug'::text as key,
    'UNIQUE-Constraint auf slug vorhanden (create_mood verlaesst sich per Table-Lock + Existenzcheck darauf)'::text as expected,
    coalesce(
      (select string_agg(c.conname, ', ')
        from pg_constraint c
        where c.conrelid = 'public.moods'::regclass
          and c.contype = 'u'
          and c.conkey @> (select array_agg(attnum) from pg_attribute where attrelid = 'public.moods'::regclass and attname = 'slug')
      ),
      '(keine gefunden)'
    ) as actual,
    exists (
      select 1 from pg_constraint c
      where c.conrelid = 'public.moods'::regclass
        and c.contype = 'u'
        and c.conkey @> (select array_agg(attnum) from pg_attribute where attrelid = 'public.moods'::regclass and attname = 'slug')
    ) as match
),
moods_slug_format_row as (
  select
    'moods_slug_format'::text as report_section,
    'moods.slug (alle Zeilen)'::text as key,
    'alle Slugs erfuellen ^[a-z0-9-]+$ (create_mood-Annahme)'::text as expected,
    ((select count(*) from public.moods where slug !~ '^[a-z0-9-]+$')::text || ' abweichende Zeile(n)') as actual,
    coalesce((select bool_and(slug ~ '^[a-z0-9-]+$') from public.moods), true) as match
),
moods_status_not_null_row as (
  select
    'moods_status_not_null'::text as report_section,
    'moods.status'::text as key,
    'NOT NULL'::text as expected,
    coalesce((select is_nullable from information_schema.columns
      where table_schema = 'public' and table_name = 'moods' and column_name = 'status'), '(Spalte nicht gefunden)') as actual,
    coalesce((select is_nullable = 'NO' from information_schema.columns
      where table_schema = 'public' and table_name = 'moods' and column_name = 'status'), false) as match
),
moods_status_values_row as (
  select
    'moods_status_values'::text as report_section,
    'moods.status (alle Zeilen)'::text as key,
    'alle Statuswerte sind active oder archived (Annahme aller 5 RPCs)'::text as expected,
    coalesce((select string_agg(distinct status, ', ') from public.moods), '(keine Zeilen)') as actual,
    coalesce((select bool_and(status in ('active', 'archived')) from public.moods), true) as match
)

select * from fn_exists_rows
union all
select * from fn_secdef_rows
union all
select * from fn_search_path_rows
union all
select * from fn_no_overload_rows
union all
select * from fn_grant_service_role_rows
union all
select * from fn_grant_public_blocked_rows
union all
select * from fn_grant_anon_blocked_rows
union all
select * from fn_grant_authenticated_blocked_rows
union all
select * from table_grant_select_service_role_rows
union all
select * from table_grant_write_blocked_service_role_rows
union all
select * from table_grant_anon_write_blocked_rows
union all
select * from table_grant_authenticated_write_blocked_rows
union all
select * from band_moods_pk_row
union all
select * from band_moods_sort_order_not_null_row
union all
select * from band_moods_sort_order_check_row
union all
select * from band_moods_no_new_unique_on_sort_order_row
union all
select * from moods_slug_not_null_row
union all
select * from moods_slug_unique_row
union all
select * from moods_slug_format_row
union all
select * from moods_status_not_null_row
union all
select * from moods_status_values_row
order by report_section, key;
