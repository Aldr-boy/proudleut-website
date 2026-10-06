-- Neues Feld "Besetzungsart" (bands.lineup_type). Wiederholbar: kann beliebig
-- oft ausgefuehrt werden, bereits gesetzte Besetzungsarten werden nie
-- ueberschrieben (beide UPDATEs greifen nur bei lineup_type IS NULL).
-- Kein fester Standardwert: leer ist erlaubt und wird im Code wie "band"
-- behandelt. Werte: solomusiker, duo, trio, quartett, band, bigband.

-- a) Feld anlegen, falls es fehlt
ALTER TABLE public.bands
  ADD COLUMN IF NOT EXISTS lineup_type text
  CHECK (lineup_type IN ('solomusiker', 'duo', 'trio', 'quartett', 'band', 'bigband'));

-- b) Profile mit der sekundaeren Bandart "Solomusiker": Besetzungsart
--    "solomusiker", aber nur wo noch leer
UPDATE public.bands b
SET lineup_type = 'solomusiker'
WHERE b.lineup_type IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.band_band_types bbt
    JOIN public.band_types bt ON bt.id = bbt.band_type_id
    WHERE bbt.band_id = b.id
      AND bt.slug = 'solomusiker'
  );

-- c) Alle uebrigen Profile mit leerer Besetzungsart: "band"
UPDATE public.bands
SET lineup_type = 'band'
WHERE lineup_type IS NULL;

-- Verifikation
SELECT lineup_type, count(*) FROM public.bands GROUP BY lineup_type ORDER BY lineup_type;
