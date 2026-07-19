-- ============================================================
-- admin_moods_management_transaction_tests.sql
--
-- KEIN normaler Production-Migrationsschritt. Bewusst NACH den vier
-- Setup-Dateien und VOR dem Go-Live im Supabase SQL Editor auszufuehren,
-- um die neuen RPCs gegen echte Production-Daten zu pruefen, ohne
-- irgendetwas dauerhaft zu veraendern.
--
-- Voraussetzung: die vier Setup-Dateien sind bereits erfolgreich
-- ausgefuehrt (fn_set_band_moods.sql, band_moods_admin_write_lockdown.sql,
-- fn_moods_catalog_admin.sql, moods_admin_write_lockdown.sql) UND
-- admin_moods_management_verify.sql zeigt ausschliesslich match = true.
--
-- Vollstaendig gekapselt in BEGIN ... ROLLBACK. Testdaten werden
-- ausschliesslich ueber Slug (Band) bzw. echte Katalogzeilen (Moods)
-- geladen, keine hart codierten UUIDs. Bei fehlenden Voraussetzungen
-- bricht das Script mit einer klaren Fehlermeldung ab (RAISE EXCEPTION),
-- statt gegen beliebige/unpassende Datensaetze zu arbeiten.
--
-- Ergebnis: eine Ergebnistabelle (test_name, expected, actual, passed).
-- Ein insgesamt erfolgreicher Lauf ist nur moeglich, wenn ALLE Zeilen
-- passed = true zeigen -- inklusive der Negativtests, bei denen "passed"
-- bedeutet: der erwartete Fehler wurde tatsaechlich ausgeloest.
--
-- WICHTIG: Nach der letzten SELECT-Anweisung steht bewusst ROLLBACK,
-- nicht COMMIT. Dieses Skript darf niemals mit COMMIT abgeschlossen
-- werden.
-- ============================================================

begin;

create temp table test_results (
  seq         serial,
  phase       text,
  test_name   text,
  expected    text,
  actual      text,
  passed      boolean
) on commit drop;

-- ============================================================
-- PHASE 1: public.set_band_moods
-- ============================================================
do $band_moods_tests$
declare
  v_band_id            uuid;
  v_band_name          text;
  v_original_mood_ids  uuid[];
  v_active_mood_ids    uuid[];
  v_inactive_mood_id   uuid;
  v_after_mood_ids     uuid[];
  v_count_after        integer;
  v_gapless_ok         boolean;
  v_unknown_mood_id    uuid := '00000000-0000-0000-0000-000000000000'::uuid;
