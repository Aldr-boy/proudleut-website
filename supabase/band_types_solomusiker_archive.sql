-- AUFRAEUM-DATEI -- erst ausfuehren, wenn Besetzungsart und Filter live
-- geprueft sind (siehe bands_lineup_type.sql).
--
-- Setzt die Bandart "Solomusiker" auf 'archived'. Dadurch erscheint sie im
-- Admin nicht mehr als waehlbare Bandart. Bestehende Zuordnungen an den
-- Profilen (band_band_types) und die Bandart selbst werden nicht geloescht
-- oder veraendert.
--
-- ACHTUNG (Parkpunkt): Admin-Auswahl und oeffentliche Seite haengen am
-- selben Schalter (band_types.status = 'active', auch die oeffentliche
-- Leseregel). Nach dem Ausfuehren sieht die oeffentliche Seite "Solomusiker"
-- ebenfalls nicht mehr, d. h. der Einzeleintrag "Solomusiker" im Bandtyp-
-- Filter faellt weg. Der Sammelfilter und die Solo-Texte laufen ueber die
-- Besetzungsart und sind nicht betroffen. Rueckgaengig: Status wieder auf
-- 'active' setzen (unterer Befehl).

UPDATE public.band_types
SET status = 'archived'
WHERE slug = 'solomusiker';

-- Rueckgaengig machen:
-- UPDATE public.band_types SET status = 'active' WHERE slug = 'solomusiker';

-- Verifikation
SELECT name, slug, status FROM public.band_types WHERE slug = 'solomusiker';
