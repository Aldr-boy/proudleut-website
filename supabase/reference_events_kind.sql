-- ============================================================
-- reference_events_kind.sql
--
-- Status: NOCH NICHT AUSGEFUEHRT -- vorbereitet zur manuellen Ausfuehrung
-- durch den Repo-Owner im Supabase SQL Editor (Production).
--
-- Zweck: Jede Referenz bekommt eine "Art" ('hochzeit' oder 'sonstiges').
-- Hochzeits-Referenzen erscheinen auf der Bandseite im Hochzeitsblock
-- statt in "Hier haben wir gespielt".
--
-- Nur ERGAENZEND, nichts Bestehendes wird geaendert oder geloescht:
--   1. Neue Spalte public.reference_events.kind (text, NOT NULL, Standard
--      'sonstiges', CHECK nur 'hochzeit' | 'sonstiges'). Alle bestehenden
--      Zeilen erhalten dadurch 'sonstiges'.
--   2. Zwei NEUE Ueberladungen (eigenstaendige Funktionen):
--        fn_reference_event_create(uuid, text, text, text, integer, text, text)
--        fn_reference_event_update(uuid, uuid, text, text, text, integer, text, text)
--      jeweils mit p_kind als letztem Argument.
--   Die vier bisherigen Fassungen (5-/6-Arg create, 6-/7-Arg update) bleiben
--   unveraendert bestehen. Sie lassen kind unberuehrt: create nutzt den
--   Spaltenstandard 'sonstiges', update aendert kind nicht. Der bisherige
--   Code und alte Aufrufe laufen deshalb unveraendert weiter.
--
-- Mehrfach ausfuehrbar (idempotent): ADD COLUMN IF NOT EXISTS, Constraint
-- nur falls nicht vorhanden, CREATE OR REPLACE FUNCTION, REVOKE/GRANT
-- wiederholbar. Alles in einer Transaktion: bei einem Fehler wird nichts
-- uebernommen.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Spalte kind
-- ------------------------------------------------------------
alter table public.reference_events
  add column if not exists kind text not null default 'sonstiges';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reference_events_kind_check'
      and conrelid = 'public.reference_events'::regclass
  ) then
    alter table public.reference_events
      add constraint reference_events_kind_check
      check (kind in ('hochzeit', 'sonstiges'));
  end if;
end
$$;

-- ------------------------------------------------------------
-- 2a. fn_reference_event_create -- NEUE Ueberladung mit p_kind
-- ------------------------------------------------------------
create or replace function public.fn_reference_event_create(
  p_band_id uuid,
  p_event_name text,
  p_location_name text,
  p_city text,
  p_year integer,
  p_description text,
  p_kind text
)
returns public.reference_events
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_event_name       text;
  v_location_name    text;
  v_city             text;
  v_description      text;
  v_kind             text;
  v_next_sort_order  integer;
  v_row              public.reference_events;
