-- ============================================================
-- fn_moods_catalog_admin.sql
--
-- NOCH NICHT AUSGEFUEHRT. Versioniert vorbereitet fuer Paket 1
-- ("Klingt nach" im Admin -- minimale Mood-Katalogverwaltung).
-- Ausfuehrung erfolgt manuell durch Xandi im Supabase SQL Editor,
-- siehe Completion Report fuer die genaue Reihenfolge.
--
-- Sprint: Admin "Klingt nach" -- Mood-Katalogverwaltung (/admin/moods)
-- Datum des Entwurfs: 20.07.2026
--
-- Vier kleine, Mood-spezifische Funktionen statt einer generischen
-- Katalog-RPC (Auftrag: "keine generische Taxonomie-RPC", "keine
-- unnoetige Abstraktion") -- jede Funktion hat genau eine Aufgabe,
-- exakt wie public.set_similar_bands() eine einzelne, klar
-- abgegrenzte Aufgabe hat. Alle vier teilen sich dasselbe
-- Sicherheitsmodell (siehe unten).
--
-- Funktionen:
--   public.create_mood(p_name text, p_slug text, p_description text)
--     returns public.moods
--   public.update_mood(p_mood_id uuid, p_name text, p_description text)
--     returns public.moods
--   public.archive_mood(p_mood_id uuid)
--     returns public.moods
--   public.reactivate_mood(p_mood_id uuid)
--     returns public.moods
--
-- Warum der Slug als Parameter (nicht in SQL berechnet):
--   Die Slug-Erzeugung selbst ist eine reine Funktion des Namens ohne
--   Race-Condition-Risiko (anders als sort_order = max+1, das vom
--   aktuellen Tabellenzustand abhaengt) -- sie laeuft deterministisch
--   und getestet in lib/moods/slug.ts (node:test). Die Server Action
--   berechnet den Slug und uebergibt ihn; create_mood validiert Format
--   und Eindeutigkeit serverseitig/atomar (siehe unten) -- exakt das
--   bereits etablierte Muster aus app/admin/bands/new/actions.ts, wo
--   der Client-/Server-berechnete Slug ebenfalls serverseitig gegen
--   die UNIQUE-Constraint validiert wird.
--
-- sort_order = max + 1 (nur create_mood):
--   Race-frei durch LOCK TABLE public.moods IN SHARE ROW EXCLUSIVE
--   MODE zu Beginn der Funktion. public.moods ist eine kleine, selten
--   geschriebene Katalogtabelle -- ein kurzzeitiger Tabellen-Lock ist
--   hier die einfachste korrekte Loesung, ohne eine eigene
--   Sequence-Spalte einzufuehren. Bestehende sort_order-Werte werden
--   dabei nicht veraendert (nur gelesen), keine Kompaktierung.
--
-- Zulaessige Statusuebergaenge (serverseitig erzwungen, nicht nur
-- clientseitig):
--   archive_mood:    nur von status='active' -> 'archived'
--   reactivate_mood: nur von status='archived' -> 'active'
--   (ein bereits archivierter Mood kann nicht erneut archiviert
--   werden und umgekehrt -- klarer Fehler statt stillem No-op)
--
-- Archivierung nur ohne jegliche band_moods-Zuordnung, unabhaengig
-- vom Status der referenzierenden Band (auch archivierte/pausierte
-- Baender zaehlen mit) -- siehe archive_mood unten: der Check laeuft
-- direkt gegen band_moods, ohne jeden Join/Filter auf bands.status.
--
-- Kein Loeschpfad: es gibt in diesem Paket bewusst keine delete_mood-
-- Funktion.
--
-- Fehlercodes (MESSAGE = stabiler Slug, zusaetzlich projektspezifischer
-- ERRCODE):
--   MC001  moods_name_required
--   MC002  moods_description_required
--   MC003  moods_slug_required
--   MC004  moods_slug_invalid
--   MC005  moods_slug_conflict
--   MC010  moods_not_found
--   MC011  moods_archive_in_use
--   MC012  moods_archive_not_active
--   MC013  moods_reactivate_not_archived
--
-- Sicherheit (identisches Modell zu fn_set_similar_bands.sql und
-- fn_set_band_moods.sql):
--   - SECURITY DEFINER, SET search_path = pg_catalog, pg_temp,
--     vollstaendige Schemaqualifizierung (public.moods, public.band_moods).
--   - REVOKE ALL FROM PUBLIC/anon/authenticated + GRANT EXECUTE nur an
--     service_role, jeweils pro Funktion einzeln am Dateiende.
--   - Direkte INSERT/UPDATE/DELETE-Grants auf public.moods werden
--     service_role in einer separaten Datei entzogen (siehe
--     supabase/moods_admin_write_lockdown.sql, NACH dieser Datei
--     auszufuehren) -- Schreiben ab dann ausschliesslich ueber diese
--     vier Funktionen.
-- ============================================================

-- ------------------------------------------------------------
-- create_mood
-- ------------------------------------------------------------
create or replace function public.create_mood(
  p_name text,
  p_slug text,
  p_description text
)
returns public.moods
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_name             text;
  v_description      text;
  v_slug             text;
  v_next_sort_order  integer;
  v_row              public.moods;
begin
  -- Serialisiert konkurrierende create_mood-Aufrufe, damit
  -- max(sort_order)+1 und die Slug-Eindeutigkeitspruefung race-frei
  -- bleiben.
  lock table public.moods in share row exclusive mode;

  v_name := coalesce(trim(p_name), '');
  v_description := coalesce(trim(p_description), '');
  v_slug := coalesce(trim(p_slug), '');

  if v_name = '' then
    raise exception 'moods_name_required'
      using errcode = 'MC001', detail = 'name must not be empty after trim';
  end if;

  if v_description = '' then
    raise exception 'moods_description_required'
      using errcode = 'MC002', detail = 'description must not be empty after trim';
  end if;

  if v_slug = '' then
    raise exception 'moods_slug_required'
      using errcode = 'MC003', detail = 'slug must not be empty after trim';
  end if;

  if v_slug !~ '^[a-z0-9-]+$' then
    raise exception 'moods_slug_invalid'
      using errcode = 'MC004',
            detail = format('slug=%s does not match ^[a-z0-9-]+$', v_slug);
  end if;

  if exists (select 1 from public.moods where slug = v_slug) then
    raise exception 'moods_slug_conflict'
      using errcode = 'MC005',
            detail = format('slug=%s already exists', v_slug);
  end if;

  select coalesce(max(sort_order), 0) + 1 into v_next_sort_order from public.moods;

  insert into public.moods (name, slug, description, status, sort_order)
  values (v_name, v_slug, v_description, 'active', v_next_sort_order)
  returning * into v_row;

  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- update_mood -- nur name/description. id, slug, status, sort_order
-- unveraendert.
-- ------------------------------------------------------------
create or replace function public.update_mood(
  p_mood_id uuid,
  p_name text,
  p_description text
)
returns public.moods
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_name        text;
  v_description text;
  v_row         public.moods;
begin
  perform 1 from public.moods where id = p_mood_id for update;
  if not found then
    raise exception 'moods_not_found'
      using errcode = 'MC010', detail = format('mood_id=%s not found', p_mood_id);
  end if;

  v_name := coalesce(trim(p_name), '');
  v_description := coalesce(trim(p_description), '');

  if v_name = '' then
    raise exception 'moods_name_required'
      using errcode = 'MC001', detail = 'name must not be empty after trim';
  end if;

  if v_description = '' then
    raise exception 'moods_description_required'
      using errcode = 'MC002', detail = 'description must not be empty after trim';
  end if;

  update public.moods
     set name = v_name,
         description = v_description
   where id = p_mood_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- archive_mood -- nur zulaessig ohne jegliche band_moods-Zuordnung,
-- unabhaengig vom Status der referenzierenden Band.
-- ------------------------------------------------------------
create or replace function public.archive_mood(
  p_mood_id uuid
)
returns public.moods
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_current_status text;
  v_usage_count    integer;
  v_row            public.moods;
begin
  select status into v_current_status from public.moods where id = p_mood_id for update;
  if not found then
    raise exception 'moods_not_found'
      using errcode = 'MC010', detail = format('mood_id=%s not found', p_mood_id);
  end if;

  if v_current_status <> 'active' then
    raise exception 'moods_archive_not_active'
      using errcode = 'MC012',
            detail = format('mood_id=%s has status=%s, expected active', p_mood_id, v_current_status);
  end if;

  -- Zaehlt JEDE band_moods-Zeile, unabhaengig vom Status oder
  -- Veroeffentlichungszustand der referenzierenden Band -- archivierte
  -- oder pausierte Baender duerfen eine Archivierung nicht faelschlich
  -- erlauben.
  select count(*) into v_usage_count from public.band_moods where mood_id = p_mood_id;
  if v_usage_count > 0 then
    raise exception 'moods_archive_in_use'
      using errcode = 'MC011',
            detail = format('mood_id=%s has %s existing band_moods row(s)', p_mood_id, v_usage_count);
  end if;

  update public.moods set status = 'archived' where id = p_mood_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- reactivate_mood -- id, slug, sort_order bleiben unveraendert, keine
-- automatische Bandzuordnung.
-- ------------------------------------------------------------
create or replace function public.reactivate_mood(
  p_mood_id uuid
)
returns public.moods
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_current_status text;
  v_row            public.moods;
begin
  select status into v_current_status from public.moods where id = p_mood_id for update;
  if not found then
    raise exception 'moods_not_found'
      using errcode = 'MC010', detail = format('mood_id=%s not found', p_mood_id);
  end if;

  if v_current_status <> 'archived' then
    raise exception 'moods_reactivate_not_archived'
      using errcode = 'MC013',
            detail = format('mood_id=%s has status=%s, expected archived', p_mood_id, v_current_status);
  end if;

  update public.moods set status = 'active' where id = p_mood_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- Ausfuehrungsrechte: Standardmaessig vergibt Postgres EXECUTE an
-- PUBLIC bei CREATE FUNCTION -- das muss explizit entzogen werden.
-- ------------------------------------------------------------
revoke all on function public.create_mood(text, text, text) from public;
revoke all on function public.create_mood(text, text, text) from anon;
revoke all on function public.create_mood(text, text, text) from authenticated;
grant execute on function public.create_mood(text, text, text) to service_role;

revoke all on function public.update_mood(uuid, text, text) from public;
revoke all on function public.update_mood(uuid, text, text) from anon;
revoke all on function public.update_mood(uuid, text, text) from authenticated;
grant execute on function public.update_mood(uuid, text, text) to service_role;

revoke all on function public.archive_mood(uuid) from public;
revoke all on function public.archive_mood(uuid) from anon;
revoke all on function public.archive_mood(uuid) from authenticated;
grant execute on function public.archive_mood(uuid) to service_role;

revoke all on function public.reactivate_mood(uuid) from public;
revoke all on function public.reactivate_mood(uuid) from anon;
revoke all on function public.reactivate_mood(uuid) from authenticated;
grant execute on function public.reactivate_mood(uuid) to service_role;
