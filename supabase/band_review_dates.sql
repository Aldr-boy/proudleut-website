-- Aktualitaetspruefung der Bands: zwei optionale Datumsfelder auf public.bands.
-- Rein additiv: keine bestehende Spalte/Zeile wird veraendert, beide Felder
-- sind bei allen vorhandenen Bands NULL (leer). Idempotent (IF NOT EXISTS).
ALTER TABLE public.bands
  ADD COLUMN IF NOT EXISTS review_requested_at date,
  ADD COLUMN IF NOT EXISTS review_confirmed_at date;

COMMENT ON COLUMN public.bands.review_requested_at IS 'Zuletzt zur Profilpruefung angefragt am (nur Admin, nicht oeffentlich)';
COMMENT ON COLUMN public.bands.review_confirmed_at IS 'Aktualitaet zuletzt bestaetigt am (nur Admin, nicht oeffentlich)';

-- Verifikation: 2 Zeilen erwartet, danach 0 Bands mit gesetztem Datum
SELECT column_name, data_type, is_nullable FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'bands' AND column_name LIKE 'review_%';
SELECT count(*) AS bands_mit_datum FROM public.bands
WHERE review_requested_at IS NOT NULL OR review_confirmed_at IS NOT NULL;
