-- ============================================================
-- people_instrument_seed_v1.sql
--
-- Paket 3 -- Minimaler Admin Musiker V1.
--
-- Idempotenter V1-Instrument-Seed fuer den in
-- supabase/people_data_foundation_v1.sql angelegten, bisher leeren
-- Katalog public.instruments. Exakt drei Eintraege, keine weiteren:
--   Bass, Tuba, Posaune.
--
-- Kann gefahrlos beliebig oft ausgefuehrt werden -- ON CONFLICT (slug)
-- aktualisiert lediglich name/status, sort_order bleibt bei einem
-- erneuten Lauf unangetastet (falls redaktionell bereits manuell
-- umsortiert), es entstehen nie Duplikate.
--
-- Rollout-Umfang dieser Datei in Paket 3: AUSSCHLIESSLICH TEST
-- (jqzqpizykymjdjumwdoj). Production (bfyucjjyarvqeftqqihm) bleibt
-- unveraendert -- der Production-Rollout dieses Seeds ist ein eigenes,
-- spaeteres Paket.
-- ============================================================

insert into public.instruments (name, slug, status, sort_order)
values
  ('Bass', 'bass', 'active', 10),
  ('Tuba', 'tuba', 'active', 20),
  ('Posaune', 'posaune', 'active', 30)
on conflict (slug) do update set
  name = excluded.name,
  status = 'active';
