-- ============================================================
-- event_type_anfrage_label_erstbefuellung.sql
--
-- Block "Event-Type-Anfrage-Label V1" (Owner-Entscheidung, eingefroren):
-- setzt public.event_types.anfrage_label ausschliesslich fuer genau die
-- vier freigegebenen Slugs. Voraussetzung: die Spalte existiert bereits
-- (siehe supabase/event_type_anfrage_label.sql, separat zuvor
-- ausgefuehrt).
--
-- Zielwerte (Owner-Entscheidung, eingefroren):
--   firmenfeier-business-event -> Firmenfeier
--   private-feiern             -> Private Feier
--   exklusive-privatfeiern     -> Exklusive Privatfeier
--   stadt-und-buergerfest      -> Stadtfest
--
-- Bewusst KEIN neues Label fuer Geburtstagsfeier, Open Air oder jeden
-- anderen Event Type -- ausschliesslich diese vier Zeilen werden
-- angefasst. Updates ausschliesslich ueber slug, NICHT ueber name.
--
-- Ausdruecklich NICHT Bestandteil dieser Datei:
--   - keine Konsolidierung von private-feiern/exklusive-privatfeiern
--   - keine Aenderung an name, id, slug, parent_id, status, sort_order,
--     description
--   - keine Aenderung an band_event_types
--
-- ============================================================
-- AUSFUEHRUNGSVERMERK
--
-- Der erste Owner-Lauf einer frueheren Fassung dieser Datei (mit
-- session-lokaler TEMP TABLE _v1_expected, ON COMMIT DROP, ueber mehrere
-- Statements hinweg referenziert) hat das fachliche UPDATE nachweislich
-- erfolgreich ausgefuehrt und committet, ist danach aber in der
-- Abschlusspruefung mit
--   ERROR: 42P01: relation "_v1_expected" does not exist
-- fehlgeschlagen -- identisches, bereits in
-- supabase/moods_description_backfill.sql dokumentiertes, nicht
-- abschliessend geklaertes Verhalten des Supabase SQL Editors bei
-- mehrstatigen Skripten mit session-lokalen Temp-Tabellen.
--
-- Unmittelbar danach wurde Production read-only verifiziert: alle vier
-- Zielzeilen trugen bereits exakt die vier Sollwerte, keine weitere Zeile
-- war betroffen, kanonische Felder aller 45 event_types-Zeilen sowie
-- band_event_types (1099 Zuordnungen) blieben unveraendert. Der
-- fachliche Zielzustand war damit vollstaendig erreicht.
--
-- Diese Datei wurde danach, VOR dem Commit, auf ein einziges atomares
-- DO-Statement ohne TEMP TABLE umgestellt -- ausschliesslich um dieses
-- Editor-Verhalten fuer kuenftige Laeufe strukturell auszuschliessen.
-- Diese korrigierte Fassung wurde NICHT erneut gegen Production
-- ausgefuehrt (Production befindet sich bereits im Sollzustand, ein
-- erneuter Lauf ist fachlich nicht erforderlich) -- sie ist rerun-safe
-- angelegt (siehe unten) und dokumentiert den beabsichtigten, fachlich
-- bereits erreichten Zielzustand als versioniertes Artefakt.
-- ============================================================
--
-- Rerun-Sicherheit: je Zielzeile ist ausschliesslich anfrage_label IS
-- NULL oder bereits exakt der Zielwert ein zulaessiger Ausgangszustand.
-- Ein abweichender, bereits vorhandener Wert bricht das gesamte
-- Statement fail-closed ab (kein stilles Ueberschreiben). Bereits exakt
-- korrekte Zielzeilen bleiben No-op -- ein wiederholter Lauf aendert
-- 0 Zeilen und schliesst trotzdem erfolgreich ab.
--
-- Ein einziges DO-Statement (keine TEMP TABLE, keine mehrstatige
-- Abhaengigkeit): schlaegt eine Vor- oder Nachbedingung fehl, rollt
-- Postgres das gesamte Statement atomar zurueck.
--
-- updated_at: der bestehende Trigger trg_event_types_updated_at setzt
-- updated_at automatisch bei tatsaechlichen Updates -- diese Migration
-- setzt updated_at nirgends manuell.
-- ============================================================

do $$
declare
  v_row             record;
  v_current_name    text;
  v_current_status  text;
  v_current_label   text;
  v_verified_count  integer;
  v_unexpected_count integer;
  v_unexpected_list  text;
