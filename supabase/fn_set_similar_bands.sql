-- ============================================================
-- fn_set_similar_bands.sql
--
-- AUSGEFUEHRT: Production / Supabase SQL Editor, 10.07.2026 (v3,
-- inklusive Zweiphasen-Rank-Fix)
-- VERIFIZIERT: SECURITY DEFINER, Owner postgres,
-- search_path=pg_catalog,pg_temp, EXECUTE nur service_role
-- (PUBLIC/anon/authenticated=false)
-- ABNAHME: gruen -- No-op-Speichern ohne Writes (updated_at/reason
-- unveraendert), Rank-Tausch 1<->2 kollisionsfrei, Psyco-Dad-Roundtrip
-- vollstaendig aufgeraeumt, Nicht-similar-Zeilen unveraendert.
-- Nicht erneut ausfuehren ohne bewusste Entscheidung -- dieses Script
-- bleibt nur als versioniertes Muster im Repo.
--
-- Sprint: Admin "Aehnliche Bands pflegen"
-- Datum des Entwurfs: 10.07.2026
--
-- Zweck:
--   Setzt den vollstaendigen Sollzustand der kuratierten
--   relation_type='similar'-Empfehlungen einer Source-Band in EINER
--   atomaren Transaktion (impliziter Funktionsblock). Ersetzt einen
--   mehrschrittigen, nicht-atomaren Schreibpfad ueber den
--   PostgREST-Client durch eine einzige RPC.
--
-- Signatur:
--   public.set_similar_bands(p_source_band_id uuid, p_target_band_ids uuid[])
--   RETURNS void
--
-- Semantik:
--   - Rank ergibt sich ausschliesslich aus der Array-Position in
--     p_target_band_ids (Index 1 = Rank 1, Index 2 = Rank 2, ...).
--     Leere Slots MUESSEN von der aufrufenden Server Action vor dem
--     Aufruf herausgefiltert werden -- die Funktion kompaktiert nicht
--     nachtraeglich, sie nimmt die Reihenfolge des Arrays als Sollrank.
--   - p_target_band_ids = NULL wirft einen Fehler (PL007) -- ein
--     fehlender/falsch benannter RPC-Parameter darf nie still alle
--     Kurationen loeschen. NUR ein explizit leeres Array ('{}'::uuid[],
--     cardinality = 0) bedeutet: alle relation_type='similar'-Zeilen
--     dieser Source-Band entfernen. Kein Fehler, kein Insert.
--   - Betrifft ausschliesslich relation_type='similar'. Alle anderen
--     Relationstypen (alternative, often_together, same_sound_world)
--     werden in keinem Statement dieser Funktion gelesen, verglichen,
--     geaendert oder geloescht.
--   - Diff-Semantik (nicht Delete+Insert, nicht blindes Upsert):
--       * Paar (source,target) unveraendert UND Rank unveraendert
--         -> keine Schreiboperation auf diese Zeile
--       * Paar unveraendert, Rank neu -> ausschliesslich UPDATE rank
--       * Paar nicht mehr im Soll-Array -> DELETE
--       * Paar neu -> INSERT mit is_manual=true, reason=null,
--         confidence_score=null
--     Dadurch bleiben bestehende reason-Texte (z. B. Donnaweda) exakt
--     so lange erhalten, wie sich am Paar nichts aendert -- unabhaengig
--     davon, wie oft gespeichert wird.
--   - created_at/updated_at werden nie explizit gesetzt (Defaults +
--     Trigger trg_band_relations_updated_at uebernehmen das).
--
-- Rank-Eindeutigkeit (live verifiziert, 10.07.2026):
--   Production besitzt den PARTIELLEN Unique-Index
--     CREATE UNIQUE INDEX one_rank_per_band_relation_type
--       ON public.band_relations USING btree
--       (source_band_id, relation_type, rank)
--       WHERE (rank IS NOT NULL);
--   Er schuetzt die Eindeutigkeit aller NICHTLEEREN Ranks pro
--   Source-Band und relation_type. Rank-Luecklosigkeit (1..N) ist
--   NICHT Aufgabe dieses Index -- die stellt ausschliesslich die RPC
--   sicher, ueber die kompaktierte Array-Reihenfolge in
--   p_target_band_ids (siehe Rank-Vergabe unten).
--   Der Index ist NICHT deferrable und wird pro Einzelstatement sofort
--   geprueft, nicht erst am Ende der Transaktion. Ein direkter
--   Rank-Tausch (z. B. 1<->2) ueber zwei einzelne UPDATEs wuerde daher
--   mit 23505 (duplicate key) scheitern, weil die Zielband-Zeile fuer
--   Rang 1 kurzzeitig noch die alte Zeile mit Rang 1 vorfindet, bevor
--   diese selbst verschoben wurde. Die Rank-Vergabe unten loest das
--   ueber eine temporaere NULL-Parkphase: NULL kollidiert im
--   partiellen Index nie, da er nur WHERE rank IS NOT NULL gilt.
--   Methodik-Hinweis: Dieser Index war in einer reinen
--   pg_constraint-Introspektion nicht sichtbar -- partielle Unique-
--   Indizes muessen zusaetzlich ueber pg_indexes/pg_index geprueft
--   werden. Merksatz: Constraints und Eindeutigkeitsregeln pruefen =
--   pg_constraint UND pg_indexes.
--
-- Rank-Vergabe (zweiphasig, kollisionsfrei unter dem partiellen
-- Unique-Index):
--   Phase 2a -- nur geaenderte bestehende Rows parken:
--     Fuer jedes Soll-Target wird die bestehende Zeile (falls
--     vorhanden) NUR dann auf rank=NULL gesetzt, wenn ihr aktueller
--     Rank vom Soll-Rank abweicht. Unveraendert korrekte Zeilen
--     erhalten keinerlei Write. Das UPDATE setzt ausschliesslich die
--     Spalte rank.
--   Phase 2b -- finale Ranks setzen oder neu einfuegen:
--     Fuer jedes Soll-Target: existiert das Paar noch nicht -> INSERT
--     mit relation_type='similar', finalem Rank, is_manual=true,
--     reason=null, confidence_score=null. Existiert es und der Rank
--     weicht noch vom Soll-Rank ab (z. B. weil Phase 2a ihn auf NULL
--     geparkt hat) -> UPDATE ausschliesslich rank auf den finalen
--     Wert. Unveraendert korrekte Zeilen bleiben unangetastet.
--   Die gesamte Funktion bleibt atomar unter dem Source-Band-Zeilen-
--   Lock (FOR UPDATE) -- ein Fehler an beliebiger Stelle rollt die
--   komplette Transaktion zurueck, es gibt keinen halb angewendeten
--   Zwischenzustand.
--
-- Validierung (wirft RAISE EXCEPTION bei Verstoss, siehe Fehlercodes
-- unten -- Validierung laeuft VOR jeder Schreiboperation):
--   - Source-Band existiert (per SELECT ... FOR UPDATE gesperrt --
--     serialisiert parallele Aufrufe fuer dieselbe Source-Band)
--   - p_target_band_ids ist nicht NULL
--   - Kein Element des Target-Arrays ist NULL
--   - Alle Targets existieren und sind status='active' AND
--     is_published=true
--   - Keine Selbstreferenz (Source darf nicht im Target-Array stehen)
--   - Maximal 3 Targets
--   - Keine Duplikate innerhalb des Target-Arrays
--
-- Fehlercodes (MESSAGE = stabiler Slug, zusaetzlich projektspezifischer
-- ERRCODE fuer Code-basiertes Abfangen -- beides stabil und
-- maschinenlesbar, unabhaengig vom uebersetzten Fehlertext):
--   PL001  similar_source_not_found
--   PL002  similar_target_not_found
--   PL003  similar_target_not_active
--   PL004  similar_self_reference
--   PL005  similar_too_many_targets
--   PL006  similar_duplicate_target
--   PL007  similar_targets_required
--   PL008  similar_null_target
--
-- Sicherheit:
--   - SECURITY DEFINER: laeuft mit den Rechten des Funktions-Owners
--     (im SQL Editor i. d. R. postgres), NICHT mit denen des
--     Aufrufers. Deshalb braucht service_role KEINE eigenen
--     INSERT/UPDATE/DELETE-Table-Grants auf band_relations oder
--     bands -- nur EXECUTE auf diese Funktion.
--   - SET search_path = pg_catalog, pg_temp: bewusst OHNE "public" im
--     Pfad. Alle Tabellenverweise im Funktionskoerper sind vollstaendig
--     schemaqualifiziert (public.bands, public.band_relations), daher
--     wird "public" im search_path nicht gebraucht -- jeder unqualifi-
--     zierte Bezeichner, der sich einschleichen wuerde, schlaegt so mit
--     einem klaren Fehler fehl, statt sich still ueber eine gehijackte
--     "public"-Platzierung im Pfad aufzuloesen. (Die fruehere Fassung
--     dieses Kommentars behauptete, "public" an erster Stelle im Pfad
--     verhindere Hijacking bereits ausreichend -- das war zu stark;
--     die Schemaqualifizierung ist die eigentliche Absicherung, der
--     search_path ohne "public" ist die zusaetzliche Haertung.)
--   - REVOKE ALL FROM PUBLIC/anon/authenticated + GRANT EXECUTE nur an
--     service_role: Postgres vergibt bei CREATE FUNCTION standardmaessig
--     EXECUTE an PUBLIC. Ein blosses REVOKE ... FROM PUBLIC entfernt
--     aber keine Rechte, die einer Rolle (z. B. anon/authenticated)
--     zusaetzlich DIREKT vergeben wurden -- deshalb alle drei Rollen
--     explizit einzeln entziehen, das macht die Datei auch bei
--     Wiederholungslaeufen oder unbekannten Altstaenden eindeutig.
--     Ohne diese Revokes koennte theoretisch jede Rolle die Funktion
--     aufrufen, sobald sie ueber /rest/v1/rpc/set_similar_bands
--     geroutet wird -- PostgREST routet jede Funktion im exponierten
--     Schema unabhaengig von Grants, die Autorisierung kommt
--     ausschliesslich aus dem EXECUTE-Grant.
-- ============================================================

