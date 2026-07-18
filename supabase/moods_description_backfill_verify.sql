-- ============================================================
-- moods_description_backfill_verify.sql
--
-- Eigenstaendige Read-only-Verifikation zu Paket B1
-- (supabase/moods_description_backfill.sql).
--
-- SEPARAT im Supabase SQL Editor auszufuehren -- NICHT Teil der
-- Migration. Vollstaendig read-only, beliebig oft wiederholbar, ohne
-- jede Abhaengigkeit von Session-Temp-Tabellen der Migration
-- (_b1_expected, _b1_updated sind ON COMMIT DROP und ausserhalb der
-- erzeugenden Transaktion ohnehin nicht mehr zugreifbar -- diese Datei
-- referenziert sie deshalb an keiner Stelle ausfuehrbar).
--
-- Diese Datei prueft ausschliesslich den AKTUELLEN Sollzustand von
-- public.moods, nicht den Verlauf eines historischen Laufs. Sie trifft
-- keine Aussage darueber, welche Zeilen in einem frueheren Lauf
-- geaendert wurden -- eine nachtraegliche Read-only-Abfrage kann das
-- ohne separates Audit-Log nicht belastbar rekonstruieren. Eine
-- Sektion oder Spalte mit der Bedeutung "updated_this_run" ist deshalb
-- bewusst NICHT enthalten. `updated_at` wird unten als aktueller
-- Datenbankwert ausgegeben, aber nicht als alleiniger Beweis fuer
-- einen bestimmten historischen Lauf umgedeutet.
--
-- Der historische Schreib-Nachweis (11/11 Backfills, gemeinsamer
-- updated_at-Zeitstempel der elf Ziel-Moods) sowie der urspruengliche
-- 42P01-Befund bleiben ausschliesslich im Ausfuehrungs- und
-- Verifikationsvermerk von supabase/moods_description_backfill.sql
-- dokumentiert -- diese Datei ersetzt jenen Vermerk nicht, sondern
-- ergaenzt ihn um eine jederzeit wiederholbare Sollzustandspruefung.
--
-- Enthaelt ausschliesslich einen WITH ... VALUES-CTE und ein
-- kombiniertes SELECT. Kein BEGIN, kein COMMIT, kein INSERT, UPDATE,
-- DELETE, ALTER, CREATE, DROP, TRUNCATE, GRANT, REVOKE, keine RPC-
-- oder Funktionsaufrufe mit moeglicher Schreibwirkung.
--
-- Erwartetes Ergebnis bei aktuellem Sollzustand: genau 15 Zeilen --
-- 11 x report_section = 'target_mood' (alle mit exists_in_db = true,
-- name_matches = true, description_matches = true) und
-- 4 x report_section = 'active_without_description'
-- (brass-power, publikumsnaehe, tradition, vielseitig).
-- Sortierung: report_section, slug.
-- ============================================================

-- ============================================================
-- AUSFUEHRUNGS- UND VERIFIKATIONSVERMERK
--
-- Ausgefuehrt: 18.07.2026, durch Xandi im Supabase SQL Editor gegen
-- Production. Ausschliesslich read-only -- kein Lauf der eigentlichen
-- Migration, keine Datenbank-Writes.
--
-- Ergebnis: exakt 15 Zeilen, keine Abweichungen.
--
-- 11 Zeilen mit report_section = target_mood. Bei allen elf:
-- exists_in_db = true, name_matches = true, description_matches =
-- true, Status active. Gemeinsamer updated_at-Wert der elf Ziel-Moods:
-- 2026-07-17 21:58:21.633379+00.
--
-- 4 Zeilen mit report_section = active_without_description --
-- brass-power, publikumsnaehe, tradition, vielseitig. Status jeweils
-- active. Gemeinsamer unveraenderter updated_at-Wert dieser vier
-- Zeilen: 2026-06-08 21:23:20.978511+00. name_matches und
-- description_matches sind in dieser Sektion absichtlich NULL, da sie
-- dort keine Pruefwerte sind -- fuer diese Moods existiert keine
-- Ziel-Erwartung in der expected-Liste.
--
-- Die Query ist damit praktisch als wiederholbare Sollzustandspruefung
-- bestaetigt. Der gemeinsame Zeitstempel der elf Ziel-Moods ist
-- konsistent mit dem historischen Trigger-Nachweis im Ausfuehrungs-
-- und Verifikationsvermerk von supabase/moods_description_backfill.sql,
-- beweist fuer sich allein aber keinen vollstaendigen historischen
-- Transaktionsablauf.
-- ============================================================

with expected (slug, name, description) as (
  values
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
     'Bekannte Melodien, Refrains oder Interaktion laden das Publikum aktiv zum Mitsingen ein.')
),
target_mood_rows as (
  select
    'target_mood'::text as report_section,
    e.slug,
    e.name as expected_name,
    m.name as actual_name,
    (m.id is not null) as exists_in_db,
    coalesce(m.name = e.name, false) as name_matches,
    coalesce(m.description = e.description, false) as description_matches,
    m.status,
    m.updated_at
  from expected e
  left join public.moods m on m.slug = e.slug
),
active_without_description_rows as (
  select
    'active_without_description'::text as report_section,
    m.slug,
    null::text as expected_name,
    m.name as actual_name,
    true as exists_in_db,
    null::boolean as name_matches,
    null::boolean as description_matches,
    m.status,
    m.updated_at
  from public.moods m
  where m.status = 'active'
    and m.description is null
)
select * from target_mood_rows
union all
select * from active_without_description_rows
order by report_section, slug;
