-- ============================================================
-- moods_b2_migration.sql
--
-- Einmalige Production-Migration (Paket B2). Legt zwei neue Moods an
-- (Emotional & beruehrend, Rockig & mitreissend) und archiviert drei
-- bestehende Moods (Publikumsnaehe, Tradition, Vielseitig). Reines
-- INSERT (2 Zeilen) + UPDATE status (3 Zeilen), kein DELETE. Keine
-- Aenderung an band_moods, keine Aenderung an Brass-Power, keine
-- Aenderung an den bereits vor B2 archivierten Alt-Moods, keine
-- Aenderung an irgendeinem bestehenden moods.sort_order-Wert.
--
-- BEWUSSTE SCOPE-ABWEICHUNG (Nachtrag 18.07.2026 zur Mood-Katalog-v2-
-- Entscheidung vom 15.07.2026): Die vollstaendige Katalog-
-- Kompaktierung auf die Zielreihenfolge 1-13 ist NICHT Teil dieser
-- Migration und folgt erst in Paket D. Grund: Bigband STEINBACHs vier
-- band_moods.sort_order-Werte stehen weiterhin auf Default 0: die
-- oeffentliche Anzeige nutzt bei diesem Gleichstand moods.sort_order
-- als Tie-Breaker. Eine Katalog-Umsortierung in B2 wuerde STEINBACHs
-- sichtbare Mood-Reihenfolge deshalb indirekt vor Paket D veraendern
-- -- das widerspricht der verbindlichen Produktregel, STEINBACH vor
-- Paket D nicht zwischenzusortieren. Saemtliche bestehenden
-- moods.sort_order-Werte 1-15 bleiben daher unveraendert. Die zwei
-- Neuanlagen erhalten stattdessen temporaere Werte am Katalogende:
--   - rockig-mitreissend: sort_order 16
--   - emotional-beruehrend: sort_order 17
--
-- Dieses Skript ist ein unveraenderliches, vor Ausfuehrung geprueftes
-- Artefakt. Production-Ausfuehrung und Evidenz werden nach dem
-- manuellen Lauf separat dokumentiert.
--
-- DUAL-STATE-GUARD:
-- Das Skript unterscheidet genau drei Zustandsklassen. Akzeptiert
-- werden NUR exakte Uebereinstimmungen -- Zaehlwerte allein reichen
-- nie aus, immer zusaetzlich exakte aktive UND archivierte Slug-
-- Mengen sowie unveraenderte sort_order-Werte der 15 bestehenden
-- Moods:
--   Zustand A (exakter Vorzustand: 15 active / 6 archived / 21 total)
--     -> Migration wird ausgefuehrt.
--   Zustand B (exakter bereits erreichter Zielzustand: 14 active /
--     9 archived / 23 total) -> kontrollierter No-op ueber RETURN
--     innerhalb des DO-Blocks, keine Schreiboperation, normaler
--     COMMIT am Skriptende (ohne Wirkung).
--   Jeder sonstige Zustand (C) -> RAISE EXCEPTION mit konkreten
--     Ist-Werten VOR jeder Schreiboperation, keine Teilkorrektur,
--     kein UPSERT.
--
-- band_moods bleibt vollstaendig unangetastet -- kein INSERT, UPDATE
-- oder DELETE dagegen, keine Katalog-Kompaktierung. Fingerprint-
-- Berechnung NULL-sicher (coalesce(sort_order::text, '<NULL>'),
-- order by band_id, mood_id, sort_order nulls first), identisch zu
-- Pre-Snapshot und Verify. Vor der ersten Aenderung erfasst und
-- unmittelbar vor COMMIT erneut geprueft; bei jeder Abweichung
-- RAISE EXCEPTION statt COMMIT.
--
-- Keine session-scoped Temp-Tables, deren Verfuegbarkeit ueber das
-- Skriptende hinaus vorausgesetzt wird (B1-Praezedenz).
-- ============================================================