begin
  perform 1 from public.bands b where b.id = p_band_id for update;
  if not found then
    raise exception 'reference_event_band_not_found'
      using errcode = 'RE001',
            detail = format('band_id=%s not found in public.bands', p_band_id);
  end if;

  v_event_name := coalesce(trim(p_event_name), '');
  if v_event_name = '' then
    raise exception 'reference_event_name_required'
      using errcode = 'RE002',
            detail = 'event_name must not be empty after trim';
  end if;

  v_location_name := nullif(trim(coalesce(p_location_name, '')), '');
  v_city := nullif(trim(coalesce(p_city, '')), '');
  v_description := nullif(trim(coalesce(p_description, '')), '');
  v_kind := coalesce(nullif(trim(coalesce(p_kind, '')), ''), 'sonstiges');

  if v_kind not in ('hochzeit', 'sonstiges') then
    raise exception 'reference_event_kind_invalid'
      using errcode = 'RE007',
            detail = format('kind=%s, expected hochzeit or sonstiges', p_kind);
  end if;

  if p_year is not null and (p_year < 1900 or p_year > 2100) then
    raise exception 'reference_event_year_out_of_range'
      using errcode = 'RE003',
            detail = format('year=%s, expected between 1900 and 2100', p_year);
  end if;

  select coalesce(max(sort_order), 0) + 1
    into v_next_sort_order
  from public.reference_events
  where band_id = p_band_id;

  insert into public.reference_events (
    band_id, event_name, location_name, city, year, description, kind, sort_order
  )
  values (
    p_band_id, v_event_name, v_location_name, v_city, p_year, v_description, v_kind, v_next_sort_order
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- 2b. fn_reference_event_update -- NEUE Ueberladung mit p_kind
-- ------------------------------------------------------------
create or replace function public.fn_reference_event_update(
  p_id uuid,
  p_band_id uuid,
  p_event_name text,
  p_location_name text,
  p_city text,
  p_year integer,
  p_description text,
  p_kind text
)
returns public.reference_events
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_existing_band_id uuid;
  v_event_name       text;
  v_location_name    text;
  v_city             text;
  v_description      text;
  v_kind             text;
  v_row              public.reference_events;
begin
  perform 1 from public.bands b where b.id = p_band_id for update;
  if not found then
    raise exception 'reference_event_band_not_found'
      using errcode = 'RE001',
            detail = format('band_id=%s not found in public.bands', p_band_id);
  end if;

  select re.band_id into v_existing_band_id
  from public.reference_events re
  where re.id = p_id
  for update;

  if not found then
    raise exception 'reference_event_not_found'
      using errcode = 'RE004',
            detail = format('id=%s not found in public.reference_events', p_id);
  end if;

  if v_existing_band_id is distinct from p_band_id then
    raise exception 'reference_event_wrong_band'
      using errcode = 'RE005',
            detail = format('id=%s belongs to band_id=%s, not %s', p_id, v_existing_band_id, p_band_id);
  end if;

  v_event_name := coalesce(trim(p_event_name), '');
  if v_event_name = '' then
    raise exception 'reference_event_name_required'
      using errcode = 'RE002',
            detail = 'event_name must not be empty after trim';
  end if;

  v_location_name := nullif(trim(coalesce(p_location_name, '')), '');
  v_city := nullif(trim(coalesce(p_city, '')), '');
  v_description := nullif(trim(coalesce(p_description, '')), '');
  v_kind := coalesce(nullif(trim(coalesce(p_kind, '')), ''), 'sonstiges');

  if v_kind not in ('hochzeit', 'sonstiges') then
    raise exception 'reference_event_kind_invalid'
      using errcode = 'RE007',
            detail = format('kind=%s, expected hochzeit or sonstiges', p_kind);
  end if;

  if p_year is not null and (p_year < 1900 or p_year > 2100) then
    raise exception 'reference_event_year_out_of_range'
      using errcode = 'RE003',
            detail = format('year=%s, expected between 1900 and 2100', p_year);
  end if;

  update public.reference_events
     set event_name    = v_event_name,
         location_name = v_location_name,
         city          = v_city,
         year          = p_year,
         description   = v_description,
         kind          = v_kind,
         updated_at    = now()
   where id = p_id
     and band_id = p_band_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- 3. Berechtigungen -- gleiches Muster wie fn_reference_events_admin.sql:
-- nur service_role darf die neuen Funktionen ausfuehren.
-- ------------------------------------------------------------
revoke all on function public.fn_reference_event_create(uuid, text, text, text, integer, text, text) from public;
revoke all on function public.fn_reference_event_create(uuid, text, text, text, integer, text, text) from anon;
revoke all on function public.fn_reference_event_create(uuid, text, text, text, integer, text, text) from authenticated;
grant execute on function public.fn_reference_event_create(uuid, text, text, text, integer, text, text) to service_role;

revoke all on function public.fn_reference_event_update(uuid, uuid, text, text, text, integer, text, text) from public;
revoke all on function public.fn_reference_event_update(uuid, uuid, text, text, text, integer, text, text) from anon;
revoke all on function public.fn_reference_event_update(uuid, uuid, text, text, text, integer, text, text) from authenticated;
grant execute on function public.fn_reference_event_update(uuid, uuid, text, text, text, integer, text, text) to service_role;

commit;

-- ------------------------------------------------------------
-- Kontrolle (nur lesend; liefert eine Ergebnistabelle im SQL Editor).
-- Erwartet: sonstiges = alle_referenzen, hochzeit = 0,
-- funktionsfassungen = 6 (create mit 5/6/7 und update mit 6/7/8 Argumenten).
-- ------------------------------------------------------------
select
  (select count(*) from public.reference_events)                          as alle_referenzen,
  (select count(*) from public.reference_events where kind = 'sonstiges') as sonstiges,
  (select count(*) from public.reference_events where kind = 'hochzeit')  as hochzeit,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('fn_reference_event_create', 'fn_reference_event_update')) as funktionsfassungen;
