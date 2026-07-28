-- ============================================================
-- fn_band_gallery_mutations_v2.sql
--
-- Vor dem zugehoerigen App-Deployment manuell gegen Production
-- auszufuehren. Der Ausfuehrungsnachweis wird im PR dokumentiert.
-- Versioniert vorbereitet fuer den Codex-Korrekturblock zu PR #16
-- ("Hero-Revalidierung und transaktionale Galerie-Mutationen").
--
-- Sprint: Admin "Bandbilder pflegen" -- Galerie, Serialisierung + Add/Move-RPC
-- Datum des Entwurfs: 28.07.2026
--
-- Ausfuehrung erfolgt manuell durch Xandi im Supabase SQL Editor (wie alle
-- vorherigen fn_*.sql-Dateien in diesem Repo -- der Agent hat keinen
-- eigenen Ausfuehrungskanal fuer Production).
--
-- Die bereits ausgefuehrte Datei supabase/fn_delete_band_gallery_image.sql
-- bleibt UNVERAENDERT als historischer, hash-verifizierter Stand erhalten.
-- Diese Datei ersetzt die darin enthaltene Funktion per CREATE OR REPLACE
-- (identische Signatur) und ergaenzt zwei neue Funktionen.
--
-- Ursache der Korrektur (Codex-Review PR #16):
--   A2: Galerie-Add las Anzahl/naechste Position und fuegte die neue
--       Zeile in getrennten PostgREST-Aufrufen ein. Zwei parallele
--       Uploads konnten dieselbe Ausgangslage sehen, dieselbe Position
--       berechnen und gemeinsam das Limit bzw. die eindeutige
--       Reihenfolge verletzen.
--   A3: Galerie-Reorder nutzte ein insert-faehiges upsert() fuer den
--       Positionstausch. Wurde eine der beiden Zeilen zwischen Laden und
--       upsert() geloescht, haette upsert() sie mit der (falschen)
--       sort_order erneut EINGEFUEGT statt den Fehler zu erkennen -- ein
--       bereits geloeschter Datensatz waere mit einer nicht mehr
--       existierenden Storage-URL wiederauferstanden.
--
-- Gemeinsame Loesung fuer beide Punkte UND fuer das bestehende Delete:
-- alle drei Galerie-Mutationen einer Band sperren zu Beginn ihrer
-- jeweiligen Funktion dieselbe public.bands-Zeile per SELECT ... FOR
-- UPDATE (identisches, bereits etabliertes Muster wie
-- fn_set_similar_bands.sql / fn_set_band_repertoire_styles.sql). Dadurch:
--   - Operationen verschiedener Bands blockieren einander nicht.
--   - Add/Delete/Reorder DERSELBEN Band laufen strikt nacheinander
--     (PostgreSQL serialisiert ueber den Zeilen-Lock).
--   - Jede Operation sieht garantiert den Bestand NACH der jeweils
--     vorherigen Operation, nie einen veralteten Zwischenstand.
-- Das Reorder-Problem (A3) wird zusaetzlich dadurch geloest, dass die
-- neue Move-Funktion ausschliesslich UPDATE auf bereits durch SELECT ...
-- FOR UPDATE bestaetigte, existierende Zeilen ausfuehrt -- niemals
-- INSERT oder UPSERT. Eine zwischenzeitlich geloeschte Nachbar-Zeile
-- kann dadurch strukturell nicht wiederauferstehen: sie wird von der
-- Nachbar-Suche (gegen den Bestand NACH dem Bandlock) schlicht nicht
-- mehr gefunden.
--
-- Signaturen:
--   public.delete_band_gallery_image(p_band_id uuid, p_media_asset_id uuid)
--     RETURNS TABLE (deleted_media_asset_id uuid, deleted_url text)
--   public.add_band_gallery_image(p_band_id uuid, p_url text, p_alt_text text)
--     RETURNS TABLE (new_media_asset_id uuid, new_url text, new_sort_order integer)
--   public.move_band_gallery_image(p_band_id uuid, p_media_asset_id uuid, p_direction text)
--     RETURNS TABLE (media_asset_id uuid, sort_order integer)
--
-- Ablauf delete_band_gallery_image (unveraendert ausser dem neuen
-- Schritt 0, identische Semantik zu fn_delete_band_gallery_image.sql):
--   0. Bandzeile per p_band_id sperren (SELECT ... FOR UPDATE), Existenz
--      pruefen (GA004).
--   1. Zielzeile per id sperren und laden.
--   2. Existenz (GA001), Band-Zugehoerigkeit (GA002), role='gallery'
--      (GA003) pruefen.
--   3. Bisherige URL sichern (fuer Storage-Cleanup AUSSERHALB der
--      Funktion).
--   4. Zeile loeschen.
--   5. Verbleibende Galerie deterministisch neu nummerieren
--      (sort_order ASC, created_at ASC, id ASC -> 1..n).
--   6. Geloeschte id/URL zurueckgeben.
--
-- Ablauf add_band_gallery_image:
--   0. Bandzeile sperren, Existenz pruefen (GA004).
--   1. Aktuelle Anzahl role='gallery'-Zeilen dieser Band ermitteln.
--   2. Bei >= 10 Bildern abbrechen (GA005) -- die Zahl 10 ist als lokale
--      Konstante v_max_gallery_images im Funktionskoerper hinterlegt und
--      hier verbindlich in der Datenbank durchgesetzt. Das Admin-UI
--      (GalleryEditorSection.tsx) sowie die Server Action fuehren
--      denselben Wert 10 zusaetzlich als Komfortpruefung -- diese
--      Datenbankfunktion bleibt die fachliche Autoritaet.
--   3. Naechste sort_order (max+1, oder 1 bei leerer Galerie) INNERHALB
--      derselben Transaktion berechnen -- durch den Bandlock ist
--      garantiert kein anderer paralleler Aufruf fuer dieselbe Band
--      zwischen Zaehlung und Insert aktiv.
--   4. Genau eine Zeile anlegen: band_id=p_band_id, url=p_url,
--      role='gallery' (fest, kein Parameter), alt_text=p_alt_text,
--      source_provider='supabase_storage' (fest, kein Parameter),
--      sort_order=berechneter Wert.
--   5. Neue id/URL/sort_order zurueckgeben.
--
-- Ablauf move_band_gallery_image:
--   0. p_direction validieren (nur 'up'/'down', GA006) -- bewusst VOR
--      jedem Lock, da unabhaengig vom DB-Zustand pruefbar.
--   1. Bandzeile sperren, Existenz pruefen (GA004).
--   2. Zielzeile sperren und laden; Existenz (GA001), Band-Zugehoerigkeit
--      (GA002), role='gallery' (GA003) pruefen.
--   3. Direkten Nachbarn anhand derselben deterministischen Reihenfolge
--      wie beim Delete (sort_order ASC, created_at ASC, id ASC)
--      ermitteln und ebenfalls per FOR UPDATE sperren.
--   4. Kein Nachbar in der gewuenschten Richtung (bereits am Rand) ->
--      saubere No-op-Rueckgabe (aktuelle id/sort_order unveraendert),
--      kein Fehler.
--   5. Sonst: sort_order der beiden bereits bestaetigten, existierenden
--      Zeilen AUSSCHLIESSLICH per UPDATE tauschen -- niemals INSERT
--      oder UPSERT.
--   6. Finale id/sort_order der Zielzeile zurueckgeben.
--
-- Fehlercodes (MESSAGE = stabiler Slug, zusaetzlich projektspezifischer
-- ERRCODE -- GA001-GA003 identisch zur bereits ausgefuehrten v1-Datei,
-- GA004-GA006 neu):
--   GA001  gallery_target_not_found
--   GA002  gallery_target_wrong_band
--   GA003  gallery_target_wrong_role
--   GA004  gallery_band_not_found
--   GA005  gallery_limit_reached
--   GA006  gallery_invalid_direction
--
-- Sicherheit (identisches Modell zu fn_delete_band_gallery_image.sql):
--   - SECURITY INVOKER (kein SECURITY DEFINER-Zusatz). service_role
--     besitzt bereits volle SELECT/INSERT/UPDATE/DELETE-Grants direkt
--     auf public.media_assets UND auf public.bands (siehe
--     supabase/grant-service-role-permissions-v2.sql) -- keine
--     Rechteausweitung noetig, auch nicht fuer den neuen Bandzeilen-Lock.
--   - Tabellenverweise vollstaendig schemaqualifiziert
--     (public.media_assets, public.bands).
--   - REVOKE ALL FROM PUBLIC/anon/authenticated + GRANT EXECUTE nur an
--     service_role fuer alle drei Funktionen -- kein neuer direkter
--     Browser-Client-Zugriff.
--
-- Storage bleibt ausdruecklich AUSSERHALB aller drei Funktionen: Upload
-- (add) und Loeschen des alten Objekts (delete) erfolgen weiterhin in
-- den jeweiligen Server Actions (app/admin/bands/[id]/actions.ts), vor
-- bzw. nach dem jeweiligen RPC-Aufruf.
-- ============================================================

-- ─────────────────────────────────────────
-- delete_band_gallery_image: CREATE OR REPLACE, identische Signatur wie
-- die bereits ausgefuehrte v1-Funktion. Einziger inhaltlicher Unterschied:
-- neuer Schritt 0 (Bandzeilen-Lock + Existenzpruefung).
-- ─────────────────────────────────────────
create or replace function public.delete_band_gallery_image(
  p_band_id uuid,
  p_media_asset_id uuid
)
returns table (
  deleted_media_asset_id uuid,
  deleted_url text
)
language plpgsql
as $$
declare
  v_url     text;
  v_band_id uuid;
  v_role    text;
begin
  -- ---- 0. Bandzeile sperren -- serialisiert Add/Delete/Reorder
  -- derselben Band gegeneinander (siehe Dateikommentar oben) ----
  perform 1 from public.bands b where b.id = p_band_id for update;
  if not found then
    raise exception 'gallery_band_not_found'
      using errcode = 'GA004',
            detail = format('band_id=%s not found in public.bands', p_band_id);
  end if;

  -- ---- 1. Zielzeile sperren und laden ----
  select ma.url, ma.band_id, ma.role
    into v_url, v_band_id, v_role
  from public.media_assets ma
  where ma.id = p_media_asset_id
  for update;

  -- ---- 2. Existenz, Band-Zugehoerigkeit, Rolle pruefen ----
  if not found then
    raise exception 'gallery_target_not_found'
      using errcode = 'GA001',
            detail = format('media_asset_id=%s not found in public.media_assets', p_media_asset_id);
  end if;

  if v_band_id is distinct from p_band_id then
    raise exception 'gallery_target_wrong_band'
      using errcode = 'GA002',
            detail = format('media_asset_id=%s belongs to band_id=%s, not %s', p_media_asset_id, v_band_id, p_band_id);
  end if;

  if v_role is distinct from 'gallery' then
    raise exception 'gallery_target_wrong_role'
      using errcode = 'GA003',
            detail = format('media_asset_id=%s has role=%s, expected gallery', p_media_asset_id, v_role);
  end if;

  -- ============================================================
  -- Ab hier: validiert. Loeschung + Neudurchnummerierung im selben
  -- impliziten Transaktionsblock der Funktion (atomar).
  -- ============================================================

  -- ---- 4. Genau diese Zeile loeschen ----
  delete from public.media_assets ma where ma.id = p_media_asset_id;

  -- ---- 5. Verbleibende Galeriezeilen derselben Band deterministisch
  -- und luecken-/duplikatfrei neu nummerieren (sort_order ASC,
  -- created_at ASC, id ASC). Nur tatsaechlich abweichende Zeilen
  -- werden geschrieben. ----
  with ordered as (
    select
      ma.id,
      row_number() over (
        order by ma.sort_order asc, ma.created_at asc, ma.id asc
      ) as new_sort_order
    from public.media_assets ma
    where ma.band_id = p_band_id
      and ma.role = 'gallery'
  )
  update public.media_assets ma
     set sort_order = ordered.new_sort_order
    from ordered
   where ma.id = ordered.id
     and ma.sort_order is distinct from ordered.new_sort_order;

  -- ---- 6. Geloeschte media_asset_id und gesicherte URL zurueckgeben ----
  return query select p_media_asset_id, v_url;
end;
$$;

-- ─────────────────────────────────────────
-- add_band_gallery_image: neu. Buendelt Limitpruefung, Positionsvergabe
-- und Insert in einer Transaktion, serialisiert ueber denselben
-- Bandzeilen-Lock wie delete/move.
-- ─────────────────────────────────────────
create or replace function public.add_band_gallery_image(
  p_band_id uuid,
  p_url text,
  p_alt_text text
)
returns table (
  new_media_asset_id uuid,
  new_url text,
  new_sort_order integer
)
language plpgsql
as $$
declare
  v_max_gallery_images constant integer := 10;
  v_current_count      integer;
  v_next_sort_order    integer;
  v_new_id             uuid;
begin
  -- ---- 0. Bandzeile sperren -- serialisiert Add/Delete/Reorder
  -- derselben Band gegeneinander ----
  perform 1 from public.bands b where b.id = p_band_id for update;
  if not found then
    raise exception 'gallery_band_not_found'
      using errcode = 'GA004',
            detail = format('band_id=%s not found in public.bands', p_band_id);
  end if;

  -- ---- 1./2. Aktuelle Anzahl pruefen -- verbindliche Grenze, nicht
  -- nur im UI. Durch den Bandlock oben ist garantiert kein anderer
  -- paralleler add/delete/move-Aufruf fuer dieselbe Band zwischen
  -- dieser Zaehlung und dem Insert unten aktiv. ----
  select count(*) into v_current_count
  from public.media_assets ma
  where ma.band_id = p_band_id
    and ma.role = 'gallery';

  if v_current_count >= v_max_gallery_images then
    raise exception 'gallery_limit_reached'
      using errcode = 'GA005',
            detail = format('band_id=%s already has %s gallery images (max %s)', p_band_id, v_current_count, v_max_gallery_images);
  end if;

  -- ---- 3. Naechste Position innerhalb derselben Transaktion
  -- berechnen ----
  select coalesce(max(ma.sort_order), 0) + 1 into v_next_sort_order
  from public.media_assets ma
  where ma.band_id = p_band_id
    and ma.role = 'gallery';

  -- ---- 4. Genau eine Zeile anlegen. role und source_provider sind
  -- fest verdrahtet, keine Parameter -- die Funktion akzeptiert keine
  -- frei uebergebene Rolle. ----
  insert into public.media_assets (band_id, url, role, alt_text, source_provider, sort_order)
  values (p_band_id, p_url, 'gallery', p_alt_text, 'supabase_storage', v_next_sort_order)
  returning id into v_new_id;

  -- ---- 5. Neue id/URL/sort_order zurueckgeben ----
  return query select v_new_id, p_url, v_next_sort_order;
end;
$$;

-- ─────────────────────────────────────────
-- move_band_gallery_image: neu. Ersetzt den bisherigen, insert-faehigen
-- Bulk-upsert() im Server-Action-Code vollstaendig -- ausschliesslich
-- UPDATE auf bereits durch SELECT ... FOR UPDATE bestaetigte,
-- existierende Zeilen. Kein INSERT, kein UPSERT.
-- ─────────────────────────────────────────
create or replace function public.move_band_gallery_image(
  p_band_id uuid,
  p_media_asset_id uuid,
  p_direction text
)
returns table (
  media_asset_id uuid,
  sort_order integer
)
language plpgsql
as $$
declare
  v_band_id             uuid;
  v_role                text;
  v_current_sort_order  integer;
  v_current_created_at  timestamptz;
  v_neighbor_id         uuid;
  v_neighbor_sort_order integer;
begin
  -- ---- 0. Richtung validieren -- unabhaengig vom DB-Zustand, daher vor
  -- jedem Lock ----
  if p_direction is null
     or p_direction not in ('up', 'down') then
    raise exception 'gallery_invalid_direction'
      using errcode = 'GA006',
            detail = format('p_direction=%s, expected up or down', p_direction);
  end if;

  -- ---- 1. Bandzeile sperren -- serialisiert Add/Delete/Reorder
  -- derselben Band gegeneinander ----
  perform 1 from public.bands b where b.id = p_band_id for update;
  if not found then
    raise exception 'gallery_band_not_found'
      using errcode = 'GA004',
            detail = format('band_id=%s not found in public.bands', p_band_id);
  end if;

  -- ---- 2. Zielzeile sperren und laden, Existenz/Band/Rolle pruefen ----
  select ma.band_id, ma.role, ma.sort_order, ma.created_at
    into v_band_id, v_role, v_current_sort_order, v_current_created_at
  from public.media_assets ma
  where ma.id = p_media_asset_id
  for update;

  if not found then
    raise exception 'gallery_target_not_found'
      using errcode = 'GA001',
            detail = format('media_asset_id=%s not found in public.media_assets', p_media_asset_id);
  end if;

  if v_band_id is distinct from p_band_id then
    raise exception 'gallery_target_wrong_band'
      using errcode = 'GA002',
            detail = format('media_asset_id=%s belongs to band_id=%s, not %s', p_media_asset_id, v_band_id, p_band_id);
  end if;

  if v_role is distinct from 'gallery' then
    raise exception 'gallery_target_wrong_role'
      using errcode = 'GA003',
            detail = format('media_asset_id=%s has role=%s, expected gallery', p_media_asset_id, v_role);
  end if;

  -- ---- 3. Direkten Nachbarn anhand derselben deterministischen
  -- Reihenfolge wie delete_band_gallery_image ermitteln (sort_order
  -- ASC, created_at ASC, id ASC) und per FOR UPDATE sperren. Diese
  -- Suche laeuft gegen den Bestand NACH dem Bandlock oben -- eine
  -- zwischenzeitlich geloeschte Nachbar-Zeile wird hier schlicht nicht
  -- mehr gefunden (kein Resurrection-Risiko). ----
  if p_direction = 'up' then
    select ma.id, ma.sort_order into v_neighbor_id, v_neighbor_sort_order
    from public.media_assets ma
    where ma.band_id = p_band_id
      and ma.role = 'gallery'
      and ma.id <> p_media_asset_id
      and (ma.sort_order, ma.created_at, ma.id) < (v_current_sort_order, v_current_created_at, p_media_asset_id)
    order by ma.sort_order desc, ma.created_at desc, ma.id desc
    limit 1
    for update;
  else
    select ma.id, ma.sort_order into v_neighbor_id, v_neighbor_sort_order
    from public.media_assets ma
    where ma.band_id = p_band_id
      and ma.role = 'gallery'
      and ma.id <> p_media_asset_id
      and (ma.sort_order, ma.created_at, ma.id) > (v_current_sort_order, v_current_created_at, p_media_asset_id)
    order by ma.sort_order asc, ma.created_at asc, ma.id asc
    limit 1
    for update;
  end if;

  -- ---- 4. Kein Nachbar in dieser Richtung -- bereits am Rand der
  -- Galerie. Sauberer No-op, kein Fehler. ----
  if not found then
    return query select p_media_asset_id, v_current_sort_order;
    return;
  end if;

  -- ---- 5. Ausschliesslich UPDATE auf die beiden bereits bestaetigten,
  -- existierenden Zeilen -- niemals INSERT oder UPSERT. ----
  update public.media_assets set sort_order = v_neighbor_sort_order where id = p_media_asset_id;
  update public.media_assets set sort_order = v_current_sort_order where id = v_neighbor_id;

  -- ---- 6. Finale id/sort_order der Zielzeile zurueckgeben ----
  return query select p_media_asset_id, v_neighbor_sort_order;
end;
$$;

-- ------------------------------------------------------------
-- Ausfuehrungsrechte: Standardmaessig vergibt Postgres EXECUTE an
-- PUBLIC bei CREATE FUNCTION -- das muss explizit entzogen werden.
-- REVOKE FROM PUBLIC allein entfernt keine direkt an anon/authenticated
-- vergebenen Rechte -- deshalb alle drei Rollen explizit einzeln, fuer
-- alle drei Funktionen.
-- ------------------------------------------------------------
revoke all on function public.delete_band_gallery_image(uuid, uuid) from public;
revoke all on function public.delete_band_gallery_image(uuid, uuid) from anon;
revoke all on function public.delete_band_gallery_image(uuid, uuid) from authenticated;
grant execute on function public.delete_band_gallery_image(uuid, uuid) to service_role;

revoke all on function public.add_band_gallery_image(uuid, text, text) from public;
revoke all on function public.add_band_gallery_image(uuid, text, text) from anon;
revoke all on function public.add_band_gallery_image(uuid, text, text) from authenticated;
grant execute on function public.add_band_gallery_image(uuid, text, text) to service_role;

revoke all on function public.move_band_gallery_image(uuid, uuid, text) from public;
revoke all on function public.move_band_gallery_image(uuid, uuid, text) from anon;
revoke all on function public.move_band_gallery_image(uuid, uuid, text) from authenticated;
grant execute on function public.move_band_gallery_image(uuid, uuid, text) to service_role;
