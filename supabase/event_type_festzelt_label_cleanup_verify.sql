-- ============================================================
-- event_type_festzelt_label_cleanup_verify.sql
--
-- Eigenstaendige Read-only-Verifikation zur Namenskuerzung
-- "Festzelt & Volksfest" -> "Festzelt" fuer event_types.slug='festzelt'
-- (supabase/event_type_festzelt_label_cleanup.sql). SEPARAT im
-- Supabase SQL Editor auszufuehren -- nicht Teil der Migration.
-- Vollstaendig read-only, beliebig oft wiederholbar, keine Temp-
-- Table-Abhaengigkeit. Identisches Format wie
-- supabase/band_moods_steinbach_festlich_ausgelassen_removal_verify.sql
-- (report_section/key/expected/actual/match).
--
-- Diese Datei prueft den gewuenschten ZIELZUSTAND und ist bewusst
-- jederzeit sinnvoll ausfuehrbar -- unabhaengig davon, ob die
-- zugehoerige Migration jemals ausgefuehrt wurde: laut read-only
-- Production-Preflight vom 03.08.2026 ist event_types.name fuer
-- slug='festzelt' bereits "Festzelt" (siehe Dateikommentar der
-- Migration). Alle Zeilen unten sollten daher schon vor einer
-- Ausfuehrung der Migration match = true zeigen.
--
-- Die aktuelle Zahl der band_event_types-Zuordnungen wird nur
-- informativ ausgegeben. Sie ist kein fixer Sollwert, weil regulaere
-- Kuration die Anzahl jederzeit aendern darf und die Migration selbst
-- ausschliesslich public.event_types.name aktualisiert.
-- ============================================================

with expected (key, id) as (
  values
    ('event_types.slug=festzelt', 'e0000001-0000-0000-0000-000000000002'::uuid)
),
row_state as (
  select
    'A_row_state'::text as report_section,
    e.key,
    'genau 1 Zeile, name=Festzelt, slug=festzelt, id unveraendert'::text as expected,
    coalesce(
      'count=' || (select count(*) from public.event_types where slug = 'festzelt')::text
      || ', name=' || et.name
      || ', slug=' || et.slug
      || ', id=' || et.id::text,
      '(keine Zeile mit slug=festzelt gefunden)'
    ) as actual,
    coalesce(
      (select count(*) from public.event_types where slug = 'festzelt') = 1
      and et.name = 'Festzelt'
      and et.slug = 'festzelt'
      and et.id = e.id,
      false
    ) as match
  from expected e
  left join public.event_types et on et.id = e.id
),
old_name_gone as (
  select
    'B_old_name_gone'::text as report_section,
    'Festzelt & Volksfest'::text as key,
    '0 Zeilen mit diesem Namen'::text as expected,
    (select count(*) from public.event_types where name = 'Festzelt & Volksfest')::text || ' Zeile(n)' as actual,
    (select count(*) from public.event_types where name = 'Festzelt & Volksfest') = 0 as match
),
no_duplicate_label as (
  select
    'C_no_duplicate_event_type_name'::text as report_section,
    'Festzelt'::text as key,
    'genau 1 Zeile mit diesem Namen (keine Dopplung durch diese Aenderung)'::text as expected,
    (select count(*) from public.event_types where name = 'Festzelt')::text || ' Zeile(n)' as actual,
    (select count(*) from public.event_types where name = 'Festzelt') = 1 as match
),
assignments_current_state as (
  select
    'D_band_event_types_current_state'::text as report_section,
    'Bandzuordnungen zur unveraenderten event_type_id'::text as key,
    'event_type_id unveraendert; aktuelle Zuordnungszahl nur informativ'::text as expected,
    count(bet.band_id)::text || ' Zuordnung(en) zu event_type_id=' || e.id::text as actual,
    coalesce(et.id = e.id and et.slug = 'festzelt', false) as match
  from expected e
  left join public.event_types et
    on et.id = e.id
   and et.slug = 'festzelt'
  left join public.band_event_types bet
    on bet.event_type_id = e.id
  group by e.id, et.id, et.slug
)
select * from row_state
union all
select * from old_name_gone
union all
select * from no_duplicate_label
union all
select * from assignments_current_state
order by report_section, key;
