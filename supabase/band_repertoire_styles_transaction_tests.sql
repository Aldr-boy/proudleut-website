-- ============================================================
-- band_repertoire_styles_transaction_tests.sql
--
-- KEIN normaler Production-Migrationsschritt. Vorbereitet fuer den
-- Production-Import "Musikalisch verortet". Bewusst NACH
-- fn_set_band_repertoire_styles.sql und VOR dem eigentlichen Datenimport
-- (musikalisch_verortet_import.sql) manuell im Supabase SQL Editor
-- auszufuehren, um die neue RPC gegen echte Production-Daten zu pruefen,
-- ohne dauerhaft etwas zu veraendern.
--
-- AUSGEFUEHRT: manuell durch Xandi im Supabase SQL Editor gegen
-- Production, 2026-07-24. Erfolgs-Sentinel erreicht:
--   ALLE TESTS BESTANDEN -- ERZWUNGENER ROLLBACK
-- Saemtliche Teständerungen wurden dadurch vollstaendig zurueckgerollt
-- (garantiert durch die einzige, nicht abgefangene Erfolgs-Exception am
-- Ende der DO-Anweisung, siehe unten). Alle Testfaelle bestanden, mit
-- einer dokumentierten Ausnahme: der Test fuer unzulaessigen Style-
-- Status (PR007) war mangels eines passenden nicht-aktiven
-- repertoire_style-Datensatzes in Production nicht ausfuehrbar -- es
-- wurde bewusst kein Testobjekt dafuer angelegt (siehe die bedingte
-- Testlogik weiter unten).
--
-- ARCHITEKTUR (v3 -- ersetzt die fruehere BEGIN/TEMP-TABLE/ROLLBACK-
-- Fassung vollstaendig):
-- Zwei vorherige Laeufe scheiterten mit "42P01: relation test_results
-- does not exist", zuletzt auch nach Entfernen von ON COMMIT DROP.
-- Bestaetigte Ursache: der Supabase SQL Editor gewaehrleistet fuer die
-- einzelnen Top-Level-Anweisungen eines mehrteiligen Skripts keine
-- durchgehend identische Datenbanksitzung -- eine TEMP TABLE (streng
-- sitzungsgebunden) kann daher zwischen CREATE, DO, INSERT und SELECT
-- verschwinden, unabhaengig von ON COMMIT DROP/PRESERVE ROWS.
--
-- Deshalb besteht dieses Skript jetzt aus GENAU EINER ausfuehrbaren
-- Top-Level-Anweisung:
--
--   DO $$ ... $$;
--
-- Keine TEMP TABLE, kein aeusseres BEGIN/ROLLBACK, keine mehrteilige
-- Struktur mehr -- damit unabhaengig von Sitzungs-/Verbindungswechseln
-- zwischen Anweisungen. Testergebnisse werden ausschliesslich in einer
-- lokalen PL/pgSQL-Variable (text[]) gesammelt, nicht in einer Tabelle.
--
-- Erfolgs-/Fehlschlag-Semantik:
--   - Jeder erwartete Negativfall wird ueber einen gezielten inneren
--     BEGIN ... EXCEPTION ... END-Block abgefangen (Punkt 5).
--   - Jede Abweichung vom erwarteten Ergebnis (egal ob ein erwarteter
--     Fehler ausblieb, der falsche Fehler auftrat, oder ein positiver
--     Test ein falsches Resultat lieferte) loest SOFORT eine eindeutige
--     RAISE EXCEPTION mit Testname, erwartetem und tatsaechlichem
--     Ergebnis aus -- unverschluckt, direkt sichtbar im SQL-Editor.
--   - Sind ALLE Tests bestanden, loest der DO-Block selbst am Ende
--     BEWUSST eine eigene, nicht abgefangene Exception aus:
--       SQLSTATE P0001
--       MESSAGE  'ALLE TESTS BESTANDEN -- ERZWUNGENER ROLLBACK'
--       DETAIL   kompakte Liste aller bestandenen Testnamen
--     Diese Exception ist verpflichtend: sie sorgt dafuer, dass jede
--     durch die RPC innerhalb dieser EINEN Anweisung vorgenommene
--     Aenderung vollstaendig zurueckgerollt wird -- unabhaengig von
--     Sitzungs-/Verbindungsverhalten des Editors, da alles innerhalb
--     der impliziten Transaktion dieser einen Anweisung liegt.
--
-- Erwartetes sichtbares Ergebnis im Supabase SQL Editor bei vollem
-- Erfolg ist daher ein FEHLER mit exakt diesem Sentinel:
--   ALLE TESTS BESTANDEN -- ERZWUNGENER ROLLBACK
-- Jeder andere Fehler (abweichender Text, abweichender SQLSTATE, ein
-- "TEST FEHLGESCHLAGEN: ..."-Text) bedeutet, dass mindestens ein Test
-- nicht bestanden ist.
--
-- Voraussetzung fuer einen aussagekraeftigen Lauf: mindestens 3 aktive
-- repertoire_styles-Katalogzeilen (nach der Katalogergaenzung aus
-- musikalisch_verortet_import.sql sind es deutlich mehr) sowie
-- mindestens 2 aktive Bands (Testband + Kontrollband -- bei 141 aktiven
-- Bands in Production immer erfuellt).
--
-- Abgedeckte Faelle: No-op, drei Eintraege in Reihenfolge, Rank-Tausch,
-- Delete-all/Empty State, doppelte IDs, unbekannte Style-ID, unbekannte
-- Band-ID, mehr als drei Eintraege, unzulaessiger Style-Status (nur wenn
-- ein vorhandener nicht-aktiver Datensatz existiert, sonst nachvollziehbar
-- als nicht ausfuehrbar dokumentiert -- kein Testobjekt wird dafuer
-- angelegt), andere Band bleibt unveraendert, sowie die Rechte-
-- Verifikation fuer anon/authenticated/service_role.
-- ============================================================

