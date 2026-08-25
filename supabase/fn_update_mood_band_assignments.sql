-- ============================================================
-- fn_update_mood_band_assignments.sql
--
-- Bulk-Schreibweg fuer die Mood-zentrierte Bandverwaltung
-- (/admin/moods/[slug]/bands, Paket "Mood-zentrierte Bandverwaltung V1").
--
-- Zweck:
--   Aendert fuer EINEN Mood die Zuordnung zu MEHREREN Bands gleichzeitig
--   (hinzufuegen und/oder entfernen), atomar in einer Transaktion. Ersetzt
--   NICHT den bestehenden band-zentrierten Schreibweg
--   (public.set_band_moods, siehe fn_set_band_moods.sql) -- dieser bleibt
--   fuer den Band-Editor unveraendert bestehen. Beide Wege schreiben auf
--   dieselbe Tabelle unter demselben Lockdown-Modell.
--
-- Signatur:
--   public.update_mood_band_assignments(
--     p_mood_id uuid,
--     p_add_band_ids uuid[],
--     p_remove_band_ids uuid[]
--   )
--   RETURNS void
--
-- Architekturentscheidung -- Wiederverwendung statt Parallel-Implementierung:
--   Diese Funktion dupliziert NICHT die Diff-/Rang-/Validierungslogik von
--   set_band_moods. Stattdessen wird fuer jede betroffene Band deren
--   VOLLSTAENDIGES aktuelles Mood-Array (in bestehender sort_order-
--   Reihenfolge) gelesen, um genau ein Element (den hier betrachteten
--   Mood) ergaenzt bzw. daraus entfernt, und das Ergebnis an
--   set_band_moods(band_id, mood_ids) uebergeben. Dadurch erbt dieser
--   Bulk-Weg automatisch und ohne Zweitimplementierung:
--     - Max-4-Pruefung (PM003)
--     - Aktiv-Mood-Pruefung fuer ALLE Moods dieser Band, nicht nur den
--       hier bearbeiteten (PM007) -- siehe Hinweis unten
--     - echte Diff-Semantik (nur tatsaechlich geaenderte Zeilen werden
--       geschrieben, unveraenderte Paare bleiben inkl. created_at
--       unangetastet)
--     - Rang-Kompaktierung ueber Array-Position
--     - identische Fehlercode-Semantik (PM00x)
--
-- Bewusste Nebenwirkung: Wenn eine betroffene Band unabhaengig von diesem
-- Mood bereits einen Datenkonflikt hat (z. B. eine andere, inzwischen
-- archivierte Zuordnung -- im Production-Audit vom 2026-08-24 aktuell mit
-- 0 Zeilen bestaetigt, siehe docs des Audits), wuerde set_band_moods auch
-- dafuer PM007 werfen und dadurch den GESAMTEN Bulk-Save abbrechen. Das
-- ist gewolltes Fail-closed-Verhalten (siehe Auftrag Abschnitt 22), keine
-- Regression -- ein still uebergangener Fremd-Konflikt waere die
-- schlechtere Alternative.
--
-- Damit ein solcher (oder ein Max-4-)Fehler aus set_band_moods trotz
-- Wiederverwendung bandbezogen bleibt, wird jeder Aufruf einzeln in einem
-- BEGIN/EXCEPTION-Block abgefangen und mit derselben Fehlermeldung/demselben
-- ERRCODE, aber einem um "band_id=<uuid>: " ergaenzten detail erneut
-- geworfen. Ein Abfangen+erneutes Werfen in PL/pgSQL erzeugt ein internes
-- Savepoint, aendert aber NICHTS an der Tatsache, dass die aeussere
-- Transaktion bei einer unbehandelt bis zum Aufrufer durchgereichten
-- Exception vollstaendig zurückgerollt wird -- keine Teilcommits.
--
-- Locking-Reihenfolge (Auftrag Abschnitt 21, exakt in dieser Reihenfolge):
--   1. Alle betroffenen Bands (add ∪ remove, dedupliziert) werden VOR jeder
--      Schreiboperation in deterministischer Reihenfolge (ORDER BY band_id)
--      mit FOR UPDATE gesperrt.
--   2. Der betrachtete Mood wird per FOR SHARE gesperrt und auf
--      Existenz/active geprueft (identisches Locking-Prinzip wie in
--      set_band_moods).
--   3. Erst danach die eigentlichen Schreiboperationen (ueber
--      set_band_moods je betroffener Band). Ein erneutes Sperren derselben
--      Bandzeile innerhalb von set_band_moods (eigenes FOR UPDATE) ist
--      innerhalb derselben Transaktion unschaedlich (reentrant) und
--      aendert die bereits etablierte Sperr-Reihenfolge nicht.
--
-- Validierung (RAISE EXCEPTION bei Verstoss):
--   MB001  mood_bands_mood_required     -- p_mood_id ist NULL
--   MB002  mood_bands_null_target       -- add/remove enthaelt NULL-Element
--   MB003  mood_bands_mood_not_found    -- Mood existiert nicht
--   MB004  mood_bands_mood_not_active   -- Mood ist nicht status='active'
--   MB005  mood_bands_band_not_found    -- eine betroffene Band existiert nicht
--   MB006  mood_bands_duplicate         -- Duplikat innerhalb add ODER remove
--   MB007  mood_bands_overlap           -- eine Band-ID steht in add UND remove
--   (PM00x -- durchgereicht aus set_band_moods, band-identifiziert per detail)
--
-- p_add_band_ids / p_remove_band_ids: NULL wird als leeres Array
-- behandelt (anders als p_mood_ids in set_band_moods: dort bedeutet NULL
-- einen Fehler, weil ein fehlender Parameter dort "alles loeschen"
-- verhindern soll -- hier bedeutet ein fehlendes Array lediglich "keine
-- Hinzufuegungen" bzw. "keine Entfernungen", was risikofrei ist).
--
-- Idempotenz (Auftrag Abschnitt 23): eine Band in p_add_band_ids, die den
-- Mood bereits besitzt, sowie eine Band in p_remove_band_ids, die den
-- Mood nicht (mehr) besitzt, werden sicher als No-op behandelt (kein
-- Fehler, kein unnoetiger Write) -- deckt den Fall ab, dass die
-- Zuordnung durch einen parallelen Vorgang bereits im Zielzustand ist.
--
-- Sicherheit (identisches Modell zu set_band_moods):
--   SECURITY DEFINER, SET search_path = pg_catalog, pg_temp, alle
--   Tabellen-/Funktionsverweise vollstaendig schemaqualifiziert. REVOKE
--   ALL FROM PUBLIC/anon/authenticated, GRANT EXECUTE nur an service_role.
--   Keine neuen Table-DML-Grants auf band_moods -- das bestehende Lockdown
--   (band_moods_admin_write_lockdown.sql: service_role nur SELECT) bleibt
--   unveraendert gueltig, da auch dieser Weg ausschliesslich ueber
--   set_band_moods schreibt.
-- ============================================================

create or replace function public.update_mood_band_assignments(
  p_mood_id uuid,
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
  v_current uuid[];
  v_new     uuid[];
begin
  -- ---- p_mood_id ist Pflicht ----
  if p_mood_id is null then
    raise exception 'mood_bands_mood_required'
      using errcode = 'MB001',
            detail = 'p_mood_id must not be null';
  end if;

  -- ---- Kein Element von add/remove ist NULL ----
  if array_position(v_add, null) is not null or array_position(v_remove, null) is not null then
    raise exception 'mood_bands_null_target'
      using errcode = 'MB002',
            detail = 'p_add_band_ids/p_remove_band_ids must not contain null elements';
  end if;

  -- ---- Keine Duplikate innerhalb von add bzw. innerhalb von remove ----
  if (select count(distinct x) from unnest(v_add) as x) <> cardinality(v_add)
     or (select count(distinct x) from unnest(v_remove) as x) <> cardinality(v_remove)
  then
    raise exception 'mood_bands_duplicate'
      using errcode = 'MB006',
            detail = 'p_add_band_ids or p_remove_band_ids contains duplicate values';
  end if;

  -- ---- Keine Band-ID gleichzeitig in add und remove ----
  if exists (select 1 from unnest(v_add) a where a = any (v_remove)) then
    raise exception 'mood_bands_overlap'
      using errcode = 'MB007',
            detail = 'a band_id is present in both p_add_band_ids and p_remove_band_ids';
  end if;

  -- ---- Mood sperren, Existenz + active pruefen (vor jedem Bandzugriff) ----
  perform 1 from public.moods m where m.id = p_mood_id for share;
  if not found then
    raise exception 'mood_bands_mood_not_found'
      using errcode = 'MB003',
            detail = format('mood_id=%s not found in public.moods', p_mood_id);
  end if;

  if not exists (select 1 from public.moods m where m.id = p_mood_id and m.status = 'active') then
    raise exception 'mood_bands_mood_not_active'
      using errcode = 'MB004',
            detail = format('mood_id=%s is not status=active', p_mood_id);
  end if;

  -- ---- Alle betroffenen Bands deterministisch sortiert (ORDER BY band_id)
  --      sperren und auf Existenz pruefen -- VOR jeder Schreiboperation,
  --      unabhaengig davon, ob die Band in add oder remove steht. ----
  for v_band_id in
    select distinct b from unnest(v_add || v_remove) as b order by b
  loop
    perform 1 from public.bands bd where bd.id = v_band_id for update;
    if not found then
      raise exception 'mood_bands_band_not_found'
        using errcode = 'MB005',
              detail = format('band_id=%s not found in public.bands', v_band_id);
    end if;
  end loop;

  -- ============================================================
  -- Ab hier: validiert und gesperrt. Eigentliche Aenderungen, je Band
  -- delegiert an set_band_moods (siehe Kommentarblock oben).
  -- ============================================================

  -- ---- Hinzufuegen ----
  for v_band_id in select x from unnest(v_add) as x order by x loop
    select coalesce(array_agg(bm.mood_id order by bm.sort_order), '{}'::uuid[])
      into v_current
      from public.band_moods bm
      where bm.band_id = v_band_id;

    if p_mood_id = any (v_current) then
      v_new := v_current; -- bereits vorhanden (paralleler Vorgang) -- idempotent, kein Fehler
    else
      v_new := v_current || p_mood_id; -- neuer Mood kommt ans Ende der bestehenden Reihenfolge
    end if;

    begin
      perform public.set_band_moods(v_band_id, v_new);
    exception when others then
      raise exception '%', sqlerrm
        using errcode = sqlstate,
              detail = format('band_id=%s: %s', v_band_id, coalesce(sqlerrm, ''));
    end;
  end loop;

  -- ---- Entfernen ----
  for v_band_id in select x from unnest(v_remove) as x order by x loop
    select coalesce(array_agg(bm.mood_id order by bm.sort_order), '{}'::uuid[])
      into v_current
      from public.band_moods bm
      where bm.band_id = v_band_id;

    v_new := array_remove(v_current, p_mood_id); -- bereits nicht vorhanden -- idempotent, array_remove ist ein No-op

    begin
      perform public.set_band_moods(v_band_id, v_new);
    exception when others then
      raise exception '%', sqlerrm
        using errcode = sqlstate,
              detail = format('band_id=%s: %s', v_band_id, coalesce(sqlerrm, ''));
    end;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- Ausfuehrungsrechte: identisches Modell zu set_band_moods.
-- ------------------------------------------------------------
revoke all on function public.update_mood_band_assignments(uuid, uuid[], uuid[]) from public;
revoke all on function public.update_mood_band_assignments(uuid, uuid[], uuid[]) from anon;
revoke all on function public.update_mood_band_assignments(uuid, uuid[], uuid[]) from authenticated;
grant execute on function public.update_mood_band_assignments(uuid, uuid[], uuid[]) to service_role;

-- ------------------------------------------------------------
-- MANUELLER ZWEI-SESSION-CONCURRENCY-SMOKE (nach Rollout auf Test, kein
-- Teil dieser Migration selbst -- siehe Abschlussbericht fuer die
-- tatsaechlich durchgefuehrten Laeufe):
--
-- Richtung A (zwei ueberlappende Bulk-Saves auf teils ueberschneidenden
-- Bandmengen):
--   Session 1: BEGIN; update_mood_band_assignments mit einer Bandmenge
--              aufrufen; Transaktion offen lassen.
--   Session 2: update_mood_band_assignments mit einer ueberschneidenden
--              Bandmenge aufrufen. Erwartung: wartet, bis Session 1
--              committet/rollbackt; kein Deadlock, kein Lost Update.
--
-- Richtung B (Bulk-Save gegen bestehenden set_band_moods-Save derselben
-- Band):
--   Session 1: BEGIN; set_band_moods fuer eine Band aufrufen, die auch
--              Teil des Bulk-Saves ist; Transaktion offen lassen.
--   Session 2: update_mood_band_assignments mit derselben Band aufrufen.
--              Erwartung: wartet, bis Session 1 endet; kein Deadlock.
-- ------------------------------------------------------------
