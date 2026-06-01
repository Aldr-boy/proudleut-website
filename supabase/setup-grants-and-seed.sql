-- ============================================================
-- setup-grants-and-seed.sql
-- Stand: 2026-06-01
-- ============================================================
-- Alles in einer Datei, als einzelne Statements ohne Inline-Kommentare.
-- Im Supabase-Dashboard → SQL-Editor ausführen (als postgres/Superuser).
--
-- Inhalt:
--   A) DIAGNOSTIC – aktuellen Grant-Status anzeigen (optional vorab)
--   B) GRANTs für service_role (Schreibrechte für Migration)
--   C) GRANTs für anon (nur SELECT für öffentliche Frontend-Queries)
--   D) Slug-Fix: Quertreiber quertreiber → d-quertreiber
--   E) event_types: 21 fehlende Werte einfügen
--   F) band_types:   4 fehlende Werte einfügen
--   G) VERIFIKATION – Ergebnis prüfen
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- A) DIAGNOSTIC (optional – vorab ausführen um Ist-Stand zu sehen)
-- ────────────────────────────────────────────────────────────

-- SELECT grantee, table_name, privilege_type
-- FROM   information_schema.role_table_grants
-- WHERE  table_schema = 'public'
--   AND  grantee IN ('service_role', 'anon')
--   AND  table_name IN ('bands', 'event_types', 'band_types', 'media_assets')
-- ORDER  BY grantee, table_name, privilege_type;


-- ────────────────────────────────────────────────────────────
-- B) service_role – SELECT, INSERT, UPDATE, DELETE
-- ────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bands TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.band_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.locations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.event_types TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.band_types TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lineups TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sound_worlds TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.moods TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.repertoire_styles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.services TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.band_event_types TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.band_band_types TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.band_lineups TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.band_sound_worlds TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.band_moods TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.band_repertoire_styles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.band_services TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.band_relations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.media_assets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.videos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.social_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reference_events TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;


-- ────────────────────────────────────────────────────────────
-- C) anon – nur SELECT, keine Schreibrechte
-- ────────────────────────────────────────────────────────────

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


-- ────────────────────────────────────────────────────────────
-- D) Slug-Fix: Quertreiber
-- ────────────────────────────────────────────────────────────

UPDATE public.bands
SET    slug       = 'd-quertreiber',
       updated_at = now()
WHERE  slug = 'quertreiber';


-- ────────────────────────────────────────────────────────────
-- E) event_types – 21 fehlende Werte
-- ────────────────────────────────────────────────────────────

INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('Abschlussfeier', 'abschlussfeier', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('Ball', 'ball', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('Bankett', 'bankett', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('Bierfest', 'bierfest', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('Biergarten', 'biergarten', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('Brauereifest', 'brauereifest', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('Empfang', 'empfang', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('exklusive Privatfeiern', 'exklusive-privatfeiern', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('Festival', 'festival', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('Frühschoppen', 'fruehschoppen', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('Geburtstagsfeier', 'geburtstagsfeier', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('Jubiläum', 'jubilaeum', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('Konzert', 'konzert', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('Kultur', 'kultur', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('Open Air', 'open-air', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('private Feiern', 'private-feiern', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('Stadt- und Bürgerfest', 'stadt-und-buergerfest', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('Tanzveranstaltung', 'tanzveranstaltung', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('Taufe', 'taufe', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('Weihnachtsfeier', 'weihnachtsfeier', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.event_types (name, slug, status, sort_order)
VALUES ('Wirtshausmusi', 'wirtshausmusi', 'active', 0)
ON CONFLICT (slug) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- F) band_types – 4 fehlende Werte
-- ────────────────────────────────────────────────────────────

INSERT INTO public.band_types (name, slug, status, sort_order)
VALUES ('Akustikband', 'akustikband', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.band_types (name, slug, status, sort_order)
VALUES ('Blasmusik / Wirtshausmusik', 'blasmusik-wirtshausmusik', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.band_types (name, slug, status, sort_order)
VALUES ('Hochzeitssänger*in', 'hochzeitssaengerin', 'active', 0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.band_types (name, slug, status, sort_order)
VALUES ('Kinder- & Jugendband', 'kinder-und-jugendband', 'active', 0)
ON CONFLICT (slug) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- G) VERIFIKATION
-- ────────────────────────────────────────────────────────────

-- 1. Quertreiber-Slug korrekt?
SELECT name, slug, status
FROM   public.bands
WHERE  name ILIKE '%quertreiber%'
   OR  slug IN ('quertreiber', 'd-quertreiber');

-- 2. event_types – Anzahl und Inhalt
SELECT COUNT(*) AS event_type_count FROM public.event_types;

-- 3. band_types – Anzahl und Inhalt
SELECT COUNT(*) AS band_type_count FROM public.band_types;

-- 4. anon hat keine Schreibrechte (Erwartung: 0 Zeilen)
SELECT grantee, table_name, privilege_type
FROM   information_schema.role_table_grants
WHERE  table_schema = 'public'
  AND  grantee = 'anon'
  AND  privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');

-- 5. service_role hat Schreibrechte auf Kern-Tabellen (Erwartung: je 4 Zeilen)
SELECT grantee, table_name, privilege_type
FROM   information_schema.role_table_grants
WHERE  table_schema = 'public'
  AND  grantee = 'service_role'
  AND  table_name IN ('bands', 'event_types', 'band_types')
ORDER  BY table_name, privilege_type;
