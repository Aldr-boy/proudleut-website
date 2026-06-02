-- ============================================================
-- grant-service-role-permissions.sql
-- Stand: 2026-06-01
-- ============================================================
-- Zweck:
--   Erteilt dem Supabase service_role Schreibrechte für
--   Migration und Seed-Scripts.
--   Erteilt anon NUR SELECT auf Tabellen, die die öffentlichen
--   Frontend-Queries (getBandFromSupabase, getAllBandsFromSupabase)
--   tatsächlich lesen.
--
-- Sicherheitsregeln:
--   • anon   → ausschließlich SELECT, nur Frontend-relevante Tabellen
--   • anon   → KEINE INSERT, UPDATE, DELETE, TRUNCATE – nirgends
--   • authenticated → keine Rechte in diesem File (keine Login-Features)
--   • service_role → SELECT + INSERT + UPDATE + DELETE (Backend-Only-Key,
--                    nie an Client weitergegeben)
--
-- Bewusst AUSGESCHLOSSEN:
--   • band_contacts  – enthält E-Mail und Telefon; anon hat KEINEN Zugriff.
--                      service_role erhält SELECT, INSERT, UPDATE (separates Statement unten).
--   • plz_reference  – reine Infrastruktur-Tabelle, nicht in Frontend-Queries
--
-- Hintergrund:
--   Tables aus proudleut-schema.sql wurden ohne GRANT-Statements
--   angelegt. Nur media_assets hat bereits Grants (Dashboard-Ursprung).
--
-- Ausführung:
--   Supabase-Dashboard → SQL-Editor (läuft als postgres/Superuser)
--   Idempotent: GRANT kann mehrfach ausgeführt werden.
-- ============================================================

-- ── 1. service_role: Schreibrechte für Migration + Seed ───────────────────────
-- Backend-Only-Key, wird nie an den Client weitergegeben.
-- Benötigt für: migrate-bands.mjs, seed-missing-lookups*.sql, migrate-band-images.mjs
--
-- Phase 1 (aktuell):   bands, band_profiles, locations, event_types, band_types,
--                      band_event_types, band_band_types, media_assets
-- Phase 2 (geplant):   videos, social_profiles, reference_events,
--                      band_sound_worlds, band_moods, band_repertoire_styles,
--                      band_lineups, band_services, band_relations
-- Lookup-Tabellen:     lineups, sound_worlds, moods, repertoire_styles, services
--                      (für Seed-Scripts)

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  -- Band-Kern
  public.bands,
  public.band_profiles,
  -- Geografie
  public.locations,
  -- Lookup-Tabellen (für Seed und Migration)
  public.event_types,
  public.band_types,
  public.lineups,
  public.sound_worlds,
  public.moods,
  public.repertoire_styles,
  public.services,
  -- Junction-Tabellen Phase 1
  public.band_event_types,
  public.band_band_types,
  -- Junction-Tabellen Phase 2
  public.band_lineups,
  public.band_sound_worlds,
  public.band_moods,
  public.band_repertoire_styles,
  public.band_services,
  public.band_relations,
  -- Medien & Social
  public.media_assets,
  public.videos,
  public.social_profiles,
  public.reference_events
TO service_role;

-- Admin-Panel: band_contacts braucht service_role-Zugriff für /admin/bands/[id].
-- Enthält E-Mail und Telefon – kein öffentlicher Zugriff, anon bleibt ausgeschlossen.
-- Bewusst kein DELETE: Kontakte werden im Admin-MVP nicht gelöscht.
GRANT SELECT, INSERT, UPDATE ON TABLE public.band_contacts TO service_role;

-- Sequences für gen_random_uuid() bei INSERT ohne explizite id
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;


-- ── 2. anon: nur SELECT, nur Frontend-relevante Tabellen ─────────────────────
-- Gilt für alle öffentlichen Supabase-Client-Aufrufe aus Next.js
-- (NEXT_PUBLIC_SUPABASE_ANON_KEY).
--
-- Grundlage: lib/supabase/queries.ts
--   getBandFromSupabase()    → alle 22 Tabellen unten
--   getAllBandsFromSupabase() → bands, band_profiles, locations, media_assets,
--                              band_event_types+event_types, band_band_types+band_types
--
-- Explizit NICHT enthalten:
--   band_contacts  → E-Mail/Telefon der Bands, kein öffentlicher Zugriff (service_role: separat geregelt)
--   plz_reference  → rohe PLZ-Infrastruktur, nicht in Frontend-Queries
--
-- anon erhält AUSSCHLIESSLICH SELECT – keine Schreibrechte.

GRANT SELECT ON TABLE
  -- Band-Kern (getBandFromSupabase + getAllBandsFromSupabase)
  public.bands,
  public.band_profiles,
  -- Geografie (bands.home_location_id FK-Join)
  public.locations,
  -- Medien
  public.media_assets,
  public.videos,
  -- Social
  public.social_profiles,
  public.reference_events,
  -- Event-Typ-Relation (Filter, CTA-Buttons)
  public.band_event_types,
  public.event_types,
  -- Bandart-Relation (Kategorie-Tag)
  public.band_band_types,
  public.band_types,
  -- Klang & Charakter (klingtNach-Tags)
  public.band_sound_worlds,
  public.sound_worlds,
  public.band_moods,
  public.moods,
  -- Musikalisch verortet
  public.band_repertoire_styles,
  public.repertoire_styles,
  -- Besetzung (im Query enthalten, auch wenn aktuell noch leer)
  public.band_lineups,
  public.lineups,
  -- Services (im Query enthalten, auch wenn aktuell noch leer)
  public.band_services,
  public.services,
  -- Ähnliche Bands (band_relations → target_band)
  public.band_relations
TO anon;


-- ── Verifikation nach Ausführung ─────────────────────────────────────────────
--
-- Alle Grants für anon und service_role prüfen:
-- SELECT grantee, table_name, privilege_type
-- FROM   information_schema.role_table_grants
-- WHERE  table_schema = 'public'
--   AND  grantee IN ('service_role', 'anon')
-- ORDER BY grantee, table_name, privilege_type;
--
-- Sicherheitscheck: anon hat keine Schreibrechte?
-- SELECT grantee, table_name, privilege_type
-- FROM   information_schema.role_table_grants
-- WHERE  table_schema = 'public'
--   AND  grantee = 'anon'
--   AND  privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');
-- Erwartung: 0 Zeilen
