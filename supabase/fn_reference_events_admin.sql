-- ============================================================
-- fn_reference_events_admin.sql
--
-- Status: NOCH NICHT AUSGEFUEHRT (V1.1-Erweiterung) -- vorbereitet zur
-- manuellen Ausfuehrung durch den Repo-Owner im Supabase SQL Editor
-- (Production, bfyucjjyarvqeftqqihm). Der Grant aus
-- supabase/reference_events_admin_read_grant.sql ist bereits aktiv und
-- muss nicht erneut ausgefuehrt werden.
--
-- Sprint: Referenzverwaltung im Band-Admin (V1 / V1.1)
-- Datum des Entwurfs: 2026-08-16, V1.1 ergaenzt 2026-08-16
--
-- Aenderung V1.1 ("description als optionale Unterzeile") --
-- BACKWARD-KOMPATIBEL als zusaetzliche Ueberladung, kein Ersetzen:
-- description wird von einem bewusst unangetasteten auf ein editierbares
-- Feld umgestellt (freie oeffentliche Unterzeile zusaetzlich zum
-- strukturierten, weiterhin integer-typisierten year -- year selbst
-- bleibt unveraendert).
--
-- Die aktuell live deployte V1-Admin-Oberflaeche ruft
-- fn_reference_event_create(uuid, text, text, text, integer) und
-- fn_reference_event_update(uuid, uuid, text, text, text, integer) auf.
-- Diese beiden Signaturen werden hier NICHT gedroppt und NICHT
-- veraendert -- sie bleiben unveraendert bestehen, damit der live
-- laufende Admin zwischen dieser SQL-Ausfuehrung und dem spaeteren
-- V1.1-App-Deployment nicht bricht. Zusaetzlich werden zwei neue
-- Ueberladungen mit einem weiteren Argument p_description text angelegt:
--   fn_reference_event_create(uuid, text, text, text, integer, text)
--   fn_reference_event_update(uuid, uuid, text, text, text, integer, text)
-- Postgres unterscheidet Funktionen mit gleichem Namen aber
-- unterschiedlicher Argumentliste als eigenstaendige Funktionen
-- (Overloading) -- beide Fassungen koexistieren unabhaengig voneinander.
-- PostgREST/supabase-js .rpc() ruft Funktionen ueber benannte JSON-
-- Parameter auf und loest die passende Ueberladung anhand der
-- tatsaechlich uebergebenen Parameternamen auf: ein Aufruf ohne
-- p_description trifft eindeutig die alte 5-/6-Arg-Fassung, ein Aufruf
-- MIT p_description eindeutig die neue 6-/7-Arg-Fassung -- da keine der
-- beiden Fassungen DEFAULT-Werte deklariert, ist die Zuordnung fuer
-- PostgREST in beiden Faellen eindeutig, keine Ambiguitaet moeglich.
--
-- Die alten 5-/6-Arg-Signaturen sind damit als UEBERGANGSZUSTAND zu
-- verstehen: sobald der V1.1-App-Code (Server Actions) ausschliesslich
-- die neuen Signaturen mit p_description aufruft und deployed/bestaetigt
-- ist, koennen die alten Ueberladungen in einem spaeteren, separaten
-- Aufraeum-Schritt entfernt werden. Das ist ausdruecklich NICHT Teil
-- dieser Datei/dieses Schritts.
--
-- event_type_id, url, is_featured, sort_order bleiben in ALLEN
-- Fassungen (alt wie neu) weiterhin vollstaendig unberuehrt.
--
-- Vier Referenz-Event-spezifische Funktionen (plus zwei neue
-- Ueberladungen fuer create/update) statt einer generischen
-- Relation-CRUD-RPC -- gleiches Prinzip wie public.set_similar_bands()
-- und die vier fn_moods_catalog_admin.sql-Funktionen: jede Funktion hat
-- genau eine Aufgabe. Alle Funktionen teilen sich dasselbe
-- Sicherheitsmodell.
--
-- Funktionen:
--   public.fn_reference_event_create(                        -- V1, unveraendert
--     p_band_id uuid, p_event_name text, p_location_name text,
--     p_city text, p_year integer
--   ) returns public.reference_events
--
--   public.fn_reference_event_create(                        -- V1.1, neu
--     p_band_id uuid, p_event_name text, p_location_name text,
--     p_city text, p_year integer, p_description text
--   ) returns public.reference_events
--
--   public.fn_reference_event_update(                        -- V1, unveraendert
--     p_id uuid, p_band_id uuid, p_event_name text, p_location_name text,
--     p_city text, p_year integer
--   ) returns public.reference_events
--
--   public.fn_reference_event_update(                        -- V1.1, neu
--     p_id uuid, p_band_id uuid, p_event_name text, p_location_name text,
--     p_city text, p_year integer, p_description text
--   ) returns public.reference_events
--
--   public.fn_reference_event_delete(p_id uuid, p_band_id uuid)
--     returns void
--
--   public.fn_reference_event_move(p_id uuid, p_band_id uuid, p_direction text)
--     returns table (reference_event_id uuid, sort_order integer)
--
-- Scope V1.1 (Auftrag "Referenzverwaltung im Band-Admin (V1.1)"):
--   Nutzerseitig pflegbar sind event_name, location_name, city, year und
--   ab V1.1 zusaetzlich description (freie Unterzeile, optional) -- nur
--   ueber die neuen Ueberladungen. sort_order wird ausschliesslich ueber
--   fn_reference_event_move veraendert, nie ueber ein Formularfeld.
--   event_type_id, url, is_featured bleiben weiterhin vollstaendig
--   unberuehrt -- weder lesend im Formular noch schreibend in
--   create/update (weder alt noch neu). Die UPDATE-Anweisungen enthalten
--   diese drei Spalten deshalb bewusst NICHT im SET, damit bestehende
--   Werte garantiert erhalten bleiben (bei create bleiben sie auf ihren
--   Tabellen-Defaults: event_type_id/url = NULL, is_featured = false).
--
-- Validierung (RAISE EXCEPTION vor jeder Schreiboperation, identisch in
-- alter und neuer Fassung):
--   - Band existiert (per SELECT ... FOR UPDATE gesperrt -- serialisiert
--     parallele Create/Update/Delete/Move-Aufrufe fuer dieselbe Band,
--     identisches Muster wie set_similar_bands/move_band_gallery_image)
--   - event_name nach trim() nicht leer
--   - year, falls gesetzt: 1900-2100 (spiegelt den DB-CHECK
--     reference_events_year_check serverseitig, NULL bleibt erlaubt)
--   - location_name/city/(description in den neuen Ueberladungen): trim(),
--     leerer String wird zu NULL (identische Normalisierung wie bereits
--     an anderer Stelle im Repo ueblich, kein neues Modell)
--   - id + band_id: bei update/delete/move wird die Zielzeile per
--     SELECT ... FOR UPDATE geladen UND ihr tatsaechlicher band_id-Wert
--     gegen den uebergebenen p_band_id geprueft (RE005 bei Abweichung).
--     Zusaetzlich foegt jedes schreibende Statement "and band_id =
--     p_band_id" noch einmal explizit hinzu (Verteidigung in der Tiefe).
--     Eine Referenz kann daher nie allein ueber ihre id mutiert werden.
--
-- Fehlercodes (stabiler MESSAGE-Slug + projektspezifischer ERRCODE,
-- identisch in alter und neuer Fassung):
--   RE001  reference_event_band_not_found
--   RE002  reference_event_name_required
--   RE003  reference_event_year_out_of_range
--   RE004  reference_event_not_found
--   RE005  reference_event_wrong_band
--   RE006  reference_event_invalid_direction
--
-- Create: sort_order = COALESCE(MAX(sort_order), 0) + 1, race-frei durch
--   den Bandzeilen-Lock (SELECT ... FOR UPDATE auf public.bands) am
--   Funktionsanfang -- kein separater App-seitiger Read-then-Insert, kein
--   LOCK TABLE noetig (anders als bei der globalen, selten geschriebenen
--   moods-Katalogtabelle reicht hier der schmalere Bandzeilen-Lock, da
--   reference_events ohnehin pro Band skaliert).
--
-- Move: identischer Algorithmus wie public.move_band_gallery_image (v3,
--   siehe supabase/fn_move_band_gallery_image_v3.sql) -- normalisieren,
--   DANN bewegen, beides im selben impliziten Transaktionsblock unter
--   dem Bandzeilen-Lock:
--     1. p_direction validieren (nur 'up'/'down', sonst RE006)
--     2. Bandzeile sperren, Existenz pruefen (RE001)
--     3. Zielzeile sperren und laden, Existenz (RE004) und
--        Band-Zugehoerigkeit (RE005) pruefen
--     4./5. Alle Referenzen dieser Band deterministisch ordnen
--        (sort_order asc nulls last, created_at asc nulls last, id asc)
--        und darueber luecken-/duplikatfrei auf 1..n neu nummerieren --
--        macht den DB-Default sort_order=0 und daraus resultierende
--        historische Gleichstaende fuer die Nachbarermittlung
--        irrelevant. Nur tatsaechlich abweichende Zeilen werden
--        geschrieben. Derselbe Tie-Breaker (sort_order, created_at, id)
--        ist fuer die spaetere Angleichung der oeffentlichen Sortierung
--        in lib/supabase/normalizeBand.ts vorgesehen (Schritt 5 dieses
--        Pakets, hier noch nicht umgesetzt) -- Admin- und
--        Public-Reihenfolge sollen bei Gleichstaenden identisch sein.
--     6. Zielzeile nach der Normalisierung erneut laden -- Position ist
--        ab hier eindeutig.
--     7. Nachbar aus der eindeutigen Position bestimmen (up -> Position-1,
--        down -> Position+1).
--     8. Kein Nachbar in dieser Richtung (Rand erreicht) -> sauberer
--        No-op, kein Fehler, keine fremde Zeile veraendert.
--     9. Sonst: Ziel- und Nachbarzeile in einem einzigen
--        UPDATE ... SET sort_order = CASE ... tauschen.
--
-- Delete: loescht die Zielzeile und nummeriert die verbleibenden
--   Referenzen dieser Band anschliessend im selben Funktionsaufruf
--   luecken-/duplikatfrei neu (identisches Normalisierungs-Statement wie
--   in move, sodass keine unnoetigen Sortierluecken zurueckbleiben).
--
-- Sicherheit (identisches Modell zu set_similar_bands/
-- fn_moods_catalog_admin -- bewusst abweichend vom aelteren
-- move_band_gallery_image-Modell, das SECURITY INVOKER nutzt, weil
-- service_role dort bereits volle Table-Grants besass; hier gilt laut
-- Architekturentscheid explizit das Gegenteil):
--   - SECURITY DEFINER: laeuft mit den Rechten des Funktions-Owners
--     (im SQL Editor i. d. R. postgres), nicht mit denen des Aufrufers.
--     service_role braucht dadurch KEINE eigenen INSERT/UPDATE/DELETE-
--     Table-Grants auf public.reference_events -- nur EXECUTE auf diese
--     Funktionen. Der einzige direkte Table-Grant fuer service_role
--     bleibt SELECT (siehe reference_events_admin_read_grant.sql).
--   - SET search_path = pg_catalog, pg_temp: bewusst ohne "public" im
--     Pfad. Alle Tabellenverweise im Funktionskoerper sind vollstaendig
--     schemaqualifiziert (public.bands, public.reference_events), daher
--     wird "public" im search_path nicht gebraucht.
--   - REVOKE ALL FROM PUBLIC/anon/authenticated + GRANT EXECUTE nur an
--     service_role fuer jede Funktion/Ueberladung einzeln: Postgres
--     vergibt bei CREATE FUNCTION standardmaessig EXECUTE an PUBLIC.
--     PostgREST routet jede Funktion im exponierten Schema unabhaengig
--     von Grants -- die Autorisierung kommt ausschliesslich aus dem
--     EXECUTE-Grant, daher alle drei Rollen explizit einzeln entziehen.
--     Die Grants fuer die alten Signaturen sind bereits in Production
--     aktiv; die entsprechenden Statements stehen hier trotzdem erneut
--     (idempotent, kein Effekt), damit diese Datei als vollstaendiges,
--     in sich abgeschlossenes Skript lesbar und erneut ausfuehrbar
--     bleibt.
-- ============================================================

