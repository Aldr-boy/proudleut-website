-- LPC (Slug lpc-music): Profiltexte ueberarbeiten. Idempotent.
--   1. Ein einziger Slogan: "Ihr habt die Feier – wir den passenden Sound"
--      (short_description). Die drei alten Slogans entfallen: "Let the evening
--      begin" (short_description) sowie die beiden fett gesetzten Zeilen im
--      Eingangstext (main_text).
--   2. Eingangstext: "chillige Loungemusik" ergaenzt; "Walking Act" bleibt
--      als Einsatzform im Text stehen. "Ueber 700 Hochzeiten" bleibt.
--   3. Referenzen: eine Zeile "Spielte unter anderem fuer: ..." (nur Namen als
--      Text, vom Auftraggeber/der Band freigegeben). Erscheint im Profil unter
--      "Hier haben wir gespielt".
-- meta_description enthaelt bereits "Liveband" (kein "Partyband") -> unveraendert.
-- Der Seitentitel "LPC – Liveband – proudleut.com" kommt aus dem Code
-- (lib/bands/publicProfileOverrides.ts), nicht aus dieser Datei.
-- Keine neue Tabelle -> keine grant-Aenderungen noetig.

BEGIN;

UPDATE public.band_profiles
SET short_description = 'Ihr habt die Feier – wir den passenden Sound',
    main_text = E'Fünf Musiker, erstklassige Livemusik und das Gespür für den richtigen Moment: von chilliger Loungemusik und stilvoller Begleitung bis zur ausgelassenen Party.\r\nÜber 700 Hochzeiten haben wir musikalisch begleitet – und spielen ebenso auf Firmenfeiern und Galas, vom Walking Act im unplugged Stil bis zur großen Bühne.'
WHERE band_id = (SELECT id FROM public.bands WHERE slug = 'lpc-music');

INSERT INTO public.reference_events (band_id, event_name, sort_order)
SELECT b.id,
       'Spielte unter anderem für: BMW, Mercedes-Benz, AIDA, WMF, DAB Bank, Festspielhaus Neuschwanstein, Der Ball der Tiroler Wirtschaft',
       0
FROM public.bands b
WHERE b.slug = 'lpc-music'
  AND NOT EXISTS (
    SELECT 1 FROM public.reference_events re
    WHERE re.band_id = b.id AND re.event_name LIKE 'Spielte unter anderem für:%'
  );

COMMIT;

-- Verifikation
SELECT bp.short_description, bp.main_text
FROM public.band_profiles bp
JOIN public.bands b ON b.id = bp.band_id
WHERE b.slug = 'lpc-music';

SELECT re.event_name, re.sort_order
FROM public.reference_events re
JOIN public.bands b ON b.id = re.band_id
WHERE b.slug = 'lpc-music';
