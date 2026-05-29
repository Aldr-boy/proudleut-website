-- ============================================================
-- proudleut.com — Schema-Ergänzung
-- Neue Dimension: Repertoire-Stil / Musikalische Einordnung
-- Ergänzt: repertoire_styles + band_repertoire_styles
-- ============================================================
-- NICHT AUSFÜHREN über die App — direkt in Supabase Studio ausführen
-- ============================================================


-- ============================================================
-- LOOKUP-TABELLE: repertoire_styles
-- Pattern-Vorlage: sound_worlds
-- ============================================================

CREATE TABLE repertoire_styles (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL CHECK (char_length(name) <= 100),
  slug        text        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  description text,
  status      text        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'draft', 'archived')),
  sort_order  integer     NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- VERBINDUNGSTABELLE: band_repertoire_styles
-- Pattern-Vorlage: band_sound_worlds, band_moods
-- Kein updated_at (analog zu allen einfachen Join-Tabellen)
-- ============================================================

CREATE TABLE band_repertoire_styles (
  band_id               uuid        NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  repertoire_style_id   uuid        NOT NULL REFERENCES repertoire_styles(id) ON DELETE CASCADE,
  sort_order            integer     NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (band_id, repertoire_style_id)
);


-- ============================================================
-- TRIGGER: updated_at für repertoire_styles
-- Funktion set_updated_at() ist bereits in proudleut-schema.sql definiert
-- ============================================================

CREATE TRIGGER trg_repertoire_styles_updated_at
  BEFORE UPDATE ON repertoire_styles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- SEED-DATEN: Donnaweda — Repertoire-Stil
-- Idempotent — kann mehrfach ausgeführt werden
-- ============================================================

INSERT INTO repertoire_styles (name, slug, sort_order) VALUES
  ('Volksmusik bis Charts',    'volksmusik-bis-charts',    1),
  ('Gabalier bis Fliegerlied', 'gabalier-bis-fliegerlied', 2),
  ('Walzer bis aktuelle Hits', 'walzer-bis-aktuelle-hits', 3)
ON CONFLICT (slug) DO UPDATE
SET
  name       = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order;

INSERT INTO band_repertoire_styles (band_id, repertoire_style_id, sort_order)
SELECT b.id, rs.id, rs.sort_order
FROM bands b
CROSS JOIN repertoire_styles rs
WHERE b.slug = 'donnaweda'
  AND rs.slug IN (
    'volksmusik-bis-charts',
    'gabalier-bis-fliegerlied',
    'walzer-bis-aktuelle-hits'
  )
ON CONFLICT (band_id, repertoire_style_id) DO UPDATE
SET sort_order = EXCLUDED.sort_order;
