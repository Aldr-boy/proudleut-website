-- ============================================================
-- grant-service-role-permissions-v2.sql
-- Stand: 2026-06-01 – Version ohne Inline-Kommentare
-- ============================================================
-- Ausführung im Supabase-Dashboard → SQL-Editor
-- Reihenfolge: erst DIAGNOSTIC ausführen, dann die GRANTs
-- ============================================================


-- ── SCHRITT 0: Diagnose (erst ausführen, Ergebnis notieren) ──────────────────
-- Zeigt aktuelle Grants für service_role auf bands und event_types.
-- Wenn 0 Zeilen → GRANTs fehlen noch.

SELECT grantee, table_name, privilege_type
FROM   information_schema.role_table_grants
WHERE  table_schema = 'public'
  AND  grantee = 'service_role'
  AND  table_name IN ('bands', 'event_types', 'band_types', 'media_assets')
ORDER  BY table_name, privilege_type;


-- ── SCHRITT 1: service_role – Schreibrechte (ohne Inline-Kommentare) ─────────

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.bands TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.band_profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.locations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.event_types TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.band_types TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.lineups TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.sound_worlds TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.moods TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.repertoire_styles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.services TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.band_event_types TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.band_band_types TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.band_lineups TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.band_sound_worlds TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.band_moods TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.band_repertoire_styles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.band_services TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.band_relations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.media_assets TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.videos TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.social_profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.reference_events TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;


-- ── SCHRITT 2: anon – nur SELECT (keine Schreibrechte) ───────────────────────

GRANT SELECT ON TABLE public.bands TO anon;
GRANT SELECT ON TABLE public.band_profiles TO anon;
GRANT SELECT ON TABLE public.locations TO anon;
GRANT SELECT ON TABLE public.media_assets TO anon;
GRANT SELECT ON TABLE public.videos TO anon;
GRANT SELECT ON TABLE public.social_profiles TO anon;
GRANT SELECT ON TABLE public.reference_events TO anon;
GRANT SELECT ON TABLE public.band_event_types TO anon;
GRANT SELECT ON TABLE public.event_types TO anon;
GRANT SELECT ON TABLE public.band_band_types TO anon;
GRANT SELECT ON TABLE public.band_types TO anon;
GRANT SELECT ON TABLE public.band_sound_worlds TO anon;
GRANT SELECT ON TABLE public.sound_worlds TO anon;
GRANT SELECT ON TABLE public.band_moods TO anon;
GRANT SELECT ON TABLE public.moods TO anon;
GRANT SELECT ON TABLE public.band_repertoire_styles TO anon;
GRANT SELECT ON TABLE public.repertoire_styles TO anon;
GRANT SELECT ON TABLE public.band_lineups TO anon;
GRANT SELECT ON TABLE public.lineups TO anon;
GRANT SELECT ON TABLE public.band_services TO anon;
GRANT SELECT ON TABLE public.services TO anon;
GRANT SELECT ON TABLE public.band_relations TO anon;


-- ── SCHRITT 3: Verifikation ───────────────────────────────────────────────────

-- anon Schreibrechte prüfen (Erwartung: 0 Zeilen):
SELECT grantee, table_name, privilege_type
FROM   information_schema.role_table_grants
WHERE  table_schema = 'public'
  AND  grantee = 'anon'
  AND  privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');

-- service_role auf Kern-Tabellen (Erwartung: 4 Einträge pro Tabelle):
SELECT grantee, table_name, privilege_type
FROM   information_schema.role_table_grants
WHERE  table_schema = 'public'
  AND  grantee = 'service_role'
  AND  table_name IN ('bands', 'event_types', 'band_types')
ORDER  BY table_name, privilege_type;