-- ------------------------------------------------------------
-- fn_reference_event_create -- V1, 5 Argumente. UNVERAENDERT
-- gegenueber der aktuell live deployten Fassung -- wird von der
-- aktuell deployten Admin-Oberflaeche weiterhin aufgerufen, bis der
-- V1.1-App-Code auf die neue 6-Arg-Ueberladung unten umstellt.
-- ------------------------------------------------------------
create or replace function public.fn_reference_event_create(
  p_band_id uuid,
  p_event_name text,
  p_location_name text,
  p_city text,
  p_year integer
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

  if p_year is not null and (p_year < 1900 or p_year > 2100) then
    raise exception 'reference_event_year_out_of_range'
      using errcode = 'RE003',
            detail = format('year=%s, expected between 1900 and 2100', p_year);
  end if;

  -- Race-frei durch den Bandzeilen-Lock oben: kein anderer paralleler
  -- Create/Delete/Move-Aufruf fuer dieselbe Band kann zwischen dieser
  -- Ermittlung und dem folgenden INSERT laufen.
  select coalesce(max(sort_order), 0) + 1
    into v_next_sort_order
  from public.reference_events
  where band_id = p_band_id;

  insert into public.reference_events (
    band_id, event_name, location_name, city, year, sort_order
  )
  values (
    p_band_id, v_event_name, v_location_name, v_city, p_year, v_next_sort_order
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- fn_reference_event_create -- V1.1, NEUE Ueberladung mit
-- zusaetzlichem p_description text (letztes Argument). Eigenstaendige
-- Funktion (Postgres-Overloading anhand der Argumentliste) -- ersetzt
-- die 5-Arg-Fassung oben NICHT.
-- ------------------------------------------------------------
create or replace function public.fn_reference_event_create(
  p_band_id uuid,
  p_event_name text,
  p_location_name text,
  p_city text,
  p_year integer,
  p_description text
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

  if p_year is not null and (p_year < 1900 or p_year > 2100) then
    raise exception 'reference_event_year_out_of_range'
      using errcode = 'RE003',
            detail = format('year=%s, expected between 1900 and 2100', p_year);
  end if;

  -- Race-frei durch den Bandzeilen-Lock oben: kein anderer paralleler
  -- Create/Delete/Move-Aufruf fuer dieselbe Band kann zwischen dieser
  -- Ermittlung und dem folgenden INSERT laufen.
  select coalesce(max(sort_order), 0) + 1
    into v_next_sort_order
  from public.reference_events
  where band_id = p_band_id;

  insert into public.reference_events (
    band_id, event_name, location_name, city, year, description, sort_order
  )
  values (
    p_band_id, v_event_name, v_location_name, v_city, p_year, v_description, v_next_sort_order
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- fn_reference_event_update -- V1, 6 Argumente. UNVERAENDERT
-- gegenueber der aktuell live deployten Fassung -- nur event_name/
-- location_name/city/year + updated_at. id, band_id, sort_order,
-- event_type_id, description, url, is_featured, created_at bleiben
-- unveraendert. Wird von der aktuell deployten Admin-Oberflaeche
-- weiterhin aufgerufen, bis der V1.1-App-Code auf die neue
-- 7-Arg-Ueberladung unten umstellt.
-- ------------------------------------------------------------
create or replace function public.fn_reference_event_update(
  p_id uuid,
  p_band_id uuid,
  p_event_name text,
  p_location_name text,
  p_city text,
  p_year integer
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

  if p_year is not null and (p_year < 1900 or p_year > 2100) then
    raise exception 'reference_event_year_out_of_range'
      using errcode = 'RE003',
            detail = format('year=%s, expected between 1900 and 2100', p_year);
  end if;

  -- event_type_id, description, url, is_featured, sort_order sind
  -- bewusst NICHT Teil dieses SET -- bleiben dadurch garantiert
  -- unveraendert. "and band_id = p_band_id" hier zusaetzlich zur bereits
  -- oben geprueften Zielzeile (Verteidigung in der Tiefe).
  update public.reference_events
     set event_name    = v_event_name,
         location_name = v_location_name,
         city          = v_city,
         year          = p_year,
         updated_at    = now()
   where id = p_id
     and band_id = p_band_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- fn_reference_event_update -- V1.1, NEUE Ueberladung mit
-- zusaetzlichem p_description text (letztes Argument). Eigenstaendige
-- Funktion (Postgres-Overloading anhand der Argumentliste) -- ersetzt
-- die 6-Arg-Fassung oben NICHT. event_name/location_name/city/year/
-- description + updated_at. id, band_id, sort_order, event_type_id,
-- url, is_featured, created_at bleiben unveraendert.
-- ------------------------------------------------------------
create or replace function public.fn_reference_event_update(
  p_id uuid,
  p_band_id uuid,
  p_event_name text,
  p_location_name text,
  p_city text,
  p_year integer,
  p_description text
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

  if p_year is not null and (p_year < 1900 or p_year > 2100) then
    raise exception 'reference_event_year_out_of_range'
      using errcode = 'RE003',
            detail = format('year=%s, expected between 1900 and 2100', p_year);
  end if;

  -- event_type_id, url, is_featured, sort_order sind bewusst NICHT Teil
  -- dieses SET -- bleiben dadurch garantiert unveraendert. description
  -- ist in dieser V1.1-Ueberladung bewusst editierbar (freie oeffentliche
  -- Unterzeile). "and band_id = p_band_id" hier zusaetzlich zur bereits
  -- oben geprueften Zielzeile (Verteidigung in der Tiefe).
  update public.reference_events
     set event_name    = v_event_name,
         location_name = v_location_name,
         city          = v_city,
         year          = p_year,
         description   = v_description,
         updated_at    = now()
   where id = p_id
     and band_id = p_band_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- fn_reference_event_delete -- unveraendert. Loescht die Zielzeile und
-- nummeriert die verbleibenden Referenzen dieser Band anschliessend
-- luecken-/duplikatfrei neu.
-- ------------------------------------------------------------
create or replace function public.fn_reference_event_delete(
  p_id uuid,
  p_band_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_existing_band_id uuid;
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

  delete from public.reference_events
  where id = p_id
    and band_id = p_band_id;

  -- Verbleibende Referenzen dieser Band deterministisch ordnen und
  -- luecken-/duplikatfrei auf 1..n neu nummerieren. Nur tatsaechlich
  -- abweichende Zeilen werden geschrieben.
  with ordered as (
    select
      re.id,
      row_number() over (
        order by re.sort_order asc nulls last, re.created_at asc nulls last, re.id asc
      ) as new_position
    from public.reference_events re
    where re.band_id = p_band_id
  )
  update public.reference_events re
     set sort_order = ordered.new_position
    from ordered
   where re.id = ordered.id
     and re.sort_order is distinct from ordered.new_position;
end;
$$;

-- ------------------------------------------------------------
-- fn_reference_event_move -- unveraendert. Normalisieren, dann mit dem
-- tatsaechlichen Nachbarn tauschen (identischer Algorithmus wie
-- public.move_band_gallery_image v3).
-- ------------------------------------------------------------
create or replace function public.fn_reference_event_move(
  p_id uuid,
  p_band_id uuid,
  p_direction text
)
returns table (
  reference_event_id uuid,
  sort_order integer
)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_existing_band_id  uuid;
  v_target_position   integer;
  v_neighbor_id        uuid;
  v_neighbor_position integer;
begin
  if p_direction is null or p_direction not in ('up', 'down') then
    raise exception 'reference_event_invalid_direction'
      using errcode = 'RE006',
            detail = format('p_direction=%s, expected up or down', p_direction);
  end if;

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

  -- Alle Referenzen dieser Band deterministisch ordnen und luecken-/
  -- duplikatfrei auf 1..n neu nummerieren -- macht bestehende
  -- sort_order-Gleichstaende (DB-Default 0) fuer die Nachbarermittlung
  -- irrelevant.
  with ordered as (
    select
      re.id,
      row_number() over (
        order by re.sort_order asc nulls last, re.created_at asc nulls last, re.id asc
      ) as new_position
    from public.reference_events re
    where re.band_id = p_band_id
  )
  update public.reference_events re
     set sort_order = ordered.new_position
    from ordered
   where re.id = ordered.id
     and re.sort_order is distinct from ordered.new_position;

  select re.sort_order into v_target_position
  from public.reference_events re
  where re.id = p_id;

  if p_direction = 'up' then
    select re.id, re.sort_order into v_neighbor_id, v_neighbor_position
    from public.reference_events re
    where re.band_id = p_band_id
      and re.sort_order = v_target_position - 1;
  else
    select re.id, re.sort_order into v_neighbor_id, v_neighbor_position
    from public.reference_events re
    where re.band_id = p_band_id
      and re.sort_order = v_target_position + 1;
  end if;

  -- Kein Nachbar in dieser Richtung -- bereits am Rand der (jetzt
  -- normalisierten) Liste. Sauberer No-op, kein Fehler, keine fremde
  -- Zeile veraendert.
  if v_neighbor_id is null then
    return query select p_id, v_target_position;
    return;
  end if;

  update public.reference_events re
     set sort_order = case
       when re.id = p_id then v_neighbor_position
       when re.id = v_neighbor_id then v_target_position
     end
   where re.id in (p_id, v_neighbor_id);

  return query select p_id, v_neighbor_position;
end;
$$;

-- ------------------------------------------------------------
-- Ausfuehrungsrechte: Standardmaessig vergibt Postgres EXECUTE an PUBLIC
-- bei CREATE FUNCTION -- das muss explizit entzogen werden. REVOKE FROM
-- PUBLIC allein entfernt keine direkt an anon/authenticated vergebenen
-- Rechte -- deshalb alle drei Rollen explizit einzeln je
-- Funktion/Ueberladung. Die Statements fuer die alten Signaturen sind
-- bereits in Production aktiv (idempotent, kein Effekt) und stehen hier
-- nur, damit diese Datei als vollstaendiges Skript lesbar bleibt.
-- ------------------------------------------------------------

-- fn_reference_event_create -- V1, 5 Argumente (unveraendert)
revoke all on function public.fn_reference_event_create(uuid, text, text, text, integer) from public;
revoke all on function public.fn_reference_event_create(uuid, text, text, text, integer) from anon;
revoke all on function public.fn_reference_event_create(uuid, text, text, text, integer) from authenticated;
grant execute on function public.fn_reference_event_create(uuid, text, text, text, integer) to service_role;

-- fn_reference_event_create -- V1.1, 6 Argumente (neu, mit p_description)
revoke all on function public.fn_reference_event_create(uuid, text, text, text, integer, text) from public;
revoke all on function public.fn_reference_event_create(uuid, text, text, text, integer, text) from anon;
revoke all on function public.fn_reference_event_create(uuid, text, text, text, integer, text) from authenticated;
grant execute on function public.fn_reference_event_create(uuid, text, text, text, integer, text) to service_role;

-- fn_reference_event_update -- V1, 6 Argumente (unveraendert)
revoke all on function public.fn_reference_event_update(uuid, uuid, text, text, text, integer) from public;
revoke all on function public.fn_reference_event_update(uuid, uuid, text, text, text, integer) from anon;
revoke all on function public.fn_reference_event_update(uuid, uuid, text, text, text, integer) from authenticated;
grant execute on function public.fn_reference_event_update(uuid, uuid, text, text, text, integer) to service_role;

-- fn_reference_event_update -- V1.1, 7 Argumente (neu, mit p_description)
revoke all on function public.fn_reference_event_update(uuid, uuid, text, text, text, integer, text) from public;
revoke all on function public.fn_reference_event_update(uuid, uuid, text, text, text, integer, text) from anon;
revoke all on function public.fn_reference_event_update(uuid, uuid, text, text, text, integer, text) from authenticated;
grant execute on function public.fn_reference_event_update(uuid, uuid, text, text, text, integer, text) to service_role;

revoke all on function public.fn_reference_event_delete(uuid, uuid) from public;
revoke all on function public.fn_reference_event_delete(uuid, uuid) from anon;
revoke all on function public.fn_reference_event_delete(uuid, uuid) from authenticated;
grant execute on function public.fn_reference_event_delete(uuid, uuid) to service_role;

revoke all on function public.fn_reference_event_move(uuid, uuid, text) from public;
revoke all on function public.fn_reference_event_move(uuid, uuid, text) from anon;
revoke all on function public.fn_reference_event_move(uuid, uuid, text) from authenticated;
grant execute on function public.fn_reference_event_move(uuid, uuid, text) to service_role;
