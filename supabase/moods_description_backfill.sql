-- ============================================================
-- moods_description_backfill.sql
--
-- Paket B1 — Produktentscheidung "Mood-Katalog v2" (Notion, freigegeben
-- durch Xandi am 15.07.2026):
-- https://app.notion.com/p/3a0d7cb2c95481fbbe83dd906f6aeda2
--
-- Zweck:
--   1) public.moods erhaelt eine nullable Spalte "description" (text).
--   2) Backfill der Definitionstexte fuer genau die 11 bereits
--      existierenden Ziel-Moods aus dem 13er-Zielkatalog.
--
-- Ausdruecklich NICHT Bestandteil dieses Pakets:
--   - "Rockig & mitreissend" (rockig-mitreissend) und
--     "Emotional & beruehrend" (emotional-beruehrend) -- werden erst in
--     Paket B2 neu angelegt.
--   - Brass-Power -- gehoert nicht zum 13er-Zielkatalog, description
--     bleibt bewusst NULL bis zum Repertoire-/Bereinigungspaket (D).
--   - Publikumsnaehe, Tradition, Vielseitig -- keine Ziel-Moods fuer B1.
--
-- Production-Verifikation (SQL Editor, vor diesem Entwurf ausgefuehrt):
--   - public.moods hat aktuell genau 7 Spalten, "description" existiert
--     nicht, 0 vorhandene Beschreibungswerte.
--   - PK auf id, UNIQUE-Constraint+Index "moods_slug_key" auf slug,
--     KEIN Unique-Constraint auf name -- Updates werden deshalb bewusst
--     ueber slug UND name adressiert, nicht nur slug.
--   - anon besitzt effektives Tabellen-SELECT auf public.moods
--     (has_table_privilege = true, Grant-Zeile anon|moods|SELECT
--     vorhanden). Eine neue Spalte ist davon automatisch umfasst --
--     DAHER KEIN GRANT-STATEMENT IN DIESER MIGRATION.
--   - Trigger trg_moods_updated_at (BEFORE UPDATE, enabled) setzt
--     updated_at automatisch -- diese Migration setzt updated_at
--     deshalb nirgends manuell.
--   - 21 Moods gesamt (15 aktiv, 6 archiviert). Alle 11 B1-Zielpaare
--     (Slug+Name) wurden einzeln gegen Production verifiziert.
--
-- Idempotenz (Hausregel 6): ein versehentlicher zweiter Lauf muss gruen
-- durchlaufen. "add column if not exists" plus eine unmittelbar
-- anschliessende Schemaform-Pruefung deckt sowohl den Erstlauf (Spalte
-- wird angelegt) als auch den Wiederholungslauf (Spalte bereits korrekt
-- vorhanden) ab -- ein reiner Vorab-"Spalte darf nicht existieren"-Check
-- wuerde den zweiten, laengst idempotenten Lauf faelschlich verwerfen.
-- Die UPDATE-Klausel schreibt ohnehin nur Zeilen mit description IS
-- NULL, ein Wiederholungslauf aendert daher 0 Zeilen und committet
-- trotzdem sauber durch.
--
-- SQL-Editor-Hinweis: der Supabase SQL Editor zeigt bei Multi-Statement-
-- Skripten in der Regel nur das letzte Resultset an. Die komplette
-- Kontrollausgabe (Ziel-Moods + aktive Moods ohne Beschreibung + in
-- diesem Lauf tatsaechlich geaenderte Zeilen) ist deshalb bewusst in
-- EIN kombiniertes finales SELECT mit der Kennzeichnungs-Spalte
-- report_section gegossen (siehe Abschnitt 6). Da COMMIT alle
-- temporaeren Tabellen dieser Migration verwirft, dient zusaetzlich
-- eine unabhaengige Post-Commit-Verifikationsquery (separat geliefert,
-- fuer einen zweiten SQL-Editor-Tab) als massgebliches Kontrollmittel.
--
-- Rollback: siehe auskommentierten Hinweis ganz unten -- kein
-- automatisch ausfuehrbarer DROP COLUMN.
-- ============================================================

