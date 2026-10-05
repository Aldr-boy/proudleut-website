-- "Wie nennt mich der Kontakt?" (z. B. Alexander, Alex, Xandi): ein optionales
-- Textfeld pro Kontakt, nur intern (band_contacts ist fuer anon gesperrt).
-- Rein additiv: eine neue Spalte, bei allen vorhandenen Kontakten NULL (leer).
-- Keine Aenderung an Funktionen, Rechten oder bestehenden Spalten. Idempotent.
ALTER TABLE public.band_contacts
  ADD COLUMN IF NOT EXISTS calls_me_as text CHECK (char_length(calls_me_as) <= 100);

COMMENT ON COLUMN public.band_contacts.calls_me_as IS 'Wie nennt mich der Kontakt? (nur intern, fuer die Schlussformel in Mails)';

-- Verifikation: 1 Zeile erwartet, danach 0 Kontakte mit Wert
SELECT column_name, data_type, is_nullable FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'band_contacts' AND column_name = 'calls_me_as';
SELECT count(*) AS kontakte_mit_wert FROM public.band_contacts WHERE calls_me_as IS NOT NULL;
