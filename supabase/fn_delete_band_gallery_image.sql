-- ============================================================
-- fn_delete_band_gallery_image.sql
--
-- NOCH NICHT AUSGEFUEHRT. Versioniert vorbereitet fuer die A-Korrektur
-- "Galerie-Loeschung atomar ausfuehren" (Teilpaket 3, Bandbilder im
-- Admin -- Galerie pflegen).
--
-- Sprint: Admin "Bandbilder pflegen" -- Galerie, A-Korrektur Atomaritaet
-- Datum des Entwurfs: 28.07.2026
--
-- Ausfuehrung erfolgt manuell durch Xandi im Supabase SQL Editor (wie
-- alle vorherigen fn_*.sql-Dateien in diesem Repo -- der Agent hat
-- keinen eigenen Ausfuehrungskanal fuer Production).
--
-- Ursache der Korrektur:
--   Der bisherige Galerie-Loeschvorgang (app/admin/bands/[id]/actions.ts,
--   deleteBandGalleryImageAction) bestand aus zwei getrennten
--   PostgREST-Aufrufen: 1) DELETE der Zielzeile, 2) ein Bulk-upsert()
--   zur luecken-/duplikatfreien Neudurchnummerierung der restlichen
--   Galeriezeilen. Jeder der beiden Schritte ist fuer sich genommen
--   atomar, aber NICHT gemeinsam -- schlaegt Schritt 2 nach
--   erfolgreichem Schritt 1 fehl, bleibt die Loeschung bestehen, ohne
--   dass die Neudurchnummerierung nachgezogen wird. Ergebnis: eine
--   Luecke in sort_order, ein inkonsistenter Zwischenzustand. Diese
--   Funktion fuehrt beide Schritte in EINEM Funktionsaufruf zusammen --
--   PL/pgSQL-Funktionen laufen in Postgres implizit in einer einzigen
--   Transaktion; ein RAISE EXCEPTION an beliebiger Stelle rollt den
--   gesamten Aufruf zurueck, es gibt keinen halb angewendeten Zustand.
--
-- Signatur:
--   public.delete_band_gallery_image(p_band_id uuid, p_media_asset_id uuid)
--   RETURNS TABLE (deleted_media_asset_id uuid, deleted_url text)
--
-- Ablauf (siehe Funktionskoerper):
--   1. Zielzeile per id sperren und laden (SELECT ... FOR UPDATE) --
--      serialisiert parallele Aufrufe fuer dieselbe Zeile.
--   2. Existenz pruefen (GA001), dann Zugehoerigkeit zu p_band_id
--      (GA002) und role='gallery' (GA003) -- jeweils eigener
--      Fehlercode, damit die aufrufende Server Action zwischen "Zeile
--      existiert nicht mehr" und "Zeile gehoert nicht zu dieser
--      Band/Rolle" unterscheiden kann (z. B. manipuliertes
--      Formularfeld).
--   3. Bisherige URL in einer Variablen sichern (fuer den spaeteren,
--      AUSSERHALB dieser Funktion liegenden Storage-Cleanup -- Storage
--      ist kein Postgres-Objekt und kann nicht Teil dieser Transaktion
--      sein).
--   4. Genau diese Zeile loeschen.
--   5. Alle verbleibenden role='gallery'-Zeilen DERSELBEN Band
--      deterministisch neu nummerieren: sort_order = 1..n, Reihenfolge
--      nach sort_order ASC, created_at ASC, id ASC (row_number() over
--      genau dieser ORDER BY-Klausel). Nur Zeilen, deren neue Position
--      von der bisherigen abweicht, werden tatsaechlich geschrieben
--      (WHERE ... IS DISTINCT FROM) -- unveraendert korrekte Zeilen
--      bleiben ohne Write, updated_at bleibt dort exakt erhalten.
--   6. Geloeschte media_asset_id und die gesicherte URL zurueckgeben.
--
-- Die Funktion liest/schreibt ausschliesslich role='gallery'-Zeilen der
-- betroffenen Band. Hero-, Thumbnail-, Logo- oder sonstige
-- Medienzeilen werden in keinem Statement dieser Funktion beruehrt.
--
-- Fehlercodes (MESSAGE = stabiler Slug, zusaetzlich projektspezifischer
-- ERRCODE):
--   GA001  gallery_target_not_found
--   GA002  gallery_target_wrong_band
--   GA003  gallery_target_wrong_role
--
-- Sicherheit (bewusst ABWEICHEND vom Muster in fn_set_similar_bands.sql
-- / fn_set_band_moods.sql / fn_set_band_repertoire_styles.sql):
--   - SECURITY INVOKER (Postgres-Standardverhalten, kein SECURITY
--     DEFINER-Zusatz). Anders als band_relations/moods/repertoire_styles
--     -- wo service_role's direkte INSERT/UPDATE/DELETE-Table-Grants
--     bewusst entzogen wurden, um jedes Schreiben ueber die jeweilige
--     RPC zu erzwingen -- besitzt service_role auf public.media_assets
--     weiterhin volle SELECT/INSERT/UPDATE/DELETE-Grants (siehe
--     supabase/grant-service-role-permissions-v2.sql Zeile 89,
--     supabase/setup-grants-and-seed.sql Zeile 61). Diese Funktion
--     buendelt lediglich zwei ohnehin erlaubte Operationen in einer
--     Transaktion -- sie braucht dafuer keine erweiterten Rechte des
--     Funktions-Owners, SECURITY DEFINER waere hier unnoetige
--     Rechteausweitung ohne belegten Bedarf.
--   - Tabellenverweise im Funktionskoerper sind dennoch vollstaendig
--     schemaqualifiziert (public.media_assets) -- unabhaengig vom
--     Sicherheitsmodus guter Stil und ohne Kosten.
--   - REVOKE ALL FROM PUBLIC/anon/authenticated + GRANT EXECUTE nur an
--     service_role: identisch zu allen anderen fn_*.sql in diesem Repo.
--     Postgres vergibt bei CREATE FUNCTION standardmaessig EXECUTE an
--     PUBLIC -- PostgREST routet jede Funktion im exponierten Schema
--     unabhaengig von Grants, die Autorisierung kommt ausschliesslich
--     aus dem EXECUTE-Grant. Ohne diese Revokes koennte jede Rolle die
--     Funktion ueber /rest/v1/rpc/delete_band_gallery_image aufrufen.
--
-- Storage bleibt ausdruecklich AUSSERHALB dieser Funktion: das
-- Loeschen des zugehoerigen Storage-Objekts erfolgt in
-- deleteBandGalleryImageAction (app/admin/bands/[id]/actions.ts) erst
-- NACH erfolgreichem Rueckgabewert dieser Funktion, unter Verwendung
-- der zurueckgegebenen deleted_url.
-- ============================================================

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

-- ------------------------------------------------------------
-- Ausfuehrungsrechte: Standardmaessig vergibt Postgres EXECUTE an
-- PUBLIC bei CREATE FUNCTION -- das muss explizit entzogen werden.
-- REVOKE FROM PUBLIC allein entfernt keine direkt an anon/authenticated
-- vergebenen Rechte -- deshalb alle drei Rollen explizit einzeln.
-- ------------------------------------------------------------
revoke all on function public.delete_band_gallery_image(uuid, uuid) from public;
revoke all on function public.delete_band_gallery_image(uuid, uuid) from anon;
revoke all on function public.delete_band_gallery_image(uuid, uuid) from authenticated;
grant execute on function public.delete_band_gallery_image(uuid, uuid) to service_role;
