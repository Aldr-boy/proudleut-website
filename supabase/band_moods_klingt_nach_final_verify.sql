-- ============================================================
-- band_moods_klingt_nach_final_verify.sql
--
-- Eigenstaendige Read-only-Gesamtverifikation des finalen "Klingt
-- nach"-Production-Rollouts (Runde 3 + Runde 4 Import
-- [band_moods_klingt_nach_rounds_3_4_import.sql] und STEINBACH-
-- Entfernung [band_moods_steinbach_festlich_ausgelassen_removal.sql]
-- gemeinsam). SEPARAT im Supabase SQL Editor auszufuehren, als
-- letzter Schritt nach beiden Migrationen. Vollstaendig read-only,
-- beliebig oft wiederholbar, keine Temp-Table-Abhaengigkeit, keine
-- sessionabhaengigen Zustaende.
--
-- Prueft gemeinsam:
--   1. alle 59 Runde-3/4-Baender: exakte (mood_slug=sort_order)-Paare
--      (1-basiert), keine fehlende, zusaetzliche oder falsch sortierte
--      Zuordnung
--   2. Bigband STEINBACH: exakt drei verbleibende Zuordnungen bei
--      sort_order=0 (tanzflaechen-garantie, konzertant-hochwertig,
--      brass-power), festlich-ausgelassen explizit nicht mehr
--      vorhanden, keine unerwartete zusaetzliche Zuordnung
--   3. alle sechs bewussten Empty States: Band eindeutig gefunden,
--      aktiv, exakt 0 band_moods-Zeilen
--   4. globaler Abschlusszustand: exakt 141 aktive Bands, davon exakt
--      135 mit mindestens einer Mood-Zuordnung und exakt 6 ohne
--      Zuordnung -- und diese 6 sind exakt die sechs dokumentierten
--      Empty States, keine weitere aktive Band ohne Zuordnung
--   5. eine finale Summary-Zeile, die alle Teilpruefungen zu einem
--      einzigen match = true zusammenfasst
--
-- Noch NICHT ausgefuehrt -- kein Ausfuehrungs- und
-- Verifikationsvermerk vorhanden. Wird nach Ausfuehrung durch Xandi
-- in docs/migrations/band_moods_klingt_nach_final_rollout.md
-- dokumentiert.
-- ============================================================