-- ============================================================
-- AUSFUEHRUNGS- UND VERIFIKATIONSVERMERK (ergaenzt nach Production-Lauf)
--
-- Ausgefuehrt: 17.07.2026, durch Xandi im Supabase SQL Editor gegen
-- Production.
--
-- Negativtests (vor der eigentlichen Migration ausgefuehrt):
--   - Negativtest A (Namenskonflikt): bestanden. Ergebnis im SQL
--     Editor: "Success. No rows returned". Die Testkonstruktion laesst
--     einen erfolgreichen Abschluss nur zu, wenn der fachliche Guard
--     tatsaechlich RAISE EXCEPTION ausgeloest hat, ausschliesslich die
--     erwartete B1-Guard-Meldung im inneren Exception-Block abgefangen
--     wurde, der simulierte Update-Pfad nicht erreicht wurde und der
--     aeussere Test mit ROLLBACK endete. Die RAISE NOTICE-Meldung
--     selbst wurde vom Results-Panel nicht angezeigt -- das aendert an
--     der bestandenen Testsemantik nichts, da der Test ueber das
--     Nichtauftreten der beiden NEGATIVTEST-FEHLGESCHLAGEN-Exceptions
--     definiert ist, nicht ueber die Sichtbarkeit der NOTICE.
--   - Negativtest B (description-Konflikt): bestanden, dieselbe
--     Guard-/Handler-Semantik. Vollstaendig auf Schatten-/Temp-Tabellen
--     umgestellt -- public.moods wurde in diesem Test weder gelesen
--     noch geschrieben.
--   - Spur-Kontrolle nach beiden Negativtests (information_schema.
--     columns fuer public.moods.description): 0 Zeilen. Production
--     befand sich vor dem fachlichen Write weiterhin im verifizierten
--     Ausgangszustand.
--
-- Production-Write: das Skript wurde anschliessend im SQL Editor
-- ausgefuehrt. Fachlich PERSISTENT:
--   - Spalte public.moods.description wurde angelegt.
--   - Genau 11 Mood-Zeilen wurden mit Beschreibung befuellt --
--     ausschliesslich die 11 festgelegten B1-Ziel-Moods.
--
-- BEKANNTER, NICHT ABSCHLIESSEND GEKLAERTER BEFUND: der interne
-- kombinierte Abschlussreport (Abschnitt 6, finales SELECT) schlug im
-- selben SQL-Editor-Lauf fehl mit:
--   ERROR: 42P01: relation "_b1_expected" does not exist
-- Die fachlichen Datenaenderungen waren zu diesem Zeitpunkt bereits
-- persistent (s.u., unabhaengig verifiziert). Es ist NICHT belegt, ob
-- der Supabase SQL Editor Statements bzw. den Session-/Temp-Tabellen-
-- Kontext innerhalb eines eingefuegten Multi-Statement-Skripts anders
-- behandelt als eine einzelne durchgehende Transaktion, oder ob eine
-- andere Ursache vorlag. Es wird AUSDRUECKLICH NICHT behauptet, dass
-- das vollstaendige Skript fehlerfrei durchgelaufen ist, dass der
-- interne Abschlussreport erfolgreich war, oder dass der gesamte
-- SQL-Editor-Lauf nachweislich als eine einzige Transaktion ausgefuehrt
-- wurde.
--
-- Unabhaengige Post-Write-Verifikation (separate read-only Abfragen,
-- nicht Teil dieses Skripts): eine eigenstaendige Expected-Liste wurde
-- per LEFT JOIN gegen Production abgeglichen.
--   - 11/11 Ziel-Moods gefunden.
--   - 11/11 name_matches = true.
--   - 11/11 description_matches = true, zeichengenau.
--   - Gemeinsamer updated_at-Wert der elf Ziel-Moods:
--     2026-07-17 21:58:21.633379+00 -- bestaetigt, dass der Trigger
--     trg_moods_updated_at bei den elf tatsaechlichen Backfill-Updates
--     gegriffen hat und updated_at nicht manuell gesetzt wurde. Dieser
--     gemeinsame Zeitstempel belegt NICHT, dass der gesamte
--     SQL-Editor-Lauf eine einzige Transaktion war -- nur, dass die elf
--     UPDATE-Zeilen selbst in einem gemeinsamen Update-Vorgang liefen.
--   - Aktive Moods mit description IS NULL: genau vier -- brass-power,
--     publikumsnaehe, tradition, vielseitig. Alle vier weiterhin mit
--     unveraendertem updated_at = 2026-06-08 21:23:20.978511+00 --
--     belegt, dass diese vier Zeilen durch den Backfill nicht
--     angefasst wurden. Brass-Power bleibt entsprechend der
--     Entscheidung vom 17.07.2026 bewusst ohne Beschreibung bis zum
--     spaeteren Bereinigungspaket.
--   - Finale Schemapruefung public.moods.description: data_type=text,
--     is_nullable=YES, column_default=NULL, is_identity=NO,
--     is_generated=NEVER.
--   - Finale Rechtepruefung: anon_can_select=true,
--     authenticated_can_select=false, service_role_can_select=true.
--     Kein zusaetzliches Grant-Statement war erforderlich.
--
-- Idempotenz -- praezise formuliert: die fachliche UPDATE-Logik ist
-- idempotent, weil ausschliesslich Zeilen mit description IS NULL
-- aktualisiert werden. Ein zweiter Production-Lauf war nach dem
-- erfolgreichen Backfill nicht erforderlich und wurde NICHT
-- ausgefuehrt. Wegen des oben dokumentierten 42P01-Befunds im
-- internen Report darf NICHT behauptet werden, das vollstaendige
-- Skript sei im Supabase SQL Editor als Ganzes erfolgreich
-- wiederholungserprobt.
--
-- B2-MERKER (Dokumentation, keine Entscheidung, keine Umsetzung in
-- diesem Paket):
--   - Der 42P01-Befund wirft eine offene Frage zum Transaktions- und
--     Temp-Tabellen-Verhalten des Supabase SQL Editors bei
--     Multi-Statement-Skripten auf. Die Ursache ist NICHT geklaert.
--   - Vor Paket B2 muss dieses Verhalten mit einem harmlosen,
--     reproduzierbaren Test gemessen werden.
--   - Fuer B2 ist zu pruefen, ob Guards und kritische Writes
--     alternativ in einem einzelnen atomaren Statement (z. B. einem
--     DO-Block) gekapselt werden sollen -- dies ist nur eine
--     Pruefoption, noch keine beschlossene Architektur.
--   - Unabhaengige Post-Write-Verifikation bleibt fuer B2 verpflichtend.
-- ============================================================

