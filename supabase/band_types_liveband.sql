-- Neue Bandart "Liveband" (band_types). Idempotent, gleiches Muster wie
-- band_types_metalband.sql. sort_order 2 = gleicher Wert wie "Partyband";
-- das Admin-Formular sortiert danach nach Name, "Liveband" steht dadurch
-- direkt ueber "Partyband". Keine Umsortierung bestehender Eintraege.
-- Admin-Formular (Primaer-Dropdown, Sekundaer-Checkboxen) und oeffentliche
-- Abfragen lesen band_types dynamisch -- kein Codeeintrag noetig.
-- Keine Band wird umgestellt (LPC stellt Xandi selbst im Admin um).
-- Keine neue Tabelle -> keine grant-Aenderungen noetig.

INSERT INTO public.band_types (name, slug, status, sort_order)
VALUES ('Liveband', 'liveband', 'active', 2)
ON CONFLICT (slug) DO NOTHING;

-- Verifikation
SELECT name, slug, status, sort_order FROM public.band_types WHERE slug = 'liveband';