with import_expected (band_name, band_id, mood_slug, sort_order) as (
  values
    ('Königlich Bayrisches Vollgas Orchester'::text, 'bb5bd065-cdba-4807-97f5-b0613157a3ac'::uuid, 'festzeltenergie', 1),
    ('Let''s Fetz'::text, '5696d179-4151-47e4-96ba-f65ab87c234b'::uuid, 'authentisch-handgemacht', 1),
    ('Moosbüffel'::text, '83dfd5ed-f78b-41a6-8750-3b756e14ad0a'::uuid, 'festzeltenergie', 1),
    ('Moosbüffel'::text, '83dfd5ed-f78b-41a6-8750-3b756e14ad0a'::uuid, 'authentisch-handgemacht', 2),
    ('Mountain Crew'::text, 'bf607148-b44d-4f3c-bec1-9d348cabab88'::uuid, 'festzeltenergie', 1),
    ('Mountain Crew'::text, 'bf607148-b44d-4f3c-bec1-9d348cabab88'::uuid, 'rockig-mitreissend', 2),
    ('Non Stop'::text, '9cf10b17-9190-4da6-8c8c-9b05a03469f2'::uuid, 'festzeltenergie', 1),
    ('Non Stop'::text, '9cf10b17-9190-4da6-8c8c-9b05a03469f2'::uuid, 'tanzflaechen-garantie', 2),
    ('Ö''ha'::text, '3e8021f3-cc1d-4ff8-9714-0b6055598376'::uuid, 'festzeltenergie', 1),
    ('Ö''ha'::text, '3e8021f3-cc1d-4ff8-9714-0b6055598376'::uuid, 'party-pur', 2),
    ('Out Of Bayern'::text, 'cfaca43b-a3a5-4d8f-85fc-a829a014f91f'::uuid, 'festzeltenergie', 1),
    ('Rotzlöffl'::text, '3ec00d36-18d8-4c0a-b950-f8152cb37019'::uuid, 'festzeltenergie', 1),
    ('Rotzlöffl'::text, '3ec00d36-18d8-4c0a-b950-f8152cb37019'::uuid, 'bayerisch-frech', 2),
    ('Route 12 34'::text, '9058b633-d67b-4580-a526-f9068674e0b3'::uuid, 'festzeltenergie', 1),
    ('Route 12 34'::text, '9058b633-d67b-4580-a526-f9068674e0b3'::uuid, 'party-pur', 2),
    ('Rundumadum'::text, 'b4a13586-3a27-4da8-ba84-2ae9b2daa20b'::uuid, 'festzeltenergie', 1),
    ('Rundumadum'::text, 'b4a13586-3a27-4da8-ba84-2ae9b2daa20b'::uuid, 'tanzflaechen-garantie', 2),
    ('SaKrisch'::text, '5c9bdb9e-d3ad-4950-aa22-7a3aedfb61db'::uuid, 'festzeltenergie', 1),
    ('SaKrisch'::text, '5c9bdb9e-d3ad-4950-aa22-7a3aedfb61db'::uuid, 'party-pur', 2),
    ('Sappralot'::text, 'f7bacdc9-83d9-493b-9773-d88f20511806'::uuid, 'festzeltenergie', 1),
    ('Saustoimusi'::text, '08baa498-23f9-4e18-a77a-81417c9aada4'::uuid, 'festzeltenergie', 1),
    ('Saustoimusi'::text, '08baa498-23f9-4e18-a77a-81417c9aada4'::uuid, 'tanzflaechen-garantie', 2),
    ('SIMMISAMMA'::text, 'acdf1ffd-c3cf-401c-aa2d-ce164523c09c'::uuid, 'festzeltenergie', 1),
    ('Spitz af Knopf'::text, '457e37f4-b3f2-4455-bc89-a6f98baaa024'::uuid, 'festzeltenergie', 1),
    ('Spitz af Knopf'::text, '457e37f4-b3f2-4455-bc89-a6f98baaa024'::uuid, 'authentisch-handgemacht', 2),
    ('Sturschädl'::text, 'f3ff4ac3-3889-478f-89e0-276a96d73467'::uuid, 'festzeltenergie', 1),
    ('Sturschädl'::text, 'f3ff4ac3-3889-478f-89e0-276a96d73467'::uuid, 'generationenverbindend', 2),
    ('Sturschädl'::text, 'f3ff4ac3-3889-478f-89e0-276a96d73467'::uuid, 'tanzflaechen-garantie', 3),
    ('Urwaidler'::text, 'e48f142c-6ff5-4eb0-854f-8a0f9fb2d88f'::uuid, 'festzeltenergie', 1),
    ('Urwaidler'::text, 'e48f142c-6ff5-4eb0-854f-8a0f9fb2d88f'::uuid, 'rockig-mitreissend', 2),
    ('Waidler-Power'::text, '13841f6c-eb94-44fb-ae0c-7651d095f6d7'::uuid, 'festzeltenergie', 1),
    ('Waidler-Power'::text, '13841f6c-eb94-44fb-ae0c-7651d095f6d7'::uuid, 'party-pur', 2),
    ('X''Ploushn'::text, 'bc44b34b-10c1-4532-bbad-ad5602295398'::uuid, 'festzeltenergie', 1),
    ('X''Ploushn'::text, 'bc44b34b-10c1-4532-bbad-ad5602295398'::uuid, 'mitsing-faktor', 2),
    ('X''Ploushn'::text, 'bc44b34b-10c1-4532-bbad-ad5602295398'::uuid, 'herzlich-nahbar', 3),
    ('zruck zu Dir!'::text, '035f7889-83e4-4711-a15c-d625cf944a31'::uuid, 'festzeltenergie', 1),
    ('zruck zu Dir!'::text, '035f7889-83e4-4711-a15c-d625cf944a31'::uuid, 'rockig-mitreissend', 2),
    ('Limited'::text, 'aa63f7be-6e57-4e7b-8541-b64451540c1a'::uuid, 'tanzflaechen-garantie', 1),
    ('Limited'::text, 'aa63f7be-6e57-4e7b-8541-b64451540c1a'::uuid, 'rockig-mitreissend', 2),
    ('Loops'::text, '679fa465-573f-41da-979e-3e943fdbb0ed'::uuid, 'festzeltenergie', 1),
    ('Loops'::text, '679fa465-573f-41da-979e-3e943fdbb0ed'::uuid, 'tanzflaechen-garantie', 2),
    ('Loops'::text, '679fa465-573f-41da-979e-3e943fdbb0ed'::uuid, 'rockig-mitreissend', 3),
    ('Loops'::text, '679fa465-573f-41da-979e-3e943fdbb0ed'::uuid, 'generationenverbindend', 4),
    ('LPC'::text, 'd11f8a3a-cb64-49c6-b605-71ed8401f28c'::uuid, 'tanzflaechen-garantie', 1),
    ('Max Headroom'::text, 'd3e75948-668c-4cfa-84b6-c98677fbd137'::uuid, 'mitsing-faktor', 1),
    ('Max Headroom'::text, 'd3e75948-668c-4cfa-84b6-c98677fbd137'::uuid, 'rockig-mitreissend', 2),
    ('Max Headroom'::text, 'd3e75948-668c-4cfa-84b6-c98677fbd137'::uuid, 'generationenverbindend', 3),
    ('May Vibes'::text, '500351ce-3955-48ed-8bb5-41cf1ea6b71f'::uuid, 'tanzflaechen-garantie', 1),
    ('Michael Jackts Net'::text, 'dc9fb51a-2087-4e13-af4d-5be60fc44ff1'::uuid, 'festzeltenergie', 1),
    ('Michael Jackts Net'::text, 'dc9fb51a-2087-4e13-af4d-5be60fc44ff1'::uuid, 'rockig-mitreissend', 2),
    ('mix2max'::text, '884a2d54-d652-472a-8dbb-2e57de04695d'::uuid, 'tanzflaechen-garantie', 1),
    ('mix2max'::text, '884a2d54-d652-472a-8dbb-2e57de04695d'::uuid, 'generationenverbindend', 2),
    ('mix2max'::text, '884a2d54-d652-472a-8dbb-2e57de04695d'::uuid, 'festzeltenergie', 3),
    ('Mixtape'::text, 'baff31e6-2619-48d6-aaa2-cedf83c08e0d'::uuid, 'festzeltenergie', 1),
    ('Mixtape'::text, 'baff31e6-2619-48d6-aaa2-cedf83c08e0d'::uuid, 'generationenverbindend', 2),
    ('Mixtape'::text, 'baff31e6-2619-48d6-aaa2-cedf83c08e0d'::uuid, 'mitsing-faktor', 3),
    ('More Candy'::text, 'f8616e8f-bb6d-4368-b22a-bcb63de49e54'::uuid, 'tanzflaechen-garantie', 1),
    ('MyfriendZ'::text, '6580c6c7-3f60-4980-b171-3eec4d625ede'::uuid, 'tanzflaechen-garantie', 1),
    ('Nice Ties'::text, 'd63cbc29-077d-4005-a296-90caec77b1bf'::uuid, 'bayerisch-frech', 1),
    ('Nick''s Nice'::text, 'aab585d3-94b6-4b6b-be4c-ff21b83fef69'::uuid, 'festzeltenergie', 1),
    ('Nick''s Nice'::text, 'aab585d3-94b6-4b6b-be4c-ff21b83fef69'::uuid, 'rockig-mitreissend', 2),
    ('Nick''s Nice'::text, 'aab585d3-94b6-4b6b-be4c-ff21b83fef69'::uuid, 'mitsing-faktor', 3),
    ('Onesee'::text, '17f4dbbf-27de-49dd-92b9-334385a2a752'::uuid, 'festzeltenergie', 1),
    ('Onesee'::text, '17f4dbbf-27de-49dd-92b9-334385a2a752'::uuid, 'tanzflaechen-garantie', 2),
    ('Onesee'::text, '17f4dbbf-27de-49dd-92b9-334385a2a752'::uuid, 'generationenverbindend', 3),
    ('Partybox'::text, '7aa80a7b-c424-4808-a6ad-a4f23a8edcdc'::uuid, 'tanzflaechen-garantie', 1),
    ('Partybox'::text, '7aa80a7b-c424-4808-a6ad-a4f23a8edcdc'::uuid, 'party-pur', 2),
    ('Prime Time'::text, 'b1c1f410-2de0-4ef3-9cf2-55044ba32bf4'::uuid, 'festzeltenergie', 1),
    ('Prime Time'::text, 'b1c1f410-2de0-4ef3-9cf2-55044ba32bf4'::uuid, 'tanzflaechen-garantie', 2),
    ('Singing Sonixx'::text, 'ea8412e7-7851-47b1-b726-5cb3c5deb14a'::uuid, 'party-pur', 1),
    ('Soiz''n''Pepper'::text, '6946fed2-d09b-4f25-87e6-24c665a26e40'::uuid, 'authentisch-handgemacht', 1),
    ('Soiz''n''Pepper'::text, '6946fed2-d09b-4f25-87e6-24c665a26e40'::uuid, 'tanzflaechen-garantie', 2),
    ('Sommerwind'::text, '21530533-f0a9-409e-9d78-9af3d4ce46c2'::uuid, 'bayerisch-frech', 1),
    ('Sommerwind'::text, '21530533-f0a9-409e-9d78-9af3d4ce46c2'::uuid, 'lagerfeuer-atmosphaere', 2),
    ('Sommerwind'::text, '21530533-f0a9-409e-9d78-9af3d4ce46c2'::uuid, 'tanzflaechen-garantie', 3),
    ('Spectrum'::text, '1a641665-c14c-44ab-8955-9cfd867a9355'::uuid, 'festzeltenergie', 1),
    ('Spectrum'::text, '1a641665-c14c-44ab-8955-9cfd867a9355'::uuid, 'herzlich-nahbar', 2),
    ('Spectrum'::text, '1a641665-c14c-44ab-8955-9cfd867a9355'::uuid, 'rockig-mitreissend', 3),
    ('SPOTLIGHT Eventband'::text, 'd4a98980-e215-454a-b6c7-8dc9395bf6d9'::uuid, 'tanzflaechen-garantie', 1),
    ('SPOTLIGHT Eventband'::text, 'd4a98980-e215-454a-b6c7-8dc9395bf6d9'::uuid, 'party-pur', 2),
    ('The Silverhammers'::text, '96aa49dc-755a-44ff-ab7e-cc5cb463d068'::uuid, 'generationenverbindend', 1),
    ('The Silverhammers'::text, '96aa49dc-755a-44ff-ab7e-cc5cb463d068'::uuid, 'tanzflaechen-garantie', 2),
    ('The Silverhammers'::text, '96aa49dc-755a-44ff-ab7e-cc5cb463d068'::uuid, 'authentisch-handgemacht', 3),
    ('vier-tell-four'::text, 'd5f340c7-f81f-4f2b-a7e8-e2f01ec69015'::uuid, 'festzeltenergie', 1),
    ('vier-tell-four'::text, 'd5f340c7-f81f-4f2b-a7e8-e2f01ec69015'::uuid, 'tanzflaechen-garantie', 2),
    ('Whoobers'::text, '57ba3e53-5065-48f6-8421-64f67e641d1a'::uuid, 'lagerfeuer-atmosphaere', 1),
    ('Whoobers'::text, '57ba3e53-5065-48f6-8421-64f67e641d1a'::uuid, 'rockig-mitreissend', 2),
    ('Whoobers'::text, '57ba3e53-5065-48f6-8421-64f67e641d1a'::uuid, 'tanzflaechen-garantie', 3),
    ('Wiesnkönige'::text, '255a2c2b-ddfc-4712-b555-d84c6d9003ec'::uuid, 'festzeltenergie', 1),
    ('Wiesnkönige'::text, '255a2c2b-ddfc-4712-b555-d84c6d9003ec'::uuid, 'generationenverbindend', 2),
    ('Wiesnkönige'::text, '255a2c2b-ddfc-4712-b555-d84c6d9003ec'::uuid, 'tanzflaechen-garantie', 3),
    ('Wois Bois'::text, '9196ffec-d07d-49f5-84b9-7ac407336949'::uuid, 'bayerisch-frech', 1),
    ('Muckasäck'::text, '3225d8e1-29d1-476d-b1ed-ecc1a2c08ee7'::uuid, 'festzeltenergie', 1),
    ('Muckasäck'::text, '3225d8e1-29d1-476d-b1ed-ecc1a2c08ee7'::uuid, 'tanzflaechen-garantie', 2),
    ('Quetschnblech'::text, '69a6ae07-88d9-496d-9e08-4eb9a456ec4d'::uuid, 'authentisch-handgemacht', 1),
    ('Quetschnblech'::text, '69a6ae07-88d9-496d-9e08-4eb9a456ec4d'::uuid, 'tanzflaechen-garantie', 2),
    ('Seubersdorfer Blasmusik'::text, '6a9a2f9d-a88d-49ce-be22-5b38243e6c57'::uuid, 'festzeltenergie', 1),
    ('Seubersdorfer Blasmusik'::text, '6a9a2f9d-a88d-49ce-be22-5b38243e6c57'::uuid, 'rockig-mitreissend', 2),
    ('Tegernseer Tanzlmusi'::text, 'd6c2bb7b-6c5e-400f-a8c1-e9dbf1edb328'::uuid, 'festzeltenergie', 1),
    ('Urner Musi'::text, 'e0c5fff5-429a-400a-a792-6fbdb6ecd712'::uuid, 'festzeltenergie', 1),
    ('Lebensg''fühl'::text, 'c205c65b-9976-4f67-b25a-ff2cbfe8819a'::uuid, 'emotional-beruehrend', 1),
    ('Lebensg''fühl'::text, 'c205c65b-9976-4f67-b25a-ff2cbfe8819a'::uuid, 'lagerfeuer-atmosphaere', 2),
    ('Saitenwind'::text, 'da38188f-2de8-49ed-869a-90f868ac96a5'::uuid, 'lagerfeuer-atmosphaere', 1),
    ('Saitenwind'::text, 'da38188f-2de8-49ed-869a-90f868ac96a5'::uuid, 'emotional-beruehrend', 2),
    ('The Stereo Show'::text, '726f2390-116a-4e99-85a0-32e33fd1a1af'::uuid, 'authentisch-handgemacht', 1),
    ('The Stereo Show'::text, '726f2390-116a-4e99-85a0-32e33fd1a1af'::uuid, 'generationenverbindend', 2),
    ('KIZZRock'::text, '2ee55d09-46cd-4278-8882-b6273661b8cd'::uuid, 'rockig-mitreissend', 1),
    ('Schlawindl'::text, '98eb2761-f188-4bee-a3f8-dafefe9d26b1'::uuid, 'rockig-mitreissend', 1),
    ('Sabrina Robold'::text, '2b26c0a5-5996-4cd2-b5ee-d90e145f4edb'::uuid, 'herzlich-nahbar', 1),
    ('Sabrina Robold'::text, '2b26c0a5-5996-4cd2-b5ee-d90e145f4edb'::uuid, 'emotional-beruehrend', 2),
    ('Sabrina Robold'::text, '2b26c0a5-5996-4cd2-b5ee-d90e145f4edb'::uuid, 'lagerfeuer-atmosphaere', 3),
    ('Steffi Heim'::text, '03705432-2e19-44d6-a8f0-be9a8b04ae1c'::uuid, 'herzlich-nahbar', 1),
    ('San2 and His Soul Patrol'::text, '09ce05a0-7712-475c-95de-ecb75904821a'::uuid, 'konzertant-hochwertig', 1),
    ('Tir Nan Og'::text, '1203d7f7-c198-4dd4-8086-98ab87f29a8f'::uuid, 'tanzflaechen-garantie', 1)
),
import_expected_agg as (
  select band_name, band_id,
         array_agg(mood_slug || '=' || sort_order::text order by mood_slug) as expected_pairs,
         count(*) as expected_count
  from import_expected
  group by band_name, band_id
),
import_actual_agg as (
  select bm.band_id,
         array_agg(m.slug || '=' || bm.sort_order::text order by m.slug) as actual_pairs,
         count(*) as actual_count
  from public.band_moods bm
  join public.moods m on m.id = bm.mood_id
  where bm.band_id in (select distinct band_id from import_expected)
  group by bm.band_id
),
import_rows as (
  select
    'a_import_band'::text as report_section,
    e.band_name as key,
    array_to_string(e.expected_pairs, ',') || ' (n=' || e.expected_count || ')' as expected,
    coalesce(array_to_string(a.actual_pairs, ','), '(keine Zeilen)') || ' (n=' || coalesce(a.actual_count, 0) || ')' as actual,
    coalesce(a.actual_pairs = e.expected_pairs and a.actual_count = e.expected_count, false) as match
  from import_expected_agg e
  left join import_actual_agg a on a.band_id = e.band_id
),

