-- ============================================================
-- social_profiles_admin_grant_verify.sql
--
-- Read-only Verifikation des in social_profiles_admin_grant.sql
-- hergestellten Sollzustands. Nach Ausfuehrung der Migration auf einer
-- Instanz gegen dieselbe Instanz laufen lassen.
-- ============================================================

\pset pager off

\echo '=== Table-Level-Grants service_role auf social_profiles ==='
SELECT
  bool_or(privilege_type = 'SELECT')     AS has_select,
  bool_or(privilege_type = 'INSERT')     AS has_insert,
  bool_or(privilege_type = 'UPDATE')     AS has_update,
  bool_or(privilege_type = 'DELETE')     AS has_delete,
  bool_or(privilege_type = 'TRUNCATE')   AS has_truncate,
  bool_or(privilege_type = 'REFERENCES') AS has_references,
  bool_or(privilege_type = 'TRIGGER')    AS has_trigger
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'social_profiles' AND grantee = 'service_role';

\echo '=== Rohe ACL (zeigt auch MAINTAIN, das information_schema nicht kennt) ==='
SELECT relacl FROM pg_class WHERE relname = 'social_profiles' AND relnamespace = 'public'::regnamespace;

\echo '=== Erwartung: relacl enthaelt fuer service_role nur "arwd" (SELECT/INSERT/UPDATE/DELETE), kein D/x/t/m mehr ==='

\echo '=== Column-Level: keine unerwarteten Extra-Grants fuer service_role (jenseits der Table-Level-REFERENCES/TRIGGER, die jetzt entzogen sind) ==='
SELECT table_name, column_name, grantee, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public' AND table_name = 'social_profiles' AND grantee = 'service_role'
ORDER BY column_name, privilege_type;

\echo '=== pg_attribute.attacl fuer social_profiles (muss weiterhin durchgehend NULL sein) ==='
SELECT a.attname, a.attacl
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
WHERE c.relname = 'social_profiles' AND c.relnamespace = 'public'::regnamespace AND a.attnum > 0
ORDER BY a.attname;

\echo '=== anon-Public-Read unveraendert (muss weiterhin SELECT sein) ==='
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'social_profiles' AND grantee = 'anon';

\echo '=== EXECUTE-Grants unveraendert (social_profiles hat keine eigenen RPCs -- informativ, keine Aenderung erwartet) ==='
SELECT policyname, cmd, roles FROM pg_policies WHERE schemaname='public' AND tablename='social_profiles';
