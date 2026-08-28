-- ============================================================
-- fn_update_event_type_band_assignments.sql
--
-- Bulk-Schreibweg fuer die event-type-zentrierte Bandverwaltung
-- (/admin/event-types/[slug]/bands, Paket "Event-Type-zentrierte
-- Bandzuordnung").
--
-- Zweck:
--   Aendert fuer EINEN Veranstaltungstyp die Zuordnung zu MEHREREN Bands
--   gleichzeitig (hinzufuegen und/oder entfernen), atomar in einer
--   Transaktion. Ersetzt NICHT den bestehenden band-zentrierten
--   Schreibweg (updateBandEventTypesAction in
--   app/admin/bands/[id]/actions.ts, direkte insert()/delete() auf
--   public.band_event_types) -- dieser bleibt unveraendert bestehen.
--   Beide Wege schreiben auf dieselbe Tabelle.
--
-- Signatur:
--   public.update_event_type_band_assignments(
--     p_event_type_id uuid,
--     p_add_band_ids uuid[],
--     p_remove_band_ids uuid[]
--   )
--   RETURNS void
--
-- Architekturentscheidung -- KEINE Delegation an eine Set-Funktion:
--   Anders als bei Moods (dort delegiert update_mood_band_assignments an
--   set_band_moods, weil dort ein Max-4-Cap und eine Rang-Kompaktierung
--   ueber das VOLLSTAENDIGE Mood-Array einer Band gelten) gibt es fuer
--   Veranstaltungstypen laut Auftrag ausdruecklich KEIN Ranking, KEIN Cap
--   und KEINE Vererbung. Diese Funktion schreibt deshalb direkt und
--   minimal auf public.band_event_types (INSERT der hinzuzufuegenden,
--   DELETE der zu entfernenden Paare) -- keine Zweitimplementierung
--   fremder Business-Logik noetig, weil hier keine existiert.
--
-- Warum diese RPC ueberhaupt noetig ist (nicht prophylaktisch):
--   public.band_event_types hat -- anders als public.band_moods -- KEIN
--   Schreib-Lockdown fuer service_role (siehe Repo-Recherche: keine
--   band_event_types_admin_write_lockdown.sql-Datei existiert,
--   service_role haelt weiterhin volle SELECT/INSERT/UPDATE/DELETE-
--   Grants). Der bestehende band-zentrierte Schreibweg nutzt das direkt
--   ueber zwei getrennte Supabase-JS-Aufrufe (insert(), dann delete()),
--   OHNE gemeinsame Transaktion -- fuer eine einzelne Band mit
--   ueberschaubarem Risiko akzeptabel. Der neue event-type-zentrierte
--   Editor kann jedoch in einem Save potenziell sehr viele Baender auf
--   einmal aendern; ein Fehlschlag zwischen dem insert()- und dem
--   delete()-Schritt wuerde dort eine STILLE TEILAKTUALISIERUNG erzeugen
--   (Auftrag verlangt ausdruecklich das Gegenteil). Diese RPC kapselt
--   beide Schritte in EINER Funktion/Transaktion und liefert dadurch
--   echte Atomaritaet, ohne die bestehenden Grants auf
--   public.band_event_types anzutasten oder den bestehenden
--   band-zentrierten Schreibweg zu veraendern.
--
-- SECURITY DEFINER (Korrektur einer urspruenglich zu optimistischen
-- INVOKER-Annahme):
--   Diese Funktion wurde zunaechst mit SECURITY INVOKER angelegt, weil
--   service_role bereits volle DML-Grants direkt auf band_event_types
--   haelt und daher fuer die eigentlichen DELETE/INSERT-Schritte keine
--   zusaetzlichen Rechte braucht. Uebersehen wurde dabei: die
--   Locking-Schritte VOR dem eigentlichen Schreibzugriff lesen
--   public.event_types per FOR SHARE und public.bands per FOR UPDATE --
--   und Postgres verlangt fuer SELECT ... FOR UPDATE/FOR SHARE zusaetzlich
--   zum SELECT-Recht auch das UPDATE-Recht auf der betroffenen Tabelle.
--   service_role haelt auf public.event_types bewusst nur SELECT/
--   REFERENCES/TRIGGER/TRUNCATE, kein UPDATE/INSERT/DELETE (anders als
--   auf band_event_types/bands) -- ein legitimer, bestehender Least-
--   Privilege-Grenzwert, den diese Migration nicht aufweichen soll. Unter
--   SECURITY INVOKER schlug der FOR-SHARE-Lock auf event_types deshalb in
--   Production mit 42501 "permission denied for table event_types" fehl,
--   sobald service_role real ueber PostgREST aufrief.
--
--   Statt service_role per GRANT UPDATE ON event_types (bzw. absehbar
--   auch auf bands) direkte, dauerhafte Schreibrechte auf diesen Tabellen
--   einzuraeumen -- was den bestehenden Least-Privilege-Grenzwert fuer
--   event_types permanent verbreitern wuerde --, laeuft diese Funktion
--   jetzt mit SECURITY DEFINER unter ihrem Owner (postgres, der ohnehin
--   volle Rechte auf allen beteiligten Tabellen haelt). Das schaltet
--   Zugriff ausschliesslich innerhalb dieser einen, eng validierten
--   Funktion frei -- nicht generell fuer service_role ausserhalb davon.
--   Fester search_path (siehe unten), vollstaendig schemaqualifizierte
--   Objektverweise und die unveraendert auf service_role beschraenkte
--   EXECUTE-ACL (siehe GRANT EXECUTE unten) halten diesen Zugriff eng
--   auf genau diesen Schreibweg begrenzt -- identisches Sicherheitsprinzip
--   wie bei fn_update_mood_band_assignments.sql.
--
-- Locking-Reihenfolge (identisches Prinzip wie
-- fn_update_mood_band_assignments.sql):
--   1. Alle betroffenen Bands (add ∪ remove, dedupliziert) werden VOR
--      jeder Schreiboperation in deterministischer Reihenfolge
--      (ORDER BY band_id) mit FOR UPDATE gesperrt und auf Existenz
--      geprueft.
--   2. Der betrachtete Veranstaltungstyp wird per FOR SHARE gesperrt und
--      auf Existenz geprueft; bei einem nicht-leeren Diff zusaetzlich auf
--      status='active'.
--   3. Erst danach die eigentlichen Schreiboperationen.
--
-- Validierung (RAISE EXCEPTION bei Verstoss):
--   EB001  event_type_bands_type_required   -- p_event_type_id ist NULL
--   EB002  event_type_bands_null_target     -- add/remove enthaelt NULL-Element
--   EB003  event_type_bands_type_not_found  -- Veranstaltungstyp existiert nicht
--   EB004  event_type_bands_type_not_active -- Typ ist nicht status='active'
--                                               (nur relevant bei nicht-leerem Diff)
--   EB005  event_type_bands_band_not_found  -- eine betroffene Band existiert nicht
--   EB006  event_type_bands_duplicate       -- Duplikat innerhalb add ODER remove
--   EB007  event_type_bands_overlap         -- eine Band-ID steht in add UND remove
--
-- p_add_band_ids / p_remove_band_ids: NULL wird als leeres Array
-- behandelt (identisches Prinzip wie bei update_mood_band_assignments).
--
-- Idempotenz: eine Band in p_add_band_ids, die den Veranstaltungstyp
-- bereits hat (ON CONFLICT DO NOTHING ueber den bestehenden Primary Key
-- (band_id, event_type_id)), sowie eine Band in p_remove_band_ids, die
-- ihn nicht (mehr) hat (DELETE betrifft dann 0 Zeilen), sind sichere
-- No-ops -- kein Fehler.
--
-- Atomaritaet: die gesamte Funktion laeuft in genau einer Transaktion.
-- Jede unbehandelte Exception rollt ALLE bereits ausgefuehrten
-- Teiloperationen dieses Aufrufs zurueck -- keine Teilcommits.
--
-- Sicherheit:
--   SECURITY DEFINER, SET search_path = pg_catalog, pg_temp fest verdrahtet
--   (verhindert Search-Path-Hijacking des Function Owners), alle Tabellen-/
--   Funktionsverweise vollstaendig schemaqualifiziert. REVOKE ALL FROM
--   PUBLIC/anon/authenticated, GRANT EXECUTE nur an service_role --
--   die Funktion bleibt damit ausschliesslich vom Admin-Backend aufrufbar,
--   unabhaengig davon, dass sie jetzt mit den Rechten des Owners (postgres)
--   statt des Aufrufers laeuft. Keine neuen direkten Table-DML-Grants an
--   service_role auf event_types/bands/band_event_types -- die Tabellen
--   behalten exakt die bereits bestehenden Grants, diese Migration aendert
--   daran nichts.
--
-- WICHTIG: Diese Datei korrigiert eine bereits gegen TEST und Production
-- ausgerollte Vorgaengerversion (SECURITY INVOKER), die dort real mit
-- 42501 "permission denied for table event_types" scheiterte (siehe
-- Kommentar oben). Rollout dieser Korrektur erfolgt erneut ueber das
-- bestehende TEST-vor-Production-Muster.
-- ============================================================

create or replace function public.update_event_type_band_assignments(
  p_event_type_id uuid,
  p_add_band_ids uuid[],
  p_remove_band_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_add     uuid[] := coalesce(p_add_band_ids, '{}'::uuid[]);
  v_remove  uuid[] := coalesce(p_remove_band_ids, '{}'::uuid[]);
  v_band_id uuid;
begin
  -- ---- p_event_type_id ist Pflicht ----
  if p_event_type_id is null then
    raise exception 'event_type_bands_type_required'
      using errcode = 'EB001',
            detail = 'p_event_type_id must not be null';
  end if;

  -- ---- Kein Element von add/remove ist NULL ----
  if array_position(v_add, null) is not null or array_position(v_remove, null) is not null then
    raise exception 'event_type_bands_null_target'
      using errcode = 'EB002',
            detail = 'p_add_band_ids/p_remove_band_ids must not contain null elements';
  end if;

  -- ---- Keine Duplikate innerhalb von add bzw. innerhalb von remove ----
  if (select count(distinct x) from unnest(v_add) as x) <> cardinality(v_add)
     or (select count(distinct x) from unnest(v_remove) as x) <> cardinality(v_remove)
  then
    raise exception 'event_type_bands_duplicate'
      using errcode = 'EB006',
            detail = 'p_add_band_ids or p_remove_band_ids contains duplicate values';
  end if;

  -- ---- Keine Band-ID gleichzeitig in add und remove ----
  if exists (select 1 from unnest(v_add) a where a = any (v_remove)) then
    raise exception 'event_type_bands_overlap'
      using errcode = 'EB007',
            detail = 'a band_id is present in both p_add_band_ids and p_remove_band_ids';
  end if;

  -- ---- Veranstaltungstyp sperren, Existenz pruefen (vor jedem Bandzugriff) ----
  perform 1 from public.event_types et where et.id = p_event_type_id for share;
  if not found then
    raise exception 'event_type_bands_type_not_found'
      using errcode = 'EB003',
            detail = format('event_type_id=%s not found in public.event_types', p_event_type_id);
  end if;

  -- ---- active-Pruefung nur relevant, wenn ueberhaupt etwas geschrieben wird ----
  if (cardinality(v_add) > 0 or cardinality(v_remove) > 0)
     and not exists (select 1 from public.event_types et where et.id = p_event_type_id and et.status = 'active')
  then
    raise exception 'event_type_bands_type_not_active'
      using errcode = 'EB004',
            detail = format('event_type_id=%s is not status=active', p_event_type_id);
  end if;

  -- ---- Alle betroffenen Bands deterministisch sortiert (ORDER BY band_id)
  --      sperren und auf Existenz pruefen -- VOR jeder Schreiboperation. ----
  for v_band_id in
    select distinct b from unnest(v_add || v_remove) as b order by b
  loop
    perform 1 from public.bands bd where bd.id = v_band_id for update;
    if not found then
      raise exception 'event_type_bands_band_not_found'
        using errcode = 'EB005',
              detail = format('band_id=%s not found in public.bands', v_band_id);
    end if;
  end loop;

  -- ============================================================
  -- Ab hier: validiert und gesperrt. Direkter, minimaler Schreibzugriff
  -- auf band_event_types -- kein Ranking, kein Cap, keine Vererbung.
  -- ============================================================

  if cardinality(v_remove) > 0 then
    delete from public.band_event_types
    where event_type_id = p_event_type_id
      and band_id = any (v_remove);
  end if;

  if cardinality(v_add) > 0 then
    insert into public.band_event_types (band_id, event_type_id, sort_order)
    select x, p_event_type_id, 0
    from unnest(v_add) as x
    on conflict (band_id, event_type_id) do nothing;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- Ausfuehrungsrechte: nur service_role darf aufrufen (unabhaengig von
-- SECURITY DEFINER/INVOKER). Keine Aenderung an bestehenden Table-Grants
-- auf public.band_event_types.
-- ------------------------------------------------------------
revoke all on function public.update_event_type_band_assignments(uuid, uuid[], uuid[]) from public;
revoke all on function public.update_event_type_band_assignments(uuid, uuid[], uuid[]) from anon;
revoke all on function public.update_event_type_band_assignments(uuid, uuid[], uuid[]) from authenticated;
grant execute on function public.update_event_type_band_assignments(uuid, uuid[], uuid[]) to service_role;
