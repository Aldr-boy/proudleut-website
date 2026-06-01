-- ============================================================
-- diagnose-minimal.sql
-- Stand: 2026-06-01
-- ============================================================
-- Minimaler Test: NUR diese 3 Statements ausführen.
-- Im Supabase-Dashboard → SQL-Editor → Run.
-- Bitte das ERGEBNIS (alle Ausgaben) mitteilen.
-- ============================================================

-- SCHRITT 1: Quertreiber-Slug fix
UPDATE public.bands
SET    slug = 'd-quertreiber',
       updated_at = now()
WHERE  slug = 'quertreiber';

-- SCHRITT 2: Prüfen ob der Update geklappt hat
SELECT name, slug FROM public.bands WHERE name ILIKE '%quertreiber%';

-- SCHRITT 3: Einen event_type einfügen
INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('Geburtstagsfeier', 'geburtstagsfeier', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

-- SCHRITT 4: Prüfen ob der Insert geklappt hat
SELECT name, slug FROM public.event_types WHERE slug = 'geburtstagsfeier';

-- SCHRITT 5: service_role grant (einzeln, ohne alles andere)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.event_types TO service_role;

-- SCHRITT 6: Prüfen ob der Grant sichtbar ist
SELECT grantee, table_name, privilege_type
FROM   information_schema.role_table_grants
WHERE  table_schema = 'public'
  AND  grantee = 'service_role'
  AND  table_name = 'event_types'
ORDER  BY privilege_type;
