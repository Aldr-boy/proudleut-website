-- ============================================================
-- moods_b2_verify.sql
--
-- Eigenstaendige Read-only-Verifikation zu Paket B2
-- (supabase/moods_b2_migration.sql). SEPARAT im Supabase SQL Editor
-- auszufuehren -- nicht Teil der Migration. Vollstaendig read-only,
-- beliebig oft wiederholbar, keine Temp-Table-Abhaengigkeit, kein
-- hart codierter band_moods-Count. Fingerprint-Berechnung identisch
-- zu Pre-Snapshot und Migration (NULL-sicher).
-- ============================================================

with target_mood_expected (slug, name, description, sort_order) as (
  values
    ('festzeltenergie', 'Festzeltenergie', 'Bierzelt-Vollgas: laut, deftig, gemeinschaftlich und auf Volksfeststimmung ausgerichtet.', 1),
    ('bayerisch-frech', 'Bayerisch & frech', 'Dialekt, regionaler Charakter, Schmäh und Augenzwinkern prägen Auftritt, Musik oder Ansagen.', 2),
    ('party-pur', 'Party pur', 'Hohe Energiedichte und Feiermodus prägen den Auftritt; Animation, bekannte Partynummern und gemeinsames Feiern stehen deutlich vor Konzert- oder Hintergrundcharakter.', 3),
    ('tanzflaechen-garantie', 'Tanzflächen-Garantie', 'Repertoire und Dramaturgie sind gezielt darauf ausgerichtet, die Tanzfläche zu füllen und in Bewegung zu halten.', 4),
    ('konzertant-hochwertig', 'Konzertant & hochwertig', 'Musikalische Qualität, Arrangement und bewusstes Zuhören stehen im Vordergrund; Animation und reine Partystimmung sind nicht der Hauptzweck.', 5),
    ('generationenverbindend', 'Generationenverbindend', 'Repertoire und Auftreten schaffen Anknüpfungspunkte über mehrere Altersgruppen hinweg.', 6),
    ('herzlich-nahbar', 'Herzlich & nahbar', 'Die Band wirkt warm und zugänglich; Gäste fühlen sich persönlich angesprochen statt lediglich beschallt.', 8),
    ('mitsing-faktor', 'Mitsing-Faktor', 'Bekannte Melodien, Refrains oder Interaktion laden das Publikum aktiv zum Mitsingen ein.', 9),
    ('lagerfeuer-atmosphaere', 'Lagerfeuer-Atmosphäre', 'Intim, entschleunigt und häufig akustisch geprägt — Musik, die Nähe schafft und zum Zusammenrücken einlädt.', 10),
    ('festlich-ausgelassen', 'Festlich und ausgelassen', 'Ein feierlicher oder gehobener Rahmen entwickelt sich im Verlauf zu offener, ausgelassener Stimmung — typisch für Hochzeit, Ball oder Jubiläum.', 11),
    ('authentisch-handgemacht', 'Authentisch und handgemacht', 'Ehrliches Live-Spiel und ein organischer Bandsound stehen vor Show-Fassade oder stark vorproduzierter Wirkung.', 13),
    ('rockig-mitreissend', 'Rockig & mitreißend', 'Ein kraftvoller, rockorientierter Bandsound packt das Publikum durch Druck, Dynamik und Energie.', 16),
    ('emotional-beruehrend', 'Emotional & berührend', 'Die Musik erzeugt bewusst Gänsehaut und berührt emotional — etwa bei Trauungen, stillen Momenten oder persönlichen Liedern.', 17)
),
target_mood_rows as (
  select
    'target_mood'::text as report_section,
    e.slug as key,
    e.name || ' | active | sort_order=' || e.sort_order || ' | description vorhanden' as expected,
    coalesce(m.name, '(fehlt)') || ' | ' || coalesce(m.status, '(fehlt)') || ' | sort_order=' || coalesce(m.sort_order::text, '(fehlt)') || ' | ' ||
      case when m.description is not null then 'description vorhanden' else 'description NULL' end as actual,
    coalesce(m.name = e.name and m.status = 'active' and m.sort_order = e.sort_order and m.description = e.description, false) as match
  from target_mood_expected e
  left join public.moods m on m.slug = e.slug
),
archived_expected (slug, name, sort_order) as (
  values
    ('publikumsnaehe', 'Publikumsnähe', 7),
    ('tradition', 'Tradition', 12),
    ('vielseitig', 'Vielseitig', 15)
),
archived_rows as (
  select
    'archived_deactivation'::text as report_section,
    e.slug as key,
    e.name || ' | archived | sort_order=' || e.sort_order as expected,
    coalesce(m.status, '(fehlt)') || ' | name=' || coalesce(m.name, '(fehlt)') || ' | sort_order=' || coalesce(m.sort_order::text, '(fehlt)') as actual,
    coalesce(m.status = 'archived' and m.name = e.name and m.sort_order = e.sort_order, false) as match
  from archived_expected e
  left join public.moods m on m.slug = e.slug
),
brass_power_expected (slug) as (
  values ('brass-power')
),
brass_power_row as (
  select
    'brass_power_unchanged'::text as report_section,
    e.slug as key,
    'active | sort_order=14 | description NULL' as expected,
    coalesce(m.status, '(fehlt)') || ' | sort_order=' || coalesce(m.sort_order::text, '(fehlt)') || ' | ' ||
      case when m.id is null then '(Datensatz fehlt)'
           when m.description is null then 'description NULL'
           else 'description vorhanden' end as actual,
    coalesce(m.status = 'active' and m.sort_order = 14 and m.description is null, false) as match
  from brass_power_expected e
  left join public.moods m on m.slug = e.slug
),
existing_sort_order_expected (slug, sort_order) as (
  values
    ('festzeltenergie', 1), ('bayerisch-frech', 2), ('party-pur', 3),
    ('tanzflaechen-garantie', 4), ('konzertant-hochwertig', 5),
    ('generationenverbindend', 6), ('publikumsnaehe', 7),
    ('herzlich-nahbar', 8), ('mitsing-faktor', 9),
    ('lagerfeuer-atmosphaere', 10), ('festlich-ausgelassen', 11),
    ('tradition', 12), ('authentisch-handgemacht', 13),
    ('brass-power', 14), ('vielseitig', 15)
),
existing_sort_order_rows as (
  select
    'existing_sort_order_protection'::text as report_section,
    e.slug as key,
    'sort_order=' || e.sort_order || ' (unveraendert)' as expected,
    coalesce('sort_order=' || m.sort_order::text, '(fehlt)') as actual,
    coalesce(m.sort_order is not distinct from e.sort_order, false) as match
  from existing_sort_order_expected e
  left join public.moods m on m.slug = e.slug
),
counts as (
  select
    count(*) filter (where status = 'active') as active_count,
    count(*) filter (where status = 'archived') as archived_count,
    count(*) as total_count,
    count(*) filter (where status = 'active' and description is not null and description <> '') as active_with_description_count
  from public.moods
),
counts_row as (
  select
    'mood_counts'::text as report_section,
    'summary'::text as key,
    '14 active | 9 archived | 23 total | 13 active mit description' as expected,
    active_count || ' active | ' || archived_count || ' archived | ' || total_count || ' total | ' || active_with_description_count || ' active mit description' as actual,
    (active_count = 14 and archived_count = 9 and total_count = 23 and active_with_description_count = 13) as match
  from counts
),
active_slug_set as (
  select
    'active_slug_set'::text as report_section,
    'snapshot'::text as key,
    'authentisch-handgemacht,bayerisch-frech,brass-power,emotional-beruehrend,festlich-ausgelassen,festzeltenergie,generationenverbindend,herzlich-nahbar,konzertant-hochwertig,lagerfeuer-atmosphaere,mitsing-faktor,party-pur,rockig-mitreissend,tanzflaechen-garantie' as expected,
    coalesce((select string_agg(slug, ',' order by slug) from public.moods where status = 'active'), '') as actual,
    coalesce((select string_agg(slug, ',' order by slug) from public.moods where status = 'active'), '') =
      'authentisch-handgemacht,bayerisch-frech,brass-power,emotional-beruehrend,festlich-ausgelassen,festzeltenergie,generationenverbindend,herzlich-nahbar,konzertant-hochwertig,lagerfeuer-atmosphaere,mitsing-faktor,party-pur,rockig-mitreissend,tanzflaechen-garantie' as match
),
archived_slug_set as (
  select
    'archived_slug_set'::text as report_section,
    'snapshot'::text as key,
    'aufregend,bewegend,energiegeladen,mitreissend,pfundig,publikumsnaehe,tradition,traditionell,vielseitig' as expected,
    coalesce((select string_agg(slug, ',' order by slug) from public.moods where status = 'archived'), '') as actual,
    coalesce((select string_agg(slug, ',' order by slug) from public.moods where status = 'archived'), '') =
      'aufregend,bewegend,energiegeladen,mitreissend,pfundig,publikumsnaehe,tradition,traditionell,vielseitig' as match
),
band_moods_fingerprint as (
  select
    'band_moods_fingerprint'::text as report_section,
    'live'::text as key,
    'gegen den in der Migrationsausgabe protokollierten Vorher-Wert bzw. den B2-Pre-Snapshot manuell abgleichen -- kein hart codierter Erwartungswert moeglich' as expected,
    'count=' || count(*) || ' fingerprint=' || md5(coalesce(string_agg(
      band_id::text || ':' || mood_id::text || ':' || coalesce(sort_order::text, '<NULL>'),
      ',' order by band_id, mood_id, sort_order nulls first
    ), '')) as actual,
    null::boolean as match
  from public.band_moods
)
select * from target_mood_rows
union all
select * from archived_rows
union all
select * from brass_power_row
union all
select * from existing_sort_order_rows
union all
select * from counts_row
union all
select * from active_slug_set
union all
select * from archived_slug_set
union all
select * from band_moods_fingerprint
order by report_section, key;
