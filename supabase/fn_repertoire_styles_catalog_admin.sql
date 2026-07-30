-- ============================================================
-- fn_repertoire_styles_catalog_admin.sql
--
-- NOCH NICHT AUSGEFUEHRT. Versioniert vorbereitet fuer den Admin-Katalog
-- "Musikalisch verortet" (/admin/repertoire-styles). Ausfuehrung erfolgt
-- manuell durch Xandi im Supabase SQL Editor, siehe Abschlussbericht
-- fuer die genaue Reihenfolge. In diesem Auftrag NICHT gegen Production
-- ausgefuehrt.
--
-- Sprint: Admin "Musikalisch verortet" -- Repertoire-Katalogverwaltung
-- Datum des Entwurfs: 30.07.2026
--
-- Vorbild/Muster: supabase/fn_moods_catalog_admin.sql (identisches
-- Sicherheitsmodell, identische Validierungsreihenfolge, identisches
-- Fehlercode-Schema, identische sort_order-/Slug-/Archivierungs-
-- Semantik). Vier kleine, Repertoire-Style-spezifische Funktionen statt
-- einer generischen Katalog-RPC -- exakt dasselbe Architekturprinzip.
--
-- Funktionen:
--   public.create_repertoire_style(p_name text, p_slug text, p_description text)
--     returns public.repertoire_styles
--   public.update_repertoire_style(p_repertoire_style_id uuid, p_name text, p_description text)
--     returns public.repertoire_styles
--   public.archive_repertoire_style(p_repertoire_style_id uuid)
--     returns public.repertoire_styles
--   public.reactivate_repertoire_style(p_repertoire_style_id uuid)
--     returns public.repertoire_styles
--
-- Warum der Slug als Parameter (nicht in SQL berechnet):
--   Identische Begruendung wie bei create_mood -- die Slug-Erzeugung
--   selbst ist eine reine Funktion des Namens ohne Race-Condition-Risiko
--   (anders als sort_order = max+1, das vom aktuellen Tabellenzustand
--   abhaengt). Sie laeuft deterministisch und getestet in
--   lib/repertoireStyles/slug.ts (node:test, bewusst eigenstaendig statt
--   geteilter Abstraktion mit lib/moods/slug.ts). Die Server Action
--   berechnet den Slug und uebergibt ihn; create_repertoire_style
--   validiert Format und Eindeutigkeit serverseitig/atomar (siehe unten).
--
-- sort_order = max + 1 (nur create_repertoire_style):
--   Race-frei durch LOCK TABLE public.repertoire_styles IN SHARE ROW
--   EXCLUSIVE MODE zu Beginn der Funktion -- identisches Muster wie
--   create_mood. public.repertoire_styles ist eine kleine, selten
--   geschriebene Katalogtabelle (aktuell 322 Zeilen laut Production-
--   Rollout-Dokumentation) -- ein kurzzeitiger Tabellen-Lock ist hier
--   die einfachste korrekte Loesung, ohne eine eigene Sequence-Spalte
--   einzufuehren. Bestehende sort_order-Werte werden dabei nicht
--   veraendert (nur gelesen), keine Kompaktierung.
--
-- Zulaessige Statusuebergaenge (serverseitig erzwungen, nicht nur
-- clientseitig):
--   archive_repertoire_style:    nur von status='active' -> 'archived'
--   reactivate_repertoire_style: nur von status='archived' -> 'active'
--   (ein bereits archivierter Wert kann nicht erneut archiviert werden
--   und umgekehrt -- klarer Fehler statt stillem No-op). Ein Wert mit
--   status='draft' kann ueber diese beiden Funktionen weder archiviert
--   noch reaktiviert werden (identisches Verhalten zu Moods -- 'draft'
--   ist im aktuellen Katalog nicht in Verwendung, siehe Analysebericht).
--
-- Archivierung nur ohne jegliche band_repertoire_styles-Zuordnung,
-- unabhaengig vom Status der referenzierenden Band (auch archivierte/
-- pausierte Baender zaehlen mit) -- identisches Muster zu archive_mood.
--
-- Kein Loeschpfad: es gibt bewusst keine delete_repertoire_style-Funktion.
--
-- Keine Aenderung an public.band_repertoire_styles durch diese Datei --
-- alle vier Funktionen schreiben ausschliesslich auf
-- public.repertoire_styles. Bestehende Bandzuordnungen werden weder
-- gelesen noch veraendert (Archivierungs-Check liest band_repertoire_styles
-- nur read-only zur Zaehlung, schreibt nichts dorthin).
--
-- Fehlercodes (MESSAGE = stabiler Slug, zusaetzlich projektspezifischer
-- ERRCODE):
--   RC001  repertoire_style_name_required
--   RC002  repertoire_style_description_required
--   RC003  repertoire_style_slug_required
--   RC004  repertoire_style_slug_invalid
--   RC005  repertoire_style_slug_conflict
--   RC010  repertoire_style_not_found
--   RC011  repertoire_style_archive_in_use
--   RC012  repertoire_style_archive_not_active
--   RC013  repertoire_style_reactivate_not_archived
--
-- Sicherheit (identisches Modell zu fn_moods_catalog_admin.sql,
-- fn_set_similar_bands.sql und fn_set_band_moods.sql):
--   - SECURITY DEFINER, SET search_path = pg_catalog, pg_temp,
--     vollstaendige Schemaqualifizierung (public.repertoire_styles,
--     public.band_repertoire_styles).
--   - REVOKE ALL FROM PUBLIC/anon/authenticated + GRANT EXECUTE nur an
--     service_role, jeweils pro Funktion einzeln am Dateiende.
--   - KEIN separates Lockdown-File noetig: service_role wurden die
--     direkten INSERT/UPDATE/DELETE/TRUNCATE-Rechte auf
--     public.repertoire_styles UND public.band_repertoire_styles bereits
--     mit supabase/fn_set_band_repertoire_styles.sql entzogen (Zeilen
--     282-283 dieser Datei, bereits gegen Production ausgefuehrt,
--     24.07.2026) -- service_role besitzt auf beiden Tabellen bereits
--     ausschliesslich SELECT. Ein direkter INSERT/UPDATE auf
--     repertoire_styles ueber service_role ist dadurch technisch gar
--     nicht mehr moeglich; Schreiben kann nur ueber diese vier
--     SECURITY-DEFINER-Funktionen erfolgen.
-- ============================================================