begin;

-- ────────────────────────────────────────────────────────────
-- 1) Zentrale Erwartungsliste -- einzige Quelle fuer Slug/Name/
--    Zielbeschreibung, um Duplikation im Skript zu vermeiden.
-- ────────────────────────────────────────────────────────────

create temporary table _b1_expected (
  slug        text primary key,
  name        text not null,
  description text not null
) on commit drop;

insert into _b1_expected (slug, name, description) values
  ('festzeltenergie', 'Festzeltenergie',
   'Bierzelt-Vollgas: laut, deftig, gemeinschaftlich und auf Volksfeststimmung ausgerichtet.'),
  ('party-pur', 'Party pur',
   'Hohe Energiedichte und Feiermodus prägen den Auftritt; Animation, bekannte Partynummern und gemeinsames Feiern stehen deutlich vor Konzert- oder Hintergrundcharakter.'),
  ('tanzflaechen-garantie', 'Tanzflächen-Garantie',
   'Repertoire und Dramaturgie sind gezielt darauf ausgerichtet, die Tanzfläche zu füllen und in Bewegung zu halten.'),
  ('festlich-ausgelassen', 'Festlich und ausgelassen',
   'Ein feierlicher oder gehobener Rahmen entwickelt sich im Verlauf zu offener, ausgelassener Stimmung — typisch für Hochzeit, Ball oder Jubiläum.'),
  ('herzlich-nahbar', 'Herzlich & nahbar',
   'Die Band wirkt warm und zugänglich; Gäste fühlen sich persönlich angesprochen statt lediglich beschallt.'),
  ('lagerfeuer-atmosphaere', 'Lagerfeuer-Atmosphäre',
   'Intim, entschleunigt und häufig akustisch geprägt — Musik, die Nähe schafft und zum Zusammenrücken einlädt.'),
  ('authentisch-handgemacht', 'Authentisch und handgemacht',
   'Ehrliches Live-Spiel und ein organischer Bandsound stehen vor Show-Fassade oder stark vorproduzierter Wirkung.'),
  ('bayerisch-frech', 'Bayerisch & frech',
   'Dialekt, regionaler Charakter, Schmäh und Augenzwinkern prägen Auftritt, Musik oder Ansagen.'),
  ('konzertant-hochwertig', 'Konzertant & hochwertig',
   'Musikalische Qualität, Arrangement und bewusstes Zuhören stehen im Vordergrund; Animation und reine Partystimmung sind nicht der Hauptzweck.'),
  ('generationenverbindend', 'Generationenverbindend',
   'Repertoire und Auftreten schaffen Anknüpfungspunkte über mehrere Altersgruppen hinweg.'),
  ('mitsing-faktor', 'Mitsing-Faktor',
   'Bekannte Melodien, Refrains oder Interaktion laden das Publikum aktiv zum Mitsingen ein.');