begin
  -- ---- Testband waehlen: bevorzugt slug 'donnaweda' (bekannt sauberer
  -- sort_order, siehe Completion Report Paket 1), sonst irgendeine
  -- aktive/veroeffentlichte Band mit mindestens 2 bestehenden
  -- Mood-Zuordnungen. Keine hart codierte UUID.
  select b.id, b.name into v_band_id, v_band_name
  from public.bands b
  where b.slug = 'donnaweda' and b.status = 'active' and b.is_published = true
  limit 1;

  if v_band_id is null then
    select b.id, b.name into v_band_id, v_band_name
    from public.bands b
    where b.status = 'active' and b.is_published = true
      and (select count(*) from public.band_moods bm where bm.band_id = b.id) >= 2
    order by b.name
    limit 1;
  end if;

  if v_band_id is null then
    raise exception 'Testvoraussetzung fehlt: weder Band mit slug=donnaweda noch eine andere aktive/veroeffentlichte Band mit >=2 bestehenden Mood-Zuordnungen gefunden -- Transaction-Tests (Phase 1) abgebrochen.';
  end if;

  -- ---- mindestens 5 aktive Moods fuer Duplikat-/>4-Tests noetig ----
  select array_agg(id order by sort_order, name) into v_active_mood_ids
  from (select id, sort_order, name from public.moods where status = 'active' order by sort_order, name limit 5) s;

  if coalesce(array_length(v_active_mood_ids, 1), 0) < 5 then
    raise exception 'Testvoraussetzung fehlt: weniger als 5 aktive Moods im Katalog gefunden (%), Transaction-Tests (Phase 1) abgebrochen.', coalesce(array_length(v_active_mood_ids, 1), 0);
  end if;

  -- ---- mindestens 1 archivierter Mood fuer den Inaktiv-Test noetig ----
  select id into v_inactive_mood_id from public.moods where status = 'archived' order by name limit 1;

  if v_inactive_mood_id is null then
    raise exception 'Testvoraussetzung fehlt: kein archivierter Mood im Katalog gefunden, Transaction-Tests (Phase 1) abgebrochen.';
  end if;

  -- ---- Ausgangszustand der Testband sichern (fuer Wiederherstellung nach jedem mutierenden Test) ----
  select coalesce(array_agg(mood_id order by sort_order, mood_id), '{}'::uuid[]) into v_original_mood_ids
  from public.band_moods where band_id = v_band_id;

  insert into test_results (phase, test_name, expected, actual, passed) values (
    'set_band_moods', 'Testband gewaehlt', 'Band mit slug=donnaweda oder Fallback-Kriterium',
    v_band_name || ' (ursprl. Moods: ' || array_length(v_original_mood_ids, 1)::text || ')', true
  );

  -- ---- Test: No-op Zielzustand (Ausgangszustand unveraendert schreiben) ----
  begin
    perform public.set_band_moods(v_band_id, v_original_mood_ids);
    select coalesce(array_agg(mood_id order by sort_order, mood_id), '{}'::uuid[]) into v_after_mood_ids
    from public.band_moods where band_id = v_band_id;
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'set_band_moods', 'No-op Zielzustand aendert nichts',
      v_original_mood_ids::text, v_after_mood_ids::text, v_after_mood_ids = v_original_mood_ids
    );
  exception when others then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'set_band_moods', 'No-op Zielzustand aendert nichts', 'kein Fehler', 'FEHLER: ' || sqlstate || ' / ' || sqlerrm, false
    );
  end;

  -- ---- Test: korrekte lueckenlose Reihenfolge bei 3 Eintraegen ----
  begin
    perform public.set_band_moods(v_band_id, array[v_active_mood_ids[1], v_active_mood_ids[2], v_active_mood_ids[3]]);
    select
      exists (select 1 from public.band_moods where band_id = v_band_id and mood_id = v_active_mood_ids[1] and sort_order = 1)
      and exists (select 1 from public.band_moods where band_id = v_band_id and mood_id = v_active_mood_ids[2] and sort_order = 2)
      and exists (select 1 from public.band_moods where band_id = v_band_id and mood_id = v_active_mood_ids[3] and sort_order = 3)
      and (select count(*) from public.band_moods where band_id = v_band_id) = 3
    into v_gapless_ok;
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'set_band_moods', 'Lueckenlose sort_order 1,2,3 nach 3 Eintraegen',
      'sort_order exakt 1,2,3 in Array-Reihenfolge, keine weiteren Zeilen',
      case when v_gapless_ok then 'sort_order exakt wie erwartet' else 'Abweichung festgestellt' end,
      coalesce(v_gapless_ok, false)
    );
    -- Wiederherstellen vor dem naechsten Test
    perform public.set_band_moods(v_band_id, v_original_mood_ids);
  exception when others then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'set_band_moods', 'Lueckenlose sort_order 1,2,3 nach 3 Eintraegen', 'kein Fehler', 'FEHLER: ' || sqlstate || ' / ' || sqlerrm, false
    );
  end;

  -- ---- Test: leeres Array technisch akzeptiert (entfernt alle Zuordnungen) ----
  begin
    perform public.set_band_moods(v_band_id, '{}'::uuid[]);
    select count(*) into v_count_after from public.band_moods where band_id = v_band_id;
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'set_band_moods', 'Leeres Array entfernt alle Zuordnungen',
      '0 verbleibende Zeilen', v_count_after::text || ' verbleibende Zeilen', v_count_after = 0
    );
    -- Wiederherstellen vor dem naechsten Test
    perform public.set_band_moods(v_band_id, v_original_mood_ids);
  exception when others then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'set_band_moods', 'Leeres Array entfernt alle Zuordnungen', 'kein Fehler', 'FEHLER: ' || sqlstate || ' / ' || sqlerrm, false
    );
  end;

  -- ---- Test: Duplikat wird abgelehnt (PM005) ----
  begin
    perform public.set_band_moods(v_band_id, array[v_active_mood_ids[1], v_active_mood_ids[1]]);
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'set_band_moods', 'Duplikat wird abgelehnt', 'PM005 / mood_duplicate', 'KEIN FEHLER AUSGELOEST', false
    );
  exception when others then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'set_band_moods', 'Duplikat wird abgelehnt', 'PM005 / mood_duplicate', sqlstate || ' / ' || sqlerrm, sqlstate = 'PM005'
    );
  end;

  -- ---- Test: mehr als 4 Eintraege wird abgelehnt (PM003) ----
  begin
    perform public.set_band_moods(v_band_id, v_active_mood_ids); -- 5 Elemente
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'set_band_moods', 'Mehr als 4 Eintraege wird abgelehnt', 'PM003 / mood_too_many', 'KEIN FEHLER AUSGELOEST', false
    );
  exception when others then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'set_band_moods', 'Mehr als 4 Eintraege wird abgelehnt', 'PM003 / mood_too_many', sqlstate || ' / ' || sqlerrm, sqlstate = 'PM003'
    );
  end;

  -- ---- Test: unbekannte Mood-ID wird abgelehnt (PM006) ----
  begin
    perform public.set_band_moods(v_band_id, array[v_active_mood_ids[1], v_unknown_mood_id]);
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'set_band_moods', 'Unbekannte Mood-ID wird abgelehnt', 'PM006 / mood_not_found', 'KEIN FEHLER AUSGELOEST', false
    );
  exception when others then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'set_band_moods', 'Unbekannte Mood-ID wird abgelehnt', 'PM006 / mood_not_found', sqlstate || ' / ' || sqlerrm, sqlstate = 'PM006'
    );
  end;

  -- ---- Test: inaktive Mood-ID wird abgelehnt (PM007) ----
  begin
    perform public.set_band_moods(v_band_id, array[v_active_mood_ids[1], v_inactive_mood_id]);
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'set_band_moods', 'Inaktive Mood-ID wird abgelehnt', 'PM007 / mood_not_active', 'KEIN FEHLER AUSGELOEST', false
    );
  exception when others then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'set_band_moods', 'Inaktive Mood-ID wird abgelehnt', 'PM007 / mood_not_active', sqlstate || ' / ' || sqlerrm, sqlstate = 'PM007'
    );
  end;

  -- ---- Abschlusscheck Phase 1: Ausgangszustand der Testband ist nach
  -- allen abgefangenen Negativtests weiterhin exakt wie zu Beginn
  -- (Negativtests schreiben laut fn_set_band_moods.sql nie etwas, da
  -- jede Validierung vor der ersten DML-Anweisung laeuft -- diese Zeile
  -- bestaetigt das explizit statt es nur anzunehmen). ----
  select coalesce(array_agg(mood_id order by sort_order, mood_id), '{}'::uuid[]) into v_after_mood_ids
  from public.band_moods where band_id = v_band_id;
  insert into test_results (phase, test_name, expected, actual, passed) values (
    'set_band_moods', 'Ausgangszustand nach allen Negativtests unveraendert',
    v_original_mood_ids::text, v_after_mood_ids::text, v_after_mood_ids = v_original_mood_ids
  );