do $$
declare
  v_band_id             uuid;
  v_band_name           text;
  v_original_style_ids  uuid[];
  v_active_style_ids    uuid[];
  v_after_style_ids     uuid[];
  v_count_after         integer;
  v_unknown_band_id     uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_unknown_style_id    uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_inactive_style_id   uuid;
  v_control_band_id     uuid;
  v_control_band_name   text;
  v_control_original    uuid[];
  v_control_after       uuid[];
  v_rpc_error_code      text;
  v_rpc_error_msg       text;
  v_grant_count         integer;
  v_passed_tests        text[] := '{}';
  v_nonexistent_style_id uuid;
  v_too_many_style_ids   uuid[];
begin
  -- ---- Testband: bevorzugt slug 'donnaweda' (bekannt bereits geseedet,
  -- siehe supabase/add-repertoire-styles.sql), sonst irgendeine aktive
  -- Band mit >=1 bestehender repertoire_style-Zuordnung ----
  select b.id, b.name into v_band_id, v_band_name
  from public.bands b
  where b.slug = 'donnaweda' and b.status = 'active'
  limit 1;

  if v_band_id is null then
    select b.id, b.name into v_band_id, v_band_name
    from public.bands b
    where b.status = 'active'
      and (select count(*) from public.band_repertoire_styles brs where brs.band_id = b.id) >= 1
    order by b.name
    limit 1;
  end if;

  if v_band_id is null then
    raise exception 'TESTVORAUSSETZUNG FEHLT: weder Band mit slug=donnaweda noch eine andere aktive Band mit >=1 bestehender repertoire_style-Zuordnung gefunden';
  end if;

  -- ---- mindestens 3 aktive repertoire_styles fuer die Reihenfolge-/
  -- Duplikat-/>3-Tests noetig ----
  select array_agg(id order by sort_order, name) into v_active_style_ids
  from (select id, sort_order, name from public.repertoire_styles where status = 'active' order by sort_order, name limit 4) s;

  if coalesce(array_length(v_active_style_ids, 1), 0) < 3 then
    raise exception 'TESTVORAUSSETZUNG FEHLT: weniger als 3 aktive repertoire_styles im Katalog gefunden (% gefunden)', coalesce(array_length(v_active_style_ids, 1), 0);
  end if;

  -- ---- Ausgangszustand der Testband sichern ----
  select coalesce(array_agg(repertoire_style_id order by sort_order, repertoire_style_id), '{}'::uuid[]) into v_original_style_ids
  from public.band_repertoire_styles where band_id = v_band_id;

  v_passed_tests := array_append(v_passed_tests,
    format('Testband gewaehlt: %s (ursprl. Eintraege: %s)', v_band_name, array_length(v_original_style_ids, 1)));

  -- ---- Kontrollband waehlen: irgendeine andere aktive Band als die
  -- Testband, unabhaengig davon ob sie eigene repertoire_style-
  -- Zuordnungen hat -- dient dem Nachweis, dass kein RPC-Aufruf dieses
  -- Skripts jemals eine ANDERE Band als die explizit adressierte
  -- veraendert. ----
  select b.id, b.name into v_control_band_id, v_control_band_name
  from public.bands b
  where b.status = 'active' and b.id <> v_band_id
  order by b.name
  limit 1;

  if v_control_band_id is null then
    raise exception 'TESTVORAUSSETZUNG FEHLT: keine zweite aktive Band fuer den Kontrollband-Test gefunden';
  end if;

  select coalesce(array_agg(repertoire_style_id order by sort_order, repertoire_style_id), '{}'::uuid[]) into v_control_original
  from public.band_repertoire_styles where band_id = v_control_band_id;

  v_passed_tests := array_append(v_passed_tests,
    format('Kontrollband gewaehlt: %s (ursprl. Eintraege: %s)', v_control_band_name, array_length(v_control_original, 1)));

  -- ================================================================
  -- Test: No-op Zielzustand aendert nichts
  -- ================================================================
  v_rpc_error_msg := null;
  begin
    perform public.set_band_repertoire_styles(v_band_id, v_original_style_ids);
  exception when others then
    v_rpc_error_msg := sqlstate || ' / ' || sqlerrm;
  end;
  if v_rpc_error_msg is not null then
    raise exception 'TEST FEHLGESCHLAGEN: No-op Zielzustand aendert nichts | erwartet: kein Fehler | tatsaechlich: %', v_rpc_error_msg;
  end if;
  select coalesce(array_agg(repertoire_style_id order by sort_order, repertoire_style_id), '{}'::uuid[]) into v_after_style_ids
  from public.band_repertoire_styles where band_id = v_band_id;
  if v_after_style_ids is distinct from v_original_style_ids then
    raise exception 'TEST FEHLGESCHLAGEN: No-op Zielzustand aendert nichts | erwartet: % | tatsaechlich: %', v_original_style_ids::text, v_after_style_ids::text;
  end if;
  v_passed_tests := array_append(v_passed_tests, 'No-op Zielzustand aendert nichts');

  -- ================================================================
  -- Test: drei Eintraege in lueckenloser Reihenfolge
  -- ================================================================
  v_rpc_error_msg := null;
  begin
    perform public.set_band_repertoire_styles(v_band_id, array[v_active_style_ids[1], v_active_style_ids[2], v_active_style_ids[3]]);
  exception when others then
    v_rpc_error_msg := sqlstate || ' / ' || sqlerrm;
  end;
  if v_rpc_error_msg is not null then
    raise exception 'TEST FEHLGESCHLAGEN: Lueckenlose sort_order 1,2,3 nach 3 Eintraegen | erwartet: kein Fehler | tatsaechlich: %', v_rpc_error_msg;
  end if;
  if not (
    exists (select 1 from public.band_repertoire_styles where band_id = v_band_id and repertoire_style_id = v_active_style_ids[1] and sort_order = 1)
    and exists (select 1 from public.band_repertoire_styles where band_id = v_band_id and repertoire_style_id = v_active_style_ids[2] and sort_order = 2)
    and exists (select 1 from public.band_repertoire_styles where band_id = v_band_id and repertoire_style_id = v_active_style_ids[3] and sort_order = 3)
    and (select count(*) from public.band_repertoire_styles where band_id = v_band_id) = 3
  ) then
    raise exception 'TEST FEHLGESCHLAGEN: Lueckenlose sort_order 1,2,3 nach 3 Eintraegen | erwartet: sort_order exakt 1,2,3 in Array-Reihenfolge, keine weiteren Zeilen | tatsaechlich: Abweichung festgestellt';
  end if;
  v_passed_tests := array_append(v_passed_tests, 'Lueckenlose sort_order 1,2,3 nach 3 Eintraegen');

  -- ================================================================
  -- Test: Rank-Tausch 1<->2 (kollisionsfrei, kein Unique-Index auf sort_order)
  -- ================================================================
  v_rpc_error_msg := null;
  begin
    perform public.set_band_repertoire_styles(v_band_id, array[v_active_style_ids[2], v_active_style_ids[1], v_active_style_ids[3]]);
  exception when others then
    v_rpc_error_msg := sqlstate || ' / ' || sqlerrm;
  end;
  if v_rpc_error_msg is not null then
    raise exception 'TEST FEHLGESCHLAGEN: Rank-Tausch 1<->2 kollisionsfrei | erwartet: kein Fehler | tatsaechlich: %', v_rpc_error_msg;
  end if;
  if not (
    exists (select 1 from public.band_repertoire_styles where band_id = v_band_id and repertoire_style_id = v_active_style_ids[2] and sort_order = 1)
    and exists (select 1 from public.band_repertoire_styles where band_id = v_band_id and repertoire_style_id = v_active_style_ids[1] and sort_order = 2)
    and exists (select 1 from public.band_repertoire_styles where band_id = v_band_id and repertoire_style_id = v_active_style_ids[3] and sort_order = 3)
  ) then
    raise exception 'TEST FEHLGESCHLAGEN: Rank-Tausch 1<->2 kollisionsfrei | erwartet: neue Reihenfolge exakt uebernommen | tatsaechlich: Abweichung festgestellt';
  end if;
  v_passed_tests := array_append(v_passed_tests, 'Rank-Tausch 1<->2 kollisionsfrei');

  -- Wiederherstellen vor dem naechsten Test
  perform public.set_band_repertoire_styles(v_band_id, v_original_style_ids);

  -- ================================================================
  -- Test: leeres Array entfernt alle Zuordnungen (Empty State)
  -- ================================================================
  v_rpc_error_msg := null;
  begin
    perform public.set_band_repertoire_styles(v_band_id, '{}'::uuid[]);
  exception when others then
    v_rpc_error_msg := sqlstate || ' / ' || sqlerrm;
  end;
  if v_rpc_error_msg is not null then
    raise exception 'TEST FEHLGESCHLAGEN: Leeres Array entfernt alle Zuordnungen (Empty State) | erwartet: kein Fehler | tatsaechlich: %', v_rpc_error_msg;
  end if;
  select count(*) into v_count_after from public.band_repertoire_styles where band_id = v_band_id;
  if v_count_after <> 0 then
    raise exception 'TEST FEHLGESCHLAGEN: Leeres Array entfernt alle Zuordnungen (Empty State) | erwartet: 0 verbleibende Zeilen | tatsaechlich: % verbleibende Zeile(n)', v_count_after;
  end if;
  v_passed_tests := array_append(v_passed_tests, 'Leeres Array entfernt alle Zuordnungen (Empty State)');

  -- Wiederherstellen vor dem naechsten Test
  perform public.set_band_repertoire_styles(v_band_id, v_original_style_ids);

  -- ================================================================
  -- Test: Duplikat wird abgelehnt (PR005)
  -- ================================================================
  v_rpc_error_code := null; v_rpc_error_msg := null;
  begin
    perform public.set_band_repertoire_styles(v_band_id, array[v_active_style_ids[1], v_active_style_ids[1]]);
  exception when others then
    v_rpc_error_code := sqlstate; v_rpc_error_msg := sqlerrm;
  end;
  if v_rpc_error_code is null then
    raise exception 'TEST FEHLGESCHLAGEN: Duplikat wird abgelehnt | erwartet: PR005 / repertoire_duplicate | tatsaechlich: KEIN FEHLER AUSGELOEST';
  elsif v_rpc_error_code <> 'PR005' then
    raise exception 'TEST FEHLGESCHLAGEN: Duplikat wird abgelehnt | erwartet: PR005 / repertoire_duplicate | tatsaechlich: % / %', v_rpc_error_code, v_rpc_error_msg;
  end if;
  v_passed_tests := array_append(v_passed_tests, 'Duplikat wird abgelehnt (PR005)');

  -- ================================================================
  -- Test: mehr als 3 Eintraege wird abgelehnt (PR003)
  --
  -- Prueft ausschliesslich, dass der Mengenguard (v_target_count > 3)
  -- in fn_set_band_repertoire_styles.sql VOR jeder Katalogvalidierung
  -- und vor jedem DML-Schritt greift. Die 4. ID muss daher NICHT im
  -- Katalog existieren -- waere PR006 (repertoire_style_not_found) statt
  -- PR003 die Folge, bewiese das im Gegenteil eine falsche Pruefreihen-
  -- folge in der RPC (Katalogvalidierung faelschlich vor dem
  -- Mengenguard). Production hat aktuell nur 3 aktive repertoire_styles-
  -- Katalogzeilen (Stand vor dem eigentlichen Datenimport) -- daher wird
  -- hier statt eines 4. echten Katalogeintrags eine garantiert nicht
  -- existierende, garantiert von den 3 vorhandenen IDs verschiedene
  -- UUID erzeugt. Kein Katalogeintrag wird dafuer angelegt.
  -- ================================================================
  if cardinality(v_active_style_ids) <> 3 then
    raise exception 'TESTVORAUSSETZUNG GEAENDERT: erwartet genau 3 aktive repertoire_styles in v_active_style_ids, tatsaechlich %', cardinality(v_active_style_ids);
  end if;

  v_nonexistent_style_id := gen_random_uuid();
  while exists (select 1 from public.repertoire_styles where id = v_nonexistent_style_id)
     or v_nonexistent_style_id = any (v_active_style_ids)
  loop
    v_nonexistent_style_id := gen_random_uuid();
  end loop;

  v_too_many_style_ids := array_append(v_active_style_ids, v_nonexistent_style_id);

  if cardinality(v_too_many_style_ids) <> 4 then
    raise exception 'TESTVORAUSSETZUNG GEAENDERT: erwartet cardinality 4 fuer v_too_many_style_ids, tatsaechlich %', cardinality(v_too_many_style_ids);
  end if;
  if (select count(distinct x) from unnest(v_too_many_style_ids) as x) <> 4 then
    raise exception 'TESTVORAUSSETZUNG GEAENDERT: v_too_many_style_ids enthaelt nicht 4 paarweise unterschiedliche IDs';
  end if;
  if not (
    exists (select 1 from public.repertoire_styles where id = v_too_many_style_ids[1] and status = 'active')
    and exists (select 1 from public.repertoire_styles where id = v_too_many_style_ids[2] and status = 'active')
    and exists (select 1 from public.repertoire_styles where id = v_too_many_style_ids[3] and status = 'active')
  ) then
    raise exception 'TESTVORAUSSETZUNG GEAENDERT: die ersten drei Test-IDs sind nicht (mehr) allesamt vorhandene aktive Katalogeintraege';
  end if;
  if exists (select 1 from public.repertoire_styles where id = v_too_many_style_ids[4]) then
    raise exception 'TESTVORAUSSETZUNG GEAENDERT: die 4. Test-ID existiert entgegen der Erwartung im Katalog';
  end if;

  v_rpc_error_code := null; v_rpc_error_msg := null;
  begin
    perform public.set_band_repertoire_styles(v_band_id, v_too_many_style_ids);
  exception when others then
    v_rpc_error_code := sqlstate; v_rpc_error_msg := sqlerrm;
  end;
  if v_rpc_error_code is null then
    raise exception 'TEST FEHLGESCHLAGEN: Mehr als 3 Eintraege wird abgelehnt | erwartet: PR003 / repertoire_too_many | tatsaechlich: KEIN FEHLER AUSGELOEST';
  elsif v_rpc_error_code <> 'PR003' then
    raise exception 'TEST FEHLGESCHLAGEN: Mehr als 3 Eintraege wird abgelehnt | erwartet: PR003 / repertoire_too_many | tatsaechlich: % / % (PR006 haette insbesondere eine falsche Pruefreihenfolge in der RPC bedeutet)', v_rpc_error_code, v_rpc_error_msg;
  end if;
  v_passed_tests := array_append(v_passed_tests, 'Mehr als 3 Eintraege wird abgelehnt (PR003, 4. ID bewusst nicht im Katalog vorhanden)');

  -- ================================================================
  -- Test: unbekannte repertoire_style-ID wird abgelehnt (PR006)
  -- ================================================================
  v_rpc_error_code := null; v_rpc_error_msg := null;
  begin
    perform public.set_band_repertoire_styles(v_band_id, array[v_active_style_ids[1], v_unknown_style_id]);
  exception when others then
    v_rpc_error_code := sqlstate; v_rpc_error_msg := sqlerrm;
  end;
  if v_rpc_error_code is null then
    raise exception 'TEST FEHLGESCHLAGEN: Unbekannte repertoire_style-ID wird abgelehnt | erwartet: PR006 / repertoire_style_not_found | tatsaechlich: KEIN FEHLER AUSGELOEST';
  elsif v_rpc_error_code <> 'PR006' then
    raise exception 'TEST FEHLGESCHLAGEN: Unbekannte repertoire_style-ID wird abgelehnt | erwartet: PR006 / repertoire_style_not_found | tatsaechlich: % / %', v_rpc_error_code, v_rpc_error_msg;
  end if;
  v_passed_tests := array_append(v_passed_tests, 'Unbekannte repertoire_style-ID wird abgelehnt (PR006)');

  -- ================================================================
  -- Test: unbekannte Band-ID wird abgelehnt (PR001)
  -- ================================================================
  v_rpc_error_code := null; v_rpc_error_msg := null;
  begin
    perform public.set_band_repertoire_styles(v_unknown_band_id, array[v_active_style_ids[1]]);
  exception when others then
    v_rpc_error_code := sqlstate; v_rpc_error_msg := sqlerrm;
  end;
  if v_rpc_error_code is null then
    raise exception 'TEST FEHLGESCHLAGEN: Unbekannte Band-ID wird abgelehnt | erwartet: PR001 / repertoire_band_not_found | tatsaechlich: KEIN FEHLER AUSGELOEST';
  elsif v_rpc_error_code <> 'PR001' then
    raise exception 'TEST FEHLGESCHLAGEN: Unbekannte Band-ID wird abgelehnt | erwartet: PR001 / repertoire_band_not_found | tatsaechlich: % / %', v_rpc_error_code, v_rpc_error_msg;
  end if;
  v_passed_tests := array_append(v_passed_tests, 'Unbekannte Band-ID wird abgelehnt (PR001)');

  -- ================================================================
  -- Test: unzulaessiger Style-Status wird abgelehnt (PR007) -- nur
  -- ausfuehren, wenn ein bereits vorhandener nicht-aktiver
  -- repertoire_style-Datensatz existiert. Kein neues Katalogobjekt wird
  -- fuer diesen Test angelegt.
  -- ================================================================
  select id into v_inactive_style_id
  from public.repertoire_styles
  where status <> 'active'
  order by id
  limit 1;

  if v_inactive_style_id is null then
    v_passed_tests := array_append(v_passed_tests,
      'Unzulaessiger Style-Status wird abgelehnt (PR007): NICHT AUSFUEHRBAR -- kein nicht-aktiver repertoire_style-Datensatz vorhanden, bewusst kein Testobjekt angelegt');
  else
    v_rpc_error_code := null; v_rpc_error_msg := null;
    begin
      perform public.set_band_repertoire_styles(v_band_id, array[v_active_style_ids[1], v_inactive_style_id]);
    exception when others then
      v_rpc_error_code := sqlstate; v_rpc_error_msg := sqlerrm;
    end;
    if v_rpc_error_code is null then
      raise exception 'TEST FEHLGESCHLAGEN: Unzulaessiger Style-Status wird abgelehnt | erwartet: PR007 / repertoire_style_not_active | tatsaechlich: KEIN FEHLER AUSGELOEST';
    elsif v_rpc_error_code <> 'PR007' then
      raise exception 'TEST FEHLGESCHLAGEN: Unzulaessiger Style-Status wird abgelehnt | erwartet: PR007 / repertoire_style_not_active | tatsaechlich: % / %', v_rpc_error_code, v_rpc_error_msg;
    end if;
    v_passed_tests := array_append(v_passed_tests, 'Unzulaessiger Style-Status wird abgelehnt (PR007)');
  end if;

  -- ================================================================
  -- Abschlusscheck: Ausgangszustand der Testband nach allen
  -- abgefangenen Negativtests weiterhin exakt wie zu Beginn
  -- ================================================================
  select coalesce(array_agg(repertoire_style_id order by sort_order, repertoire_style_id), '{}'::uuid[]) into v_after_style_ids
  from public.band_repertoire_styles where band_id = v_band_id;
  if v_after_style_ids is distinct from v_original_style_ids then
    raise exception 'TEST FEHLGESCHLAGEN: Ausgangszustand nach allen Negativtests unveraendert | erwartet: % | tatsaechlich: %', v_original_style_ids::text, v_after_style_ids::text;
  end if;
  v_passed_tests := array_append(v_passed_tests, 'Ausgangszustand nach allen Negativtests unveraendert');

  -- ================================================================
  -- Abschlusscheck: Kontrollband nach ALLEN Testoperationen weiterhin
  -- exakt unveraendert -- Nachweis, dass die RPC ausschliesslich die
  -- explizit adressierte Band schreibt.
  -- ================================================================
  select coalesce(array_agg(repertoire_style_id order by sort_order, repertoire_style_id), '{}'::uuid[]) into v_control_after
  from public.band_repertoire_styles where band_id = v_control_band_id;
  if v_control_after is distinct from v_control_original then
    raise exception 'TEST FEHLGESCHLAGEN: Kontrollband nach allen Testoperationen unveraendert | erwartet: % | tatsaechlich: %', v_control_original::text, v_control_after::text;
  end if;
  v_passed_tests := array_append(v_passed_tests, 'Kontrollband nach allen Testoperationen unveraendert');

  -- ================================================================
  -- Rechte-Verifikation: anon/authenticated duerfen die RPC nicht
  -- ausfuehren, service_role muss sie ausfuehren duerfen (rein
  -- deklarative Pruefung gegen information_schema).
  -- ================================================================
  select count(*) into v_grant_count
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name = 'set_band_repertoire_styles'
    and grantee in ('anon', 'authenticated');
  if v_grant_count <> 0 then
    raise exception 'TEST FEHLGESCHLAGEN: Keine EXECUTE-Rechte fuer anon/authenticated | erwartet: 0 Grants | tatsaechlich: % Grant(s)', v_grant_count;
  end if;
  v_passed_tests := array_append(v_passed_tests, 'Keine EXECUTE-Rechte fuer anon/authenticated auf set_band_repertoire_styles');

  select count(*) into v_grant_count
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name = 'set_band_repertoire_styles'
    and grantee = 'service_role';
  if v_grant_count < 1 then
    raise exception 'TEST FEHLGESCHLAGEN: service_role hat EXECUTE auf set_band_repertoire_styles | erwartet: >=1 Grant | tatsaechlich: % Grant(s)', v_grant_count;
  end if;
  v_passed_tests := array_append(v_passed_tests, 'service_role hat EXECUTE auf set_band_repertoire_styles');

  -- ================================================================
  -- ALLE TESTS BESTANDEN: erzwungene, nicht abgefangene Exception --
  -- rollt saemtliche RPC-Aenderungen dieser einen Anweisung zurueck
  -- und macht den Erfolg im SQL-Editor eindeutig sichtbar.
  -- ================================================================
  raise exception using
    errcode = 'P0001',
    message = 'ALLE TESTS BESTANDEN -- ERZWUNGENER ROLLBACK',
    detail = array_to_string(v_passed_tests, E'\n');
end;
$$;
