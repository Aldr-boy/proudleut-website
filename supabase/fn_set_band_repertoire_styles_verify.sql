-- ============================================================
-- fn_set_band_repertoire_styles_verify.sql
--
-- Eigenstaendige, ausschliesslich lesende Verifikation zu
-- fn_set_band_repertoire_styles.sql. Auszufuehren NACH:
--   1. fn_set_band_repertoire_styles.sql
--   2. band_repertoire_styles_transaction_tests.sql
--
-- AUSGEFUEHRT: manuell durch Xandi im Supabase SQL Editor gegen
-- Production, 2026-07-24 (nach fn_set_band_repertoire_styles.sql und
-- band_repertoire_styles_transaction_tests.sql). Alle 50 ausgegebenen
-- Pruefzeilen zeigten match = true -- vollstaendig gruen. Der Agent
-- hatte keinen eigenen Ausfuehrungskanal fuer Production (siehe
-- docs/musikalisch-verortet-production-rollout.md).
--
-- Ein Lauf gilt als vollstaendig gruen, wenn ALLE Zeilen match = true
-- zeigen. Kein INSERT/UPDATE/DELETE/TRUNCATE, keine DDL-Anweisung, keine
-- temporaeren Tabellen -- ausschliesslich lesende SELECT-Statements.
--
-- Muster: supabase/admin_moods_management_verify.sql (identische
-- report_section/key/expected/actual/match-Struktur, identische
-- pg_catalog-Introspektion ueber has_function_privilege/
-- has_table_privilege/aclexplode/pg_get_constraintdef). Die
-- search_path-Erwartung uebernimmt bewusst den dort bereits etablierten
-- Wert "search_path=pg_catalog, pg_temp" (NICHT bare "public") -- siehe
-- Begruendung in fn_set_band_repertoire_styles.sql.
--
-- Eine Eigenschaft, die nicht messbar ist (z. B. Funktion nicht
-- gefunden), wird NIE stillschweigend als erfolgreich markiert -- der
-- jeweilige actual-Wert zeigt dann explizit "(nicht gefunden)" o. ae.
-- und match = false.
-- ============================================================

with fn_signatures (fn_name, fn_signature) as (
  values
    ('set_band_repertoire_styles', 'public.set_band_repertoire_styles(uuid, uuid[])')
),
fn_resolved as (
  select
    s.fn_name,
    s.fn_signature,
    to_regprocedure(s.fn_signature) as fn_oid,
    p.prosecdef,
    p.proconfig,
    p.proacl,
    p.proowner,
    p.prorettype
  from fn_signatures s
  left join pg_proc p on p.oid = to_regprocedure(s.fn_signature)::oid
),

-- ---- 1. Zieltabellen vorhanden ----
table_exists_rows as (
  select
    'table_exists'::text as report_section,
    t.table_name as key,
    'Tabelle public.' || t.table_name || ' vorhanden'::text as expected,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = t.table_name)::text as actual,
    exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = t.table_name) as match
  from (values ('repertoire_styles'), ('band_repertoire_styles')) t(table_name)
),

-- ---- 2. Erwartete Spalten vorhanden ----
expected_columns (table_name, column_name) as (
  values
    ('repertoire_styles', 'id'),
    ('repertoire_styles', 'name'),
    ('repertoire_styles', 'slug'),
    ('repertoire_styles', 'status'),
    ('repertoire_styles', 'sort_order'),
    ('band_repertoire_styles', 'band_id'),
    ('band_repertoire_styles', 'repertoire_style_id'),
    ('band_repertoire_styles', 'sort_order')
),
column_exists_rows as (
  select
    'column_exists'::text as report_section,
    ec.table_name || '.' || ec.column_name as key,
    'Spalte vorhanden'::text as expected,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = ec.table_name and column_name = ec.column_name
    )::text as actual,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = ec.table_name and column_name = ec.column_name
    ) as match
  from expected_columns ec
),