end;
$band_moods_tests$;

-- ============================================================
-- PHASE 2: Katalog-RPCs (create_mood / update_mood / archive_mood /
-- reactivate_mood) -- eindeutig temporaerer Testname/-slug, komplett
-- innerhalb derselben zurueckgerollten Transaktion.
-- ============================================================
do $catalog_tests$
declare
  v_test_name          text := 'ZZZ Transaction Test Mood';
  v_test_name_updated  text := 'ZZZ Transaction Test Mood (bearbeitet)';
  v_test_slug          text := 'zzz-transaction-test-mood';
  v_prev_max_sort      integer;
  v_new_mood           public.moods%rowtype;
  v_updated_mood       public.moods%rowtype;
  v_archived_mood      public.moods%rowtype;
  v_reactivated_mood   public.moods%rowtype;
  v_band_id            uuid;
  v_original_mood_ids  uuid[];
begin
  if exists (select 1 from public.moods where slug = v_test_slug) then
    raise exception 'Testvoraussetzung verletzt: Test-Slug "%" existiert bereits im Katalog -- Transaction-Tests (Phase 2) abgebrochen, bitte pruefen statt ueberschreiben.', v_test_slug;
  end if;

  select coalesce(max(sort_order), 0) into v_prev_max_sort from public.moods;

  -- ---- Test: Mood anlegen, Slug deterministisch, sort_order = max+1 ----
  begin
    v_new_mood := public.create_mood(v_test_name, v_test_slug, 'Testbeschreibung fuer Transaction-Test, wird zurueckgerollt.');
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'catalog', 'create_mood: Slug deterministisch, sort_order=max+1, status=active',
      'slug=' || v_test_slug || ', sort_order=' || (v_prev_max_sort + 1)::text || ', status=active',
      'slug=' || v_new_mood.slug || ', sort_order=' || v_new_mood.sort_order::text || ', status=' || v_new_mood.status,
      v_new_mood.slug = v_test_slug and v_new_mood.sort_order = v_prev_max_sort + 1 and v_new_mood.status = 'active'
    );
  exception when others then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'catalog', 'create_mood: Slug deterministisch, sort_order=max+1, status=active', 'Erfolg', 'FEHLER: ' || sqlstate || ' / ' || sqlerrm, false
    );
  end;

  if v_new_mood.id is null then
    raise exception 'create_mood ist fehlgeschlagen -- restliche Katalog-Tests (Phase 2) werden uebersprungen, siehe vorherige Ergebniszeile.';
  end if;

  -- ---- Test: Slug-Kollision wird abgelehnt (MC005) ----
  begin
    perform public.create_mood('ZZZ Transaction Test Mood Zweiter Versuch', v_test_slug, 'Sollte wegen Slug-Kollision abgelehnt werden.');
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'catalog', 'create_mood: Slug-Kollision wird abgelehnt', 'MC005 / moods_slug_conflict', 'KEIN FEHLER AUSGELOEST', false
    );
  exception when others then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'catalog', 'create_mood: Slug-Kollision wird abgelehnt', 'MC005 / moods_slug_conflict', sqlstate || ' / ' || sqlerrm, sqlstate = 'MC005'
    );
  end;

  -- ---- Test: Description-Pflicht wird abgelehnt (MC002, bei create_mood) ----
  begin
    perform public.create_mood('ZZZ Transaction Test Mood Ohne Beschreibung', 'zzz-transaction-test-mood-ohne-beschreibung', '   ');
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'catalog', 'create_mood: Description-Pflicht (whitespace-only) wird abgelehnt', 'MC002 / moods_description_required', 'KEIN FEHLER AUSGELOEST', false
    );
  exception when others then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'catalog', 'create_mood: Description-Pflicht (whitespace-only) wird abgelehnt', 'MC002 / moods_description_required', sqlstate || ' / ' || sqlerrm, sqlstate = 'MC002'
    );
  end;

  -- ---- Test: Name und Definition bearbeiten, Slug bleibt unveraendert ----
  begin
    v_updated_mood := public.update_mood(v_new_mood.id, v_test_name_updated, 'Aktualisierte Testbeschreibung.');
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'catalog', 'update_mood: aktualisiert Name/Definition, Slug unveraendert',
      'name=' || v_test_name_updated || ', slug=' || v_test_slug,
      'name=' || v_updated_mood.name || ', slug=' || v_updated_mood.slug,
      v_updated_mood.name = v_test_name_updated and v_updated_mood.slug = v_test_slug
    );
  exception when others then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'catalog', 'update_mood: aktualisiert Name/Definition, Slug unveraendert', 'Erfolg', 'FEHLER: ' || sqlstate || ' / ' || sqlerrm, false
    );
  end;

  -- ---- Test: Description-Pflicht wird auch bei update_mood abgelehnt (MC002) ----
  begin
    perform public.update_mood(v_new_mood.id, v_test_name_updated, '');
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'catalog', 'update_mood: Description-Pflicht wird abgelehnt', 'MC002 / moods_description_required', 'KEIN FEHLER AUSGELOEST', false
    );
  exception when others then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'catalog', 'update_mood: Description-Pflicht wird abgelehnt', 'MC002 / moods_description_required', sqlstate || ' / ' || sqlerrm, sqlstate = 'MC002'
    );
  end;

  -- ---- Test: Archivieren eines ZUGEORDNETEN Test-Moods wird abgelehnt (MC011) ----
  -- Ordnet den Test-Mood kurzzeitig einer echten, aktiven/veroeffentlichten
  -- Band zu (voller Zielzustand-Ersatz!), prueft die Ablehnung, und stellt
  -- den urspruenglichen Zustand dieser Band sofort wieder her, bevor
  -- irgendein anderer Test darauf aufbauen koennte.
  select b.id into v_band_id
  from public.bands b
  where b.status = 'active' and b.is_published = true
  order by b.name
  limit 1;

  if v_band_id is null then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'catalog', 'archive_mood: zugeordneter Mood wird abgelehnt', 'MC011 / moods_archive_in_use',
      'UEBERSPRUNGEN: keine aktive/veroeffentlichte Band fuer den Test gefunden', false
    );
  else
    select coalesce(array_agg(mood_id order by sort_order, mood_id), '{}'::uuid[]) into v_original_mood_ids
    from public.band_moods where band_id = v_band_id;

    begin
      perform public.set_band_moods(v_band_id, array[v_new_mood.id]);

      begin
        perform public.archive_mood(v_new_mood.id);
        insert into test_results (phase, test_name, expected, actual, passed) values (
          'catalog', 'archive_mood: zugeordneter Mood wird abgelehnt', 'MC011 / moods_archive_in_use', 'KEIN FEHLER AUSGELOEST', false
        );
      exception when others then
        insert into test_results (phase, test_name, expected, actual, passed) values (
          'catalog', 'archive_mood: zugeordneter Mood wird abgelehnt', 'MC011 / moods_archive_in_use', sqlstate || ' / ' || sqlerrm, sqlstate = 'MC011'
        );
      end;

      -- Zuordnung sofort wieder auf den Ausgangszustand dieser Band zuruecksetzen
      perform public.set_band_moods(v_band_id, v_original_mood_ids);
    exception when others then
      insert into test_results (phase, test_name, expected, actual, passed) values (
        'catalog', 'archive_mood: Testvorbereitung (Testband voruebergehend zuordnen)', 'Vorbereitung erfolgreich', 'FEHLER: ' || sqlstate || ' / ' || sqlerrm, false
      );
    end;
  end if;

  -- ---- Test: Archivieren eines UNGENUTZTEN Test-Moods erfolgreich ----
  begin
    v_archived_mood := public.archive_mood(v_new_mood.id);
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'catalog', 'archive_mood: ungenutzter Test-Mood wird archiviert',
      'status=archived, slug/id unveraendert',
      'status=' || v_archived_mood.status || ', slug=' || v_archived_mood.slug || ', id unveraendert=' || (v_archived_mood.id = v_new_mood.id)::text,
      v_archived_mood.status = 'archived' and v_archived_mood.slug = v_test_slug and v_archived_mood.id = v_new_mood.id
    );
  exception when others then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'catalog', 'archive_mood: ungenutzter Test-Mood wird archiviert', 'Erfolg', 'FEHLER: ' || sqlstate || ' / ' || sqlerrm, false
    );
  end;

  -- ---- Test: Reaktivieren -- ID/Slug/sort_order bleiben erhalten ----
  begin
    v_reactivated_mood := public.reactivate_mood(v_new_mood.id);
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'catalog', 'reactivate_mood: status=active, id/slug/sort_order erhalten',
      'status=active, id/slug/sort_order wie beim Anlegen',
      'status=' || v_reactivated_mood.status ||
        ', id gleich=' || (v_reactivated_mood.id = v_new_mood.id)::text ||
        ', slug gleich=' || (v_reactivated_mood.slug = v_new_mood.slug)::text ||
        ', sort_order gleich=' || (v_reactivated_mood.sort_order = v_new_mood.sort_order)::text,
      v_reactivated_mood.status = 'active'
        and v_reactivated_mood.id = v_new_mood.id
        and v_reactivated_mood.slug = v_new_mood.slug
        and v_reactivated_mood.sort_order = v_new_mood.sort_order
    );
  exception when others then
    insert into test_results (phase, test_name, expected, actual, passed) values (
      'catalog', 'reactivate_mood: status=active, id/slug/sort_order erhalten', 'Erfolg', 'FEHLER: ' || sqlstate || ' / ' || sqlerrm, false
    );
  end;
end;
$catalog_tests$;

-- ============================================================
-- Ergebnis: alle Zeilen muessen passed = true zeigen. Reihenfolge nach
-- Ausfuehrung (seq), nicht alphabetisch -- Negativtests sind nur im
-- Kontext ihrer unmittelbar vorherigen Vorbereitung aussagekraeftig.
-- ============================================================
select
  phase,
  test_name,
  expected,
  actual,
  passed
from test_results
order by seq;

select
  count(*) as total_checks,
  count(*) filter (where passed) as passed_checks,
  count(*) filter (where not passed) as failed_checks,
  bool_and(passed) as all_passed
from test_results;

-- WICHTIG: niemals COMMIT. Dieses Skript verwirft alle Testdaten wieder.
rollback;
