-- ============================================================
-- repertoire_style_catalog_cleanup_verify.sql
--
-- Eigenstaendige Read-only-Verifikation zur Katalogbereinigung
-- "Musikalisch verortet" (supabase/repertoire_style_catalog_cleanup.sql).
-- SEPARAT im Supabase SQL Editor auszufuehren -- nicht Teil der
-- Migration. Vollstaendig read-only, beliebig oft wiederholbar, keine
-- Temp-Table-Abhaengigkeit. Identisches Format wie
-- supabase/band_moods_steinbach_festlich_ausgelassen_removal_verify.sql
-- (report_section/key/expected/actual/match).
--
-- Zwei klar getrennte Abschnitte -- jeweils ein eigenstaendiges SELECT,
-- unabhaengig voneinander markier- und ausfuehrbar:
--
--   ABSCHNITT A (PREFLIGHT) -- VOR der Migration auszufuehren. Prueft,
--   dass exakt der in der Migration vorausgesetzte Ausgangszustand
--   vorliegt (Quell-/Zielzeilen, Zuordnungen, geschuetzte
--   Referenzbands, Umbenennungs-Kollisionsfreiheit).
--
--   ABSCHNITT B (POSTFLIGHT) -- NACH erfolgreicher Migration
--   auszufuehren. Prueft das Ergebnis (archivierte Quellen ohne
--   Zuordnung, korrekt umgehaengte Bands mit erhaltenem sort_order,
--   umbenannte Zeilen, unveraenderte geschuetzte Referenzbands,
--   unveraenderte ausdruecklich ausgeschlossene Faelle, globale
--   Zaehlwerte).
--
-- Let's Fetz: Abschnitt B bildet ausschliesslich den tatsaechlich von
-- der Migration umgesetzten Zustand als "match" ab -- "Bayerisch bis
-- Aktuell" bleibt unveraendert bei Let's Fetz (mangels eindeutigem
-- Beleg, siehe Abschlussbericht). Der alternative, hier NICHT
-- umgesetzte Zustand ("zusammengefuehrt nach Bayerisch bis aktuelle
-- Charts") ist als eigene, informative Zeile mit match=false markiert,
-- damit ein spaeterer manueller Merge -- falls Xandi doch einen Beleg
-- fuer Let's Fetz findet -- anhand dieser Datei erkennbar bliebe. Diese
-- Datei erzwingt diesen alternativen Zustand nicht und ist kein Gate
-- fuer den restlichen Bericht.
-- ============================================================


-- ============================================================
-- ABSCHNITT A -- PREFLIGHT (vor Ausfuehrung der Migration)
-- ============================================================

with expected_styles (key, id, slug, status) as (
  values
    ('Merge1 Quelle: Bayerisch & international',        'a2028e17-4363-4530-a639-8dd61615d1a7'::uuid, 'bayerisch-international',        'active'),
    ('Merge1 Ziel: Bayerisch bis international',         '4089444d-19f7-4de9-9852-03172bb89266'::uuid, 'bayerisch-bis-international',    'active'),
    ('Merge2 Quelle: Alpenrock & Volksmusik',             '2a01cd55-cddf-4162-87df-38759881f4fe'::uuid, 'alpenrock-volksmusik',           'active'),
    ('Merge2 Ziel: Volksmusik bis Alpenrock',              'afa1967d-e581-4e41-bfb5-849a465a16ab'::uuid, 'volksmusik-bis-alpenrock',       'active'),
    ('Merge3 Quelle: Alpenrock bis Schlager',              'c19dc3fa-d633-4c37-876c-2320060fe5b1'::uuid, 'alpenrock-bis-schlager',         'active'),
    ('Merge3 Ziel: Alpenrock & Schlager',                  '2055bc75-4205-41d5-8b19-cca0664c8127'::uuid, 'alpenrock-schlager',             'active'),
    ('Merge4 Ziel (geschuetzt): Klassiker & aktuelle Charts', 'aa8edbf0-04b6-41f0-8a30-4c1d9e1cf6f1'::uuid, 'klassiker-aktuelle-charts',   'active'),
    ('Merge4 Quelle A: Klassiker & aktuelle Hits',         '56ac12e6-f250-4adb-9814-cb0742dc082f'::uuid, 'klassiker-aktuelle-hits',        'active'),
    ('Merge4 Quelle B: Aktuelle Hits & Klassiker',         '4a364f68-e14f-43ee-957e-9c4836e98317'::uuid, 'aktuelle-hits-klassiker',        'active'),
    ('Merge4 Quelle C: Klassiker bis aktuelle Hits',       '9b23bc57-f937-458c-80b2-c871ad2659bc'::uuid, 'klassiker-bis-aktuelle-hits',    'active'),
    ('Merge5 Quelle: Aktuelle Charts & Evergreens',        '0a02fd63-1d3f-41cb-ba5c-f725b19b79c6'::uuid, 'aktuelle-charts-evergreens',     'active'),
    ('Merge5 Ziel: Evergreens bis aktuelle Charts',        '7e6d57e7-f348-400c-ba2e-bb735c49119d'::uuid, 'evergreens-bis-aktuelle-charts', 'active'),
    ('Merge6 Quelle: Party-Hits & Evergreens',             'a97585f5-bb3d-4b70-a85e-45af2ad34984'::uuid, 'party-hits-evergreens',          'active'),
    ('Merge6 Ziel: Partyhits & Evergreens',                'fa2981cb-eef4-4e80-b3bc-0c02ec842f92'::uuid, 'partyhits-evergreens',           'active'),
    ('Merge7 Quelle: Volksmusik bis Rock-Klassiker',       'd118c3b2-41ff-4342-b831-dc96c9d46d69'::uuid, 'volksmusik-bis-rock-klassiker',  'active'),
    ('Merge7 Ziel: Volksmusik bis Rockklassiker',          'a74f64d5-8a2f-47aa-881c-8ad13f75c84b'::uuid, 'volksmusik-bis-rockklassiker',   'active'),
    ('Merge8 Quelle: Schlager bis Rock-Klassiker',         'dee583b1-1543-4cc4-b8da-f49214dd5bf2'::uuid, 'schlager-bis-rock-klassiker',    'active'),
    ('Merge8 Ziel (geschuetzt): Rockklassiker & Schlager', 'd88ed3aa-025a-44a2-aa6b-4566b02651df'::uuid, 'rockklassiker-schlager',         'active'),
    ('Rename1: Charts & Klassiker gemischt',               '36920071-d602-491f-85a1-ab8fefc7ebd6'::uuid, 'charts-klassiker-gemischt',      'active'),
    ('Rename2: Schlager & Rock gemischt',                  '0f7e367a-680a-461a-b9c6-eceeab86e1d6'::uuid, 'schlager-rock-gemischt',         'active'),
    ('Rename3: Bayerisch & Rock gemischt',                 'a8138c0e-2139-40ee-810e-eb6077e7784a'::uuid, 'bayerisch-rock-gemischt',        'active'),
    ('Ausgeschlossen: Bayerisch bis Aktuell (Lets Fetz)',  'f913ca6b-4f56-4f7f-b6be-53824e7bf880'::uuid, 'bayerisch-bis-aktuell',          'active'),
    ('Ausgeschlossen: Bayerisch bis aktuelle Charts (geschuetzt, Herbn Beets)', '1c0caa4d-f68b-47ed-9c73-5ee745838841'::uuid, 'bayerisch-bis-aktuelle-charts', 'active')
),
style_rows as (
  select
    'A_style_state'::text as report_section,
    e.key,
    e.slug || ' / ' || e.status as expected,
    coalesce(rs.slug || ' / ' || rs.status, '(keine Zeile mit dieser ID)') as actual,
    coalesce(rs.id = e.id and rs.slug = e.slug and rs.status = e.status, false) as match
  from expected_styles e
  left join public.repertoire_styles rs on rs.id = e.id
),
expected_assignments (key, style_id, band_pairs) as (
  values
    ('Merge1 Quelle-Zuordnung',  'a2028e17-4363-4530-a639-8dd61615d1a7'::uuid, array['a954938c-0c34-4ab3-a379-0a5e09c5b8fd=2']),
    ('Merge2 Quelle-Zuordnung',  '2a01cd55-cddf-4162-87df-38759881f4fe'::uuid, array['5e73f690-bb13-4be7-97a5-94874e5a2939=1']),
    ('Merge3 Quelle-Zuordnung',  'c19dc3fa-d633-4c37-876c-2320060fe5b1'::uuid, array['344bdf8a-bcd9-4325-9b44-714a65420672=1']),
    ('Merge4 Quelle-A-Zuordnung','56ac12e6-f250-4adb-9814-cb0742dc082f'::uuid, array['c8a602f8-434c-4a7f-892f-1ea65cf54b54=3']),
    ('Merge4 Quelle-B-Zuordnung','4a364f68-e14f-43ee-957e-9c4836e98317'::uuid, array['1ef5a9aa-f6b6-4c63-9a42-d1b95e5062c7=1']),
    ('Merge4 Quelle-C-Zuordnung','9b23bc57-f937-458c-80b2-c871ad2659bc'::uuid, array['d4a98980-e215-454a-b6c7-8dc9395bf6d9=1']),
    ('Merge5 Quelle-Zuordnung',  '0a02fd63-1d3f-41cb-ba5c-f725b19b79c6'::uuid, array['bc44b34b-10c1-4532-bbad-ad5602295398=2']),
    ('Merge5 Ziel-Zuordnung',    '7e6d57e7-f348-400c-ba2e-bb735c49119d'::uuid, array['a8206639-65be-476f-9dfd-6de10550af6a=2']),
    ('Merge6 Quelle-Zuordnung',  'a97585f5-bb3d-4b70-a85e-45af2ad34984'::uuid, array['21530533-f0a9-409e-9d78-9af3d4ce46c2=2']),
    ('Merge6 Ziel-Zuordnung',    'fa2981cb-eef4-4e80-b3bc-0c02ec842f92'::uuid, array['9cf10b17-9190-4da6-8c8c-9b05a03469f2=3']),
    ('Merge7 Quelle-Zuordnung',  'd118c3b2-41ff-4342-b831-dc96c9d46d69'::uuid, array['9cf10b17-9190-4da6-8c8c-9b05a03469f2=2','e48f142c-6ff5-4eb0-854f-8a0f9fb2d88f=1']),
    ('Merge7 Ziel-Zuordnung',    'a74f64d5-8a2f-47aa-881c-8ad13f75c84b'::uuid, array['21530533-f0a9-409e-9d78-9af3d4ce46c2=1','42cbccd1-4907-457e-a985-915471ef0723=1','e330f96c-ee21-4130-b7bb-fc6459918e94=1']),
    ('Merge8 Quelle-Zuordnung',  'dee583b1-1543-4cc4-b8da-f49214dd5bf2'::uuid, array['5e73f690-bb13-4be7-97a5-94874e5a2939=2'])
),
assignment_rows as (
  select
    'A_assignment_state'::text as report_section,
    e.key,
    array_to_string(e.band_pairs, ',') as expected,
    coalesce(array_to_string(a.pairs, ','), '(keine Zuordnung)') as actual,
    coalesce(a.pairs = e.band_pairs, false) as match
  from expected_assignments e
  left join (
    select repertoire_style_id, array_agg(band_id::text || '=' || sort_order::text order by band_id) as pairs
    from public.band_repertoire_styles
    group by repertoire_style_id
  ) a on a.repertoire_style_id = e.style_id
),
double_assignment_check as (
  select
    'A_no_double_assignment'::text as report_section,
    x.key,
    'keine Band mit Quelle und Ziel gleichzeitig'::text as expected,
    case when count(*) = 0 then 'keine Ueberschneidung' else count(*)::text || ' Ueberschneidung(en)' end as actual,
    count(*) = 0 as match
  from (
    values
      ('Merge1', 'a2028e17-4363-4530-a639-8dd61615d1a7'::uuid, '4089444d-19f7-4de9-9852-03172bb89266'::uuid),
      ('Merge2', '2a01cd55-cddf-4162-87df-38759881f4fe'::uuid, 'afa1967d-e581-4e41-bfb5-849a465a16ab'::uuid),
      ('Merge3', 'c19dc3fa-d633-4c37-876c-2320060fe5b1'::uuid, '2055bc75-4205-41d5-8b19-cca0664c8127'::uuid),
      ('Merge5', '0a02fd63-1d3f-41cb-ba5c-f725b19b79c6'::uuid, '7e6d57e7-f348-400c-ba2e-bb735c49119d'::uuid),
      ('Merge6', 'a97585f5-bb3d-4b70-a85e-45af2ad34984'::uuid, 'fa2981cb-eef4-4e80-b3bc-0c02ec842f92'::uuid),
      ('Merge7', 'd118c3b2-41ff-4342-b831-dc96c9d46d69'::uuid, 'a74f64d5-8a2f-47aa-881c-8ad13f75c84b'::uuid),
      ('Merge8', 'dee583b1-1543-4cc4-b8da-f49214dd5bf2'::uuid, 'd88ed3aa-025a-44a2-aa6b-4566b02651df'::uuid)
  ) as x(key, src_id, tgt_id)
  left join public.band_repertoire_styles src on src.repertoire_style_id = x.src_id
  left join public.band_repertoire_styles tgt on tgt.repertoire_style_id = x.tgt_id and tgt.band_id = src.band_id
  where src.band_id is not null and tgt.band_id is not null
  group by x.key
),
rename_collision_check as (
  select
    'A_rename_no_collision'::text as report_section,
    y.new_name as key,
    '0 andere Zeilen mit diesem Namen oder Slug'::text as expected,
    count(*)::text || ' Kollision(en)' as actual,
    count(*) = 0 as match
  from (
    values
      ('Charts & Klassiker', 'charts-klassiker', '36920071-d602-491f-85a1-ab8fefc7ebd6'::uuid),
      ('Schlager & Rock', 'schlager-rock', '0f7e367a-680a-461a-b9c6-eceeab86e1d6'::uuid),
      ('Bayerisch & Rock', 'bayerisch-rock', 'a8138c0e-2139-40ee-810e-eb6077e7784a'::uuid)
  ) as y(new_name, new_slug, own_id)
  left join public.repertoire_styles rs
    on (rs.name = y.new_name or rs.slug = y.new_slug) and rs.id <> y.own_id
  group by y.new_name
),
expected_protected_fp (band_name, band_id, pairs) as (
  values
    ('2 unplugged',    'f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid, array['48ed59a1-8294-402b-a977-b62fac3f1d0c=1','7794ffc9-b050-4feb-b7cf-890fbcf4c38f=3','da5a3b39-d28f-40b8-9d9a-02c0f2466ed6=2']),
    ('5toBeat',        '354e2447-41f0-487a-a46d-a2d209dc890b'::uuid, array['4182d9d5-95d9-4ab9-b242-f988bb91bd3c=2','aa8edbf0-04b6-41f0-8a30-4c1d9e1cf6f1=1']),
    ('9to5',           '098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid, array['62710caf-ae8d-48ee-ace2-b448618e5b2a=1','c0b1dc22-66a6-4c8c-9a93-6dcdc87fb853=3','ef7a8419-c5b0-4ba0-ac01-4e38a7c8af08=2']),
    ('Entprima Live',  '82acc533-07d3-4479-82fe-31983711a3e0'::uuid, array['a14b5f7b-d9be-41da-b531-2266b41fc850=1','e35567e8-271a-4094-b27a-1312649ffec9=2']),
    ('Herbn Beets',    '332dfade-6e61-4f6e-b33d-23a03b610d24'::uuid, array['1c0caa4d-f68b-47ed-9c73-5ee745838841=2','d22fa0b1-bdc9-4a88-854d-0ccf3d00f8c1=1']),
    ('Hob Nou',        '65a12d3a-c654-46b7-b738-0feb94fc7e8a'::uuid, array['99c99d12-58c4-4f8e-a02e-0f7202ac1937=2','ef09bb47-ab81-46a1-8d71-48b0318a5228=1']),
    ('SaKrisch',       '5c9bdb9e-d3ad-4950-aa22-7a3aedfb61db'::uuid, array['2c1ee950-4171-40e0-9bd1-ffbb047cf8e2=1','cf64fe78-d8c9-429c-94ea-a3cc20dd79f1=3','d88ed3aa-025a-44a2-aa6b-4566b02651df=2'])
),
protected_fp_rows as (
  select
    'A_protected_band_fingerprint'::text as report_section,
    e.band_name as key,
    array_to_string(e.pairs, ',') as expected,
    coalesce(array_to_string(a.pairs, ','), '(keine Zuordnung)') as actual,
    coalesce(a.pairs = e.pairs, false) as match
  from expected_protected_fp e
  left join (
    select band_id, array_agg(repertoire_style_id::text || '=' || sort_order::text order by repertoire_style_id) as pairs
    from public.band_repertoire_styles
    group by band_id
  ) a on a.band_id = e.band_id
),
global_counts as (
  select
    'A_global_counts'::text as report_section,
    'repertoire_styles + band_repertoire_styles'::text as key,
    '319 active / 3 archived / 322 total / 340 assignments'::text as expected,
    (select count(*) from public.repertoire_styles where status = 'active')::text || ' active / ' ||
    (select count(*) from public.repertoire_styles where status <> 'active')::text || ' archived / ' ||
    (select count(*) from public.repertoire_styles)::text || ' total / ' ||
    (select count(*) from public.band_repertoire_styles)::text || ' assignments' as actual,
    (select count(*) from public.repertoire_styles where status = 'active') = 319
    and (select count(*) from public.repertoire_styles where status <> 'active') = 3
    and (select count(*) from public.repertoire_styles) = 322
    and (select count(*) from public.band_repertoire_styles) = 340 as match
)
select * from style_rows
union all
select * from assignment_rows
union all
select * from double_assignment_check
union all
select * from rename_collision_check
union all
select * from protected_fp_rows
union all
select * from global_counts
order by report_section, key;


-- ============================================================
-- ABSCHNITT B -- POSTFLIGHT (nach erfolgreicher Migration)
-- ============================================================

with archived_sources (key, id, slug) as (
  values
    ('Merge1 Quelle: Bayerisch & international',        'a2028e17-4363-4530-a639-8dd61615d1a7'::uuid, 'bayerisch-international'),
    ('Merge2 Quelle: Alpenrock & Volksmusik',             '2a01cd55-cddf-4162-87df-38759881f4fe'::uuid, 'alpenrock-volksmusik'),
    ('Merge3 Quelle: Alpenrock bis Schlager',              'c19dc3fa-d633-4c37-876c-2320060fe5b1'::uuid, 'alpenrock-bis-schlager'),
    ('Merge4 Quelle A: Klassiker & aktuelle Hits',         '56ac12e6-f250-4adb-9814-cb0742dc082f'::uuid, 'klassiker-aktuelle-hits'),
    ('Merge4 Quelle B: Aktuelle Hits & Klassiker',         '4a364f68-e14f-43ee-957e-9c4836e98317'::uuid, 'aktuelle-hits-klassiker'),
    ('Merge4 Quelle C: Klassiker bis aktuelle Hits',       '9b23bc57-f937-458c-80b2-c871ad2659bc'::uuid, 'klassiker-bis-aktuelle-hits'),
    ('Merge5 Quelle: Aktuelle Charts & Evergreens',        '0a02fd63-1d3f-41cb-ba5c-f725b19b79c6'::uuid, 'aktuelle-charts-evergreens'),
    ('Merge6 Quelle: Party-Hits & Evergreens',             'a97585f5-bb3d-4b70-a85e-45af2ad34984'::uuid, 'party-hits-evergreens'),
    ('Merge7 Quelle: Volksmusik bis Rock-Klassiker',       'd118c3b2-41ff-4342-b831-dc96c9d46d69'::uuid, 'volksmusik-bis-rock-klassiker'),
    ('Merge8 Quelle: Schlager bis Rock-Klassiker',         'dee583b1-1543-4cc4-b8da-f49214dd5bf2'::uuid, 'schlager-bis-rock-klassiker')
),
archived_source_rows as (
  select
    'B_source_archived'::text as report_section,
    a.key,
    'status=archived, slug unveraendert, 0 Zuordnungen'::text as expected,
    coalesce('status=' || rs.status || ', slug=' || rs.slug, '(Zeile fehlt)') || ', ' ||
      (select count(*) from public.band_repertoire_styles where repertoire_style_id = a.id)::text || ' Zuordnungen' as actual,
    coalesce(rs.status = 'archived' and rs.slug = a.slug, false)
      and (select count(*) from public.band_repertoire_styles where repertoire_style_id = a.id) = 0 as match
  from archived_sources a
  left join public.repertoire_styles rs on rs.id = a.id
),
expected_target_assignments (key, style_id, band_pairs) as (
  values
    ('Ziel: Bayerisch bis international (nach Merge 1)', '4089444d-19f7-4de9-9852-03172bb89266'::uuid,
      array['8e5605ee-1be9-4094-9c9e-2310e0ea3fe4=3','679fa465-573f-41da-979e-3e943fdbb0ed=2','d63cbc29-077d-4005-a296-90caec77b1bf=2','cfaca43b-a3a5-4d8f-85fc-a829a014f91f=2','a954938c-0c34-4ab3-a379-0a5e09c5b8fd=2']),
    ('Ziel: Volksmusik bis Alpenrock (nach Merge 2)', 'afa1967d-e581-4e41-bfb5-849a465a16ab'::uuid,
      array['ba000002-0000-0000-0000-000000000001=1','5e73f690-bb13-4be7-97a5-94874e5a2939=1']),
    ('Ziel: Alpenrock & Schlager (nach Merge 3)', '2055bc75-4205-41d5-8b19-cca0664c8127'::uuid,
      array['fd9e8fc3-2e6a-4ac6-baac-baf57c7d5a49=1','344bdf8a-bcd9-4325-9b44-714a65420672=1']),
    ('Ziel (geschuetzt): Klassiker & aktuelle Charts (nach Merge 4)', 'aa8edbf0-04b6-41f0-8a30-4c1d9e1cf6f1'::uuid,
      array['354e2447-41f0-487a-a46d-a2d209dc890b=1','c8a602f8-434c-4a7f-892f-1ea65cf54b54=3','1ef5a9aa-f6b6-4c63-9a42-d1b95e5062c7=1','d4a98980-e215-454a-b6c7-8dc9395bf6d9=1']),
    ('Ziel: Evergreens bis aktuelle Charts (nach Merge 5)', '7e6d57e7-f348-400c-ba2e-bb735c49119d'::uuid,
      array['a8206639-65be-476f-9dfd-6de10550af6a=2','bc44b34b-10c1-4532-bbad-ad5602295398=2']),
    ('Ziel: Partyhits & Evergreens (nach Merge 6)', 'fa2981cb-eef4-4e80-b3bc-0c02ec842f92'::uuid,
      array['9cf10b17-9190-4da6-8c8c-9b05a03469f2=3','21530533-f0a9-409e-9d78-9af3d4ce46c2=2']),
    ('Ziel: Volksmusik bis Rockklassiker (nach Merge 7)', 'a74f64d5-8a2f-47aa-881c-8ad13f75c84b'::uuid,
      array['42cbccd1-4907-457e-a985-915471ef0723=1','e330f96c-ee21-4130-b7bb-fc6459918e94=1','21530533-f0a9-409e-9d78-9af3d4ce46c2=1','9cf10b17-9190-4da6-8c8c-9b05a03469f2=2','e48f142c-6ff5-4eb0-854f-8a0f9fb2d88f=1']),
    ('Ziel (geschuetzt): Rockklassiker & Schlager (nach Merge 8)', 'd88ed3aa-025a-44a2-aa6b-4566b02651df'::uuid,
      array['5c9bdb9e-d3ad-4950-aa22-7a3aedfb61db=2','5e73f690-bb13-4be7-97a5-94874e5a2939=2'])
),
target_assignment_rows as (
  select
    'B_target_assignments'::text as report_section,
    e.key,
    array_to_string(array(select unnest(e.band_pairs) order by 1), ',') as expected,
    coalesce(array_to_string(array(select unnest(a.pairs) order by 1), ','), '(keine Zuordnung)') as actual,
    coalesce(
      array(select unnest(a.pairs) order by 1) = array(select unnest(e.band_pairs) order by 1),
      false
    ) as match
  from expected_target_assignments e
  left join (
    select repertoire_style_id, array_agg(band_id::text || '=' || sort_order::text) as pairs
    from public.band_repertoire_styles
    group by repertoire_style_id
  ) a on a.repertoire_style_id = e.style_id
),
no_duplicate_target_check as (
  select
    'B_no_duplicate_band_per_target'::text as report_section,
    e.key,
    'count(band_id) = count(distinct band_id)'::text as expected,
    coalesce(count(brs.band_id)::text || ' Zeilen / ' || count(distinct brs.band_id)::text || ' verschiedene Bands', '0 Zeilen / 0 Bands') as actual,
    coalesce(count(brs.band_id) = count(distinct brs.band_id), true) as match
  from expected_target_assignments e
  left join public.band_repertoire_styles brs on brs.repertoire_style_id = e.style_id
  group by e.key
),
rename_rows as (
  select
    'B_rename_applied'::text as report_section,
    z.new_name as key,
    'name=' || z.new_name || ', slug unveraendert=' || z.old_slug || ', status=active'::text as expected,
    coalesce('name=' || rs.name || ', slug=' || rs.slug || ', status=' || rs.status, '(Zeile fehlt)') as actual,
    coalesce(rs.name = z.new_name and rs.slug = z.old_slug and rs.status = 'active', false) as match
  from (
    values
      ('Charts & Klassiker', 'charts-klassiker-gemischt', '36920071-d602-491f-85a1-ab8fefc7ebd6'::uuid),
      ('Schlager & Rock', 'schlager-rock-gemischt', '0f7e367a-680a-461a-b9c6-eceeab86e1d6'::uuid),
      ('Bayerisch & Rock', 'bayerisch-rock-gemischt', 'a8138c0e-2139-40ee-810e-eb6077e7784a'::uuid)
  ) as z(new_name, old_slug, id)
  left join public.repertoire_styles rs on rs.id = z.id
),
rename_name_exactly_once as (
  select
    'B_rename_name_exactly_once'::text as report_section,
    new_name as key,
    '1 aktive Zeile mit diesem Namen'::text as expected,
    (select count(*) from public.repertoire_styles where name = new_name and status = 'active')::text || ' Zeile(n)' as actual,
    (select count(*) from public.repertoire_styles where name = new_name and status = 'active') = 1 as match
  from (values ('Charts & Klassiker'), ('Schlager & Rock'), ('Bayerisch & Rock')) as x(new_name)
),
old_gemischt_name_gone as (
  select
    'B_old_gemischt_name_gone'::text as report_section,
    old_name as key,
    '0 aktive Zeilen mit diesem Namen'::text as expected,
    (select count(*) from public.repertoire_styles where name = old_name and status = 'active')::text || ' Zeile(n)' as actual,
    (select count(*) from public.repertoire_styles where name = old_name and status = 'active') = 0 as match
  from (values ('Charts & Klassiker gemischt'), ('Schlager & Rock gemischt'), ('Bayerisch & Rock gemischt')) as x(old_name)
),
expected_protected_fp_post (band_name, band_id, pairs) as (
  values
    ('2 unplugged',    'f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid, array['48ed59a1-8294-402b-a977-b62fac3f1d0c=1','7794ffc9-b050-4feb-b7cf-890fbcf4c38f=3','da5a3b39-d28f-40b8-9d9a-02c0f2466ed6=2']),
    ('5toBeat',        '354e2447-41f0-487a-a46d-a2d209dc890b'::uuid, array['4182d9d5-95d9-4ab9-b242-f988bb91bd3c=2','aa8edbf0-04b6-41f0-8a30-4c1d9e1cf6f1=1']),
    ('9to5',           '098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid, array['62710caf-ae8d-48ee-ace2-b448618e5b2a=1','c0b1dc22-66a6-4c8c-9a93-6dcdc87fb853=3','ef7a8419-c5b0-4ba0-ac01-4e38a7c8af08=2']),
    ('Entprima Live',  '82acc533-07d3-4479-82fe-31983711a3e0'::uuid, array['a14b5f7b-d9be-41da-b531-2266b41fc850=1','e35567e8-271a-4094-b27a-1312649ffec9=2']),
    ('Herbn Beets',    '332dfade-6e61-4f6e-b33d-23a03b610d24'::uuid, array['1c0caa4d-f68b-47ed-9c73-5ee745838841=2','d22fa0b1-bdc9-4a88-854d-0ccf3d00f8c1=1']),
    ('Hob Nou',        '65a12d3a-c654-46b7-b738-0feb94fc7e8a'::uuid, array['99c99d12-58c4-4f8e-a02e-0f7202ac1937=2','ef09bb47-ab81-46a1-8d71-48b0318a5228=1']),
    ('SaKrisch',       '5c9bdb9e-d3ad-4950-aa22-7a3aedfb61db'::uuid, array['2c1ee950-4171-40e0-9bd1-ffbb047cf8e2=1','cf64fe78-d8c9-429c-94ea-a3cc20dd79f1=3','d88ed3aa-025a-44a2-aa6b-4566b02651df=2'])
),
protected_fp_rows_post as (
  select
    'B_protected_band_fingerprint'::text as report_section,
    e.band_name as key,
    array_to_string(e.pairs, ',') as expected,
    coalesce(array_to_string(a.pairs, ','), '(keine Zuordnung)') as actual,
    coalesce(a.pairs = e.pairs, false) as match
  from expected_protected_fp_post e
  left join (
    select band_id, array_agg(repertoire_style_id::text || '=' || sort_order::text order by repertoire_style_id) as pairs
    from public.band_repertoire_styles
    group by band_id
  ) a on a.band_id = e.band_id
),
excluded_unchanged (key, id, expected_name, expected_slug) as (
  values
    ('Ausgeschlossen: Pop-Rock & Evergreens',        '0'::text, 'Pop-Rock & Evergreens', 'pop-rock-evergreens'),
    ('Ausgeschlossen: Rock & Pop-Evergreens',         '0'::text, 'Rock & Pop-Evergreens', 'rock-pop-evergreens'),
    ('Ausgeschlossen: Eigene Arrangements',           '0'::text, 'Eigene Arrangements', 'eigene-arrangements'),
    ('Ausgeschlossen: Eigene Songs & Covers',         '0'::text, 'Eigene Songs & Covers', 'eigene-songs-covers'),
    ('Ausgeschlossen: Charts von 60s bis heute (9to5, geschuetzt)', '0'::text, 'Charts von 60s bis heute', 'charts-von-60s-bis-heute'),
    ('Ausgeschlossen: 60er bis aktuelle Charts',      '0'::text, '60er bis aktuelle Charts', '60er-bis-aktuelle-charts'),
    ('Ausgeschlossen: Oktoberfest & Après-Ski',       '0'::text, 'Oktoberfest & Après-Ski', 'oktoberfest-apr-s-ski'),
    ('Ausgeschlossen: Wiesn-Hits bis Pop-Crossover',  '0'::text, 'Wiesn-Hits bis Pop-Crossover', 'wiesn-hits-bis-pop-crossover'),
    ('Ausgeschlossen: Oktoberfest-Hits',              '0'::text, 'Oktoberfest-Hits', 'oktoberfest-hits'),
    ('Ausgeschlossen: Wiesn trifft Mainstream',       '0'::text, 'Wiesn trifft Mainstream', 'wiesn-trifft-mainstream')
),
excluded_rows as (
  select
    'B_excluded_unchanged'::text as report_section,
    e.key,
    'name=' || e.expected_name || ', slug=' || e.expected_slug || ', status=active, unveraendert'::text as expected,
    coalesce('name=' || rs.name || ', slug=' || rs.slug || ', status=' || rs.status, '(Zeile fehlt)') as actual,
    coalesce(rs.name = e.expected_name and rs.slug = e.expected_slug and rs.status = 'active', false) as match
  from excluded_unchanged e
  left join public.repertoire_styles rs on rs.slug = e.expected_slug
),
lets_fetz_executed_state as (
  select
    'B_lets_fetz_executed_state'::text as report_section,
    'Bayerisch bis Aktuell bleibt unveraendert (kein Beleg, B-Punkt)'::text as key,
    'status=active, slug unveraendert, weiterhin Lets Fetz zugeordnet'::text as expected,
    coalesce('status=' || rs.status || ', slug=' || rs.slug || ', zugeordnet=' ||
      case when exists (select 1 from public.band_repertoire_styles where repertoire_style_id = rs.id and band_id = '5696d179-4151-47e4-96ba-f65ab87c234b'::uuid)
           then 'ja' else 'nein' end, '(Zeile fehlt)') as actual,
    coalesce(rs.status = 'active' and rs.slug = 'bayerisch-bis-aktuell'
      and exists (select 1 from public.band_repertoire_styles where repertoire_style_id = rs.id and band_id = '5696d179-4151-47e4-96ba-f65ab87c234b'::uuid), false) as match
  from public.repertoire_styles rs
  where rs.id = 'f913ca6b-4f56-4f7f-b6be-53824e7bf880'::uuid
),
lets_fetz_alternative_state as (
  -- Informative Alternative, NICHT von dieser Migration umgesetzt: nur
  -- relevant, falls ein spaeterer, separater Merge (bei nachtraeglich
  -- gefundenem Beleg) durchgefuehrt wuerde. match=false ist hier der
  -- ERWARTETE Wert fuer diese Migration.
  select
    'B_lets_fetz_alternative_state'::text as report_section,
    'Bayerisch bis Aktuell zusammengefuehrt (NICHT Teil dieser Migration)'::text as key,
    'match=false erwartet, da diese Migration keinen Lets-Fetz-Merge durchfuehrt'::text as expected,
    case when not exists (select 1 from public.repertoire_styles where id = 'f913ca6b-4f56-4f7f-b6be-53824e7bf880'::uuid and status = 'active')
         then 'Quelle nicht mehr aktiv -- ALTERNATIVER Zustand liegt vor (nicht diese Migration)'
         else 'Quelle weiterhin aktiv (erwarteter Zustand dieser Migration)' end as actual,
    exists (select 1 from public.repertoire_styles where id = 'f913ca6b-4f56-4f7f-b6be-53824e7bf880'::uuid and status = 'active') as match
),
global_counts_post as (
  select
    'B_global_counts'::text as report_section,
    'repertoire_styles + band_repertoire_styles'::text as key,
    '309 active / 13 archived / 322 total / 340 assignments'::text as expected,
    (select count(*) from public.repertoire_styles where status = 'active')::text || ' active / ' ||
    (select count(*) from public.repertoire_styles where status <> 'active')::text || ' archived / ' ||
    (select count(*) from public.repertoire_styles)::text || ' total / ' ||
    (select count(*) from public.band_repertoire_styles)::text || ' assignments' as actual,
    (select count(*) from public.repertoire_styles where status = 'active') = 309
    and (select count(*) from public.repertoire_styles where status <> 'active') = 13
    and (select count(*) from public.repertoire_styles) = 322
    and (select count(*) from public.band_repertoire_styles) = 340 as match
),
orphan_check as (
  select
    'B_no_orphaned_join_rows'::text as report_section,
    'band_repertoire_styles ohne existierende repertoire_styles-Zeile'::text as key,
    '0 verwaiste Zeilen'::text as expected,
    count(*)::text || ' verwaiste Zeile(n)' as actual,
    count(*) = 0 as match
  from public.band_repertoire_styles brs
  left join public.repertoire_styles rs on rs.id = brs.repertoire_style_id
  where rs.id is null
)
select * from archived_source_rows
union all
select * from target_assignment_rows
union all
select * from no_duplicate_target_check
union all
select * from rename_rows
union all
select * from rename_name_exactly_once
union all
select * from old_gemischt_name_gone
union all
select * from protected_fp_rows_post
union all
select * from excluded_rows
union all
select * from lets_fetz_executed_state
union all
select * from lets_fetz_alternative_state
union all
select * from global_counts_post
union all
select * from orphan_check
order by report_section, key;
