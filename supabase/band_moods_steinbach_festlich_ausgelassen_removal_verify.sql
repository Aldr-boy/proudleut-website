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
expected_agg as (
  select band_name, band_id,
         array_agg(mood_slug order by mood_slug) as expected_slugs,
         count(*) as expected_count
  from expected
  group by band_name, band_id
),
actual_agg as (
  select bm.band_id,
         array_agg(m.slug order by m.slug) as actual_slugs,
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
    array_to_string(e.expected_slugs, ',') || ' (n=' || e.expected_count || ')' as expected,
    coalesce(array_to_string(a.actual_slugs, ','), '(keine Zeilen)') || ' (n=' || coalesce(a.actual_count, 0) || ')' as actual,
    coalesce(a.actual_slugs = e.expected_slugs and a.actual_count = e.expected_count, false) as match
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