-- ============================================================
-- AUSFUEHRUNGS- UND VERIFIKATIONSVERMERK
--
-- Ausgefuehrt: 18.07.2026, durch Xandi im Supabase SQL Editor gegen
-- Production.
--
-- Pre-Snapshot (vor der Migration): bm_count=7, bm_fingerprint=
-- 38fa7a60000412494b77ec97ad00c5a4.
--
-- Migrationsergebnis: "Success. No rows returned", keine
-- Fehlermeldung. RAISE NOTICE wurde im Results-Panel des SQL Editors
-- nicht angezeigt -- das Ausbleiben einer Fehlermeldung bei diesem
-- Skriptaufbau (Guards vor jeder Schreiboperation, Postcheck vor
-- COMMIT) gilt als Erfolgsindikator, unabhaengig von der Sichtbarkeit
-- der RAISE NOTICE-Ausgabe selbst.
--
-- Verify-Ergebnis (supabase/moods_b2_verify.sql, separat ausgefuehrt):
-- 36 Ergebniszeilen, alle automatisch bewerteten match-Werte true.
-- Die einzige Zeile mit match = NULL ist wie vorgesehen
-- band_moods_fingerprint (kein hart codierter Vergleich moeglich):
-- count=7 fingerprint=38fa7a60000412494b77ec97ad00c5a4 -- identisch
-- zum Pre-Snapshot. Zusaetzlich einzeln bestaetigt: active_slug_set,
-- archived_slug_set, publikumsnaehe/tradition/vielseitig archived mit
-- unveraenderter sort_order (7/12/15), Brass-Power unveraendert
-- (active, sort_order 14, description NULL), alle 15 bestehenden
-- sort_order-Pruefungen, mood_counts (14 active / 9 archived / 23
-- total / 13 active mit description), alle 13 target_mood-Pruefungen.
--
-- Damit ist B2 vollstaendig und wie spezifiziert production-verifiziert
-- abgeschlossen. B2 entsperrt die weitere Kuration ("Klingt nach"),
-- veraendert die Steuerungszahl (X von 141 Bands mit fertigem
-- Klingt nach) selbst aber noch nicht.
-- ============================================================

begin;

do $$
declare
  v_bm_count_before       integer;
  v_bm_fingerprint_before text;
  v_bm_count_after        integer;
  v_bm_fingerprint_after  text;

  v_active_count          integer;
  v_archived_count        integer;
  v_total_count           integer;
  v_active_slugs          text[];
  v_archived_slugs        text[];

  v_new_slug_conflicts    integer;
  v_sort_order_mismatches integer;
  v_state                 text;
