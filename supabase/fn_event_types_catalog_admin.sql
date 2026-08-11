-- ============================================================
-- fn_event_types_catalog_admin.sql
--
-- NOCH NICHT AUSGEFUEHRT. Versioniert vorbereitet fuer den Admin-Katalog
-- "Veranstaltungstypen" (/admin/event-types). Ausfuehrung erfolgt manuell
-- durch Xandi im Supabase SQL Editor, siehe Abschlussbericht fuer die
-- genaue Reihenfolge. In diesem Auftrag NICHT gegen Production
-- ausgefuehrt.
--
-- Sprint: Admin "Veranstaltungstypen" -- event_types-Katalogverwaltung
--
-- Vorbild/Muster: supabase/fn_repertoire_styles_catalog_admin.sql und
-- supabase/fn_moods_catalog_admin.sql (identisches Sicherheitsmodell,
-- identische Validierungsreihenfolge, identisches Fehlercode-Schema,
-- identische sort_order-/Slug-/Archivierungs-Semantik). Vier kleine,
-- event-type-spezifische Funktionen statt einer generischen Katalog-RPC
-- -- exakt dasselbe Architekturprinzip.
--
-- Funktionen:
--   public.create_event_type(p_name text, p_slug text, p_anfrage_label text)
--     returns public.event_types
--   public.update_event_type(p_event_type_id uuid, p_name text, p_anfrage_label text)
--     returns public.event_types
--   public.archive_event_type(p_event_type_id uuid)
--     returns public.event_types
--   public.reactivate_event_type(p_event_type_id uuid)
--     returns public.event_types
--
-- Warum der Slug als Parameter (nicht in SQL berechnet):
--   Identische Begruendung wie bei create_mood/create_repertoire_style --
--   die Slug-Erzeugung selbst ist eine reine Funktion des Namens ohne
--   Race-Condition-Risiko. Sie laeuft deterministisch und getestet in
--   lib/eventTypes/slug.ts (node:test). Die Server Action berechnet den
--   Slug und uebergibt ihn; create_event_type validiert Format und
--   Eindeutigkeit serverseitig/atomar (siehe unten).
--
-- KEIN p_parent_id-Parameter: dieses Paket bietet bewusst keine
-- Parent-Zuordnung beim Anlegen und keine Parent-Bearbeitung bestehender
-- Typen an (Auftrag: "parent_id nicht editierbar machen ... bestehende
-- Parent-Beziehungen nicht veraendern"). Neu angelegte Veranstaltungstypen
-- erhalten daher immer parent_id = NULL (Spaltendefault). Bestehende
-- Parent-Beziehungen (z. B. Festzelt -> Gruendungsfest/Volksfest/
-- Kirchweih/Dult/Oktoberfest/Buergerfest) werden von keiner der vier
-- Funktionen gelesen oder veraendert.
--
-- KEIN p_status/p_sort_order-Parameter: sort_order bleibt beim Anlegen
-- auf dem Spaltendefault (0) -- dieses Paket bietet kein Sortierungs-/
-- Drag-and-Drop-System (siehe Scope). status wird ausschliesslich ueber
-- archive_event_type/reactivate_event_type gesteuert, nie direkt gesetzt.
--
-- KEINE Namens-Eindeutigkeitspruefung (Unterschied zu
-- create_repertoire_style/update_repertoire_style/reactivate_repertoire_style,
-- dort RC006): Bestandspruefung ergab, dass keine bestehende Oberflaeche
-- event_types ueber einen namensbasierten Lookup abbildet -- der
-- Band-Editor (app/admin/bands/[id]/page.tsx) identifiziert Event-Types
-- ueber event_type_id (Checkbox-value), nicht ueber name; das native
-- Anfrageformular identifiziert Event-Types ueber slug (siehe
-- lib/anfrage/anfrageEventTypeOptions.ts). Eine Namenskollision zwischen
-- zwei event_types-Zeilen kann dadurch aktuell keinen bestehenden Lookup
-- kollidieren lassen -- anders als bei repertoire_styles (dort bildet
-- RepertoireStyleEditorSection.tsx den Katalog ueber einen namensbasierten
-- Map-Lookup ab, siehe dortiger Dateikommentar). Es wird daher bewusst
-- KEINE neue fachliche Eindeutigkeitsregel fuer name eingefuehrt (Auftrag:
-- "Keine neue fachliche Eindeutigkeitsregel erfinden, ohne Bestand zu
-- pruefen").
--
-- sort_order bleibt beim Anlegen unveraendert auf dem Spaltendefault --
-- kein LOCK TABLE fuer eine max(sort_order)+1-Berechnung noetig (Unterschied
-- zu create_mood/create_repertoire_style). Der LOCK TABLE in
-- create_event_type dient ausschliesslich der Race-Freiheit der
-- Slug-Eindeutigkeitspruefung (Check-then-Insert) -- identisches Prinzip,
-- nur anderer Grund als bei den beiden Vorbildern.
--
-- Zulaessige Statusuebergaenge (serverseitig erzwungen, nicht nur
-- clientseitig):
--   archive_event_type:    nur von status='active' -> 'archived'
--   reactivate_event_type: nur von status='archived' -> 'active'
--   (ein bereits archivierter Wert kann nicht erneut archiviert werden
--   und umgekehrt -- klarer Fehler statt stillem No-op). Ein Wert mit
--   status='draft' kann ueber diese beiden Funktionen weder archiviert
--   noch reaktiviert werden (identisches Verhalten zu Moods/Repertoire-
--   Styles -- 'draft' ist im aktuellen Katalog nicht in Verwendung, alle
--   45 realen Production-Zeilen sind status='active', per Audit
--   verifiziert).
--
-- Archivieren statt Loeschen: archive_event_type setzt AUSSCHLIESSLICH
-- status = 'archived' (updated_at aktualisiert sich automatisch ueber den
-- bestehenden Trigger trg_event_types_updated_at). Es findet KEINE
-- Zulaessigkeitspruefung gegen band_event_types-Zuordnungen und KEINE
-- Zulaessigkeitspruefung gegen Child-Event-Types (parent_id) statt --
-- bestehende Beziehungen bleiben unveraendert bestehen, sie werden weder
-- gelesen noch als Blocker verwendet (Auftrag: "Archivieren statt
-- Loeschen. Bestehende Zuordnungen und Beziehungen bleiben bestehen.").
-- Frueherer Entwurf dieser Datei enthielt zwei nicht freigegebene
-- Blocker-Pruefungen (band_event_types-Nutzung, aktive Child-Event-Types)
-- -- beide wurden ersatzlos entfernt, kein Cascade- oder
-- Parent-Umschreibungs-Ersatz eingefuehrt.
--
-- Kein Loeschpfad: es gibt bewusst keine delete_event_type-Funktion.
--
-- Keine Aenderung an public.band_event_types durch diese Datei -- alle
-- vier Funktionen schreiben ausschliesslich auf public.event_types.
-- Bestehende Bandzuordnungen werden von keiner der vier Funktionen
-- gelesen oder veraendert. Keine Aenderung an parent_id bestehender
-- Zeilen.
--
-- Fehlercodes (MESSAGE = stabiler Slug, zusaetzlich projektspezifischer
-- ERRCODE):
--   ET001  event_types_name_required
--   ET003  event_types_slug_required
--   ET004  event_types_slug_invalid
--   ET005  event_types_slug_conflict
--   ET010  event_types_not_found
--   ET012  event_types_archive_not_active
--   ET013  event_types_reactivate_not_archived
--
-- anfrage_label ist nullable und wird ueber nullif(trim(...), '') zu NULL
-- normalisiert, wenn leer bzw. nur Leerzeichen -- identisches Muster zur
-- optionalen description in create_repertoire_style/update_repertoire_style.
-- Keine Ableitung aus name -- der Aufrufer (Server Action) uebergibt den
-- Wert unveraendert durch. Laenge wird -- wie bei name -- nicht zusaetzlich
-- in der Funktion validiert, sondern ueber die bestehende DB-CHECK-
-- Constraint char_length(anfrage_label) <= 100 (siehe
-- supabase/event_type_anfrage_label.sql) als Backstop abgesichert,
-- identisch zum bestehenden Umgang mit name (char_length(name) <= 100,
-- ebenfalls nicht redundant in den Funktionen geprueft) in
-- create_mood/create_repertoire_style.
--
-- Sicherheit (identisches Modell zu fn_moods_catalog_admin.sql und
-- fn_repertoire_styles_catalog_admin.sql):
--   - SECURITY DEFINER, SET search_path = pg_catalog, pg_temp,
--     vollstaendige Schemaqualifizierung (public.event_types,
--     public.band_event_types).
--   - REVOKE ALL FROM PUBLIC/anon/authenticated + GRANT EXECUTE nur an
--     service_role, jeweils pro Funktion einzeln am Dateiende.
--   - Direkte INSERT/UPDATE/DELETE-Grants auf public.event_types werden
--     service_role in einer separaten Datei entzogen (siehe
--     supabase/event_types_admin_write_lockdown.sql, NACH dieser Datei
--     auszufuehren) -- Schreiben ab dann ausschliesslich ueber diese vier
--     Funktionen. Bestandspruefung: service_role hat aktuell noch volles
--     SELECT/INSERT/UPDATE/DELETE auf event_types (siehe
--     supabase/setup-grants-and-seed.sql Zeile 38) -- kein vorheriges
--     Lockdown-File existiert fuer diese Tabelle, anders als bei moods/
--     repertoire_styles.
-- ============================================================

-- ------------------------------------------------------------
-- create_event_type
-- ------------------------------------------------------------
create or replace function public.create_event_type(
  p_name text,
  p_slug text,
  p_anfrage_label text
)
returns public.event_types
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_name          text;
  v_slug          text;
  v_anfrage_label text;
  v_row           public.event_types;
begin
  -- Serialisiert konkurrierende create_event_type-Aufrufe, damit die
  -- Slug-Eindeutigkeitspruefung (Check-then-Insert) race-frei bleibt.
  -- Kein sort_order-Bezug (Unterschied zu create_mood/
  -- create_repertoire_style) -- sort_order bleibt auf Spaltendefault.
  lock table public.event_types in share row exclusive mode;

  v_name := coalesce(trim(p_name), '');
  v_slug := coalesce(trim(p_slug), '');
  v_anfrage_label := nullif(trim(p_anfrage_label), '');

  if v_name = '' then
    raise exception 'event_types_name_required'
      using errcode = 'ET001', detail = 'name must not be empty after trim';
  end if;

  if v_slug = '' then
    raise exception 'event_types_slug_required'
      using errcode = 'ET003', detail = 'slug must not be empty after trim';
  end if;

  if v_slug !~ '^[a-z0-9-]+$' then
    raise exception 'event_types_slug_invalid'
      using errcode = 'ET004',
            detail = format('slug=%s does not match ^[a-z0-9-]+$', v_slug);
  end if;

  if exists (select 1 from public.event_types where slug = v_slug) then
    raise exception 'event_types_slug_conflict'
      using errcode = 'ET005',
            detail = format('slug=%s already exists', v_slug);
  end if;

  -- parent_id bleibt NULL (Spaltendefault), status = 'active',
  -- sort_order bleibt auf Spaltendefault (0) -- siehe Dateikommentar oben.
  insert into public.event_types (name, slug, anfrage_label, status)
  values (v_name, v_slug, v_anfrage_label, 'active')
  returning * into v_row;

  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- update_event_type -- nur name/anfrage_label. id, slug, status,
-- parent_id, sort_order unveraendert. Slug ist nach dem Anlegen eine
-- stabile Identitaet (Auftrag) -- diese Funktion nimmt bewusst keinen
-- p_slug-Parameter entgegen.
-- ------------------------------------------------------------
create or replace function public.update_event_type(
  p_event_type_id uuid,
  p_name text,
  p_anfrage_label text
)
returns public.event_types
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_name          text;
  v_anfrage_label text;
  v_row           public.event_types;
begin
  perform 1 from public.event_types where id = p_event_type_id for update;
  if not found then
    raise exception 'event_types_not_found'
      using errcode = 'ET010', detail = format('event_type_id=%s not found', p_event_type_id);
  end if;

  v_name := coalesce(trim(p_name), '');
  v_anfrage_label := nullif(trim(p_anfrage_label), '');

  if v_name = '' then
    raise exception 'event_types_name_required'
      using errcode = 'ET001', detail = 'name must not be empty after trim';
  end if;

  update public.event_types
     set name = v_name,
         anfrage_label = v_anfrage_label
   where id = p_event_type_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- archive_event_type -- setzt AUSSCHLIESSLICH status = 'archived'
-- (updated_at aktualisiert der bestehende Trigger automatisch). Keine
-- Pruefung gegen band_event_types-Zuordnungen, keine Pruefung gegen
-- Child-Event-Types -- bestehende Beziehungen bleiben unveraendert
-- bestehen und werden von dieser Funktion weder gelesen noch als
-- Zulaessigkeitsbedingung verwendet (Auftrag: "Archivieren statt
-- Loeschen. Bestehende Zuordnungen und Beziehungen bleiben bestehen.").
-- ------------------------------------------------------------
create or replace function public.archive_event_type(
  p_event_type_id uuid
)
returns public.event_types
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_current_status text;
  v_row            public.event_types;
begin
  select status into v_current_status from public.event_types where id = p_event_type_id for update;
  if not found then
    raise exception 'event_types_not_found'
      using errcode = 'ET010', detail = format('event_type_id=%s not found', p_event_type_id);
  end if;

  if v_current_status <> 'active' then
    raise exception 'event_types_archive_not_active'
      using errcode = 'ET012',
            detail = format('event_type_id=%s has status=%s, expected active', p_event_type_id, v_current_status);
  end if;

  update public.event_types set status = 'archived' where id = p_event_type_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- reactivate_event_type -- id, slug, parent_id, sort_order bleiben
-- unveraendert, keine automatische Bandzuordnung, kein automatisches
-- Reaktivieren von Kindern oder Pruefung des Parent-Status.
-- ------------------------------------------------------------
create or replace function public.reactivate_event_type(
  p_event_type_id uuid
)
returns public.event_types
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_current_status text;
  v_row            public.event_types;
begin
  select status into v_current_status from public.event_types where id = p_event_type_id for update;
  if not found then
    raise exception 'event_types_not_found'
      using errcode = 'ET010', detail = format('event_type_id=%s not found', p_event_type_id);
  end if;

  if v_current_status <> 'archived' then
    raise exception 'event_types_reactivate_not_archived'
      using errcode = 'ET013',
            detail = format('event_type_id=%s has status=%s, expected archived', p_event_type_id, v_current_status);
  end if;

  update public.event_types set status = 'active' where id = p_event_type_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- Ausfuehrungsrechte: Standardmaessig vergibt Postgres EXECUTE an
-- PUBLIC bei CREATE FUNCTION -- das muss explizit entzogen werden.
-- ------------------------------------------------------------
revoke all on function public.create_event_type(text, text, text) from public;
revoke all on function public.create_event_type(text, text, text) from anon;
revoke all on function public.create_event_type(text, text, text) from authenticated;
grant execute on function public.create_event_type(text, text, text) to service_role;

revoke all on function public.update_event_type(uuid, text, text) from public;
revoke all on function public.update_event_type(uuid, text, text) from anon;
revoke all on function public.update_event_type(uuid, text, text) from authenticated;
grant execute on function public.update_event_type(uuid, text, text) to service_role;

revoke all on function public.archive_event_type(uuid) from public;
revoke all on function public.archive_event_type(uuid) from anon;
revoke all on function public.archive_event_type(uuid) from authenticated;
grant execute on function public.archive_event_type(uuid) to service_role;

revoke all on function public.reactivate_event_type(uuid) from public;
revoke all on function public.reactivate_event_type(uuid) from anon;
revoke all on function public.reactivate_event_type(uuid) from authenticated;
grant execute on function public.reactivate_event_type(uuid) to service_role;
