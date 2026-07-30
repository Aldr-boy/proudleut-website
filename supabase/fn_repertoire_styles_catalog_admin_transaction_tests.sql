-- ============================================================
-- fn_repertoire_styles_catalog_admin_transaction_tests.sql
--
-- KEIN normaler Production-Migrationsschritt. Bewusst NACH
-- fn_repertoire_styles_catalog_admin.sql und VOR dem Go-Live im Supabase
-- SQL Editor auszufuehren, um die neue Namens-Eindeutigkeitspruefung
-- (Codex-P1, RC006 repertoire_style_name_conflict) gegen echte
-- Production-Funktionen zu pruefen, ohne irgendetwas dauerhaft zu
-- veraendern.
--
-- Voraussetzung: fn_repertoire_styles_catalog_admin.sql ist bereits
-- erfolgreich ausgefuehrt.
--
-- Vollstaendig gekapselt in BEGIN ... ROLLBACK, identisches Muster wie
-- supabase/admin_moods_management_transaction_tests.sql. Testdaten
-- verwenden einen eindeutigen "ZZZ Transaction Test"-Namens-/Slug-Praefix
-- statt hart codierter UUIDs; bei bereits vorhandenem Test-Slug bricht
-- das Skript kontrolliert ab, statt bestehende Daten zu ueberschreiben.
--
-- Ergebnis: eine Ergebnistabelle (test_name, expected, actual, passed).
-- Ein insgesamt erfolgreicher Lauf ist nur moeglich, wenn ALLE Zeilen
-- passed = true zeigen -- inklusive der Negativtests, bei denen "passed"
-- bedeutet: der erwartete Fehler (RC006) wurde tatsaechlich ausgeloest.
--
-- WICHTIG: Nach der letzten SELECT-Anweisung steht bewusst ROLLBACK,
-- nicht COMMIT. Dieses Skript darf niemals mit COMMIT abgeschlossen
-- werden.
-- ============================================================

begin;

create temp table test_results (
  seq       serial,
  phase     text,
  test_name text,
  expected  text,
  actual    text,
  passed    boolean
) on commit drop;

do $repertoire_catalog_name_conflict_tests$
declare
  v_test_name_a text := 'ZZZ Transaction Test Repertoire Stil A';
  v_test_slug_a text := 'zzz-transaction-test-repertoire-stil-a';
  v_test_name_b text := 'ZZZ Transaction Test Repertoire Stil B';
  v_test_slug_b text := 'zzz-transaction-test-repertoire-stil-b';
  v_test_slug_c text := 'zzz-transaction-test-repertoire-stil-c';
  v_style_a           public.repertoire_styles%rowtype;
  v_style_b           public.repertoire_styles%rowtype;
  v_style_c           public.repertoire_styles%rowtype;
  v_style_b_unchanged public.repertoire_styles%rowtype;
  v_style_b_after     public.repertoire_styles%rowtype;
  v_assignments_before jsonb;
  v_assignments_after  jsonb;
