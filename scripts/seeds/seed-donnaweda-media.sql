-- Donnaweda Media Seed – Supabase Storage Mini-Pilot
--
-- Ausführen im Supabase SQL-Editor
-- Voraussetzung: Upload-Script wurde erfolgreich ausgeführt und Public-URLs sind im Browser abrufbar.
--
-- Idempotent: löscht ALLE bestehenden Donnaweda-Einträge (webflow-Stubs sind HTTP 403 / nicht ladbar),
-- dann 6 supabase_storage-Einträge neu anlegen. Nur band_id von donnaweda betroffen.

DO $$
DECLARE
  v_band_id uuid;
  base_url  text := 'https://bfyucjjyarvqeftqqihm.supabase.co/storage/v1/object/public/band-media';
BEGIN
  SELECT id INTO v_band_id FROM bands WHERE slug = 'donnaweda';

  IF v_band_id IS NULL THEN
    RAISE EXCEPTION 'Band mit slug "donnaweda" nicht gefunden – bitte Slug prüfen.';
  END IF;

  -- ALLE bestehenden Donnaweda-Einträge löschen
  -- (vorhandene webflow-Einträge sind Stub-URLs / HTTP 403)
  -- Nur band_id von donnaweda betroffen – keine anderen Bands.
  DELETE FROM media_assets
  WHERE band_id = v_band_id;

  INSERT INTO media_assets (band_id, url, role, alt_text, source_provider, sort_order)
  VALUES
    (v_band_id, base_url || '/donnaweda/logo.webp',       'logo',      'Donnaweda Logo',               'supabase_storage', 0),
    (v_band_id, base_url || '/donnaweda/hero.webp',        'hero',      'Donnaweda live auf der Bühne', 'supabase_storage', 0),
    (v_band_id, base_url || '/donnaweda/thumbnail.webp',   'thumbnail', 'Donnaweda Bandfoto',           'supabase_storage', 0),
    (v_band_id, base_url || '/donnaweda/gallery-01.webp',  'gallery',   'Donnaweda Bandfoto',           'supabase_storage', 1),
    (v_band_id, base_url || '/donnaweda/gallery-02.webp',  'gallery',   'Donnaweda live',               'supabase_storage', 2),
    (v_band_id, base_url || '/donnaweda/gallery-03.webp',  'gallery',   'Donnaweda auf der Bühne',      'supabase_storage', 3);

  RAISE NOTICE 'Donnaweda: 6 media_assets angelegt (logo, hero, thumbnail, 3x gallery)';
END $$;

-- Kontrollabfrage (separat ausführen):
-- SELECT role, source_provider, sort_order, url, alt_text
-- FROM media_assets
-- WHERE band_id = (SELECT id FROM bands WHERE slug = 'donnaweda')
-- ORDER BY
--   CASE role WHEN 'logo' THEN 1 WHEN 'hero' THEN 2 WHEN 'thumbnail' THEN 3 WHEN 'gallery' THEN 4 ELSE 5 END,
--   sort_order;
