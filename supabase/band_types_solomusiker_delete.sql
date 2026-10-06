-- ENDGUELTIGES AUFRAEUMEN -- erst nach band_types_solomusiker_archive.sql und
-- nachdem alle Solo-Profile live geprueft sind.
--
-- Loescht die Zuordnungen der Bandart "Solomusiker" an den Profilen und danach
-- die Bandart selbst. Vorher prueft die Datei, ob JEDES Profil mit dieser
-- Zuordnung die Besetzungsart "solomusiker" hat. Weicht auch nur ein Profil
-- ab, bricht alles mit einer Meldung ab (mit den betroffenen Profilen) und es
-- wird nichts geloescht. Alles laeuft in einer einzigen Transaktion.

BEGIN;

DO $$
DECLARE
  abweichend text;
BEGIN
  SELECT string_agg(b.name || ' (' || b.slug || ', Besetzungsart: '
                    || coalesce(b.lineup_type, 'leer') || ')', '; ' ORDER BY b.name)
    INTO abweichend
  FROM public.band_band_types bbt
  JOIN public.band_types bt ON bt.id = bbt.band_type_id
  JOIN public.bands b ON b.id = bbt.band_id
  WHERE bt.slug = 'solomusiker'
    AND b.lineup_type IS DISTINCT FROM 'solomusiker';

  IF abweichend IS NOT NULL THEN
    RAISE EXCEPTION 'Abbruch, nichts geloescht. Diese Profile haben die Bandart "Solomusiker", aber nicht die Besetzungsart "Solomusiker": %', abweichend;
  END IF;
END $$;

DELETE FROM public.band_band_types
WHERE band_type_id IN (SELECT id FROM public.band_types WHERE slug = 'solomusiker');

DELETE FROM public.band_types
WHERE slug = 'solomusiker';

COMMIT;

-- Verifikation (jeweils 0 Zeilen)
SELECT * FROM public.band_types WHERE slug = 'solomusiker';