steinbach_expected (mood_slug, sort_order) as (
  values
    ('tanzflaechen-garantie', 0),
    ('konzertant-hochwertig', 0),
    ('brass-power', 0)
),
steinbach_expected_agg as (
  select array_agg(mood_slug || '=' || sort_order::text order by mood_slug) as expected_pairs,
         count(*) as expected_count
  from steinbach_expected
),
steinbach_actual_agg as (
  select array_agg(m.slug || '=' || bm.sort_order::text order by m.slug) as actual_pairs,
         count(*) as actual_count
  from public.band_moods bm
  join public.moods m on m.id = bm.mood_id
  where bm.band_id = '236d642f-7b8d-48c0-a7cf-6e81fbac869b'::uuid
),
steinbach_row as (
  select
    'b_steinbach'::text as report_section,
    'Bigband STEINBACH (verbleibende Zuordnungen)'::text as key,
    array_to_string(e.expected_pairs, ',') || ' (n=' || e.expected_count || ')' as expected,
    coalesce(array_to_string(a.actual_pairs, ','), '(keine Zeilen)') || ' (n=' || coalesce(a.actual_count, 0) || ')' as actual,
    coalesce(a.actual_pairs = e.expected_pairs and a.actual_count = e.expected_count, false) as match
  from steinbach_expected_agg e
  cross join steinbach_actual_agg a
),
steinbach_removed_row as (
  select
    'b_steinbach'::text as report_section,
    'festlich-ausgelassen entfernt'::text as key,
    '0 Zeilen'::text as expected,
    count(*)::text || ' Zeilen gefunden' as actual,
    count(*) = 0 as match
  from public.band_moods bm
  join public.moods m on m.id = bm.mood_id
  where bm.band_id = '236d642f-7b8d-48c0-a7cf-6e81fbac869b'::uuid
    and m.slug = 'festlich-ausgelassen'
),