begin
  -- Statement-lokale Erwartungsliste ueber VALUES -- keine TEMP TABLE,
  -- keine statementuebergreifende Lebensdauer noetig.
  for v_row in
    select * from (values
      ('firmenfeier-business-event', 'Firmenfeier & Business Event', 'Firmenfeier'),
      ('private-feiern',             'private Feiern',               'Private Feier'),
      ('exklusive-privatfeiern',     'exklusive Privatfeiern',        'Exklusive Privatfeier'),
      ('stadt-und-buergerfest',      'Stadt- und Bürgerfest',         'Stadtfest')
    ) as e(slug, current_name, target_label)
  loop
    -- Vorbedingung: Slug existiert. FOR UPDATE sperrt die Zeile fuer die
    -- Dauer des Statements (identisches Muster wie
    -- event_type_festzelt_label_cleanup.sql).
    select name, status, anfrage_label
      into v_current_name, v_current_status, v_current_label
    from public.event_types
    where slug = v_row.slug
    for update;

    if not found then
      raise exception 'V1 guard: Slug % existiert nicht in public.event_types', v_row.slug;
    end if;

    -- Vorbedingung: aktueller kanonischer Name entspricht der
    -- Owner-Entscheidung.
    if v_current_name <> v_row.current_name then
      raise exception 'V1 guard: % hat abweichenden Namen (erwartet "%", gefunden "%")',
        v_row.slug, v_row.current_name, v_current_name;
    end if;

    -- Vorbedingung: status=active.
    if v_current_status <> 'active' then
      raise exception 'V1 guard: % ist nicht status=active (gefunden %)', v_row.slug, v_current_status;
    end if;

    -- Rerun-safe: NULL oder bereits exakter Zielwert erlaubt, jeder
    -- andere vorhandene Wert bricht fail-closed ab.
    if v_current_label is not null and v_current_label <> v_row.target_label then
      raise exception 'V1 guard: % hat bereits einen abweichenden anfrage_label-Wert ("%")',
        v_row.slug, v_current_label;
    end if;

    -- Nur tatsaechlich schreiben, wenn noch nicht gesetzt -- bereits
    -- korrekte Zielzeilen bleiben No-op.
    if v_current_label is null then
      update public.event_types
         set anfrage_label = v_row.target_label
       where slug = v_row.slug;
    end if;
  end loop;

  -- Abschlusspruefung: exakt vier Zielzeilen tragen jetzt den Sollwert,
  -- kanonische Namen und status weiterhin korrekt.
  select count(*)
    into v_verified_count
  from public.event_types
  where (slug, name, anfrage_label) in (
    ('firmenfeier-business-event', 'Firmenfeier & Business Event', 'Firmenfeier'),
    ('private-feiern',             'private Feiern',               'Private Feier'),
    ('exklusive-privatfeiern',     'exklusive Privatfeiern',        'Exklusive Privatfeier'),
    ('stadt-und-buergerfest',      'Stadt- und Bürgerfest',         'Stadtfest')
  )
  and status = 'active';

  if v_verified_count <> 4 then
    raise exception 'V1 guard: Abschlusspruefung fehlgeschlagen -- nur %/4 Ziel-Event-Type(s) im Sollzustand', v_verified_count;
  end if;

  -- Keine andere Zeile darf einen anfrage_label-Wert tragen --
  -- ausschliesslich die vier freigegebenen Slugs.
  select count(*), string_agg(slug, ', ' order by slug)
    into v_unexpected_count, v_unexpected_list
  from public.event_types
  where anfrage_label is not null
    and slug not in (
      'firmenfeier-business-event', 'private-feiern',
      'exklusive-privatfeiern', 'stadt-und-buergerfest'
    );

  if v_unexpected_count > 0 then
    raise exception 'V1 guard: % unerwartete Event-Type(s) mit gesetztem anfrage_label ausserhalb der vier freigegebenen Slugs: %',
      v_unexpected_count, v_unexpected_list;
  end if;

  raise notice 'event_type_anfrage_label_erstbefuellung erfolgreich: vier Ziel-Event-Types im Sollzustand, keine weiteren Zeilen betroffen.';
end $$;

-- ============================================================
-- Manueller Rollback-Hinweis (NICHT automatisch ausfuehrbar):
--
-- Falls ein Rueckbau jemals noetig wird, ausschliesslich manuell und
-- gezielt ueber slug, z. B.:
--   update public.event_types set anfrage_label = null
--   where slug in ('firmenfeier-business-event', 'private-feiern',
--                   'exklusive-privatfeiern', 'stadt-und-buergerfest');
-- Kein automatisch ausfuehrbares Rollback-Statement in dieser Datei.
-- ============================================================
