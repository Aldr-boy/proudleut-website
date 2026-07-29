-- ============================================================
-- fn_move_band_gallery_image_v3.sql
--
-- Vor dem zugehoerigen App-Deployment manuell gegen Production
-- auszufuehren. Der Ausfuehrungsnachweis wird im PR dokumentiert.
-- Versioniert vorbereitet fuer den finalen Codex-Korrekturblock 3 zu
-- PR #16 ("Bilddateien vollstaendig validieren, Galerie-Move
-- normalisieren, Supabase-Bildhost konfigurierbar machen").
--
-- Sprint: Admin "Bandbilder pflegen" -- Galerie-Move, Normalisierung
-- Datum des Entwurfs: 29.07.2026
--
-- Ausfuehrung erfolgt manuell durch Xandi im Supabase SQL Editor (wie
-- alle vorherigen fn_*.sql-Dateien in diesem Repo -- der Agent hat
-- keinen eigenen Ausfuehrungskanal fuer Production).
--
-- Rollout-Reihenfolge (bindend):
--   1. supabase/fn_delete_band_gallery_image.sql            (bereits ausgefuehrt, unveraendert)
--   2. supabase/fn_band_gallery_mutations_v2.sql             (bereits ausgefuehrt, unveraendert)
--   3. supabase/add-media-assets-thumbnail-unique-index.sql  (bereits ausgefuehrt, unveraendert)
--   4. DIESE DATEI (fn_move_band_gallery_image_v3.sql)       (neu, jetzt auszufuehren)
-- Diese Datei ersetzt AUSSCHLIESSLICH move_band_gallery_image per
-- CREATE OR REPLACE (identische Signatur wie in v2). delete_band_gallery_image
-- und add_band_gallery_image aus fn_band_gallery_mutations_v2.sql werden
-- von dieser Datei NICHT beruehrt und bleiben unveraendert in Kraft.
--
-- Ursache der Korrektur (Codex-Review PR #16, Punkt A2):
--   move_band_gallery_image (v2) ermittelt Ziel- und Nachbarzeile ueber
--   die deterministische Tupel-Reihenfolge (sort_order, created_at, id)
--   und tauscht anschliessend nur die vorhandenen sort_order-WERTE der
--   beiden Zeilen. Wenn mehrere Galeriezeilen dieser Band denselben
--   sort_order-Wert tragen (z. B. drei Zeilen mit sort_order=0 --
--   historisch entstanden, bevor Add/Delete diese Werte serialisiert
--   und luecken-/duplikatfrei gehalten haben), liefert die
--   Tupel-Reihenfolge zwar weiterhin eine korrekte, eindeutige
--   Nachbarzeile, der anschliessende Werte-Tausch schreibt aber
--   denselben Zahlenwert (0 fuer 0) zurueck -- die Funktion meldet
--   Erfolg, ohne dass sich an der sichtbaren Reihenfolge etwas
--   aendert.
--
--   Preflight-Befund (read-only, media_assets, role='gallery',
--   29.07.2026): 59 Bands mit Galeriezeilen, 172 Galeriezeilen
--   insgesamt, 0 Bands mit doppeltem sort_order, 0 Bands mit NULL
--   sort_order, 0 Bands mit Luecken. Der aktuelle Produktionsbestand
--   ist damit bereits luecken-/duplikatfrei -- diese Korrektur ist
--   dennoch erforderlich, weil sie die Funktion strukturell gegen
--   jeden zukuenftigen bzw. bislang unbeobachteten Fall absichert,
--   nicht weil aktuell betroffene Bands bekannt sind. Es wurde keine
--   Zeile veraendert, keine Band angefasst, keine globale Bereinigung
--   vorgenommen.
--
-- Loesung (v3): normalisieren, DANN bewegen -- beides in derselben
-- Transaktion/Funktion, unter demselben Bandzeilen-Lock wie Add/Delete:
--   1. p_direction validieren (nur 'up'/'down', NULL eingeschlossen,
--      sonst GA006) -- unveraendert, bewusst vor jedem Lock.
--   2. Bandzeile sperren (SELECT ... FOR UPDATE), Existenz pruefen
--      (GA004) -- identisches Muster wie add/delete.
--   3. Zielzeile sperren und laden; Existenz (GA001), Band-Zugehoerigkeit
--      (GA002), role='gallery' (GA003) pruefen -- unveraendert.
--   4. Alle Galeriezeilen dieser Band deterministisch ordnen:
--      sort_order asc nulls last, created_at asc nulls last, id asc.
--   5. Diese Galerie INNERHALB der Funktion luecken-/duplikatfrei auf
--      1..n neu nummerieren (identisches UPDATE-Muster wie in
--      delete_band_gallery_image nach dem Loeschen).
--   6. Zielzeile NACH der Normalisierung erneut laden -- ab hier ist
--      ihre Position innerhalb dieser Band-Galerie garantiert
--      eindeutig.
--   7. Nachbarn aus der jetzt eindeutigen Position bestimmen: up ->
--      Position-1, down -> Position+1.
--   8. Kein Nachbar am Rand -> sauberer No-op: dieselbe Ziel-id, aktuelle
--      (bereits normalisierte) Position wird zurueckgegeben, kein Fehler.
--   9. Sonst: Ziel- und Nachbarzeile in EINEM einzigen
--      UPDATE ... SET sort_order = CASE ... tauschen -- niemals INSERT,
--      niemals UPSERT, keine Zeile wird geloescht.
--   10. Finale Ziel-id/-Position zurueckgeben.
-- Normalisierung und Tausch laufen unter demselben Bandzeilen-Lock und
-- innerhalb desselben RPC-Aufrufs -- kein separater Zwischen-Commit.
--
-- Signatur (UNVERAENDERT gegenueber v2 -- die bestehende Server Action
-- in app/admin/bands/[id]/actions.ts ruft weiterhin exakt dieselbe
-- Signatur auf, ohne Code-Aenderung):
--   public.move_band_gallery_image(p_band_id uuid, p_media_asset_id uuid, p_direction text)
--     RETURNS TABLE (media_asset_id uuid, sort_order integer)
--
-- Fehlercodes (identisch zu v2, keine neuen Codes):
--   GA001  gallery_target_not_found
--   GA002  gallery_target_wrong_band
--   GA003  gallery_target_wrong_role
--   GA004  gallery_band_not_found
--   GA006  gallery_invalid_direction
--
-- Sicherheit (identisches Modell zu v1/v2):
--   - SECURITY INVOKER (kein SECURITY DEFINER-Zusatz). service_role
--     besitzt bereits volle SELECT/INSERT/UPDATE/DELETE-Grants direkt
--     auf public.media_assets UND auf public.bands (siehe
--     supabase/grant-service-role-permissions-v2.sql) -- keine
--     Rechteausweitung noetig.
--   - Tabellenverweise vollstaendig schemaqualifiziert
--     (public.media_assets, public.bands).
--   - REVOKE ALL FROM PUBLIC/anon/authenticated + GRANT EXECUTE nur an
--     service_role -- erneut explizit gesetzt (idempotent), kein neuer
--     direkter Browser-Client-Zugriff.
--
-- Storage bleibt weiterhin vollstaendig ausserhalb dieser Funktion --
-- Galerie-Move loest ohnehin nie einen Storage-Zugriff aus (nur
-- sort_order-Werte aendern sich).
-- ============================================================

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
  v_band_id           uuid;
  v_role              text;
  v_target_position   integer;
  v_neighbor_id       uuid;
  v_neighbor_position integer;
begin
  -- ---- 1. Richtung validieren -- unabhaengig vom DB-Zustand, daher vor
  -- jedem Lock ----
  if p_direction is null
     or p_direction not in ('up', 'down') then
    raise exception 'gallery_invalid_direction'
      using errcode = 'GA006',
            detail = format('p_direction=%s, expected up or down', p_direction);
  end if;

  -- ---- 2. Bandzeile sperren -- serialisiert Add/Delete/Reorder
  -- derselben Band gegeneinander (identisches Muster wie add/delete) ----
  perform 1 from public.bands b where b.id = p_band_id for update;
  if not found then
    raise exception 'gallery_band_not_found'
      using errcode = 'GA004',
            detail = format('band_id=%s not found in public.bands', p_band_id);
  end if;

  -- ---- 3. Zielzeile sperren und laden, Existenz/Band/Rolle pruefen ----
  select ma.band_id, ma.role
    into v_band_id, v_role
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

  -- ============================================================
  -- Ab hier: validiert. Normalisierung + Tausch im selben impliziten
  -- Transaktionsblock der Funktion (atomar), unter dem Bandlock von
  -- Schritt 2 -- kein anderer paralleler Add/Delete/Move-Aufruf
  -- derselben Band kann zwischen diesen Schritten laufen.
  -- ============================================================

  -- ---- 4./5. Alle Galeriezeilen dieser Band deterministisch ordnen und
  -- luecken-/duplikatfrei auf 1..n neu nummerieren (identisches Muster
  -- wie in delete_band_gallery_image nach dem Loeschen). Nur tatsaechlich
  -- abweichende Zeilen werden geschrieben. ----
  with ordered as (
    select
      ma.id,
      row_number() over (
        order by ma.sort_order asc nulls last, ma.created_at asc nulls last, ma.id asc
      ) as new_position
    from public.media_assets ma
    where ma.band_id = p_band_id
      and ma.role = 'gallery'
  )
  update public.media_assets ma
     set sort_order = ordered.new_position
    from ordered
   where ma.id = ordered.id
     and ma.sort_order is distinct from ordered.new_position;

  -- ---- 6. Zielzeile NACH der Normalisierung erneut laden -- ihre
  -- Position ist jetzt garantiert eindeutig innerhalb dieser Band-Galerie ----
  select ma.sort_order into v_target_position
  from public.media_assets ma
  where ma.id = p_media_asset_id;

  -- ---- 7. Nachbarn aus der jetzt eindeutigen Position bestimmen ----
  if p_direction = 'up' then
    select ma.id, ma.sort_order into v_neighbor_id, v_neighbor_position
    from public.media_assets ma
    where ma.band_id = p_band_id
      and ma.role = 'gallery'
      and ma.sort_order = v_target_position - 1;
  else
    select ma.id, ma.sort_order into v_neighbor_id, v_neighbor_position
    from public.media_assets ma
    where ma.band_id = p_band_id
      and ma.role = 'gallery'
      and ma.sort_order = v_target_position + 1;
  end if;

  -- ---- 8. Kein Nachbar in dieser Richtung -- bereits am Rand der
  -- (jetzt normalisierten) Galerie. Sauberer No-op, kein Fehler. Das
  -- Dataset bleibt normalisiert, auch wenn keine Bewegung stattfindet. ----
  if v_neighbor_id is null then
    return query select p_media_asset_id, v_target_position;
    return;
  end if;

  -- ---- 9. Ziel- und Nachbarzeile in einem einzigen UPDATE tauschen --
  -- niemals INSERT, niemals UPSERT, keine Zeile wird geloescht. ----
  update public.media_assets ma
     set sort_order = case
       when ma.id = p_media_asset_id then v_neighbor_position
       when ma.id = v_neighbor_id then v_target_position
     end
   where ma.id in (p_media_asset_id, v_neighbor_id);

  -- ---- 10. Finale Ziel-id/-Position zurueckgeben ----
  return query select p_media_asset_id, v_neighbor_position;
end;
$$;

-- ------------------------------------------------------------
-- Ausfuehrungsrechte erneut explizit setzen (idempotent). Signatur
-- unveraendert gegenueber v2, daher betrifft dies dieselbe Funktion wie
-- zuvor -- kein neuer Grant-Bedarf, nur zur Absicherung erneut gesetzt.
-- ------------------------------------------------------------
revoke all on function public.move_band_gallery_image(uuid, uuid, text) from public;
revoke all on function public.move_band_gallery_image(uuid, uuid, text) from anon;
revoke all on function public.move_band_gallery_image(uuid, uuid, text) from authenticated;
grant execute on function public.move_band_gallery_image(uuid, uuid, text) to service_role;