empty_state_expected (band_name, band_id) as (
  values
    ('Blechhilfswerk'::text, 'e5a1d757-375e-4cc0-a8d3-02237b85ec69'::uuid),
    ('Duanix Musi'::text, '72ee26d5-89c7-462b-b9ab-54096f39ddb4'::uuid),
    ('Hochdruck Böhmische'::text, '8b7872aa-7633-42d3-b0c6-4467f7ec5190'::uuid),
    ('Silk and Sound'::text, '6f8a50e6-7358-43b1-ab92-4d9023e405d1'::uuid),
    ('Rüscherl Muse'::text, '2746335a-e267-4977-80b9-3073173c42c0'::uuid),
    ('Smooth''n''Groove'::text, 'eaab9a7b-c5b4-481e-b78d-fd37d4654486'::uuid)
),
empty_state_actual as (
  select
    ese.band_name,
    ese.band_id,
    b.id is not null as band_found,
    coalesce(b.status = 'active' and b.is_published = true, false) as band_active,
    coalesce(bmc.n, 0) as mood_count
  from empty_state_expected ese
  left join public.bands b on b.id = ese.band_id
  left join (
    select band_id, count(*) as n from public.band_moods group by band_id
  ) bmc on bmc.band_id = ese.band_id
),
empty_state_rows as (
  select
    'c_empty_state'::text as report_section,
    band_name as key,
    'gefunden, aktiv, 0 Zeilen'::text as expected,
    (case when band_found then 'gefunden' else 'NICHT GEFUNDEN' end)
      || ', ' || (case when band_active then 'aktiv' else 'NICHT AKTIV' end)
      || ', ' || mood_count::text || ' Zeilen' as actual,
    (band_found and band_active and mood_count = 0) as match
  from empty_state_actual
),