begin
  if exists (select 1 from public.repertoire_styles where slug in (v_test_slug_a, v_test_slug_b, v_test_slug_c)) then
    raise exception 'Testvoraussetzung verletzt: mindestens einer der Test-Slugs existiert bereits im Katalog -- Transaction-Tests abgebrochen, bitte pruefen statt ueberschreiben.';
  end if;

  -- ---- Setup: zwei aktive Test-Stile A und B anlegen ----
  begin
    v_style_a := public.create_repertoire_style(v_test_name_a, v_test_slug_a, 'Testbeschreibung A, wird zurueckgerollt.');
    v_style_b := public.create_repertoire_style(v_test_name_b, v_test_slug_b, 'Testbeschreibung B, wird zurueckgerollt.');
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'name_conflict', 'Setup: zwei aktive Test-Stile A und B angelegt',
      'A=active, B=active', 'A=' || v_style_a.status || ', B=' || v_style_b.status,
      v_style_a.status = 'active' and v_style_b.status = 'active'
    );
  exception when others then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'name_conflict', 'Setup: zwei aktive Test-Stile A und B angelegt', 'Erfolg', 'FEHLER: ' || sqlstate || ' / ' || sqlerrm, false
    );
  end;

  if v_style_a.id is null or v_style_b.id is null then
    raise exception 'Setup fehlgeschlagen -- restliche Namens-Konflikt-Tests werden uebersprungen, siehe vorherige Ergebniszeile.';
  end if;

  -- ---- Vor-Zustand von band_repertoire_styles sichern (muss nach den
  -- folgenden Tests exakt unveraendert bleiben -- die neuen Testzeilen
  -- selbst haben ohnehin keine Bandzuordnung). ----
  select coalesce(jsonb_agg(to_jsonb(t) order by band_id, repertoire_style_id), '[]'::jsonb)
    into v_assignments_before
  from public.band_repertoire_styles t;

  -- ---- Test: B auf den exakten Namen von A umbenennen wird abgelehnt (RC006) ----
  begin
    perform public.update_repertoire_style(v_style_b.id, v_test_name_a, 'Sollte wegen Namenskollision abgelehnt werden.');
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'name_conflict', 'update_repertoire_style: Umbenennung von B auf den Namen von A wird abgelehnt',
      'RC006 / repertoire_style_name_conflict', 'KEIN FEHLER AUSGELOEST', false
    );
  exception when others then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'name_conflict', 'update_repertoire_style: Umbenennung von B auf den Namen von A wird abgelehnt',
      'RC006 / repertoire_style_name_conflict', sqlstate || ' / ' || sqlerrm, sqlstate = 'RC006'
    );
  end;

  -- ---- Test: B behaelt Name und Slug nach der abgelehnten Umbenennung ----
  select * into v_style_b_unchanged from public.repertoire_styles where id = v_style_b.id;
  insert into test_results (phase, test_name, expected, actual, passed) values (
    'name_conflict', 'B behaelt Name und Slug nach abgelehnter Umbenennung',
    'name=' || v_test_name_b || ', slug=' || v_test_slug_b,
    'name=' || v_style_b_unchanged.name || ', slug=' || v_style_b_unchanged.slug,
    v_style_b_unchanged.name = v_test_name_b and v_style_b_unchanged.slug = v_test_slug_b
  );

  -- ---- Test: band_repertoire_styles unveraendert nach der abgelehnten Umbenennung ----
  select coalesce(jsonb_agg(to_jsonb(t) order by band_id, repertoire_style_id), '[]'::jsonb)
    into v_assignments_after
  from public.band_repertoire_styles t;
  insert into test_results (phase, test_name, expected, actual, passed) values (
    'name_conflict', 'band_repertoire_styles unveraendert nach abgelehnter Umbenennung',
    'unveraendert', case when v_assignments_after = v_assignments_before then 'unveraendert' else 'GEAENDERT' end,
    v_assignments_after = v_assignments_before
  );

  -- ---- Test: B unter seinem eigenen, unveraenderten Namen speichern bleibt erlaubt ----
  begin
    v_style_b_after := public.update_repertoire_style(v_style_b.id, v_test_name_b, 'Aktualisierte Testbeschreibung B, weiterhin derselbe Name.');
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'name_conflict', 'update_repertoire_style: Speichern unter eigenem unveraendertem Namen bleibt erlaubt',
      'name=' || v_test_name_b, 'name=' || v_style_b_after.name, v_style_b_after.name = v_test_name_b
    );
  exception when others then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'name_conflict', 'update_repertoire_style: Speichern unter eigenem unveraendertem Namen bleibt erlaubt',
      'Erfolg', 'FEHLER: ' || sqlstate || ' / ' || sqlerrm, false
    );
  end;

  -- ---- Test (DoD Punkt 4): create_repertoire_style lehnt einen neuen
  -- Stil mit dem Namen eines bestehenden aktiven Stils ab (RC006), auch
  -- bei komplett neuem, kollisionsfreiem Slug. ----
  begin
    perform public.create_repertoire_style(v_test_name_a, v_test_slug_c, 'Sollte wegen Namenskollision mit A abgelehnt werden.');
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'name_conflict', 'create_repertoire_style: neuer Stil mit Namen von A (anderer Slug) wird abgelehnt',
      'RC006 / repertoire_style_name_conflict', 'KEIN FEHLER AUSGELOEST', false
    );
  exception when others then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'name_conflict', 'create_repertoire_style: neuer Stil mit Namen von A (anderer Slug) wird abgelehnt',
      'RC006 / repertoire_style_name_conflict', sqlstate || ' / ' || sqlerrm, sqlstate = 'RC006'
    );
  end;

  -- ---- Test (DoD Punkt 4): reactivate_repertoire_style lehnt eine
  -- Reaktivierung ab, wenn inzwischen ein anderer aktiver Stil denselben
  -- Namen traegt. Ablauf: A archivieren (keine Zuordnung vorhanden, muss
  -- gelingen) -> waehrenddessen ist der Name von A frei -> Stil C mit
  -- genau A's Namen anlegen (muss jetzt gelingen, da A nicht mehr aktiv
  -- ist) -> A reaktivieren (muss an RC006 scheitern, da C den Namen
  -- inzwischen aktiv traegt). ----
  begin
    perform public.archive_repertoire_style(v_style_a.id);
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'name_conflict', 'Setup: A archivieren (Vorbereitung fuer reactivate-Test)', 'Erfolg', 'Erfolg', true
    );
  exception when others then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'name_conflict', 'Setup: A archivieren (Vorbereitung fuer reactivate-Test)', 'Erfolg', 'FEHLER: ' || sqlstate || ' / ' || sqlerrm, false
    );
  end;

  begin
    v_style_c := public.create_repertoire_style(v_test_name_a, v_test_slug_c, 'Stil C, uebernimmt den Namen von A waehrend A archiviert ist.');
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'name_conflict', 'Setup: C mit dem (jetzt archivierten) Namen von A anlegen -- erlaubt',
      'name=' || v_test_name_a || ', status=active', 'name=' || v_style_c.name || ', status=' || v_style_c.status,
      v_style_c.name = v_test_name_a and v_style_c.status = 'active'
    );
  exception when others then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'name_conflict', 'Setup: C mit dem (jetzt archivierten) Namen von A anlegen -- erlaubt', 'Erfolg', 'FEHLER: ' || sqlstate || ' / ' || sqlerrm, false
    );
  end;

  begin
    perform public.reactivate_repertoire_style(v_style_a.id);
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'name_conflict', 'reactivate_repertoire_style: Reaktivierung von A wird abgelehnt (C traegt denselben Namen bereits aktiv)',
      'RC006 / repertoire_style_name_conflict', 'KEIN FEHLER AUSGELOEST', false
    );
  exception when others then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'name_conflict', 'reactivate_repertoire_style: Reaktivierung von A wird abgelehnt (C traegt denselben Namen bereits aktiv)',
      'RC006 / repertoire_style_name_conflict', sqlstate || ' / ' || sqlerrm, sqlstate = 'RC006'
    );
  end;
end;
$repertoire_catalog_name_conflict_tests$;

select * from test_results order by seq;

rollback;
