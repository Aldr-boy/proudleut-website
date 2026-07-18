-- ============================================================
-- band_moods_rounds_1_2_verify.sql
--
-- Eigenstaendige Read-only-Verifikation zum technischen Zwischenlauf
-- nach den Kurationsrunden 1 und 2
-- (supabase/band_moods_rounds_1_2_import.sql). SEPARAT im Supabase
-- SQL Editor auszufuehren -- nicht Teil der Migration. Vollstaendig
-- read-only, beliebig oft wiederholbar, keine Temp-Table-
-- Abhaengigkeit.
-- ============================================================

with expected (band_name, band_id, mood_slug, sort_order) as (
  values
    ('5toBeat', '354e2447-41f0-487a-a46d-a2d209dc890b'::uuid, 'tanzflaechen-garantie', 1),
    ('5toBeat', '354e2447-41f0-487a-a46d-a2d209dc890b'::uuid, 'festlich-ausgelassen', 2),
    ('A96 Musikanten', '34934ebb-d7a0-4a9d-980c-45bfc716d870'::uuid, 'festzeltenergie', 1),
    ('Aufzundn', 'bd67b01a-8598-4a6b-b3d0-54743c33a263'::uuid, 'festzeltenergie', 1),
    ('Aufzundn', 'bd67b01a-8598-4a6b-b3d0-54743c33a263'::uuid, 'mitsing-faktor', 2),
    ('Aufzundn', 'bd67b01a-8598-4a6b-b3d0-54743c33a263'::uuid, 'authentisch-handgemacht', 3),
    ('Bayrisch Blau', 'b0c06fee-f8e6-4c4c-84b1-9e330f44323c'::uuid, 'herzlich-nahbar', 1),
    ('Best-of-Band', 'a954938c-0c34-4ab3-a379-0a5e09c5b8fd'::uuid, 'festzeltenergie', 1),
    ('Best-of-Band', 'a954938c-0c34-4ab3-a379-0a5e09c5b8fd'::uuid, 'tanzflaechen-garantie', 2),
    ('Birddogs', '8f3a30f8-9827-47a9-a558-a46c24eac370'::uuid, 'tanzflaechen-garantie', 1),
    ('Birddogs', '8f3a30f8-9827-47a9-a558-a46c24eac370'::uuid, 'generationenverbindend', 2),
    ('Birddogs', '8f3a30f8-9827-47a9-a558-a46c24eac370'::uuid, 'authentisch-handgemacht', 3),
    ('Blechstreet Boys', '43e110e5-1c4f-464e-9531-9c0e9bed9d71'::uuid, 'festzeltenergie', 1),
    ('Böhmisches Verlangen', 'd257d3f6-5ff8-487f-8c2c-f4b2744a6418'::uuid, 'festzeltenergie', 1),
    ('Böhmisches Verlangen', 'd257d3f6-5ff8-487f-8c2c-f4b2744a6418'::uuid, 'authentisch-handgemacht', 2),
    ('Bretterboden', '1fd5de95-6fbf-4016-8eaa-783de8eb31f0'::uuid, 'festzeltenergie', 1),
    ('Breznsalzer', '36d95224-7f95-4d55-96e8-ab98563259ed'::uuid, 'festzeltenergie', 1),
    ('Breznsalzer', '36d95224-7f95-4d55-96e8-ab98563259ed'::uuid, 'mitsing-faktor', 2),
    ('Broadway', '81cc6a67-eb44-4047-b6c4-e347545c8c5f'::uuid, 'tanzflaechen-garantie', 1),
    ('Broadway', '81cc6a67-eb44-4047-b6c4-e347545c8c5f'::uuid, 'konzertant-hochwertig', 2),
    ('Broadway', '81cc6a67-eb44-4047-b6c4-e347545c8c5f'::uuid, 'generationenverbindend', 3),
    ('Campfire', '69d6249d-ab66-40c3-bea2-13addce145b8'::uuid, 'festzeltenergie', 1),
    ('Campfire', '69d6249d-ab66-40c3-bea2-13addce145b8'::uuid, 'generationenverbindend', 2),
    ('Candy Tunes', '13329eb0-11e5-4da5-85b5-746240df22ad'::uuid, 'tanzflaechen-garantie', 1),
    ('Candy Tunes', '13329eb0-11e5-4da5-85b5-746240df22ad'::uuid, 'generationenverbindend', 2),
    ('Cherry Pink', '45dd9940-7eca-4f08-9d07-f119d7416ccd'::uuid, 'tanzflaechen-garantie', 1),
    ('Cherry Pink', '45dd9940-7eca-4f08-9d07-f119d7416ccd'::uuid, 'party-pur', 2),
    ('Claudia und Ralf', 'd86c0ca4-512e-48ec-9a89-760320c90133'::uuid, 'herzlich-nahbar', 1),
    ('Czech Aut', 'e30a2d40-2624-4a1e-af6b-8769dcac9300'::uuid, 'herzlich-nahbar', 1),
    ('d''Hundskrippln', 'c23a13a4-29ac-4275-a612-28e21c59f149'::uuid, 'rockig-mitreissend', 1),
    ('d''Hundskrippln', 'c23a13a4-29ac-4275-a612-28e21c59f149'::uuid, 'authentisch-handgemacht', 2),
    ('d''Rieder', '6be894ab-ffb7-416b-bd7d-90fd36b1f03e'::uuid, 'festzeltenergie', 1),
    ('d''Rieder', '6be894ab-ffb7-416b-bd7d-90fd36b1f03e'::uuid, 'party-pur', 2),
    ('d''Zechpreller', '5e73f690-bb13-4be7-97a5-94874e5a2939'::uuid, 'festzeltenergie', 1),
    ('d''Zechpreller', '5e73f690-bb13-4be7-97a5-94874e5a2939'::uuid, 'tanzflaechen-garantie', 2),
    ('De Gaudimacha', '42cbccd1-4907-457e-a985-915471ef0723'::uuid, 'bayerisch-frech', 1),
    ('De Gaudimacha', '42cbccd1-4907-457e-a985-915471ef0723'::uuid, 'festzeltenergie', 2),
    ('De Gaudimacha', '42cbccd1-4907-457e-a985-915471ef0723'::uuid, 'tanzflaechen-garantie', 3),
    ('De Zwiadn', '344bdf8a-bcd9-4325-9b44-714a65420672'::uuid, 'festzeltenergie', 1),
    ('De Zwiadn', '344bdf8a-bcd9-4325-9b44-714a65420672'::uuid, 'bayerisch-frech', 2),
    ('De Zwiadn', '344bdf8a-bcd9-4325-9b44-714a65420672'::uuid, 'mitsing-faktor', 3),
    ('De Zwiadn', '344bdf8a-bcd9-4325-9b44-714a65420672'::uuid, 'party-pur', 4),
    ('des Brassd scho!', 'b3b2d803-ba00-4aef-bb46-df5c7a3aeb4a'::uuid, 'festzeltenergie', 1),
    ('des Brassd scho!', 'b3b2d803-ba00-4aef-bb46-df5c7a3aeb4a'::uuid, 'authentisch-handgemacht', 2),
    ('Dezent Böhmisch', 'dc8d5036-dd9d-458b-a1e4-d7fadfa82177'::uuid, 'festzeltenergie', 1),
    ('Dezent Böhmisch', 'dc8d5036-dd9d-458b-a1e4-d7fadfa82177'::uuid, 'generationenverbindend', 2),
    ('Die Gseea Wepsn', 'e330f96c-ee21-4130-b7bb-fc6459918e94'::uuid, 'festzeltenergie', 1),
    ('Die Gseea Wepsn', 'e330f96c-ee21-4130-b7bb-fc6459918e94'::uuid, 'generationenverbindend', 2),
    ('Die Gseea Wepsn', 'e330f96c-ee21-4130-b7bb-fc6459918e94'::uuid, 'party-pur', 3),
    ('Die Haumdaucher', 'a66d8a12-c6e2-45c5-a133-ca8a33409b0e'::uuid, 'festzeltenergie', 1),
    ('Die Haumdaucher', 'a66d8a12-c6e2-45c5-a133-ca8a33409b0e'::uuid, 'party-pur', 2),
    ('Die Lausbuba', '8aa5ee33-c159-4926-b222-88767aaa3791'::uuid, 'festzeltenergie', 1),
    ('Die Lausbuba', '8aa5ee33-c159-4926-b222-88767aaa3791'::uuid, 'bayerisch-frech', 2),
    ('Die Lausbuba', '8aa5ee33-c159-4926-b222-88767aaa3791'::uuid, 'mitsing-faktor', 3),
    ('Die Ottis', 'a41ba5d8-3fb8-4bdf-8db0-808c8c48e9b9'::uuid, 'festzeltenergie', 1),
    ('Die Ottis', 'a41ba5d8-3fb8-4bdf-8db0-808c8c48e9b9'::uuid, 'authentisch-handgemacht', 2),
    ('Die WoidRocker', '92c1cb1f-402a-4fb0-b615-3988d8773e31'::uuid, 'party-pur', 1),
    ('Donikkl Crew', '58efa1d5-7816-406a-874e-4e5e1c6c8218'::uuid, 'mitsing-faktor', 1),
    ('Donikkl Crew', '58efa1d5-7816-406a-874e-4e5e1c6c8218'::uuid, 'generationenverbindend', 2),
    ('Edelwuid', 'e963743f-8520-4266-996a-d160b5d17a44'::uuid, 'tanzflaechen-garantie', 1),
    ('Edelwuid', 'e963743f-8520-4266-996a-d160b5d17a44'::uuid, 'festlich-ausgelassen', 2),
    ('Edelwuid', 'e963743f-8520-4266-996a-d160b5d17a44'::uuid, 'emotional-beruehrend', 3),
    ('Ennstal Kryner', '0d81480e-bcd5-4b1b-b561-803df9bf1217'::uuid, 'mitsing-faktor', 1),
    ('Ennstal Kryner', '0d81480e-bcd5-4b1b-b561-803df9bf1217'::uuid, 'tanzflaechen-garantie', 2),
    ('Ennstal Kryner', '0d81480e-bcd5-4b1b-b561-803df9bf1217'::uuid, 'festlich-ausgelassen', 3),
    ('Entprima Live', '82acc533-07d3-4479-82fe-31983711a3e0'::uuid, 'tanzflaechen-garantie', 1),
    ('Entprima Live', '82acc533-07d3-4479-82fe-31983711a3e0'::uuid, 'authentisch-handgemacht', 2),
    ('extra … die Band!', 'c8a602f8-434c-4a7f-892f-1ea65cf54b54'::uuid, 'festzeltenergie', 1),
    ('extra … die Band!', 'c8a602f8-434c-4a7f-892f-1ea65cf54b54'::uuid, 'tanzflaechen-garantie', 2),
    ('Foxy Gentlemen', '12e821e1-423b-422c-a8ba-72d879518ecd'::uuid, 'tanzflaechen-garantie', 1),
    ('Foxy Gentlemen', '12e821e1-423b-422c-a8ba-72d879518ecd'::uuid, 'generationenverbindend', 2),
    ('Free Vocals', '08ae1c5a-fda9-4965-8ae0-97ba26a5e31b'::uuid, 'emotional-beruehrend', 1),
    ('Free Vocals', '08ae1c5a-fda9-4965-8ae0-97ba26a5e31b'::uuid, 'konzertant-hochwertig', 2),
    ('Freunde des Brautpaares', '7414b4cf-f3e3-406f-b906-422773d01410'::uuid, 'lagerfeuer-atmosphaere', 1),
    ('Freunde des Brautpaares', '7414b4cf-f3e3-406f-b906-422773d01410'::uuid, 'authentisch-handgemacht', 2),
    ('Freunde des Brautpaares', '7414b4cf-f3e3-406f-b906-422773d01410'::uuid, 'herzlich-nahbar', 3),
    ('Froschenkapelle', '8f14155c-5967-4f40-98aa-84ef354c1f0c'::uuid, 'festzeltenergie', 1),
    ('Froschenkapelle', '8f14155c-5967-4f40-98aa-84ef354c1f0c'::uuid, 'party-pur', 2),
    ('Froschhaxn Express', 'ba000004-0000-0000-0000-000000000001'::uuid, 'festzeltenergie', 1),
    ('Gary Rhos', 'fdf586ce-5a5f-4707-9b61-71c634c7052d'::uuid, 'lagerfeuer-atmosphaere', 1),
    ('Gary Rhos', 'fdf586ce-5a5f-4707-9b61-71c634c7052d'::uuid, 'konzertant-hochwertig', 2),
    ('Gaudinockerl', '49d54169-dbd1-44c9-a39a-20d9ade54a11'::uuid, 'bayerisch-frech', 1),
    ('Gaudinockerl', '49d54169-dbd1-44c9-a39a-20d9ade54a11'::uuid, 'authentisch-handgemacht', 2),
    ('Gaudinudln', '1e34a454-8376-411f-a8d3-97a377ae1f3d'::uuid, 'festzeltenergie', 1),
    ('Gaudinudln', '1e34a454-8376-411f-a8d3-97a377ae1f3d'::uuid, 'generationenverbindend', 2),
    ('Gentle', '7303c77a-b980-4bde-85fa-5824bfffa7ec'::uuid, 'rockig-mitreissend', 1),
    ('Geraldino', '04762ee6-cd92-4694-a10d-db8804e61287'::uuid, 'mitsing-faktor', 1),
    ('Geraldino', '04762ee6-cd92-4694-a10d-db8804e61287'::uuid, 'generationenverbindend', 2),
    ('GetThat!', 'fd9e8fc3-2e6a-4ac6-baac-baf57c7d5a49'::uuid, 'festzeltenergie', 1),
    ('Grögötz Weißbir', 'ba000003-0000-0000-0000-000000000001'::uuid, 'festzeltenergie', 1),
    ('Grögötz Weißbir', 'ba000003-0000-0000-0000-000000000001'::uuid, 'generationenverbindend', 2),
    ('Hally Gally', '1ef5a9aa-f6b6-4c63-9a42-d1b95e5062c7'::uuid, 'festzeltenergie', 1),
    ('Hally Gally', '1ef5a9aa-f6b6-4c63-9a42-d1b95e5062c7'::uuid, 'party-pur', 2),
    ('Harmonic Brass', '890d75cd-e891-443c-87ef-56adba499353'::uuid, 'konzertant-hochwertig', 1),
    ('Hatphones', '2098498c-35ce-494c-ba06-e349b0ce61a4'::uuid, 'authentisch-handgemacht', 1),
    ('Heartline', '45247ea7-133f-4aeb-9035-850fc5b9a764'::uuid, 'party-pur', 1),
    ('Heimatfieber', '7c1248fb-5d50-4e83-997e-96791eb7987a'::uuid, 'festzeltenergie', 1),
    ('Heimatfieber', '7c1248fb-5d50-4e83-997e-96791eb7987a'::uuid, 'party-pur', 2),
    ('Heimatg''fühl', '8e5605ee-1be9-4094-9c9e-2310e0ea3fe4'::uuid, 'party-pur', 1),
    ('Herb''n Beets', '332dfade-6e61-4f6e-b33d-23a03b610d24'::uuid, 'festzeltenergie', 1),
    ('Herb''n Beets', '332dfade-6e61-4f6e-b33d-23a03b610d24'::uuid, 'party-pur', 2),
    ('Hertz7 - Die Band', 'aae2ea90-cdc5-4392-93fe-8df7af4dc934'::uuid, 'tanzflaechen-garantie', 1),
    ('Hertz7 - Die Band', 'aae2ea90-cdc5-4392-93fe-8df7af4dc934'::uuid, 'rockig-mitreissend', 2),
    ('Hertz7 - Die Band', 'aae2ea90-cdc5-4392-93fe-8df7af4dc934'::uuid, 'authentisch-handgemacht', 3),
    ('Hob Nou', '65a12d3a-c654-46b7-b738-0feb94fc7e8a'::uuid, 'festzeltenergie', 1),
    ('Hob Nou', '65a12d3a-c654-46b7-b738-0feb94fc7e8a'::uuid, 'rockig-mitreissend', 2),
    ('Hob Nou', '65a12d3a-c654-46b7-b738-0feb94fc7e8a'::uuid, 'generationenverbindend', 3),
    ('Hochzeitssängerin MIT HERZ', '3cdf9169-c025-4d86-8f51-c7dfbfb02395'::uuid, 'lagerfeuer-atmosphaere', 1),
    ('Hochzeitssängerin MIT HERZ', '3cdf9169-c025-4d86-8f51-c7dfbfb02395'::uuid, 'herzlich-nahbar', 2),
    ('Hulzstoussboum', 'cf69050d-75c4-4f80-987f-1acfb63abed0'::uuid, 'mitsing-faktor', 1),
    ('Hulzstoussboum', 'cf69050d-75c4-4f80-987f-1acfb63abed0'::uuid, 'authentisch-handgemacht', 2),
    ('James Band', 'a8206639-65be-476f-9dfd-6de10550af6a'::uuid, 'tanzflaechen-garantie', 1),
    ('James Band', 'a8206639-65be-476f-9dfd-6de10550af6a'::uuid, 'festzeltenergie', 2),
    ('James Band', 'a8206639-65be-476f-9dfd-6de10550af6a'::uuid, 'mitsing-faktor', 3),
    ('Jive', '6f35edf7-4144-4026-a4c5-ac6752a92d3b'::uuid, 'tanzflaechen-garantie', 1),
    ('Jive', '6f35edf7-4144-4026-a4c5-ac6752a92d3b'::uuid, 'generationenverbindend', 2),
    ('Kasplattnrocker', '8a6f7ec0-0a52-46dc-a57f-a3bdcbee992a'::uuid, 'festzeltenergie', 1),
    ('Kasplattnrocker', '8a6f7ec0-0a52-46dc-a57f-a3bdcbee992a'::uuid, 'party-pur', 2),
    ('Katharina Kornprobst', 'b31ecc91-fbec-4d70-befa-83fb41ac01ac'::uuid, 'festzeltenergie', 1)
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
    'target_band'::text as report_section,
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
    ('Bigband STEINBACH', '236d642f-7b8d-48c0-a7cf-6e81fbac869b'::uuid, 'brass-power', 0),
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
no_assignment_expected (band_name, band_id) as (
  values
    ('Blechhilfswerk', 'e5a1d757-375e-4cc0-a8d3-02237b85ec69'::uuid),
    ('Duanix Musi', '72ee26d5-89c7-462b-b9ab-54096f39ddb4'::uuid),
    ('Hochdruck Böhmische', '8b7872aa-7633-42d3-b0c6-4467f7ec5190'::uuid)
),
no_assignment_rows as (
  select
    'no_assignment_expected'::text as report_section,
    e.band_name as key,
    '0 Zeilen (weiterhin offen)' as expected,
    coalesce((select count(*)::text from public.band_moods bm where bm.band_id = e.band_id), '0') || ' Zeilen' as actual,
    coalesce((select count(*) from public.band_moods bm where bm.band_id = e.band_id), 0) = 0 as match
  from no_assignment_expected e
),
summary_row as (
  select
    'rounds_1_2_summary'::text as report_section,
    'summary'::text as key,
    '60 Baender, 119 Zeilen, alle exakt match' as expected,
    (select count(*) from band_rows where match)::text || ' von 60 Baendern exakt match, ' ||
      (select coalesce(sum(actual_count), 0) from actual_agg)::text || ' tatsaechliche Zeilen' as actual,
    (
      (select count(*) from band_rows where match) = 60
      and (select coalesce(sum(actual_count), 0) from actual_agg) = 119
    ) as match
),
bands_with_entries_row as (
  select
    'bands_with_band_moods_total'::text as report_section,
    'summary'::text as key,
    '76 Baender mit mindestens einem band_moods-Eintrag (2 bestehende Piloten + 14 Batch-1-Baender + 60 neue Baender)' as expected,
    (select count(distinct band_id) from public.band_moods)::text || ' Baender' as actual,
    (select count(distinct band_id) from public.band_moods) = 76 as match
),
steuerungszahl_row as (
  select
    'steuerungszahl'::text as report_section,
    'summary'::text as key,
    '75 von 141 (Donnaweda + 14 Batch-1-Baender + 60 neue Baender aus Runde 1+2; Bigband STEINBACH zaehlt weiterhin nicht als fertig)' as expected,
    (
      (select count(*) from band_rows where match)
      + (select count(*) from existing_rows where key <> 'Bigband STEINBACH' and match)
    )::text || ' von 141' as actual,
    (
      (select count(*) from band_rows where match)
      + (select count(*) from existing_rows where key <> 'Bigband STEINBACH' and match)
    ) = 75 as match
)
select * from band_rows
union all
select * from existing_rows
union all
select * from no_assignment_rows
union all
select * from summary_row
union all
select * from bands_with_entries_row
union all
select * from steuerungszahl_row
order by report_section, key;