-- Fail-closed: die Erwartungsliste selbst muss exakt 11 Zeilen und
-- keine doppelten Slugs enthalten (PK verhindert Duplikate strukturell,
-- die Zaehlung liefert zusaetzlich eine verstaendliche Fehlermeldung).
do $$
declare
  v_row_count      integer;
  v_distinct_count integer;
begin
  select count(*), count(distinct slug) into v_row_count, v_distinct_count
  from _b1_expected;

  if v_row_count <> 11 then
    raise exception 'B1 guard: Erwartungsliste hat % Zeile(n), erwartet genau 11', v_row_count;
  end if;

  if v_distinct_count <> 11 then
    raise exception 'B1 guard: Erwartungsliste enthaelt doppelte Slugs (% eindeutig von 11)', v_distinct_count;
  end if;
end $$;

-- ────────────────────────────────────────────────────────────
-- 2) description anlegen (idempotent) + sofortige fail-closed
--    Schemaform-Pruefung -- akzeptiert keine abweichend definierte
--    vorhandene Spalte still.
-- ────────────────────────────────────────────────────────────

alter table public.moods
  add column if not exists description text;

do $$
declare
  v_data_type      text;
  v_is_nullable    text;
  v_column_default text;
  v_is_identity    text;
  v_is_generated   text;
begin
  select data_type, is_nullable, column_default, is_identity, is_generated
  into v_data_type, v_is_nullable, v_column_default, v_is_identity, v_is_generated
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'moods'
    and column_name = 'description';

  if v_data_type is null then
    raise exception 'B1 guard: description-Spalte fehlt nach ADD COLUMN IF NOT EXISTS -- unerwarteter Zustand';
  end if;

  if v_data_type <> 'text' then
    raise exception 'B1 guard: moods.description hat data_type %, erwartet text', v_data_type;
  end if;

  if v_is_nullable <> 'YES' then
    raise exception 'B1 guard: moods.description ist NOT NULL, erwartet nullable';
  end if;

  if v_column_default is not null then
    raise exception 'B1 guard: moods.description hat einen Default (%), erwartet keinen', v_column_default;
  end if;

  if v_is_identity <> 'NO' then
    raise exception 'B1 guard: moods.description ist eine Identity-Spalte, erwartet keine';
  end if;

  if v_is_generated <> 'NEVER' then
    raise exception 'B1 guard: moods.description ist eine Generated-Spalte, erwartet keine';
  end if;
