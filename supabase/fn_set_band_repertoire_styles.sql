-- ============================================================
-- fn_set_band_repertoire_styles.sql
--
-- AUSGEFUEHRT: manuell durch Xandi im Supabase SQL Editor gegen
-- Production, 2026-07-24. Funktion erfolgreich angelegt. Rechte-Verify
-- (fn_set_band_repertoire_styles_verify.sql) vollstaendig gruen.
-- Schreiben auf repertoire_styles/band_repertoire_styles laeuft
-- ausschliesslich ueber diese RPC -- service_role besitzt nur SELECT
-- auf beide Tabellen plus EXECUTE auf diese Funktion, keine direkten
-- DML-Rechte (INSERT/UPDATE/DELETE/TRUNCATE).
--
-- Fachlicher Zielstand des Rollouts: Review-CSV v2
-- tmp/musikalisch-verortet/musikalisch_verortet_review_final_v2.csv,
-- SHA-256 d48c041e8f7db1f751b5e5f49bc463c8c51c33f7d958a0bc449707e378594230
-- (v2 loest v1, SHA-256 b2f30ea6595ba4faa7d8a36559a0c1a7edabdc95ab035c501510a20e9b6fbd45,
-- fuer den eigentlichen Import ab -- v1 bleibt als historischer Stand
-- unveraendert erhalten, enthielt aber 3 Slug-Kollisionen im
-- Katalog-Preflight, siehe musikalisch_verortet_review_summary_v2.md).
-- Diese RPC-Datei selbst ist von der CSV-Version unabhaengig -- sie
-- setzt ausschliesslich technische Zuordnungen zu bereits vorhandenen
-- repertoire_style_ids, unabhaengig davon, welcher CSV-Stand die
-- Werte fachlich geliefert hat.
--
-- Ausfuehrung erfolgte manuell durch Xandi im Supabase SQL Editor (wie
-- alle vorherigen fn_*.sql-Dateien in diesem Repo -- der Agent hat
-- keinen eigenen Kanal fuer DDL gegen Production, siehe
-- docs/musikalisch-verortet-production-rollout.md fuer die Begruendung
-- und den vollstaendigen Nachweis).
--
-- Empfohlene Ausfuehrungsreihenfolge (siehe Completion Report):
--   1. diese Datei (fn_set_band_repertoire_styles.sql)
--   2. supabase/band_repertoire_styles_transaction_tests.sql
--   3. supabase/fn_set_band_repertoire_styles_verify.sql
--   Kein Datenimport vor erfolgreichem Abschluss aller drei Schritte.
--
-- Vorbild/Muster: supabase/fn_set_band_moods.sql (identisches
-- Sicherheitsmodell, identische Diff-Semantik, identische
-- NULL-vs-leer-Array-Semantik). band_repertoire_styles hat exakt dieselbe
-- PK-Form wie band_moods (band_id, repertoire_style_id) OHNE zusaetzliche
-- Unique-Constraint auf sort_order (siehe supabase/add-repertoire-styles.sql
-- -- PRIMARY KEY (band_id, repertoire_style_id), kein weiterer Index) --
-- deshalb reicht hier, genau wie bei set_band_moods, die einfachere
-- einphasige Diff-Vergabe (kein NULL-Park-Zweiphasenschema wie bei
-- set_similar_bands, das durch den PARTIELLEN Unique-Index auf
-- band_relations.rank noetig wird -- band_repertoire_styles hat keinen
-- solchen Index).
--
-- Signatur:
--   public.set_band_repertoire_styles(p_band_id uuid, p_repertoire_style_ids uuid[])
--   RETURNS void
--
-- Semantik:
--   - sort_order ergibt sich ausschliesslich aus der Array-Position in
--     p_repertoire_style_ids (Index 1 = sort_order 1, Index 2 = sort_order 2,
--     Index 3 = sort_order 3). Leere Zwischenplaetze MUESSEN vom Aufrufer
--     vor dem Aufruf herausgefiltert werden -- die Funktion kompaktiert
--     nicht nachtraeglich, sie nimmt die Array-Reihenfolge als Soll-sort_order.
--   - p_repertoire_style_ids = NULL wirft einen Fehler (PR002) -- ein
--     fehlender/falsch benannter RPC-Parameter darf nie still alle
--     Zuordnungen loeschen. NUR ein explizit leeres Array
--     ('{}'::uuid[], cardinality = 0) bedeutet: alle
--     band_repertoire_styles-Zeilen dieser Band entfernen (bildet die
--     sechs bewussten Empty States der Review-CSV korrekt ab). Kein
--     Fehler, kein Insert.
--   - Maximal 3 Eintraege (redaktioneller Zielkorridor der Review-CSV:
--     0-3 Chips, siehe kuratierter_finaler_wert/chip_1..3 -- hier als
--     technische Grenze durchgesetzt, analog zum Muster von
--     set_band_moods, das seinen eigenen redaktionellen Korridor von
--     max. 4 technisch durchsetzt).
--   - Diff-Semantik (nicht Delete+Insert, nicht blindes Upsert):
--       * Paar (band,repertoire_style) unveraendert UND sort_order
--         unveraendert -> keine Schreiboperation auf diese Zeile
--         (created_at bleibt exakt erhalten)
--       * Paar unveraendert, sort_order neu -> ausschliesslich UPDATE
--         sort_order
--       * Paar nicht mehr im Soll-Array -> DELETE
--       * Paar neu -> INSERT
--
-- Validierung (wirft RAISE EXCEPTION bei Verstoss, Validierung laeuft
-- VOR jeder Schreiboperation):
--   - Band existiert (per SELECT ... FOR UPDATE gesperrt -- serialisiert
--     parallele Aufrufe fuer dieselbe Band). Kein zusaetzlicher
--     Statusfilter auf die zu bearbeitende Band selbst -- identisch zu
--     set_band_moods, das ebenfalls nur Existenz prueft, keinen Status
--     (eine Band beliebigen Status kann ihre eigenen Zuordnungen haben;
--     "aktiv" ist hier keine technische Voraussetzung, sondern eine
--     Filterfrage der jeweiligen Leseseite/Anwendung).
--   - p_repertoire_style_ids ist nicht NULL
--   - Kein Element des Arrays ist NULL
--   - Maximal 3 Eintraege
--   - Keine Duplikate innerhalb des Arrays
--   - Alle ausgewaehlten Katalog-Zeilen werden in deterministischer UUID-
--     Reihenfolge FOR SHARE gesperrt (analog set_band_moods -- serialisiert
--     mit einer eventuellen kuenftigen Katalogpflege-RPC).
--   - Alle repertoire_style-IDs existieren
--   - Alle ausgewaehlten repertoire_styles sind status='active'
--
-- Fehlercodes (MESSAGE = stabiler Slug, zusaetzlich projektspezifischer
-- ERRCODE):
--   PR001  repertoire_band_not_found
--   PR002  repertoire_targets_required
--   PR003  repertoire_too_many
--   PR004  repertoire_null_target
--   PR005  repertoire_duplicate
--   PR006  repertoire_style_not_found
--   PR007  repertoire_style_not_active
--
-- Sicherheit (identisches Modell zu fn_set_band_moods.sql und
-- fn_set_similar_bands.sql):
--   - SECURITY DEFINER: laeuft mit den Rechten des Funktions-Owners
--     (im SQL Editor i. d. R. postgres), NICHT mit denen des Aufrufers.
--     Deshalb braucht service_role KEINE eigenen INSERT/UPDATE/DELETE-
--     Table-Grants auf repertoire_styles oder band_repertoire_styles --
--     nur EXECUTE auf diese Funktion.
--   - SET search_path = pg_catalog, pg_temp: bewusst OHNE "public" im
--     Pfad. Alle Tabellenverweise im Funktionskoerper sind vollstaendig
--     schemaqualifiziert (public.bands, public.repertoire_styles,
--     public.band_repertoire_styles). Bewusste, dokumentierte Abweichung
--     von einer denkbaren woertlichen Lesart "SET search_path = public":
--     fn_set_band_moods.sql und fn_set_similar_bands.sql begruenden
--     ausfuehrlich, warum "public" NICHT im search_path stehen sollte
--     (die Schemaqualifizierung ist die eigentliche Absicherung, ein
--     fest gesetzter Pfad OHNE "public" ist die zusaetzliche Haertung
--     gegen Search-Path-Hijacking). Diese Funktion uebernimmt exakt
--     dieses etablierte, bereits zweifach begruendete Muster, statt ein
--     schwaecheres Muster einzufuehren. search_path ist in jedem Fall
--     fest gesetzt (nicht sitzungsabhaengig) -- das ist die pruefbare
--     Eigenschaft, siehe fn_set_band_repertoire_styles_verify.sql.
--   - REVOKE ALL FROM PUBLIC/anon/authenticated + GRANT EXECUTE nur an
--     service_role: alle drei Rollen explizit einzeln entzogen.
--
-- Hinweis zur Katalogpflege (bewusst NICHT Teil dieser Funktion):
--   Diese RPC setzt AUSSCHLIESSLICH die Zuordnung einer Band zu
--   bestehenden repertoire_styles-Zeilen. Das Anlegen neuer
--   Katalogeintraege (z. B. ein kuenftiges create_repertoire_style,
--   analog zu supabase/fn_moods_catalog_admin.sql#create_mood) ist nicht
--   Bestandteil dieses Blocks (B-Parkliste: "spaetere Katalogpflege im
--   Admin"). Fuer den einmaligen Production-Import fehlender
--   Katalogzeilen aus der Review-CSV siehe
--   tmp/musikalisch-verortet/musikalisch_verortet_import.sql (dort
--   direktes INSERT INTO repertoire_styles innerhalb derselben, manuell
--   im SQL Editor auszufuehrenden Transaktion -- kein service_role-Pfad).
-- ============================================================

create or replace function public.set_band_repertoire_styles(
  p_band_id uuid,
  p_repertoire_style_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_target_count      integer;
  v_distinct_count    integer;
  v_style_id          uuid;
  v_sort_order        integer;
begin
  -- ---- Band-Existenz, per Zeilen-Lock ----
  perform 1 from public.bands b where b.id = p_band_id for update;
  if not found then
    raise exception 'repertoire_band_not_found'
      using errcode = 'PR001',
            detail = format('band_id=%s not found in public.bands', p_band_id);
  end if;

  -- ---- NULL-Array ist ein Fehler, kein "alles loeschen" ----
  if p_repertoire_style_ids is null then
    raise exception 'repertoire_targets_required'
      using errcode = 'PR002',
            detail = 'use an empty uuid[] to remove all repertoire style assignments';
  end if;

  -- ---- Leeres Array: alle band_repertoire_styles-Zeilen dieser Band entfernen ----
  if cardinality(p_repertoire_style_ids) = 0 then
    delete from public.band_repertoire_styles where band_id = p_band_id;
    return;
  end if;

  v_target_count := array_length(p_repertoire_style_ids, 1);

  -- ---- Maximal 3 Eintraege ----
  if v_target_count > 3 then
    raise exception 'repertoire_too_many'
      using errcode = 'PR003',
            detail = format('%s repertoire styles submitted, maximum 3 allowed', v_target_count);
  end if;

  -- ---- Kein Element des Arrays ist NULL ----
  if array_position(p_repertoire_style_ids, null) is not null then
    raise exception 'repertoire_null_target'
      using errcode = 'PR004',
            detail = 'p_repertoire_style_ids contains a null element';
  end if;

  -- ---- Keine Duplikate innerhalb des Arrays ----
  select count(distinct s) into v_distinct_count from unnest(p_repertoire_style_ids) as s;
  if v_distinct_count <> v_target_count then
    raise exception 'repertoire_duplicate'
      using errcode = 'PR005',
            detail = 'p_repertoire_style_ids contains duplicate values';
  end if;

  -- ---- Ausgewaehlte Katalog-Zeilen gegen parallele Statuswechsel sperren ----
  perform 1
  from public.repertoire_styles rs
  where rs.id = any (p_repertoire_style_ids)
  order by rs.id
  for share;

  -- ---- Jede repertoire_style-ID: Existenz + active ----
  for v_style_id in select unnest(p_repertoire_style_ids)
  loop
    if not exists (select 1 from public.repertoire_styles rs where rs.id = v_style_id) then
      raise exception 'repertoire_style_not_found'
        using errcode = 'PR006',
              detail = format('repertoire_style_id=%s not found in public.repertoire_styles', v_style_id);
    end if;

    if not exists (
      select 1 from public.repertoire_styles rs
      where rs.id = v_style_id
        and rs.status = 'active'
    ) then
      raise exception 'repertoire_style_not_active'
        using errcode = 'PR007',
              detail = format('repertoire_style_id=%s is not status=active', v_style_id);
    end if;
  end loop;

  -- ============================================================
  -- Ab hier: validiert. Diff-Semantik, alles im selben impliziten
  -- Transaktionsblock der Funktion (atomar).
  -- ============================================================

  -- 1. Entfernte Paare loeschen.
  delete from public.band_repertoire_styles brs
  where brs.band_id = p_band_id
    and brs.repertoire_style_id <> all (p_repertoire_style_ids);

  -- 2. Fuer jede Soll-Position: neu einfuegen oder sort_order aktualisieren.
  for v_sort_order in 1 .. v_target_count loop
    v_style_id := p_repertoire_style_ids[v_sort_order];

    if not exists (
      select 1 from public.band_repertoire_styles brs
      where brs.band_id = p_band_id
        and brs.repertoire_style_id = v_style_id
    ) then
      insert into public.band_repertoire_styles (band_id, repertoire_style_id, sort_order)
      values (p_band_id, v_style_id, v_sort_order);
    else
      update public.band_repertoire_styles
         set sort_order = v_sort_order
       where band_id = p_band_id
         and repertoire_style_id = v_style_id
         and sort_order is distinct from v_sort_order;
    end if;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- Ausfuehrungsrechte: Standardmaessig vergibt Postgres EXECUTE an
-- PUBLIC bei CREATE FUNCTION -- das muss explizit entzogen werden.
-- ------------------------------------------------------------
revoke all on function public.set_band_repertoire_styles(uuid, uuid[]) from public;
revoke all on function public.set_band_repertoire_styles(uuid, uuid[]) from anon;
revoke all on function public.set_band_repertoire_styles(uuid, uuid[]) from authenticated;
grant execute on function public.set_band_repertoire_styles(uuid, uuid[]) to service_role;

-- ------------------------------------------------------------
-- Begleitende Rechte-Deklaration (Sollzustand, idempotent -- Muster
-- band_moods_admin_write_lockdown.sql / band_relations_admin_read_grant.sql):
-- service_role bekommt NUR SELECT auf beide Tabellen (fuer Preflight und
-- Verifikation), NIE direktes INSERT/UPDATE/DELETE. Das Anlegen fehlender
-- Katalogzeilen in repertoire_styles fuer den einmaligen Import erfolgt
-- NICHT ueber service_role, sondern manuell im selben SQL-Editor-Lauf wie
-- diese Datei (siehe musikalisch_verortet_import.sql).
-- ------------------------------------------------------------
revoke insert, update, delete, truncate on public.repertoire_styles from service_role;
revoke insert, update, delete, truncate on public.band_repertoire_styles from service_role;

grant select on public.repertoire_styles to service_role;
grant select on public.band_repertoire_styles to service_role;