global_counts as (
  select
    count(*) filter (where b.status = 'active' and b.is_published = true) as total_active,
    count(*) filter (where b.status = 'active' and b.is_published = true and coalesce(bmc.n, 0) > 0) as with_mood,
    count(*) filter (where b.status = 'active' and b.is_published = true and coalesce(bmc.n, 0) = 0) as without_mood
  from public.bands b
  left join (
    select band_id, count(*) as n from public.band_moods group by band_id
  ) bmc on bmc.band_id = b.id
),
global_row as (
  select
    'd_global'::text as report_section,
    'aktive Baender / mit Mood / ohne Mood'::text as key,
    '141 / 135 / 6'::text as expected,
    total_active::text || ' / ' || with_mood::text || ' / ' || without_mood::text as actual,
    (total_active = 141 and with_mood = 135 and without_mood = 6) as match
  from global_counts
),

without_mood_bands as (
  select b.id as band_id, b.name as band_name
  from public.bands b
  left join (
    select band_id, count(*) as n from public.band_moods group by band_id
  ) bmc on bmc.band_id = b.id
  where b.status = 'active' and b.is_published = true and coalesce(bmc.n, 0) = 0
),
without_mood_check as (
  select
    'd_global'::text as report_section,
    'Menge der Bands ohne Mood = genau die 6 Empty States'::text as key,
    (select array_to_string(array_agg(band_name order by band_name), ', ') from empty_state_expected) as expected,
    coalesce((select array_to_string(array_agg(band_name order by band_name), ', ') from without_mood_bands), '(keine)') as actual,
    coalesce(
      (select array_agg(band_name order by band_name) from without_mood_bands)
      = (select array_agg(band_name order by band_name) from empty_state_expected),
      false
    ) as match
),

final_summary as (
  select
    'e_final'::text as report_section,
    'FINAL SUMMARY'::text as key,
    'alle Teilpruefungen match = true'::text as expected,
    case when (
      (select bool_and(match) from import_rows) is true and
      (select bool_and(match) from (select match from steinbach_row union all select match from steinbach_removed_row) s) is true and
      (select bool_and(match) from empty_state_rows) is true and
      (select match from global_row) is true and
      (select match from without_mood_check) is true
    ) then 'alle Teilpruefungen match = true' else 'MINDESTENS EINE TEILPRUEFUNG match = false -- siehe Detailzeilen oben' end as actual,
    (
      (select bool_and(match) from import_rows) is true and
      (select bool_and(match) from (select match from steinbach_row union all select match from steinbach_removed_row) s) is true and
      (select bool_and(match) from empty_state_rows) is true and
      (select match from global_row) is true and
      (select match from without_mood_check) is true
    ) as match
)
select * from import_rows
union all
select * from steinbach_row
union all
select * from steinbach_removed_row
union all
select * from empty_state_rows
union all
select * from global_row
union all
select * from without_mood_check
union all
select * from final_summary
order by report_section, key;