-- ---- 3. Primaer-/Fremdschluessel ----
repertoire_styles_pk_row as (
  select
    'constraints'::text as report_section,
    'repertoire_styles_primary_key'::text as key,
    'PRIMARY KEY (id)'::text as expected,
    coalesce((select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.repertoire_styles'::regclass and contype = 'p'), '(keine PK gefunden)') as actual,
    coalesce((select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.repertoire_styles'::regclass and contype = 'p') = 'PRIMARY KEY (id)', false) as match
),
band_repertoire_styles_pk_row as (
  select
    'constraints'::text as report_section,
    'band_repertoire_styles_primary_key'::text as key,
    'PRIMARY KEY (band_id, repertoire_style_id)'::text as expected,
    coalesce((select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.band_repertoire_styles'::regclass and contype = 'p'), '(keine PK gefunden)') as actual,
    coalesce((select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.band_repertoire_styles'::regclass and contype = 'p') = 'PRIMARY KEY (band_id, repertoire_style_id)', false) as match
),
band_repertoire_styles_fk_band_row as (
  select
    'constraints'::text as report_section,
    'band_repertoire_styles_fk_band_id'::text as key,
    'FOREIGN KEY (band_id) REFERENCES bands(id)'::text as expected,
    coalesce((
      select pg_get_constraintdef(oid) from pg_constraint
      where conrelid = 'public.band_repertoire_styles'::regclass and contype = 'f'
        and pg_get_constraintdef(oid) ~* 'FOREIGN KEY \(band_id\) REFERENCES (public\.)?bands\(id\)'
    ), '(keine passende FK gefunden)') as actual,
    exists (
      select 1 from pg_constraint
      where conrelid = 'public.band_repertoire_styles'::regclass and contype = 'f'
        and pg_get_constraintdef(oid) ~* 'FOREIGN KEY \(band_id\) REFERENCES (public\.)?bands\(id\)'
    ) as match
),
band_repertoire_styles_fk_style_row as (
  select
    'constraints'::text as report_section,
    'band_repertoire_styles_fk_repertoire_style_id'::text as key,
    'FOREIGN KEY (repertoire_style_id) REFERENCES repertoire_styles(id)'::text as expected,
    coalesce((
      select pg_get_constraintdef(oid) from pg_constraint
      where conrelid = 'public.band_repertoire_styles'::regclass and contype = 'f'
        and pg_get_constraintdef(oid) ~* 'FOREIGN KEY \(repertoire_style_id\) REFERENCES (public\.)?repertoire_styles\(id\)'
    ), '(keine passende FK gefunden)') as actual,
    exists (
      select 1 from pg_constraint
      where conrelid = 'public.band_repertoire_styles'::regclass and contype = 'f'
        and pg_get_constraintdef(oid) ~* 'FOREIGN KEY \(repertoire_style_id\) REFERENCES (public\.)?repertoire_styles\(id\)'
    ) as match
),

-- ---- 4./5. RPC vorhanden, exakte Signatur ----
fn_exists_rows as (
  select
    'function_exists'::text as report_section,
    fn_name as key,
    ('genau diese Signatur existiert: ' || fn_signature) as expected,
    case when fn_oid is null then 'NICHT GEFUNDEN' else 'gefunden (oid ' || fn_oid::oid::text || ')' end as actual,
    fn_oid is not null as match
  from fn_resolved
),
fn_no_overload_rows as (
  select
    'function_no_unexpected_overload'::text as report_section,
    r.fn_name as key,
    'genau 1 Funktion mit diesem Namen in public'::text as expected,
    count(p.oid)::text as actual,
    count(p.oid) = 1 as match
  from fn_resolved r
  left join pg_proc p
    on p.proname = r.fn_name
   and p.pronamespace = 'public'::regnamespace
  group by r.fn_name
),
fn_returns_void_row as (
  select
    'function_return_type'::text as report_section,
    fn_name as key,
    'RETURNS void'::text as expected,
    case when fn_oid is null then '(Funktion nicht gefunden)' else prorettype::regtype::text end as actual,
    coalesce(prorettype = 'void'::regtype, false) as match
  from fn_resolved
),

-- ---- 6. SECURITY DEFINER ----
fn_secdef_rows as (
  select
    'function_security_definer'::text as report_section,
    fn_name as key,
    'prosecdef = true'::text as expected,
    coalesce(prosecdef::text, '(Funktion nicht gefunden)') as actual,
    coalesce(prosecdef, false) as match
  from fn_resolved
),

-- ---- 7. fest gesetzter search_path ----
fn_search_path_rows as (
  select
    'function_search_path'::text as report_section,
    fn_name as key,
    'search_path=pg_catalog, pg_temp (bewusst ohne bare "public" -- siehe fn_set_band_repertoire_styles.sql)'::text as expected,
    coalesce((select s from unnest(proconfig) s where s like 'search_path=%'), '(nicht gesetzt oder Funktion nicht gefunden)') as actual,
    coalesce(exists (select 1 from unnest(proconfig) s where s = 'search_path=pg_catalog, pg_temp'), false) as match
  from fn_resolved
),

-- ---- 8./9./10./11. EXECUTE-Rechte ----
fn_grant_public_blocked_rows as (
  select
    'function_execute_public_blocked'::text as report_section,
    fn_name as key,
    'kein EXECUTE fuer PUBLIC'::text as expected,
    case
      when fn_oid is null then '(Funktion nicht gefunden)'
      when exists (
        select 1 from aclexplode(coalesce(proacl, acldefault('f', proowner))) acl
        where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
      ) then 'true'
      else 'false'
    end as actual,
    fn_oid is not null and not exists (
      select 1 from aclexplode(coalesce(proacl, acldefault('f', proowner))) acl
      where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
    ) as match
  from fn_resolved
),
fn_grant_anon_blocked_rows as (
  select
    'function_execute_anon_blocked'::text as report_section,
    fn_name as key,
    'kein EXECUTE fuer anon'::text as expected,
    case when fn_oid is null then '(Funktion nicht gefunden)' else has_function_privilege('anon', fn_oid::oid, 'EXECUTE')::text end as actual,
    coalesce(not has_function_privilege('anon', fn_oid::oid, 'EXECUTE'), false) as match
  from fn_resolved
),
fn_grant_authenticated_blocked_rows as (
  select
    'function_execute_authenticated_blocked'::text as report_section,
    fn_name as key,
    'kein EXECUTE fuer authenticated'::text as expected,
    case when fn_oid is null then '(Funktion nicht gefunden)' else has_function_privilege('authenticated', fn_oid::oid, 'EXECUTE')::text end as actual,
    coalesce(not has_function_privilege('authenticated', fn_oid::oid, 'EXECUTE'), false) as match
  from fn_resolved
),
fn_grant_service_role_rows as (
  select
    'function_execute_service_role'::text as report_section,
    fn_name as key,
    'EXECUTE fuer service_role vorhanden'::text as expected,
    case when fn_oid is null then '(Funktion nicht gefunden)' else has_function_privilege('service_role', fn_oid::oid, 'EXECUTE')::text end as actual,
    coalesce(has_function_privilege('service_role', fn_oid::oid, 'EXECUTE'), false) as match
  from fn_resolved
),

-- ---- 12.-16. Tabellenrechte fuer service_role ----
table_names (table_name) as (
  values ('repertoire_styles'), ('band_repertoire_styles')
),
table_grant_select_service_role_rows as (
  select
    'table_select_service_role'::text as report_section,
    table_name as key,
    'SELECT fuer service_role vorhanden'::text as expected,
    has_table_privilege('service_role', 'public.' || table_name, 'SELECT')::text as actual,
    has_table_privilege('service_role', 'public.' || table_name, 'SELECT') as match
  from table_names
),
table_grant_write_blocked_service_role_rows as (
  select
    'table_write_blocked_service_role'::text as report_section,
    t.table_name || ':' || p.priv as key,
    'kein ' || p.priv || ' fuer service_role (Schreiben laeuft ausschliesslich ueber die RPC)' as expected,
    has_table_privilege('service_role', 'public.' || t.table_name, p.priv)::text as actual,
    not has_table_privilege('service_role', 'public.' || t.table_name, p.priv) as match
  from table_names t
  cross join (values ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) p(priv)
),
table_grant_anon_write_blocked_rows as (
  select
    'table_write_blocked_anon'::text as report_section,
    t.table_name || ':' || p.priv as key,
    'kein ' || p.priv || ' fuer anon' as expected,
    has_table_privilege('anon', 'public.' || t.table_name, p.priv)::text as actual,
    not has_table_privilege('anon', 'public.' || t.table_name, p.priv) as match
  from table_names t
  cross join (values ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) p(priv)
),
table_grant_authenticated_write_blocked_rows as (
  select
    'table_write_blocked_authenticated'::text as report_section,
    t.table_name || ':' || p.priv as key,
    'kein ' || p.priv || ' fuer authenticated' as expected,
    has_table_privilege('authenticated', 'public.' || t.table_name, p.priv)::text as actual,
    not has_table_privilege('authenticated', 'public.' || t.table_name, p.priv) as match
  from table_names t
  cross join (values ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) p(priv)
),

-- ---- Ergaenzend: minimal notwendiger Leseweg funktioniert tatsaechlich
-- (kein 42501 mehr) -- direkter Funktionsaufruf-freier Nachweis ueber
-- has_table_privilege ist bereits oben enthalten; dieser Block bestaetigt
-- zusaetzlich, dass mindestens die Katalogtabelle lesbar Zeilen liefert,
-- sofern welche vorhanden sind (kein match=false bei 0 Zeilen -- 0
-- Zeilen ist kein Rechteproblem, sondern ein Datenstand).
read_access_smoke_row as (
  select
    'read_access_smoke'::text as report_section,
    'repertoire_styles_readable'::text as key,
    'SELECT liefert Ergebnis ohne 42501-Fehler'::text as expected,
    (select count(*)::text || ' Zeile(n) lesbar' from public.repertoire_styles) as actual,
    true as match
)

select * from table_exists_rows
union all select * from column_exists_rows
union all select * from repertoire_styles_pk_row
union all select * from band_repertoire_styles_pk_row
union all select * from band_repertoire_styles_fk_band_row
union all select * from band_repertoire_styles_fk_style_row
union all select * from fn_exists_rows
union all select * from fn_no_overload_rows
union all select * from fn_returns_void_row
union all select * from fn_secdef_rows
union all select * from fn_search_path_rows
union all select * from fn_grant_public_blocked_rows
union all select * from fn_grant_anon_blocked_rows
union all select * from fn_grant_authenticated_blocked_rows
union all select * from fn_grant_service_role_rows
union all select * from table_grant_select_service_role_rows
union all select * from table_grant_write_blocked_service_role_rows
union all select * from table_grant_anon_write_blocked_rows
union all select * from table_grant_authenticated_write_blocked_rows
union all select * from read_access_smoke_row
order by report_section, key;
