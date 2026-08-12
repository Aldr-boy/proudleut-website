-- ============================================================
-- band_documents_migration_verify.sql
--
-- Eigenstaendige, ausschliesslich lesende Verifikation zu
-- band_documents_migration.sql (Paket 2A). Identisches Muster wie
-- supabase/admin_moods_management_verify.sql: eine Zeile pro Pruefpunkt
-- mit report_section/key/expected/actual/match, kein INSERT/UPDATE/DELETE,
-- keine temporaeren Tabellen.
--
-- NOCH NICHT AUSGEFUEHRT. Diese Datei wird in Paket 2A nicht gegen ein
-- Remote-System ausgefuehrt -- sie ist fuer Paket 2B vorbereitet, direkt
-- nach dem Anwenden von band_documents_migration.sql gegen Production
-- (bfyucjjyarvqeftqqihm) auszufuehren.
--
-- Ein Lauf gilt als vollstaendig gruen, wenn ALLE Zeilen match = true
-- zeigen.
-- ============================================================

with table_exists_row as (
  select
    'table_exists'::text as report_section,
    'band_documents'::text as key,
    'Tabelle public.band_documents existiert'::text as expected,
    case when to_regclass('public.band_documents') is null then 'NICHT GEFUNDEN' else 'gefunden' end as actual,
    to_regclass('public.band_documents') is not null as match
),
column_not_null_rows as (
  select
    'column_not_null'::text as report_section,
    'band_documents.' || col as key,
    'NOT NULL'::text as expected,
    coalesce((select is_nullable from information_schema.columns where table_schema='public' and table_name='band_documents' and column_name=col), '(Spalte nicht gefunden)') as actual,
    coalesce((select is_nullable='NO' from information_schema.columns where table_schema='public' and table_name='band_documents' and column_name=col), false) as match
  from (values ('id'), ('band_id'), ('title'), ('audience_label'), ('file_url'), ('sort_order'), ('created_at'), ('updated_at')) v(col)
),
column_nullable_rows as (
  select
    'column_nullable'::text as report_section,
    'band_documents.' || col as key,
    'nullable (optional)'::text as expected,
    coalesce((select is_nullable from information_schema.columns where table_schema='public' and table_name='band_documents' and column_name=col), '(Spalte nicht gefunden)') as actual,
    coalesce((select is_nullable='YES' from information_schema.columns where table_schema='public' and table_name='band_documents' and column_name=col), false) as match
  from (values ('description'), ('thumbnail_url')) v(col)
),
band_id_fk_row as (
  select
    'band_documents_band_id_fk'::text as report_section,
    'band_documents.band_id'::text as key,
    'FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE CASCADE'::text as expected,
    coalesce((
      select pg_get_constraintdef(oid)
      from pg_constraint
      where conrelid = 'public.band_documents'::regclass
        and contype = 'f'
        and conkey = (select array_agg(attnum) from pg_attribute where attrelid = 'public.band_documents'::regclass and attname = 'band_id')
    ), '(kein FK gefunden)') as actual,
    exists (
      select 1 from pg_constraint
      where conrelid = 'public.band_documents'::regclass
        and contype = 'f'
        and confrelid = 'public.bands'::regclass
        and confdeltype = 'c'
        and conkey = (select array_agg(attnum) from pg_attribute where attrelid = 'public.band_documents'::regclass and attname = 'band_id')
    ) as match
),
sort_order_default_row as (
  select
    'band_documents_sort_order_default'::text as report_section,
    'band_documents.sort_order'::text as key,
    'DEFAULT 0'::text as expected,
    coalesce((select column_default from information_schema.columns where table_schema='public' and table_name='band_documents' and column_name='sort_order'), '(Spalte nicht gefunden)') as actual,
    coalesce((select column_default = '0' from information_schema.columns where table_schema='public' and table_name='band_documents' and column_name='sort_order'), false) as match
),
sort_order_check_row as (
  select
    'band_documents_sort_order_check'::text as report_section,
    'band_documents.sort_order'::text as key,
    'CHECK-Constraint referenziert sort_order >= 0'::text as expected,
    coalesce((select string_agg(pg_get_constraintdef(oid), ' | ') from pg_constraint where conrelid='public.band_documents'::regclass and contype='c'), '(kein CHECK gefunden)') as actual,
    exists (select 1 from pg_constraint where conrelid='public.band_documents'::regclass and contype='c' and pg_get_constraintdef(oid) ~* 'sort_order\s*>=\s*0') as match
),
trigger_row as (
  select
    'band_documents_updated_at_trigger'::text as report_section,
    'trg_band_documents_updated_at'::text as key,
    'Trigger ruft public.set_updated_at() vor UPDATE auf'::text as expected,
    coalesce((
      select p.proname
      from pg_trigger t
      join pg_proc p on p.oid = t.tgfoid
      where t.tgrelid = 'public.band_documents'::regclass and t.tgname = 'trg_band_documents_updated_at'
    ), '(Trigger nicht gefunden)') as actual,
    exists (
      select 1
      from pg_trigger t
      join pg_proc p on p.oid = t.tgfoid
      where t.tgrelid = 'public.band_documents'::regclass
        and t.tgname = 'trg_band_documents_updated_at'
        and p.proname = 'set_updated_at'
    ) as match
),
rls_enabled_row as (
  select
    'rls_enabled'::text as report_section,
    'band_documents'::text as key,
    'relrowsecurity = true'::text as expected,
    coalesce((select relrowsecurity::text from pg_class where oid = 'public.band_documents'::regclass), '(Tabelle nicht gefunden)') as actual,
    coalesce((select relrowsecurity from pg_class where oid = 'public.band_documents'::regclass), false) as match
),
policy_exists_row as (
  select
    'policy_exists'::text as report_section,
    'band_documents_public_read'::text as key,
    'Policy fuer anon/SELECT existiert'::text as expected,
    coalesce((select string_agg(policyname, ', ') from pg_policies where schemaname='public' and tablename='band_documents'), '(keine Policy gefunden)') as actual,
    exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='band_documents'
        and policyname='band_documents_public_read'
        and cmd='SELECT'
        and roles @> array['anon']::name[]
    ) as match
),
policy_uses_bands_status_row as (
  select
    'policy_condition_references_bands_status'::text as report_section,
    'band_documents_public_read'::text as key,
    'USING-Klausel referenziert bands.status und bands.is_published'::text as expected,
    coalesce((select qual from pg_policies where schemaname='public' and tablename='band_documents' and policyname='band_documents_public_read'), '(Policy nicht gefunden)') as actual,
    coalesce((
      select qual ~ 'status' and qual ~ 'is_published'
      from pg_policies
      where schemaname='public' and tablename='band_documents' and policyname='band_documents_public_read'
    ), false) as match
),
table_grant_select_anon_row as (
  select
    'table_select_anon'::text as report_section,
    'band_documents'::text as key,
    'SELECT fuer anon vorhanden'::text as expected,
    has_table_privilege('anon', 'public.band_documents', 'SELECT')::text as actual,
    has_table_privilege('anon', 'public.band_documents', 'SELECT') as match
),
table_write_blocked_anon_rows as (
  select
    'table_write_blocked_anon'::text as report_section,
    'band_documents:' || priv as key,
    'kein ' || priv || ' fuer anon' as expected,
    has_table_privilege('anon', 'public.band_documents', priv)::text as actual,
    not has_table_privilege('anon', 'public.band_documents', priv) as match
  from (values ('INSERT'), ('UPDATE'), ('DELETE')) p(priv)
),
table_blocked_authenticated_rows as (
  select
    'table_blocked_authenticated'::text as report_section,
    'band_documents:' || priv as key,
    'kein ' || priv || ' fuer authenticated' as expected,
    has_table_privilege('authenticated', 'public.band_documents', priv)::text as actual,
    not has_table_privilege('authenticated', 'public.band_documents', priv) as match
  from (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) p(priv)
),
table_grant_service_role_rows as (
  select
    'table_service_role_full_dml'::text as report_section,
    'band_documents:' || priv as key,
    priv || ' fuer service_role vorhanden' as expected,
    has_table_privilege('service_role', 'public.band_documents', priv)::text as actual,
    has_table_privilege('service_role', 'public.band_documents', priv) as match
  from (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) p(priv)
)
select * from table_exists_row
union all select * from column_not_null_rows
union all select * from column_nullable_rows
union all select * from band_id_fk_row
union all select * from sort_order_default_row
union all select * from sort_order_check_row
union all select * from trigger_row
union all select * from rls_enabled_row
union all select * from policy_exists_row
union all select * from policy_uses_bands_status_row
union all select * from table_grant_select_anon_row
union all select * from table_write_blocked_anon_rows
union all select * from table_blocked_authenticated_rows
union all select * from table_grant_service_role_rows
order by report_section, key;
