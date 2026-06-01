-- ============================================================
-- seed-missing-lookups-for-band-migration.sql
-- Stand: 2026-06-01
-- ============================================================
-- Zweck:
--   1. Quertreiber-Slug korrigieren (quertreiber → d-quertreiber)
--   2. Fehlende event_types ergänzen (21 Werte)
--   3. Fehlende band_types ergänzen (4 Werte)
--
-- Idempotent: ON CONFLICT (slug) DO NOTHING
-- Keine bestehenden Werte werden überschrieben.
-- Kann sicher mehrfach ausgeführt werden.
--
-- Nicht migriert (bewusste Entscheidung):
--   - Nischen-event_types mit ≤ 4 Bands (Apreski-Party, Vernissage, etc.)
--   - Tippfehler "Fernsehaufttritte" – erst bereinigen, dann anlegen
--   - "Konzert" als band_type – semantisch missverständlich
--   - band_types mit 1–2 Bands (Bigband, Metal Band, etc.)
-- ============================================================

-- ── 1. Quertreiber Slug-Fix ───────────────────────────────────────────────────

UPDATE bands
SET    slug       = 'd-quertreiber',
       updated_at = now()
WHERE  slug = 'quertreiber';

-- ── 2. event_types ergänzen ──────────────────────────────────────────────────
-- Nur klare, häufige Werte (≥ 5 Bands). Idempotent via ON CONFLICT DO NOTHING.

INSERT INTO event_types (name, slug, status, sort_order) VALUES
  ('Stadt- und Bürgerfest',  'stadt-und-buergerfest',  'active', 0),
  ('Geburtstagsfeier',       'geburtstagsfeier',        'active', 0),
  ('Festival',               'festival',                'active', 0),
  ('private Feiern',         'private-feiern',          'active', 0),
  ('Open Air',               'open-air',                'active', 0),
  ('Jubiläum',               'jubilaeum',               'active', 0),
  ('Abschlussfeier',         'abschlussfeier',          'active', 0),
  ('Ball',                   'ball',                    'active', 0),
  ('Weihnachtsfeier',        'weihnachtsfeier',         'active', 0),
  ('Bierfest',               'bierfest',                'active', 0),
  ('Brauereifest',           'brauereifest',            'active', 0),
  ('Biergarten',             'biergarten',              'active', 0),
  ('exklusive Privatfeiern', 'exklusive-privatfeiern',  'active', 0),
  ('Konzert',                'konzert',                 'active', 0),
  ('Kultur',                 'kultur',                  'active', 0),
  ('Empfang',                'empfang',                 'active', 0),
  ('Tanzveranstaltung',      'tanzveranstaltung',       'active', 0),
  ('Wirtshausmusi',          'wirtshausmusi',           'active', 0),
  ('Bankett',                'bankett',                 'active', 0),
  ('Taufe',                  'taufe',                   'active', 0),
  ('Frühschoppen',           'fruehschoppen',           'active', 0)
ON CONFLICT (slug) DO NOTHING;

-- ── 3. band_types ergänzen ───────────────────────────────────────────────────
-- Nur Werte mit ≥ 4 Bands und klarer Kategoriensemantik.
-- "Blasmusik | Wirtshausmusik" → Slug ohne Pipe-Zeichen: blasmusik-wirtshausmusik
-- "Hochzeitssänger*in" → Slug ohne Sonderzeichen: hochzeitssaengerin
-- "Kinder- & Jugendband" → Slug ohne & : kinder-und-jugendband
-- "Konzert" bewusst NICHT als band_type (missverständlich, ist auch event_type)

INSERT INTO band_types (name, slug, status, sort_order) VALUES
  ('Blasmusik / Wirtshausmusik', 'blasmusik-wirtshausmusik', 'active', 0),
  ('Hochzeitssänger*in',         'hochzeitssaengerin',       'active', 0),
  ('Akustikband',                'akustikband',              'active', 0),
  ('Kinder- & Jugendband',       'kinder-und-jugendband',    'active', 0)
ON CONFLICT (slug) DO NOTHING;

-- ── Verifikations-Queries ────────────────────────────────────────────────────
-- Nach Ausführung prüfen:
--
-- SELECT name, slug, status FROM bands
--   WHERE name ILIKE '%quertreiber%' OR slug IN ('quertreiber', 'd-quertreiber');
--
-- SELECT name, slug, status FROM event_types ORDER BY sort_order, name;
--
-- SELECT name, slug, status FROM band_types ORDER BY sort_order, name;
