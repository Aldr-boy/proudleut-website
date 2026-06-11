-- ============================================================
-- proudleut.com — WeddingInfo-Spalten auf band_profiles
-- Stand: 2026-06-11
-- ============================================================
-- Additive, idempotente Migration (ADD COLUMN IF NOT EXISTS).
-- Im Supabase Studio SQL-Editor ausführen.
--
-- Kontext:
--   Diese Spalten bilden bestehende Airtable-WeddingInfo-Felder ab:
--     Info - So feiern wir Hochzeit  → wedding_description
--     Info - Mögliche Spieldauer     → wedding_possible_playtimes
--     Info - Brautentführung         → wedding_kidnapping_bride
--     Info - Moderation              → wedding_moderation
--     Info - Konstellation           → wedding_constellation
--     Info - Gagenniveau             → wedding_fee_range
--
--   Info - Bandgröße wird bewusst NICHT als neue Spalte angelegt.
--   Alle 112 Bestandswerte sind rein numerisch (ganze Zahlen).
--   Migration erfolgt später nach bands.default_member_count,
--   nur wo diese Spalte noch leer ist.
--
--   Alle Spalten sind nullable, weil Bestandsdaten unvollständig sind
--   (Befüllungsgrade: 66–94 % je Feld).
--
-- Hinweise zu einzelnen Feldern:
--   wedding_description
--     Tagline-Charakter — keine Fließtexte.
--     Bestandsdaten: max ~46 Zeichen, Durchschnitt 35 Zeichen.
--     Die Admin-UI sollte ein einzeiliges Textfeld verwenden (kein Textarea).
--
--   wedding_fee_range
--     Faktisch 5 Kategorien:
--       "Gage unter 2.000€" / "Gage unter 3.000€" / "Gage über 3.000€" /
--       "Gage über 4.000€" / "Auf Anfrage"
--     Schreibvarianten (Leerzeichen vor €, Groß-/Kleinschreibung) werden
--     beim Datenmigrations-Script normalisiert.
--     Aktuell kein Frontend-Render-Pfad — bewusst migriert, um 94 strukturierte
--     Bestandswerte zu retten.
--
--   wedding_constellation
--     Überwiegend Besetzungsoptionen-Beschreibung, nicht fix/variabel-Boolean.
--     Beispielwerte: "Duo | Trio | Quartett", "Full Band (7 Musiker)", ...
--     Kann nicht auf bands.lineup_flexibility gemappt werden.
--
-- Keine neuen Grants nötig — band_profiles hat bereits:
--   service_role: SELECT, INSERT, UPDATE, DELETE
--   anon:         SELECT
--
-- Kein neuer Trigger nötig — band_profiles hat bereits
--   den updated_at-Trigger (trg_band_profiles_updated_at).
-- ============================================================

ALTER TABLE public.band_profiles
  ADD COLUMN IF NOT EXISTS wedding_description        text,
  ADD COLUMN IF NOT EXISTS wedding_possible_playtimes text,
  ADD COLUMN IF NOT EXISTS wedding_kidnapping_bride   boolean,
  ADD COLUMN IF NOT EXISTS wedding_moderation         boolean,
  ADD COLUMN IF NOT EXISTS wedding_constellation      text,
  ADD COLUMN IF NOT EXISTS wedding_fee_range          text;
