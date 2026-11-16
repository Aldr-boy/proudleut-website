-- Neue Location "Mils" (PLZ 6068, Tirol, Österreich) und Zuordnung als
-- Home-Location für Stix'n Stones (Slug stixn-stones). Idempotent.
-- Aufbau wie die bestehenden österreichischen Locations (Mödling, Pasching,
-- Wartberg ob der Aist): landkreis/regierungsbezirk leer, plz_prefix2/3 gesetzt.
-- Koordinaten: PLZ-Lookup public/data/plz-coords.json (6068), vom Auftraggeber bestätigt.
-- Keine neue Tabelle -> keine grant-Änderungen nötig.

BEGIN;

INSERT INTO public.locations
  (plz, city_name, bundesland, country, country_code, latitude, longitude, plz_prefix2, plz_prefix3)
VALUES
  ('6068', 'Mils', 'Tirol', 'Österreich', 'at', 47.2936, 11.5293, '60', '606')
ON CONFLICT (country_code, plz) DO NOTHING;

UPDATE public.bands
SET home_location_id = (
  SELECT id FROM public.locations WHERE country_code = 'at' AND plz = '6068'
)
WHERE slug = 'stixn-stones'
  AND home_location_id IS NULL;

COMMIT;

-- Verifikation
SELECT l.id, l.plz, l.city_name, l.bundesland, l.country, l.country_code, l.latitude, l.longitude
FROM public.locations l
WHERE l.plz = '6068' OR l.city_name ILIKE '%mils%';

SELECT b.slug, b.home_location_id, l.city_name, l.plz
FROM public.bands b
LEFT JOIN public.locations l ON l.id = b.home_location_id
WHERE b.slug = 'stixn-stones';