end $$;

-- ────────────────────────────────────────────────────────────
-- 3) Zielbestand pruefen: alle 11 erwarteten Slugs existieren exakt
--    einmal mit exakt dem erwarteten Namen. Obwohl slug UNIQUE ist,
--    liefert dieser Guard eine verstaendliche fachliche Fehlermeldung
--    statt einer rohen Constraint-Verletzung.
-- ────────────────────────────────────────────────────────────

do $$
declare
  v_missing_count  integer;
  v_missing_list   text;
  v_mismatch_count integer;
  v_mismatch_list  text;
  v_dup_count      integer;
  v_dup_list       text;
begin
  select count(*), string_agg(e.slug, ', ' order by e.slug)
  into v_missing_count, v_missing_list
  from _b1_expected e
  left join public.moods m on m.slug = e.slug
  where m.id is null;

  if v_missing_count > 0 then
    raise exception 'B1 guard: % erwartete Slug(s) fehlen in public.moods: %', v_missing_count, v_missing_list;
  end if;

  select count(*),
         string_agg(e.slug || ' (erwartet "' || e.name || '", gefunden "' || m.name || '")', E'\n' order by e.slug)
  into v_mismatch_count, v_mismatch_list
  from _b1_expected e
  join public.moods m on m.slug = e.slug
  where m.name <> e.name;

  if v_mismatch_count > 0 then
    raise exception
      'B1 guard: % Slug(s) mit abweichendem Namen: %',
      v_mismatch_count,
      v_mismatch_list;
  end if;

  select count(*), string_agg(x.slug, ', ' order by x.slug)
  into v_dup_count, v_dup_list
  from (
    select slug
    from public.moods
    where slug in (select slug from _b1_expected)
    group by slug
    having count(*) > 1
  ) x;

  if v_dup_count > 0 then
    raise exception 'B1 guard: % Ziel-Slug(s) existieren mehrfach in public.moods: %', v_dup_count, v_dup_list;
  end if;
end $$;

-- ────────────────────────────────────────────────────────────
-- 4) Vorhandene description-Werte pruefen: NULL darf gesetzt werden,
--    exakter Zielwert ist idempotent i.O., jeder andere Wert bricht ab.
--    Kein stilles Ueberschreiben abweichender Texte.
-- ────────────────────────────────────────────────────────────

do $$
declare
  v_conflict_count integer;
  v_conflict_list  text;
begin
  select count(*),
         string_agg(m.slug || ' (vorhanden: "' || m.description || '")', E'\n' order by m.slug)
  into v_conflict_count, v_conflict_list
  from public.moods m
  join _b1_expected e on e.slug = m.slug
  where m.description is not null
    and m.description <> e.description;

  if v_conflict_count > 0 then
    raise exception
      'B1 guard: % Ziel-Mood(s) haben bereits einen abweichenden description-Wert: %',
      v_conflict_count,
      v_conflict_list;
  end if;
end $$;

-- ────────────────────────────────────────────────────────────
-- 5) Updates -- ausschliesslich die 11 verifizierten Ziel-Moods,
--    adressiert ueber slug UND name, nur Zeilen mit description IS
--    NULL werden tatsaechlich geschrieben (Idempotenz: ein zweiter
--    Lauf aendert 0 Zeilen). updated_at wird nicht manuell gesetzt --
--    das uebernimmt trg_moods_updated_at automatisch bei echten
--    Aenderungen. Die tatsaechlich in DIESEM Lauf geaenderten Zeilen
--    werden per RETURNING erfasst (Hausregel: UPDATE-Kontrolle).
-- ────────────────────────────────────────────────────────────