create or replace function public.set_similar_bands(
  p_source_band_id uuid,
  p_target_band_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_target_count   integer;
  v_distinct_count integer;
  v_target_id      uuid;
  v_rank           integer;
begin
  -- ---- Source-Existenz, per Zeilen-Lock ----
  -- Sperrt die Source-Band-Zeile fuer die Dauer der Funktion und
  -- serialisiert dadurch parallele Aufrufe fuer dieselbe Source-Band.
  perform 1 from public.bands b where b.id = p_source_band_id for update;
  if not found then
    raise exception 'similar_source_not_found'
      using errcode = 'PL001',
            detail = format('source_band_id=%s not found in public.bands', p_source_band_id);
  end if;

  -- ---- NULL-Array ist ein Fehler, kein "alles loeschen" ----
  -- Ein fehlender/falsch benannter Parameter darf nie still alle
  -- Kurationen entfernen. Nur ein EXPLIZIT leeres Array bedeutet das.
  if p_target_band_ids is null then
    raise exception 'similar_targets_required'
      using errcode = 'PL007',
            detail = 'use an empty uuid[] to remove all similar relations';
  end if;

  -- ---- Leeres Array: alle similar-Relations dieser Band entfernen ----
  if cardinality(p_target_band_ids) = 0 then
    delete from public.band_relations
      where source_band_id = p_source_band_id
        and relation_type = 'similar';
    return;
  end if;

  v_target_count := array_length(p_target_band_ids, 1);

  -- ---- Maximal 3 Targets ----
  if v_target_count > 3 then
    raise exception 'similar_too_many_targets'
      using errcode = 'PL005',
            detail = format('%s targets submitted, maximum 3 allowed', v_target_count);
  end if;

  -- ---- Kein Element des Arrays ist NULL ----
  -- Muss vor dem Duplikat-Check laufen: ein NULL-Element wuerde sonst
  -- die count(distinct)-Zaehlung verfaelschen und faelschlich PL006
  -- statt des eigentlich zutreffenden Fehlers ausloesen.
  if array_position(p_target_band_ids, null) is not null then
    raise exception 'similar_null_target'
      using errcode = 'PL008',
            detail = 'p_target_band_ids contains a null element';
  end if;

  -- ---- Keine Duplikate innerhalb des Arrays ----
  select count(distinct t) into v_distinct_count from unnest(p_target_band_ids) as t;
  if v_distinct_count <> v_target_count then
    raise exception 'similar_duplicate_target'
      using errcode = 'PL006',
            detail = 'p_target_band_ids contains duplicate values';
  end if;

  -- ---- Keine Selbstreferenz ----
  if p_source_band_id = any (p_target_band_ids) then
    raise exception 'similar_self_reference'
      using errcode = 'PL004',
            detail = format('source_band_id=%s appears in target list', p_source_band_id);
  end if;

  -- ---- Jedes Target: Existenz + active/published ----
  for v_target_id in select unnest(p_target_band_ids)
  loop
    if not exists (select 1 from public.bands b where b.id = v_target_id) then
      raise exception 'similar_target_not_found'
        using errcode = 'PL002',
              detail = format('target_band_id=%s not found in public.bands', v_target_id);
    end if;

    if not exists (
      select 1 from public.bands b
      where b.id = v_target_id
        and b.status = 'active'
        and b.is_published is true
    ) then
      raise exception 'similar_target_not_active'
        using errcode = 'PL003',
              detail = format('target_band_id=%s is not status=active/is_published=true', v_target_id);
    end if;
  end loop;

  -- ============================================================
  -- Ab hier: validiert. Diff-Semantik, alles im selben impliziten
  -- Transaktionsblock der Funktion (atomar).
  -- ============================================================

  -- 1. Entfernte Paare loeschen: bestehende similar-Zeilen dieser
  --    Source, deren Target NICHT mehr im neuen Soll-Array steht.
  delete from public.band_relations br
  where br.source_band_id = p_source_band_id
    and br.relation_type = 'similar'
    and br.target_band_id <> all (p_target_band_ids);

  -- 2a. Nur geaenderte bestehende Rows parken: rank=NULL fuer jedes
  --     Soll-Target, dessen bestehende Zeile einen ANDEREN Rank hat.
  --     Der partielle Unique-Index (WHERE rank IS NOT NULL) ignoriert
  --     NULL-Werte -- dieser Zwischenschritt macht Rank-Tausche (z. B.
  --     1<->2) kollisionsfrei. Unveraendert korrekte Zeilen werden von
  --     der WHERE-Bedingung ausgeschlossen und nie geschrieben.
  for v_rank in 1 .. v_target_count loop
    v_target_id := p_target_band_ids[v_rank];

    update public.band_relations
       set rank = null
     where source_band_id = p_source_band_id
       and target_band_id = v_target_id
       and relation_type = 'similar'
       and rank is distinct from v_rank;
  end loop;

  -- 2b. Finale Ranks setzen oder neue Paare einfuegen. Nach Phase 2a
  --     sind alle tatsaechlich zu aendernden Zeilen NULL -- die
  --     Zuweisung ist daher in beliebiger Reihenfolge kollisionsfrei.
  for v_rank in 1 .. v_target_count loop
    v_target_id := p_target_band_ids[v_rank];

    if not exists (
      select 1 from public.band_relations br
      where br.source_band_id = p_source_band_id
        and br.target_band_id = v_target_id
        and br.relation_type = 'similar'
    ) then
      -- Neues Paar
      insert into public.band_relations (
        source_band_id, target_band_id, relation_type, rank,
        is_manual, reason, confidence_score
      )
      values (
        p_source_band_id, v_target_id, 'similar', v_rank,
        true, null, null
      );
    else
      -- Bestehendes Paar: nur schreiben, wenn der Rank noch nicht
      -- final ist (z. B. weil Phase 2a ihn auf NULL geparkt hat).
      -- Bereits korrekte Zeilen bleiben unangetastet -- kein Write,
      -- reason/confidence_score/is_manual/created_at unveraendert.
      update public.band_relations
         set rank = v_rank
       where source_band_id = p_source_band_id
         and target_band_id = v_target_id
         and relation_type = 'similar'
         and rank is distinct from v_rank;
    end if;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- Ausfuehrungsrechte: Standardmaessig vergibt Postgres EXECUTE an
-- PUBLIC bei CREATE FUNCTION -- das muss explizit entzogen werden.
-- REVOKE FROM PUBLIC allein entfernt keine direkt an anon/authenticated
-- vergebenen Rechte -- deshalb alle drei Rollen explizit einzeln.
-- ------------------------------------------------------------
revoke all on function public.set_similar_bands(uuid, uuid[]) from public;
revoke all on function public.set_similar_bands(uuid, uuid[]) from anon;
revoke all on function public.set_similar_bands(uuid, uuid[]) from authenticated;
grant execute on function public.set_similar_bands(uuid, uuid[]) to service_role;
