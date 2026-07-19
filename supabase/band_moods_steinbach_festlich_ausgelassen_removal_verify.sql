-- ============================================================
-- band_moods_steinbach_festlich_ausgelassen_removal_verify.sql
--
-- Eigenstaendige Read-only-Verifikation zur STEINBACH-Schluss-
-- entscheidung (supabase/band_moods_steinbach_festlich_ausgelassen_
-- removal.sql). SEPARAT im Supabase SQL Editor auszufuehren -- nicht
-- Teil der Migration. Vollstaendig read-only, beliebig oft
-- wiederholbar, keine Temp-Table-Abhaengigkeit.
--
-- Noch NICHT ausgefuehrt -- kein Ausfuehrungs- und
-- Verifikationsvermerk vorhanden. Wird nach Ausfuehrung durch Xandi
-- ergaenzt (analog zu den bestehenden *_verify.sql-Dateien).
-- ============================================================

with expected (band_name, band_id, mood_slug, sort_order) as (
  values
    ('Bigband STEINBACH', '236d642f-7b8d-48c0-a7cf-6e81fbac869b'::uuid, 'tanzflaechen-garantie', 0),
    ('Bigband STEINBACH', '236d642f-7b8d-48c0-a7cf-6e81fbac869b'::uuid, 'konzertant-hochwertig', 0),
    ('Bigband STEINBACH', '236d642f-7b8d-48c0-a7cf-6e81fbac869b'::uuid, 'brass-power', 0)
),
-- expected_agg/actual_agg aggregieren jeweils die Kombination aus
-- slug UND sort_order (nicht nur den Slug) als deterministisch nach
-- Slug sortiertes "slug=sort_order"-Array -- exakt dasselbe NULL-
-- sichere Muster wie die Pre-/Postcheck-Guards in
-- band_moods_steinbach_festlich_ausgelassen_removal.sql. Dadurch
-- fuehrt eine richtige Slug-Menge mit falschem sort_order ebenfalls
-- zu match = false, nicht nur eine falsche oder fehlende Zuordnung.
expected_agg as (
  select band_name, band_id,
         array_agg(mood_slug || '=' || sort_order::text order by mood_slug) as expected_pairs,
         count(*) as expected_count
  from expected
  group by band_name, band_id
),
actual_agg as (
  select bm.band_id,
         array_agg(m.slug || '=' || bm.sort_order::text order by m.slug) as actual_pairs,
         count(*) as actual_count
  from public.band_moods bm
  join public.moods m on m.id = bm.mood_id
  where bm.band_id in (select distinct band_id from expected)
  group by bm.band_id
),
band_row as (
  select
    'steinbach_post_removal'::text as report_section,
    e.band_name as key,
    array_to_string(e.expected_pairs, ',') || ' (n=' || e.expected_count || ')' as expected,
    coalesce(array_to_string(a.actual_pairs, ','), '(keine Zeilen)') || ' (n=' || coalesce(a.actual_count, 0) || ')' as actual,
    coalesce(a.actual_pairs = e.expected_pairs and a.actual_count = e.expected_count, false) as match
  from expected_agg e
  left join actual_agg a on a.band_id = e.band_id
),
removed_check as (
  select
    'festlich_ausgelassen_removed'::text as report_section,
    'Bigband STEINBACH'::text as key,
    '0 Zeilen (Festlich und ausgelassen entfernt)'::text as expected,
    count(*)::text || ' Zeilen gefunden' as actual,
    count(*) = 0 as match
  from public.band_moods bm
  join public.moods m on m.id = bm.mood_id
  where bm.band_id = '236d642f-7b8d-48c0-a7cf-6e81fbac869b'::uuid
    and m.slug = 'festlich-ausgelassen'
),
summary_row as (
  select
    'summary'::text as report_section,
    'summary'::text as key,
    '3 verbleibende Zeilen (unveraendert bei sort_order 0), Festlich und ausgelassen entfernt'::text as expected,
    (select actual from band_row) || '; ' || (select actual from removed_check) as actual,
    (select match from band_row) and (select match from removed_check) as match
)
select * from band_row
union all
select * from removed_check
union all
select * from summary_row
order by report_section;