-- ------------------------------------------------------------
-- create_repertoire_style
-- ------------------------------------------------------------
create or replace function public.create_repertoire_style(
  p_name text,
  p_slug text,
  p_description text
)
returns public.repertoire_styles
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_name             text;
  v_description      text;
  v_slug             text;
  v_next_sort_order  integer;
  v_row              public.repertoire_styles;
begin
  -- Serialisiert konkurrierende create_repertoire_style-Aufrufe, damit
  -- max(sort_order)+1 und die Slug-Eindeutigkeitspruefung race-frei
  -- bleiben.
  lock table public.repertoire_styles in share row exclusive mode;

  v_name := coalesce(trim(p_name), '');
  v_description := coalesce(trim(p_description), '');
  v_slug := coalesce(trim(p_slug), '');

  if v_name = '' then
    raise exception 'repertoire_style_name_required'
      using errcode = 'RC001', detail = 'name must not be empty after trim';
  end if;

  if v_description = '' then
    raise exception 'repertoire_style_description_required'
      using errcode = 'RC002', detail = 'description must not be empty after trim';
  end if;

  if v_slug = '' then
    raise exception 'repertoire_style_slug_required'
      using errcode = 'RC003', detail = 'slug must not be empty after trim';
  end if;

  if v_slug !~ '^[a-z0-9-]+$' then
    raise exception 'repertoire_style_slug_invalid'
      using errcode = 'RC004',
            detail = format('slug=%s does not match ^[a-z0-9-]+$', v_slug);
  end if;

  if exists (select 1 from public.repertoire_styles where slug = v_slug) then
    raise exception 'repertoire_style_slug_conflict'
      using errcode = 'RC005',
            detail = format('slug=%s already exists', v_slug);
  end if;

  select coalesce(max(sort_order), 0) + 1 into v_next_sort_order from public.repertoire_styles;

  insert into public.repertoire_styles (name, slug, description, status, sort_order)
  values (v_name, v_slug, v_description, 'active', v_next_sort_order)
  returning * into v_row;

  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- update_repertoire_style -- nur name/description. id, slug, status,
-- sort_order unveraendert.
-- ------------------------------------------------------------
create or replace function public.update_repertoire_style(
  p_repertoire_style_id uuid,
  p_name text,
  p_description text
)
returns public.repertoire_styles
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_name        text;
  v_description text;
  v_row         public.repertoire_styles;
