-- ============================================================
-- fn_update_hero_wall_selection.sql
--
-- Paket 1 ("Hero-Bildwand: Migration + Admin-Bereich"), SCHRITT 1C.
-- Schreibweg fuer den Admin-Bereich "Hero-Bilder" (/admin/hero-images).
--
-- Zweck:
--   Ersetzt in EINER atomaren Operation den vollstaendigen kuratierten
--   Hero-Bildwand-Pool: welche public.media_assets-Zeilen hero_wall=true
--   tragen, in welcher Reihenfolge (hero_wall_position, 0-basiert,
--   lueckenlos -- direkt aus der Array-Position von p_items abgeleitet)
--   und mit welchem hero_focus. Der Admin-Editor sendet bei jedem Save
--   den vollstaendigen gewuenschten Zielzustand (nicht nur ein Diff) --
--   siehe app/admin/hero-images/actions.ts.
--
-- Signatur:
--   public.update_hero_wall_selection(p_items jsonb)
--   RETURNS TABLE (media_asset_id uuid, hero_wall_position integer)
--
--   p_items: JSON-Array in der gewuenschten Reihenfolge, z. B.
--     [{"id": "<uuid>", "hero_focus": "top"}, {"id": "<uuid>", "hero_focus": null}, ...]
--   MUSS ein expliziter JSON-Array-Wert sein. `NULL` wird NICHT als
--   leeres Array behandelt und fuehrt zu einem eigenen Fehler (siehe
--   Validierung unten) -- nur ein explizites `[]` leert den gesamten
--   Pool. Das verhindert, dass ein Client-seitiger Bug (z. B. vergessene
--   Auswahl, fehlgeschlagene Serialisierung) versehentlich als "Pool
--   leeren" interpretiert wird.
--
-- Architekturentscheidung -- volle Ersetzung statt Add/Remove-Diff:
--   Anders als bei den Mood-/Event-Type-Bulk-Editoren (dort Add/Remove-
--   Mengen ohne eigene Reihenfolge) traegt die Hero-Bildwand eine echte,
--   vom Redakteur frei sortierbare Reihenfolge. Eine Diff-basierte RPC
--   (p_add/p_remove) muesste Positionsverschiebungen ohnehin fuer den
--   gesamten Pool neu berechnen -- eine vollstaendige Ersetzung ist hier
--   die einfachere UND robustere Operation, und liefert die 0-basierte,
--   lueckenlose Reihenfolge denkbar direkt: sie ist exakt die Ordinalzahl
--   der jeweiligen Position im uebergebenen Array.
--
-- Sicherheit -- SECURITY INVOKER (Standard, kein "security definer"):
--   service_role haelt bereits volle SELECT/INSERT/UPDATE/DELETE-Rechte
--   direkt auf public.media_assets (siehe bestehende Galerie-/Hero-/
--   Thumbnail-Upload-Aktionen in app/admin/bands/[id]/actions.ts, die
--   ueber denselben Client direkt .update()/.insert() auf media_assets
--   aufrufen). Diese Funktion sperrt und schreibt ausschliesslich
--   media_assets-Zeilen -- keine andere Tabelle wird gelesen oder
--   gesperrt (band_id wird nicht neu validiert: jede existierende
--   media_assets-Zeile hat bereits eine gueltige band_id-FK). Es ist
--   daher, anders als bei fn_update_event_type_band_assignments.sql
--   (dort FOR SHARE auf public.event_types, wo service_role bewusst kein
--   UPDATE-Grant haelt), keine Rechteausweitung per SECURITY DEFINER
--   noetig.
--
-- Locking-Reihenfolge:
--   1. Validierung der Eingabe (siehe Fehlercodes unten).
--   2. Ein transaktionsgebundener PostgreSQL Advisory Lock
--      (pg_advisory_xact_lock) wird erworben, der ALLE gleichzeitigen
--      Aufrufe DIESER EINEN Funktion serialisiert -- unabhaengig davon,
--      ob sich ihre jeweiligen p_items ueberschneiden.
--
--      Grund (Concurrency-Luecke ohne dieses Lock): die Row-Locks aus
--      Schritt 3 serialisieren nur Aufrufe, die mindestens eine
--      gemeinsame Zeile sperren. Ist der Pool aktuell leer und waehlt
--      Aufruf A ausschliesslich Bild A, Aufruf B ausschliesslich Bild B,
--      sperren beide disjunkte Zeilenmengen und blockieren einander
--      nicht -- beide wuerden dann unabhaengig voneinander
--      hero_wall_position = 0 vergeben. Das verletzt sowohl die
--      Full-Replacement-Semantik (ein Save soll den GESAMTEN Pool
--      ersetzen, nicht nur die eigene Teilmenge) als auch die
--      lueckenlose, eindeutige Positionslogik.
--
--      Der Lock wird bewusst NICHT als Tabellen-Lock auf media_assets
--      ausgefuehrt (das wuerde fachfremde, parallele Bildoperationen wie
--      Galerie-Upload/-Delete/-Reorder anderer Bilder unnoetig
--      blockieren) -- er serialisiert ausschliesslich gleichzeitige
--      Aufrufe dieser einen Funktion, ueber einen fest verdrahteten,
--      aus dem Funktionsnamen abgeleiteten Lock-Key. Als
--      transaktionsgebundene Variante (pg_advisory_xact_lock statt
--      pg_advisory_lock) wird der Lock automatisch bei COMMIT oder
--      ROLLBACK der Transaktion freigegeben -- kein manuelles UNLOCK
--      noetig, kein Risiko eines haengen bleibenden Locks bei einem
--      Fehler.
--
--      Muss VOR jeder zustandsabhaengigen Abfrage/Sperrung von
--      media_assets erworben werden (siehe Schritt 3) -- sonst koennten
--      zwei Aufrufe den (dann noch unveraenderten) Pool bereits VOR dem
--      Lock gelesen haben.
--   3. Alle betroffenen Zeilen -- sowohl aktuell hero_wall=true (werden
--      ggf. entfernt) als auch die neu ausgewaehlten (p_items) -- werden
--      VOR jeder Schreiboperation in deterministischer Reihenfolge
--      (ORDER BY id) mit FOR UPDATE gesperrt.
--   4. Erst danach die eigentlichen Schreiboperationen: zuerst Zeilen
--      entfernen, die hero_wall=true sind aber nicht mehr in p_items
--      vorkommen, danach alle Zeilen aus p_items auf hero_wall=true mit
--      ihrer neuen Position/ihrem neuen Fokus setzen.
--
-- Validierung (RAISE EXCEPTION bei Verstoss):
--   HW001  hero_wall_selection_null_id        -- ein Element in p_items hat kein/NULL "id"
--   HW002  hero_wall_selection_duplicate_id   -- eine media_asset_id kommt mehrfach in p_items vor
--   HW003  hero_wall_selection_not_found      -- eine media_asset_id existiert nicht in media_assets
--   HW004  hero_wall_selection_invalid_focus  -- hero_focus ist gesetzt, aber nicht 'top'/'center'/'bottom'
--   HW005  hero_wall_selection_null_items     -- p_items ist NULL (kein impliziertes leeres Array)
--   HW006  hero_wall_selection_not_array      -- p_items ist kein JSON-Array (z. B. Objekt/Skalar)
--
-- Umgang mit bereits entferntem Bild (nicht mehr in p_items enthalten):
--   Es werden ausschliesslich hero_wall = false und hero_wall_position =
--   NULL gesetzt. hero_focus bleibt UNVERAENDERT bestehen -- es ist
--   bildbezogene Crop-Metadaten (bevorzugte vertikale Ausrichtung dieses
--   Bildes), keine poolbezogene Eigenschaft, und soll bei einer spaeteren
--   erneuten Aufnahme desselben Bildes in den Pool erhalten bleiben,
--   statt dass der Redakteur den Fokus jedes Mal neu setzen muss.
--
-- Atomaritaet & Nebenlaeufigkeit: die gesamte Funktion laeuft in genau
-- einer Transaktion. Der Advisory Lock aus Schritt 2 serialisiert ALLE
-- gleichzeitigen Aufrufe dieser Funktion vollstaendig: ein zweiter
-- Aufruf kann den Pool erst lesen/sperren, nachdem der erste committed
-- oder zurueckgerollt hat (und damit den Lock wieder freigegeben hat).
-- Dadurch ist ausgeschlossen, dass zwei gleichzeitige Save-Operationen
-- mit disjunkten p_items widerspruechliche/doppelte
-- hero_wall_position-Werte vergeben -- auch dann, wenn sie keine
-- gemeinsame media_assets-Zeile sperren. Jede unbehandelte Exception
-- rollt alle bereits ausgefuehrten Teiloperationen dieses Aufrufs
-- zurueck -- keine Teilcommits, keine teilweise geleerte/teilweise neu
-- gesetzte Bildwand.
--
-- Idempotenz: ein wiederholter Aufruf mit identischem p_items fuehrt zu
-- keinem fachlichen Unterschied (derselbe Endzustand wird erneut
-- geschrieben).
-- ============================================================

