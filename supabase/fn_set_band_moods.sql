-- ============================================================
-- fn_set_band_moods.sql
--
-- NOCH NICHT AUSGEFUEHRT. Versioniert vorbereitet fuer Paket 1
-- ("Klingt nach" im Admin -- Mood-Editor). Ausfuehrung erfolgt manuell
-- durch Xandi im Supabase SQL Editor, siehe Completion Report fuer die
-- genaue Reihenfolge.
--
-- Sprint: Admin "Klingt nach" -- Mood-Editor auf der Band-Bearbeitungsseite
-- Datum des Entwurfs: 20.07.2026
--
-- Vorbild/Muster: supabase/fn_set_similar_bands.sql (identisches
-- Sicherheitsmodell, identische NULL-vs-leer-Semantik, identisches
-- Fehlercode-Schema). Unterschiede bewusst und unten erklaert.
--
-- Zweck:
--   Setzt den vollstaendigen Sollzustand der band_moods-Zuordnungen
--   einer Band in EINER atomaren Transaktion (impliziter
--   Funktionsblock). Ersetzt den bisherigen Zustand, in dem es fuer
--   band_moods ueberhaupt keinen dedizierten Schreibpfad gab (der
--   gesamte Klingt-nach-Rollout lief ausschliesslich ueber einmalige,
--   guard-gesicherte SQL-Migrationen mit direkten Tabellen-Grants,
--   siehe supabase/band_moods_klingt_nach_rounds_3_4_import.sql u. a.
--   -- fuer den laufenden Admin-Betrieb ist das kein geeigneter
--   Schreibweg mehr).
--
-- Signatur:
--   public.set_band_moods(p_band_id uuid, p_mood_ids uuid[])
--   RETURNS void
--
-- Semantik:
--   - sort_order ergibt sich ausschliesslich aus der Array-Position in
--     p_mood_ids (Index 1 = sort_order 1, Index 2 = sort_order 2, ...).
--     Leere Zwischenplaetze MUESSEN von der aufrufenden Server Action
--     vor dem Aufruf herausgefiltert werden (siehe
--     lib/moods/sortAssignments.ts#compactRankSlots) -- die Funktion
--     kompaktiert nicht nachtraeglich, sie nimmt die Array-Reihenfolge
--     als Soll-sort_order. Kein neu geschriebener Eintrag kann dadurch
--     mit sort_order = 0 (Spalten-Default) enden.
--   - p_mood_ids = NULL wirft einen Fehler (PM002) -- ein
--     fehlender/falsch benannter RPC-Parameter darf nie still alle
--     Mood-Zuordnungen loeschen. NUR ein explizit leeres Array
--     ('{}'::uuid[], cardinality = 0) bedeutet: alle band_moods-Zeilen
--     dieser Band entfernen (bildet die sechs bewussten Empty States
--     korrekt ab). Kein Fehler, kein Insert.
--   - Maximal 4 Eintraege (technische Obergrenze -- der redaktionelle
--     Zielkorridor von 2-4 ist eine UI-Kurationsregel, keine
--     technische Sperre, siehe MoodEditorSection.tsx).
--   - Diff-Semantik (nicht Delete+Insert, nicht blindes Upsert):
--       * Paar (band,mood) unveraendert UND sort_order unveraendert
--         -> keine Schreiboperation auf diese Zeile (created_at bleibt
--         exakt erhalten)
--       * Paar unveraendert, sort_order neu -> ausschliesslich UPDATE
--         sort_order
--       * Paar nicht mehr im Soll-Array -> DELETE
--       * Paar neu -> INSERT
--
-- Unterschied zu fn_set_similar_bands.sql (bewusst kein
-- NULL-Park-Zweiphasen-Schema): band_relations hat einen partiellen
-- Unique-Index auf (source_band_id, relation_type, rank) WHERE rank IS
-- NOT NULL, der einen direkten Rank-Tausch (z. B. 1<->2) ueber zwei
-- einzelne UPDATEs mit 23505 kollidieren laesst. public.band_moods hat
-- KEINE analoge Unique-Constraint auf sort_order (Primary Key ist
-- (band_id, mood_id) -- siehe supabase/proudleut-schema.sql; live
-- bestaetigt durch Bigband STEINBACH, die drei band_moods-Zeilen mit
-- identischem sort_order=0 besitzt, was unter einer Unique-Constraint
-- unmoeglich waere). Ein direkter sort_order-Tausch kollidiert daher
-- nicht, die einfachere einphasige Diff-Vergabe unten ist ausreichend.
--
-- Validierung (wirft RAISE EXCEPTION bei Verstoss, siehe Fehlercodes
-- unten -- Validierung laeuft VOR jeder Schreiboperation):
--   - Band existiert (per SELECT ... FOR UPDATE gesperrt -- serialisiert
--     parallele Aufrufe fuer dieselbe Band)
--   - p_mood_ids ist nicht NULL
--   - Kein Element des Mood-Arrays ist NULL
--   - Maximal 4 Eintraege
--   - Keine Duplikate innerhalb des Arrays
--   - Alle Mood-IDs existieren
--   - Alle ausgewaehlten Moods sind status='active'
--
-- Fehlercodes (MESSAGE = stabiler Slug, zusaetzlich projektspezifischer
-- ERRCODE fuer Code-basiertes Abfangen -- beides stabil und
-- maschinenlesbar, unabhaengig vom uebersetzten Fehlertext). Die
-- MESSAGE-Slugs muessen exakt den Werten in MOOD_ERRCODE_TO_SLUG
-- (app/admin/bands/[id]/actions.ts) entsprechen -- die Client-Action
-- nutzt error.code (PL-ERRCODE) primaer, faellt bei fehlendem/
-- unbekanntem Code aber auf einen Vergleich gegen error.message zurueck
-- (identisches Muster zu fn_set_similar_bands.sql):
--   PM001  mood_band_not_found
--   PM002  mood_targets_required
--   PM003  mood_too_many
--   PM004  mood_null_target
--   PM005  mood_duplicate
--   PM006  mood_not_found
--   PM007  mood_not_active
--
-- Sicherheit (identisches Modell zu fn_set_similar_bands.sql):
--   - SECURITY DEFINER: laeuft mit den Rechten des Funktions-Owners
--     (im SQL Editor i. d. R. postgres), NICHT mit denen des
--     Aufrufers. Deshalb braucht service_role KEINE eigenen
--     INSERT/UPDATE/DELETE-Table-Grants auf band_moods -- nur EXECUTE
--     auf diese Funktion (siehe
--     supabase/band_moods_admin_write_lockdown.sql, separat
--     auszufuehren).
--   - SET search_path = pg_catalog, pg_temp: bewusst OHNE "public" im
--     Pfad. Alle Tabellenverweise im Funktionskoerper sind vollstaendig
--     schemaqualifiziert (public.bands, public.moods, public.band_moods).
--   - REVOKE ALL FROM PUBLIC/anon/authenticated + GRANT EXECUTE nur an
--     service_role: alle drei Rollen explizit einzeln entzogen, analog
--     zu fn_set_similar_bands.sql.
-- ============================================================

create or replace function public.set_band_moods(
  p_band_id uuid,
  p_mood_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_target_count   integer;
  v_distinct_count integer;
  v_mood_id        uuid;
  v_sort_order     integer;
begin
  -- ---- Band-Existenz, per Zeilen-Lock ----
  perform 1 from public.bands b where b.id = p_band_id for update;
  if not found then
    raise exception 'mood_band_not_found'
      using errcode = 'PM001',
            detail = format('band_id=%s not found in public.bands', p_band_id);
  end if;

  -- ---- NULL-Array ist ein Fehler, kein "alles loeschen" ----
  if p_mood_ids is null then
    raise exception 'mood_targets_required'
      using errcode = 'PM002',
            detail = 'use an empty uuid[] to remove all mood assignments';
  end if;

  -- ---- Leeres Array: alle band_moods-Zeilen dieser Band entfernen ----
  if cardinality(p_mood_ids) = 0 then
    delete from public.band_moods where band_id = p_band_id;
    return;
  end if;

  v_target_count := array_length(p_mood_ids, 1);

  -- ---- Maximal 4 Eintraege ----
  if v_target_count > 4 then
    raise exception 'mood_too_many'
      using errcode = 'PM003',
            detail = format('%s moods submitted, maximum 4 allowed', v_target_count);
  end if;

  -- ---- Kein Element des Arrays ist NULL ----
  -- Muss vor dem Duplikat-Check laufen: ein NULL-Element wuerde sonst
  -- die count(distinct)-Zaehlung verfaelschen.
  if array_position(p_mood_ids, null) is not null then
    raise exception 'mood_null_target'
      using errcode = 'PM004',
            detail = 'p_mood_ids contains a null element';
  end if;

  -- ---- Keine Duplikate innerhalb des Arrays ----
  select count(distinct m) into v_distinct_count from unnest(p_mood_ids) as m;
  if v_distinct_count <> v_target_count then
    raise exception 'mood_duplicate'
      using errcode = 'PM005',
            detail = 'p_mood_ids contains duplicate values';
  end if;

  -- ---- Jede Mood-ID: Existenz + active ----
  for v_mood_id in select unnest(p_mood_ids)
  loop
    if not exists (select 1 from public.moods m where m.id = v_mood_id) then
      raise exception 'mood_not_found'
        using errcode = 'PM006',
              detail = format('mood_id=%s not found in public.moods', v_mood_id);
    end if;

    if not exists (
      select 1 from public.moods m
      where m.id = v_mood_id
        and m.status = 'active'
    ) then
      raise exception 'mood_not_active'
        using errcode = 'PM007',
              detail = format('mood_id=%s is not status=active', v_mood_id);
    end if;
  end loop;

  -- ============================================================
  -- Ab hier: validiert. Diff-Semantik, alles im selben impliziten
  -- Transaktionsblock der Funktion (atomar).
  -- ============================================================

  -- 1. Entfernte Paare loeschen: bestehende Zeilen dieser Band, deren
  --    Mood NICHT mehr im neuen Soll-Array steht.
  delete from public.band_moods bm
  where bm.band_id = p_band_id
    and bm.mood_id <> all (p_mood_ids);

  -- 2. Fuer jede Soll-Position: neu einfuegen oder sort_order aktualisieren.
  --    Unveraendert korrekte Zeilen (Paar UND sort_order bereits korrekt)
  --    bleiben unangetastet -- kein Write, created_at unveraendert.
  for v_sort_order in 1 .. v_target_count loop
    v_mood_id := p_mood_ids[v_sort_order];

    if not exists (
      select 1 from public.band_moods bm
      where bm.band_id = p_band_id
        and bm.mood_id = v_mood_id
    ) then
      insert into public.band_moods (band_id, mood_id, sort_order)
      values (p_band_id, v_mood_id, v_sort_order);
    else
      update public.band_moods
         set sort_order = v_sort_order
       where band_id = p_band_id
         and mood_id = v_mood_id
         and sort_order is distinct from v_sort_order;
    end if;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- Ausfuehrungsrechte: Standardmaessig vergibt Postgres EXECUTE an
-- PUBLIC bei CREATE FUNCTION -- das muss explizit entzogen werden.
-- ------------------------------------------------------------
revoke all on function public.set_band_moods(uuid, uuid[]) from public;
revoke all on function public.set_band_moods(uuid, uuid[]) from anon;
revoke all on function public.set_band_moods(uuid, uuid[]) from authenticated;
grant execute on function public.set_band_moods(uuid, uuid[]) to service_role;