begin
  perform 1 from public.repertoire_styles where id = p_repertoire_style_id for update;
  if not found then
    raise exception 'repertoire_style_not_found'
      using errcode = 'RC010', detail = format('repertoire_style_id=%s not found', p_repertoire_style_id);
  end if;

  v_name := coalesce(trim(p_name), '');
  v_description := coalesce(trim(p_description), '');

  if v_name = '' then
    raise exception 'repertoire_style_name_required'
      using errcode = 'RC001', detail = 'name must not be empty after trim';
  end if;

  if v_description = '' then
    raise exception 'repertoire_style_description_required'
      using errcode = 'RC002', detail = 'description must not be empty after trim';
  end if;

  update public.repertoire_styles
     set name = v_name,
         description = v_description
   where id = p_repertoire_style_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- archive_repertoire_style -- nur zulaessig ohne jegliche
-- band_repertoire_styles-Zuordnung, unabhaengig vom Status der
-- referenzierenden Band. Liest band_repertoire_styles nur lesend zur
-- Zaehlung -- kein Write auf diese Tabelle.
-- ------------------------------------------------------------
create or replace function public.archive_repertoire_style(
  p_repertoire_style_id uuid
)
returns public.repertoire_styles
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_current_status text;
  v_usage_count    integer;
  v_row            public.repertoire_styles;
begin
  select status into v_current_status from public.repertoire_styles where id = p_repertoire_style_id for update;
  if not found then
    raise exception 'repertoire_style_not_found'
      using errcode = 'RC010', detail = format('repertoire_style_id=%s not found', p_repertoire_style_id);
  end if;

  if v_current_status <> 'active' then
    raise exception 'repertoire_style_archive_not_active'
      using errcode = 'RC012',
            detail = format('repertoire_style_id=%s has status=%s, expected active', p_repertoire_style_id, v_current_status);
  end if;

  -- Zaehlt JEDE band_repertoire_styles-Zeile, unabhaengig vom Status
  -- oder Veroeffentlichungszustand der referenzierenden Band --
  -- archivierte oder pausierte Baender duerfen eine Archivierung nicht
  -- faelschlich erlauben.
  select count(*) into v_usage_count from public.band_repertoire_styles where repertoire_style_id = p_repertoire_style_id;
  if v_usage_count > 0 then
    raise exception 'repertoire_style_archive_in_use'
      using errcode = 'RC011',
            detail = format('repertoire_style_id=%s has %s existing band_repertoire_styles row(s)', p_repertoire_style_id, v_usage_count);
  end if;

  update public.repertoire_styles set status = 'archived' where id = p_repertoire_style_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- reactivate_repertoire_style -- id, slug, sort_order bleiben
-- unveraendert, keine automatische Bandzuordnung.
-- ------------------------------------------------------------
create or replace function public.reactivate_repertoire_style(
  p_repertoire_style_id uuid
)
returns public.repertoire_styles
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_current_status text;
  v_row            public.repertoire_styles;
begin
  select status into v_current_status from public.repertoire_styles where id = p_repertoire_style_id for update;
  if not found then
    raise exception 'repertoire_style_not_found'
      using errcode = 'RC010', detail = format('repertoire_style_id=%s not found', p_repertoire_style_id);
  end if;

  if v_current_status <> 'archived' then
    raise exception 'repertoire_style_reactivate_not_archived'
      using errcode = 'RC013',
            detail = format('repertoire_style_id=%s has status=%s, expected archived', p_repertoire_style_id, v_current_status);
  end if;

  update public.repertoire_styles set status = 'active' where id = p_repertoire_style_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- Ausfuehrungsrechte: Standardmaessig vergibt Postgres EXECUTE an
-- PUBLIC bei CREATE FUNCTION -- das muss explizit entzogen werden.
-- ------------------------------------------------------------
revoke all on function public.create_repertoire_style(text, text, text) from public;
revoke all on function public.create_repertoire_style(text, text, text) from anon;
revoke all on function public.create_repertoire_style(text, text, text) from authenticated;
grant execute on function public.create_repertoire_style(text, text, text) to service_role;

revoke all on function public.update_repertoire_style(uuid, text, text) from public;
revoke all on function public.update_repertoire_style(uuid, text, text) from anon;
revoke all on function public.update_repertoire_style(uuid, text, text) from authenticated;
grant execute on function public.update_repertoire_style(uuid, text, text) to service_role;

revoke all on function public.archive_repertoire_style(uuid) from public;
revoke all on function public.archive_repertoire_style(uuid) from anon;
revoke all on function public.archive_repertoire_style(uuid) from authenticated;
grant execute on function public.archive_repertoire_style(uuid) to service_role;

revoke all on function public.reactivate_repertoire_style(uuid) from public;
revoke all on function public.reactivate_repertoire_style(uuid) from anon;
revoke all on function public.reactivate_repertoire_style(uuid) from authenticated;
grant execute on function public.reactivate_repertoire_style(uuid) to service_role;
