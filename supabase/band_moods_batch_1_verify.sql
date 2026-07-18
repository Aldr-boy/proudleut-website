-- ============================================================
-- band_moods_batch_1_verify.sql
--
-- Eigenstaendige Read-only-Verifikation zu Batch 1 des "Klingt nach"-
-- Rollouts (supabase/band_moods_batch_1_import.sql). SEPARAT im
-- Supabase SQL Editor auszufuehren -- nicht Teil der Migration.
-- Vollstaendig read-only, beliebig oft wiederholbar, keine Temp-
-- Table-Abhaengigkeit.
-- ============================================================

-- ============================================================
-- AUSFUEHRUNGS- UND VERIFIKATIONSVERMERK
--
-- Ausgefuehrt: 19.07.2026, durch Xandi im Supabase SQL Editor gegen
-- Production, nach dem Import (supabase/band_moods_batch_1_import.sql).
--
-- Der erste Import-Versuch war fehlgeschlagen ("ERROR: 42883:
-- operator does not exist: integer[] <> bigint[]" in einem Guard der
-- Migration, Details siehe Vermerk in band_moods_batch_1_import.sql)
-- und hatte nichts persistiert. Nach der minimalen Korrektur
-- (n::int) lief der zweite Import-Versuch erfolgreich durch
-- ("Success. No rows returned"). Dieses Verify wurde danach separat
-- ausgefuehrt.
--
-- Ergebnis: 19 Zeilen, alle match = true. 14 von 14 Batch-Bands
-- exakt passend (32 tatsaechliche Zuordnungen). Donnaweda und
-- Bigband STEINBACH unveraendert. bands_with_band_moods_total = 16.
-- Steuerungszahl = 15 von 141.
-- ============================================================