create or replace function public.update_hero_wall_selection(p_items jsonb)
returns table (media_asset_id uuid, hero_wall_position integer)
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
declare
  v_ids uuid[];
  v_id  uuid;
begin
  -- ---- p_items ist Pflicht -- NULL wird NICHT stillschweigend als
  --      leeres Array behandelt (siehe Begruendung oben). ----
  if p_items is null then
    raise exception 'hero_wall_selection_null_items'
      using errcode = 'HW005',
            detail = 'p_items must not be null -- pass an explicit empty JSON array [] to clear the pool';
  end if;

  -- ---- p_items muss ein JSON-ARRAY sein (nicht Objekt/Skalar) --
  --      jsonb_array_elements() auf einem Nicht-Array wuerde sonst mit
  --      einer rohen, weniger aussagekraeftigen Postgres-Fehlermeldung
  --      abbrechen. ----
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'hero_wall_selection_not_array'
      using errcode = 'HW006',
            detail = format('p_items must be a JSON array, got %s', jsonb_typeof(p_items));
  end if;

  -- ---- Kein Element ohne (oder mit NULL-)"id" ----
  if exists (
    select 1 from jsonb_array_elements(p_items) elem
    where elem->>'id' is null
  ) then
    raise exception 'hero_wall_selection_null_id'
      using errcode = 'HW001',
            detail = 'every element of p_items must have a non-null "id"';
  end if;

  -- ---- hero_focus, falls gesetzt, nur 'top'/'center'/'bottom' ----
  if exists (
    select 1 from jsonb_array_elements(p_items) elem
    where (elem->>'hero_focus') is not null
      and (elem->>'hero_focus') not in ('top', 'center', 'bottom')
  ) then
    raise exception 'hero_wall_selection_invalid_focus'
      using errcode = 'HW004',
            detail = 'hero_focus must be null, ''top'', ''center'' or ''bottom''';
  end if;

  select array_agg((elem->>'id')::uuid) into v_ids
  from jsonb_array_elements(p_items) elem;
  v_ids := coalesce(v_ids, '{}'::uuid[]);

  -- ---- Keine doppelte media_asset_id innerhalb von p_items ----
  if (select count(distinct x) from unnest(v_ids) as x) <> cardinality(v_ids) then
    raise exception 'hero_wall_selection_duplicate_id'
      using errcode = 'HW002',
            detail = 'p_items contains the same media_asset id more than once';
  end if;

  -- ============================================================
  -- Ab hier: reine Input-Validierung abgeschlossen. Advisory Lock VOR
  -- jeder zustandsabhaengigen Abfrage/Sperrung von media_assets
  -- erwerben (siehe Begruendung im Header-Kommentar, Abschnitt
  -- "Locking-Reihenfolge", Punkt 2) -- serialisiert ausschliesslich
  -- gleichzeitige Aufrufe DIESER Funktion, kein Tabellen-Lock auf
  -- media_assets. Transaktionsgebunden (pg_advisory_xact_lock): wird
  -- automatisch bei COMMIT/ROLLBACK freigegeben.
  -- ============================================================
  perform pg_advisory_xact_lock(hashtext('public.update_hero_wall_selection')::bigint);

  -- ---- Alle betroffenen Zeilen deterministisch sortiert (ORDER BY id)
  --      sperren: aktuell hero_wall=true (werden ggf. entfernt) sowie
  --      alle neu ausgewaehlten -- VOR jeder Schreiboperation. ----
  for v_id in
    select distinct m.id
    from public.media_assets m
    where m.hero_wall = true or m.id = any (v_ids)
    order by m.id
  loop
    perform 1 from public.media_assets where id = v_id for update;
  end loop;

  -- ---- Existenz jeder in p_items referenzierten Zeile pruefen (nach dem
  --      Sperren, damit keine zwischenzeitlich geloeschte Zeile
  --      faelschlich als vorhanden gilt) ----
  for v_id in select x from unnest(v_ids) as x loop
    if not exists (select 1 from public.media_assets where id = v_id) then
      raise exception 'hero_wall_selection_not_found'
        using errcode = 'HW003',
              detail = format('media_asset id=%s not found in public.media_assets', v_id);
    end if;
  end loop;

  -- ============================================================
  -- Ab hier: validiert und gesperrt.
  -- ============================================================

  -- Zeilen entfernen, die aktuell hero_wall=true sind, aber nicht mehr
  -- in der neuen Auswahl vorkommen. hero_focus bleibt bewusst
  -- UNVERAENDERT (siehe Kommentar oben) -- nur Pool-Zugehoerigkeit und
  -- Position werden zurueckgesetzt.
  update public.media_assets
    set hero_wall = false, hero_wall_position = null
    where hero_wall = true
      and not (id = any (v_ids));

  -- Neue Auswahl setzen: Position = 0-basierte Ordinalzahl im Array.
  -- WITH ORDINALITY mit expliziten Spaltenaliases (e.item, e.ord) statt
  -- eines impliziten Spaltennamens; hero_wall_position wird explizit auf
  -- integer gecastet (ordinality liefert bigint).
  update public.media_assets m
    set hero_wall = true,
        hero_wall_position = (e.ord - 1)::integer,
        hero_focus = e.item->>'hero_focus'
    from jsonb_array_elements(p_items) with ordinality as e(item, ord)
    where m.id = (e.item->>'id')::uuid;

  return query
    select m.id, m.hero_wall_position
    from public.media_assets m
    where m.id = any (v_ids)
    order by m.hero_wall_position;
end;
$$;

-- ------------------------------------------------------------
-- Ausfuehrungsrechte: nur service_role darf aufrufen. Keine Aenderung an
-- bestehenden Table-Grants auf public.media_assets.
-- ------------------------------------------------------------
revoke all on function public.update_hero_wall_selection(jsonb) from public;
revoke all on function public.update_hero_wall_selection(jsonb) from anon;
revoke all on function public.update_hero_wall_selection(jsonb) from authenticated;
grant execute on function public.update_hero_wall_selection(jsonb) to service_role;
