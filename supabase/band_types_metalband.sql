-- Neue Bandart "Metalband" (band_types). Idempotent, gleiches Muster wie
-- setup-grants-and-seed.sql (Abschnitt F). sort_order 19: ans Ende der
-- bestehenden Reihenfolge (hoechster bisheriger Wert 18), keine Umsortierung.
-- Admin-Formular (Primaer-Dropdown, Sekundaer-Checkboxen) und oeffentliche
-- Abfragen lesen band_types dynamisch -- kein Codeeintrag noetig.

INSERT INTO public.band_types (name, slug, status, sort_order)
VALUES ('Metalband', 'metalband', 'active', 19)
ON CONFLICT (slug) DO NOTHING;

-- Verifikation
SELECT name, slug, status, sort_order FROM public.band_types WHERE slug = 'metalband';