begin
  -----------------------------------------------------------------
  -- 1) band_moods-Fingerprint VOR jeder Aenderung (NULL-sicher)
  -----------------------------------------------------------------
  select count(*),
         md5(coalesce(string_agg(
           band_id::text
           || ':'
           || mood_id::text
           || ':'
           || coalesce(sort_order::text, '<NULL>'),
           ',' order by band_id, mood_id, sort_order nulls first
         ), ''))
  into v_bm_count_before, v_bm_fingerprint_before
  from public.band_moods;

  -----------------------------------------------------------------
  -- 2) Zustandserkennung: Zaehlwerte + aktive/archivierte Slug-Mengen
  -----------------------------------------------------------------
  select count(*) filter (where status = 'active'),
         count(*) filter (where status = 'archived'),
         count(*)
  into v_active_count, v_archived_count, v_total_count
  from public.moods;

  select coalesce(array_agg(slug order by slug), array[]::text[])
  into v_active_slugs
  from public.moods
  where status = 'active';

  select coalesce(array_agg(slug order by slug), array[]::text[])
  into v_archived_slugs
  from public.moods
  where status = 'archived';

  select count(*)
  into v_new_slug_conflicts
  from public.moods
  where slug in ('emotional-beruehrend', 'rockig-mitreissend');

  -----------------------------------------------------------------
  -- 3) Schutz bestehender sort_order-Werte (NULL-sicher, 15 Slugs).
  --    Zaehlt fehlende Slugs UND jede sort_order-Abweichung ueber
  --    IS DISTINCT FROM. Gilt unveraendert fuer Zustand A und
  --    Zustand B -- B2 aendert nie einen bestehenden sort_order-Wert.
  -----------------------------------------------------------------
  select count(*)
  into v_sort_order_mismatches
  from (
    values
      ('festzeltenergie', 1), ('bayerisch-frech', 2), ('party-pur', 3),
      ('tanzflaechen-garantie', 4), ('konzertant-hochwertig', 5),
      ('generationenverbindend', 6), ('publikumsnaehe', 7),
      ('herzlich-nahbar', 8), ('mitsing-faktor', 9),
      ('lagerfeuer-atmosphaere', 10), ('festlich-ausgelassen', 11),
      ('tradition', 12), ('authentisch-handgemacht', 13),
      ('brass-power', 14), ('vielseitig', 15)
  ) as expected(slug, sort_order)
  left join public.moods m on m.slug = expected.slug
  where m.slug is null or m.sort_order is distinct from expected.sort_order;

  -----------------------------------------------------------------
  -- 4) Zustandsklassifikation
  -----------------------------------------------------------------
  if v_active_count = 15
     and v_archived_count = 6
     and v_total_count = 21
     and v_active_slugs = array[
       'authentisch-handgemacht', 'bayerisch-frech', 'brass-power',
       'festlich-ausgelassen', 'festzeltenergie', 'generationenverbindend',
       'herzlich-nahbar', 'konzertant-hochwertig', 'lagerfeuer-atmosphaere',
       'mitsing-faktor', 'party-pur', 'publikumsnaehe',
       'tanzflaechen-garantie', 'tradition', 'vielseitig'
     ]
     and v_archived_slugs = array[
       'aufregend', 'bewegend', 'energiegeladen',
       'mitreissend', 'pfundig', 'traditionell'
     ]
     and v_new_slug_conflicts = 0
     and v_sort_order_mismatches = 0
  then
    v_state := 'A';
  elsif v_active_count = 14
     and v_archived_count = 9
     and v_total_count = 23
     and v_active_slugs = array[
       'authentisch-handgemacht', 'bayerisch-frech', 'brass-power',
       'emotional-beruehrend', 'festlich-ausgelassen', 'festzeltenergie',
       'generationenverbindend', 'herzlich-nahbar', 'konzertant-hochwertig',
       'lagerfeuer-atmosphaere', 'mitsing-faktor', 'party-pur',
       'rockig-mitreissend', 'tanzflaechen-garantie'
     ]
     and v_archived_slugs = array[
       'aufregend', 'bewegend', 'energiegeladen', 'mitreissend',
       'pfundig', 'publikumsnaehe', 'tradition', 'traditionell', 'vielseitig'
     ]
     and v_sort_order_mismatches = 0
  then
    v_state := 'B';
  else
    v_state := 'C';
  end if;

  -----------------------------------------------------------------
  -- 5) Zustand C: kontrollierter Abbruch VOR jeder Schreiboperation
  -----------------------------------------------------------------
  if v_state = 'C' then
    raise exception 'B2 guard: unerwarteter Misch-/Konfliktzustand. Ist: % active (Slugs=%), % archived (Slugs=%), % total, neue-Slug-Konflikte=%, sort_order-Abweichungen=%',
      v_active_count, v_active_slugs, v_archived_count, v_archived_slugs, v_total_count, v_new_slug_conflicts, v_sort_order_mismatches;
  end if;

  -----------------------------------------------------------------
  -- 6) Zustand B: kontrollierter No-op -- keine Schreiboperation.
  --    RETURN beendet den DO-Block ohne INSERT/UPDATE; das
  --    abschliessende COMMIT am Skriptende committet eine
  --    Transaktion ohne Aenderungen (wirkungslos, aber gueltig).
  -----------------------------------------------------------------
  if v_state = 'B' then
    perform 1 from public.moods
    where slug = 'emotional-beruehrend'
      and name = 'Emotional & berührend'
      and status = 'active'
      and sort_order = 17
      and description = 'Die Musik erzeugt bewusst Gänsehaut und berührt emotional — etwa bei Trauungen, stillen Momenten oder persönlichen Liedern.';
    if not found then
      raise exception 'B2 guard: Zaehlwerte/Slug-Mengen sehen wie Zielzustand aus, aber emotional-beruehrend weicht in Name/Status/sort_order/description ab';
    end if;

    perform 1 from public.moods
    where slug = 'rockig-mitreissend'
      and name = 'Rockig & mitreißend'
      and status = 'active'
      and sort_order = 16
      and description = 'Ein kraftvoller, rockorientierter Bandsound packt das Publikum durch Druck, Dynamik und Energie.';
    if not found then
      raise exception 'B2 guard: Zaehlwerte/Slug-Mengen sehen wie Zielzustand aus, aber rockig-mitreissend weicht in Name/Status/sort_order/description ab';
    end if;

    raise notice 'B2 bereits vollstaendig angewendet -- keine Aenderung noetig (No-op). band_moods unangetastet: COUNT=%, Fingerprint=%.',
      v_bm_count_before, v_bm_fingerprint_before;
    return;
  end if;

  -----------------------------------------------------------------
  -- 7) Zustand A: Migration ausfuehren -- ausschliesslich zwei
  --    INSERTs und drei Status-UPDATEs gegen public.moods
  -----------------------------------------------------------------
  if v_new_slug_conflicts <> 0 then
    raise exception 'B2 guard: emotional-beruehrend oder rockig-mitreissend existieren bereits (aktiv oder archiviert) -- Abbruch vor INSERT';
  end if;

  insert into public.moods (name, slug, status, sort_order, description)
  values
    ('Emotional & berührend', 'emotional-beruehrend', 'active', 17,
     'Die Musik erzeugt bewusst Gänsehaut und berührt emotional — etwa bei Trauungen, stillen Momenten oder persönlichen Liedern.'),
    ('Rockig & mitreißend', 'rockig-mitreissend', 'active', 16,
     'Ein kraftvoller, rockorientierter Bandsound packt das Publikum durch Druck, Dynamik und Energie.');

  update public.moods
  set status = 'archived'
  where slug in ('publikumsnaehe', 'tradition', 'vielseitig')
    and status = 'active';

  -----------------------------------------------------------------
  -- 8) Exakter Postcheck (Mengen, Identitaeten, sort_order-Schutz)
  -----------------------------------------------------------------
  select count(*) filter (where status = 'active'),
         count(*) filter (where status = 'archived'),
         count(*)
  into v_active_count, v_archived_count, v_total_count
  from public.moods;

  if v_active_count <> 14 or v_archived_count <> 9 or v_total_count <> 23 then
    raise exception 'B2 postcheck: erwartete 14 active/9 archived/23 total, gefunden % active/% archived/% total',
      v_active_count, v_archived_count, v_total_count;
  end if;

  select coalesce(array_agg(slug order by slug), array[]::text[])
  into v_active_slugs
  from public.moods
  where status = 'active';

  if v_active_slugs <> array[
    'authentisch-handgemacht', 'bayerisch-frech', 'brass-power',
    'emotional-beruehrend', 'festlich-ausgelassen', 'festzeltenergie',
    'generationenverbindend', 'herzlich-nahbar', 'konzertant-hochwertig',
    'lagerfeuer-atmosphaere', 'mitsing-faktor', 'party-pur',
    'rockig-mitreissend', 'tanzflaechen-garantie'
  ] then
    raise exception 'B2 postcheck: aktive Slug-Menge weicht vom Zielzustand ab: %', v_active_slugs;
  end if;

  select coalesce(array_agg(slug order by slug), array[]::text[])
  into v_archived_slugs
  from public.moods
  where status = 'archived';

  if v_archived_slugs <> array[
    'aufregend', 'bewegend', 'energiegeladen', 'mitreissend',
    'pfundig', 'publikumsnaehe', 'tradition', 'traditionell', 'vielseitig'
  ] then
    raise exception 'B2 postcheck: archivierte Slug-Menge weicht vom Zielzustand ab: %', v_archived_slugs;
  end if;

  select count(*)
  into v_sort_order_mismatches
  from (
    values
      ('festzeltenergie', 1), ('bayerisch-frech', 2), ('party-pur', 3),
      ('tanzflaechen-garantie', 4), ('konzertant-hochwertig', 5),
      ('generationenverbindend', 6), ('publikumsnaehe', 7),
      ('herzlich-nahbar', 8), ('mitsing-faktor', 9),
      ('lagerfeuer-atmosphaere', 10), ('festlich-ausgelassen', 11),
      ('tradition', 12), ('authentisch-handgemacht', 13),
      ('brass-power', 14), ('vielseitig', 15)
  ) as expected(slug, sort_order)
  left join public.moods m on m.slug = expected.slug
  where m.slug is null or m.sort_order is distinct from expected.sort_order;

  if v_sort_order_mismatches <> 0 then
    raise exception 'B2 postcheck: % bestehende(r) sort_order-Wert(e) wurden veraendert', v_sort_order_mismatches;
  end if;

  perform 1 from public.moods
  where slug = 'emotional-beruehrend' and name = 'Emotional & berührend'
    and status = 'active' and sort_order = 17
    and description = 'Die Musik erzeugt bewusst Gänsehaut und berührt emotional — etwa bei Trauungen, stillen Momenten oder persönlichen Liedern.';
  if not found then
    raise exception 'B2 postcheck: emotional-beruehrend nach INSERT nicht exakt wie erwartet';
  end if;

  perform 1 from public.moods
  where slug = 'rockig-mitreissend' and name = 'Rockig & mitreißend'
    and status = 'active' and sort_order = 16
    and description = 'Ein kraftvoller, rockorientierter Bandsound packt das Publikum durch Druck, Dynamik und Energie.';
  if not found then
    raise exception 'B2 postcheck: rockig-mitreissend nach INSERT nicht exakt wie erwartet';
  end if;

  perform 1 from public.moods
  where slug = 'brass-power' and status = 'active' and sort_order = 14 and description is null;
  if not found then
    raise exception 'B2 postcheck: brass-power nicht mehr wie erwartet (active, sort_order 14, description NULL)';
  end if;

  -----------------------------------------------------------------
  -- 9) band_moods-Fingerprint NACH der Aenderung -- muss identisch
  --    zum vorher erfassten Wert sein (NULL-sicher, gleiche Formel)
  -----------------------------------------------------------------
  select count(*),
         md5(coalesce(string_agg(
           band_id::text
           || ':'
           || mood_id::text
           || ':'
           || coalesce(sort_order::text, '<NULL>'),
           ',' order by band_id, mood_id, sort_order nulls first
         ), ''))
  into v_bm_count_after, v_bm_fingerprint_after
  from public.band_moods;

  if v_bm_count_after <> v_bm_count_before or v_bm_fingerprint_after <> v_bm_fingerprint_before then
    raise exception 'B2 guard: band_moods hat sich waehrend der Migration veraendert (COUNT vorher=%, nachher=%; Fingerprint vorher=%, nachher=%) -- Abbruch',
      v_bm_count_before, v_bm_count_after, v_bm_fingerprint_before, v_bm_fingerprint_after;
  end if;

  raise notice 'B2 Migration erfolgreich. band_moods unveraendert: COUNT=%, Fingerprint=%. moods: % active / % archived / % total.',
    v_bm_count_before, v_bm_fingerprint_before, v_active_count, v_archived_count, v_total_count;
end $$;

commit;
