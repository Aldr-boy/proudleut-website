-- Neue Bandart "Solomusiker" (band_types). Idempotent, gleiches Muster wie
-- band_types_metalband.sql. sort_order 20: ans Ende der bestehenden
-- Reihenfolge (Metalband = 19), keine Umsortierung.
-- Admin-Formular (Sekundaer-Checkboxen) liest band_types dynamisch.
-- Wird nur als sekundaere Bandart genutzt (Solo-Act-Texte auf Profilseiten).

INSERT INTO public.band_types (name, slug, status, sort_order)
VALUES ('Solomusiker', 'solomusiker', 'active', 20)
ON CONFLICT (slug) DO NOTHING;

-- Verifikation
SELECT name, slug, status, sort_order FROM public.band_types WHERE slug = 'solomusiker';