create temporary table _b1_updated (
  slug        text primary key,
  name        text not null,
  description text not null,
  updated_at  timestamptz not null
) on commit drop;

with updated as (
  update public.moods m
  set description = e.description
  from _b1_expected e
  where m.slug = e.slug
    and m.name = e.name
    and m.description is null
  returning
    m.slug,
    m.name,
    m.description,
    m.updated_at
)
insert into _b1_updated (slug, name, description, updated_at)
select slug, name, description, updated_at
from updated;

-- ────────────────────────────────────────────────────────────
-- 6) Abschlusspruefung (innerhalb der Transaktion) + kombinierter
--    Report in einem einzigen finalen Resultset.
-- ────────────────────────────────────────────────────────────

do $$
declare
  v_expected_count integer;
  v_verified_count integer;
  v_bad_list       text;
begin
  select count(*) into v_expected_count from _b1_expected;
  if v_expected_count <> 11 then
    raise exception 'B1 guard: Erwartungsliste ist waehrend der Migration von 11 auf % Zeilen abgewichen', v_expected_count;
  end if;

  select count(*)
  into v_verified_count
  from _b1_expected e
  join public.moods m
    on m.slug = e.slug
   and m.name = e.name
   and m.description = e.description;

  if v_verified_count <> 11 then
    select string_agg(e.slug, ', ' order by e.slug)
    into v_bad_list
    from _b1_expected e
    left join public.moods m
      on m.slug = e.slug
     and m.name = e.name
     and m.description = e.description
    where m.id is null;

    raise exception 'B1 guard: Abschlusspruefung fehlgeschlagen fuer %/11 Ziel-Mood(s): %', 11 - v_verified_count, v_bad_list;
  end if;
end $$;

-- Kombinierter Report: Punkt 5 (alle 11 Ziel-Moods) + Punkt 6 (alle
-- aktiven Moods ohne Beschreibung) + tatsaechlich in DIESEM Lauf
-- geaenderte Zeilen, unterschieden ueber report_section. Erwartet
-- unter "active_without_description": publikumsnaehe, tradition,
-- brass-power, vielseitig -- kein Fehler. Jede weitere dort
-- auftauchende Zeile ist ein sichtbar auszuweisender Befund, keine
-- automatische Aenderung. "updated_this_run" zeigt beim Erstlauf 11
-- Zeilen, bei einem idempotenten Wiederholungslauf 0 Zeilen.
select
  'target_moods'::text as report_section,
  m.slug,
  m.name,
  m.description,
  m.status,
  m.updated_at
from public.moods m
where m.slug in (select slug from _b1_expected)

union all

select
  'active_without_description'::text as report_section,
  m.slug,
  m.name,
  m.description,
  m.status,
  m.updated_at
from public.moods m
where m.status = 'active'
  and m.description is null

union all

select
  'updated_this_run'::text as report_section,
  u.slug,
  u.name,
  u.description,
  null::text as status,
  u.updated_at
from _b1_updated u

order by report_section, slug;

commit;

-- ============================================================
-- Manueller Rollback-Hinweis (NICHT automatisch ausfuehrbar):
--
-- Ein pauschales
--   alter table public.moods drop column description;
-- ist absichtlich NICHT Bestandteil dieser Datei. "add column if not
-- exists" beweist nicht, dass DIESE Migration die Spalte urspruenglich
-- angelegt hat -- ein automatischer DROP COLUMN koennte fremde Daten
-- oder eine unabhaengige spaetere Aenderung zerstoeren.
--
-- Falls ein Rueckbau jemals noetig wird: nur nach gesonderter Pruefung
-- im SQL Editor (z. B. Bestaetigung, dass ausschliesslich die hier
-- gesetzten 11 Werte + NULL vorkommen und kein anderer Verwender der
-- Spalte hinzugekommen ist), und nur als manuell einzeln ausgefuehrtes
-- Statement -- niemals als Teil eines automatisierten Skripts.
-- ============================================================