with expected (band_name, band_id, mood_slug, sort_order) as (
  values
    ('Quertreiber', 'ba000002-0000-0000-0000-000000000001'::uuid, 'festzeltenergie', 1),
    ('Quertreiber', 'ba000002-0000-0000-0000-000000000001'::uuid, 'bayerisch-frech', 2),
    ('Quertreiber', 'ba000002-0000-0000-0000-000000000001'::uuid, 'rockig-mitreissend', 3),
    ('Quertreiber', 'ba000002-0000-0000-0000-000000000001'::uuid, 'generationenverbindend', 4),
    ('Bärntreiber', '6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid, 'festzeltenergie', 1),
    ('Bärntreiber', '6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid, 'party-pur', 2),
    ('2 unplugged', 'f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid, 'lagerfeuer-atmosphaere', 1),
    ('2 unplugged', 'f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid, 'mitsing-faktor', 2),
    ('9to5', '098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid, 'konzertant-hochwertig', 1),
    ('9to5', '098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid, 'generationenverbindend', 2),
    ('Claudia Dechand', '712f40db-723f-4fea-a204-13f68f62b819'::uuid, 'emotional-beruehrend', 1),
    ('Claudia Dechand', '712f40db-723f-4fea-a204-13f68f62b819'::uuid, 'herzlich-nahbar', 2),
    ('Countryholics', 'd7bf4672-364f-4807-a80c-8f2031d69093'::uuid, 'authentisch-handgemacht', 1),
    ('Almdoodler', '17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'bayerisch-frech', 1),
    ('Almdoodler', '17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'festlich-ausgelassen', 2),
    ('Almdoodler', '17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'rockig-mitreissend', 3),
    ('Bröslschmarrn', 'aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid, 'authentisch-handgemacht', 1),
    ('Bröslschmarrn', 'aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid, 'herzlich-nahbar', 2),
    ('BigBeat', '180c5296-8440-4540-a8f8-60ee16333259'::uuid, 'tanzflaechen-garantie', 1),
    ('BigBeat', '180c5296-8440-4540-a8f8-60ee16333259'::uuid, 'generationenverbindend', 2),
    ('Coverage', 'b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'tanzflaechen-garantie', 1),
    ('Coverage', 'b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'rockig-mitreissend', 2),
    ('Coverage', 'b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'mitsing-faktor', 3),
    ('Deep Decision', 'e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid, 'emotional-beruehrend', 1),
    ('Deep Decision', 'e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid, 'herzlich-nahbar', 2),
    ('Hot Sugar', 'a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'festzeltenergie', 1),
    ('Hot Sugar', 'a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'rockig-mitreissend', 2),
    ('Hot Sugar', 'a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'generationenverbindend', 3),
    ('Psyco Dad', '3365db14-dbcd-41a5-8801-ca535a80c3a3'::uuid, 'rockig-mitreissend', 1),
    ('Lichtfänger', '2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'tanzflaechen-garantie', 1),
    ('Lichtfänger', '2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'generationenverbindend', 2),
    ('Lichtfänger', '2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'rockig-mitreissend', 3)
),
expected_agg as (
  select band_name, band_id,
         array_agg(mood_slug order by sort_order, mood_slug) as expected_slugs,
         count(*) as expected_count
  from expected
  group by band_name, band_id
),
actual_agg as (
  select bm.band_id,
         array_agg(m.slug order by bm.sort_order, m.slug) as actual_slugs,
         count(*) as actual_count
  from public.band_moods bm
  join public.moods m on m.id = bm.mood_id
  where bm.band_id in (select distinct band_id from expected)
  group by bm.band_id
),
band_rows as (
  select
    'batch_band'::text as report_section,
    e.band_name as key,
    array_to_string(e.expected_slugs, ',') || ' (n=' || e.expected_count || ')' as expected,
    coalesce(array_to_string(a.actual_slugs, ','), '(keine Zeilen)') || ' (n=' || coalesce(a.actual_count, 0) || ')' as actual,
    coalesce(a.actual_slugs = e.expected_slugs and a.actual_count = e.expected_count, false) as match
  from expected_agg e
  left join actual_agg a on a.band_id = e.band_id
),
existing_expected (band_name, band_id, mood_slug, sort_order) as (
  values
    ('Donnaweda', 'ba000001-0000-0000-0000-000000000001'::uuid, 'festzeltenergie', 1),
    ('Donnaweda', 'ba000001-0000-0000-0000-000000000001'::uuid, 'bayerisch-frech', 2),
    ('Donnaweda', 'ba000001-0000-0000-0000-000000000001'::uuid, 'mitsing-faktor', 3),
    ('Bigband STEINBACH', '236d642f-7b8d-48c0-a7cf-6e81fbac869b'::uuid, 'tanzflaechen-garantie', 0),
    ('Bigband STEINBACH', '236d642f-7b8d-48c0-a7cf-6e81fbac869b'::uuid, 'konzertant-hochwertig', 0),
    ('Bigband STEINBACH', '236d642f-7b8d-48c0-a7cf-6e81fbac869b'::uuid, 'festlich-ausgelassen', 0),
    ('Bigband STEINBACH', '236d642f-7b8d-48c0-a7cf-6e81fbac869b'::uuid, 'brass-power', 0)
),
existing_expected_agg as (
  select band_name, band_id,
         array_agg(mood_slug order by sort_order, mood_slug) as expected_slugs,
         count(*) as expected_count
  from existing_expected
  group by band_name, band_id
),
existing_actual_agg as (
  select bm.band_id,
         array_agg(m.slug order by bm.sort_order, m.slug) as actual_slugs,
         count(*) as actual_count
  from public.band_moods bm
  join public.moods m on m.id = bm.mood_id
  where bm.band_id in (select distinct band_id from existing_expected)
  group by bm.band_id
),
existing_rows as (
  select
    'existing_unchanged'::text as report_section,
    e.band_name as key,
    array_to_string(e.expected_slugs, ',') || ' (n=' || e.expected_count || ')' as expected,
    coalesce(array_to_string(a.actual_slugs, ','), '(keine Zeilen)') || ' (n=' || coalesce(a.actual_count, 0) || ')' as actual,
    coalesce(a.actual_slugs = e.expected_slugs and a.actual_count = e.expected_count, false) as match
  from existing_expected_agg e
  left join existing_actual_agg a on a.band_id = e.band_id
),
summary_row as (
  select
    'batch_summary'::text as report_section,
    'summary'::text as key,
    '14 Baender, 32 Zeilen, alle exakt match' as expected,
    (select count(*) from band_rows where match)::text || ' von 14 Baendern exakt match, ' ||
      (select coalesce(sum(actual_count), 0) from actual_agg)::text || ' tatsaechliche Zeilen' as actual,
    (
      (select count(*) from band_rows where match) = 14
      and (select coalesce(sum(actual_count), 0) from actual_agg) = 32
    ) as match
),
bands_with_entries_row as (
  select
    'bands_with_band_moods_total'::text as report_section,
    'summary'::text as key,
    '16 Baender mit mindestens einem band_moods-Eintrag (2 bestehende + 14 Batch)' as expected,
    (select count(distinct band_id) from public.band_moods)::text || ' Baender' as actual,
    (select count(distinct band_id) from public.band_moods) = 16 as match
),
steuerungszahl_row as (
  select
    'steuerungszahl'::text as report_section,
    'summary'::text as key,
    '15 von 141 (14 Batch-Bands + Donnaweda; STEINBACH zaehlt weiterhin nicht als fertig)' as expected,
    (
      (select count(*) from band_rows where match)
      + (select case when match then 1 else 0 end from existing_rows where key = 'Donnaweda')
    )::text || ' von 141' as actual,
    (
      (select count(*) from band_rows where match)
      + (select case when match then 1 else 0 end from existing_rows where key = 'Donnaweda')
    ) = 15 as match
)
select * from band_rows
union all
select * from existing_rows
union all
select * from summary_row
union all
select * from bands_with_entries_row
union all
select * from steuerungszahl_row
order by report_section, key;
