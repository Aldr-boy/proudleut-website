-- ============================================================
-- repertoire_style_catalog_cleanup.sql
--
-- Einmalige, versionierte Production-Migration zur fachlich
-- freigegebenen Bereinigung des Katalogs "Musikalisch verortet"
-- (repertoire_styles / band_repertoire_styles). Bereinigt werden
-- ausschliesslich eindeutige Dubletten, reine Schreibvarianten und drei
-- ueberfluessige "gemischt"-Zusaetze -- siehe Analysebericht
-- "Katalogpruefung Musikalisch verortet auf Dubletten/Nuancen" fuer die
-- vollstaendige fachliche Herleitung. Die Vielfalt des Katalogs bleibt
-- ausdruecklich erhalten; es werden nur die unten explizit gelisteten
-- Faelle veraendert.
--
-- KEINE neue RPC, KEINE Aenderung an der Admin-Oberflaeche. Reine
-- Datenmigration, analog zu supabase/moods_b2_migration.sql (Fingerprint-
-- Guard-Muster) und supabase/band_moods_steinbach_festlich_ausgelassen_
-- removal.sql (exakte Vor-/Nachzustandspruefung per array_agg).
--
-- NOCH NICHT AUSGEFUEHRT. Manuell durch Xandi im Supabase SQL Editor
-- auszufuehren, siehe zugehoerige Verify-Datei
-- supabase/repertoire_style_catalog_cleanup_verify.sql fuer Preflight
-- (vor Ausfuehrung) und Postflight (nach Ausfuehrung).
--
-- Ausgangsbestand (per Production-Read am Tag der Erstellung dieser
-- Datei verifiziert): 319 aktive, 3 archivierte repertoire_styles,
-- 340 Zeilen in band_repertoire_styles.
--
-- Diese Migration:
--   - Fuehrt 10 Quellzeilen ueber 8 Zusammenfuehrungen auf 7 bestehende
--     Zielzeilen zusammen (eine Zusammenfuehrung hat 3 Quellzeilen).
--   - Archiviert dabei jede Quellzeile (status = 'archived'), loescht
--     sie NICHT. id, slug, name und description der Quellzeile bleiben
--     unveraendert -- nur status wechselt.
--   - Haengt jede bestehende band_repertoire_styles-Zeile von der
--     jeweiligen Quell-ID auf die bestehende Ziel-ID um. Der bandinterne
--     sort_order jeder umgehaengten Zeile bleibt unveraendert. Es wird
--     keine Zeile geloescht, keine neue fachliche Zuordnung hinzugefuegt,
--     kein Rang neu berechnet, kein anderer Chip derselben Band beruehrt.
--   - Benennt 3 bestehende Zeilen um (nur "gemischt" entfernt). id, slug,
--     status, sort_order und description bleiben dabei unveraendert --
--     slug ist im Projekt eine stabile technische Identitaet und wird
--     bei einer reinen Namensaenderung nie mitgeaendert (siehe
--     supabase/fn_repertoire_styles_catalog_admin.sql,
--     update_repertoire_style: aendert ausschliesslich name/description,
--     slug bleibt immer unangetastet -- identisches Muster wie
--     update_mood). Diese Migration folgt exakt demselben Muster.
--
-- Sonderfall Let's Fetz ("Bayerisch bis Aktuell" -> moegliches Ziel
-- "Bayerisch bis aktuelle Charts", geschuetzte Referenzband Herb'n
-- Beets): NICHT Teil dieser Migration. Die vorhandene Repo-Dokumentation
-- (docs/klingt-nach-kuration.md, band-taxonomie-vorschlaege.md) belegt
-- fuer Let's Fetz nur eine generische Einordnung als "Bayrische
-- Partyband" / "Rock- & Coverband" mit "Rock-Signal im Text" -- kein
-- Beleg fuer eine ausdrueckliche Charts-Abdeckung, anders als z. B. bei
-- Herb'n Beets selbst nicht naeher differenziert. Da kein klarer Beleg
-- vorliegt, bleibt Let's Fetz gemaess Auftrag unveraendert. Siehe
-- Abschlussbericht, B-Punkt.
--
-- Geschuetzte Referenzbands (siehe Abschlussbericht):
--   2 unplugged, 5toBeat, 9to5, Entprima Live, Herb'n Beets, Hob Nou,
--   SaKrisch. Keine dieser Baender ist Quellband einer Zusammenfuehrung
--   in dieser Migration -- 5toBeat, Herb'n Beets und SaKrisch sind
--   ausschliesslich (unveraenderte) Zielbaender bereits bestehender
--   Zuordnungen; die anderen vier sind von dieser Migration inhaltlich
--   nicht betroffen. Ihr vollstaendiger Zuordnungs-Fingerprint wird
--   trotzdem vor UND nach der Migration erfasst und muss exakt
--   uebereinstimmen (Guards 0a/9a unten).
--
-- ABSICHTLICH NICHT IDEMPOTENT (identisches, etabliertes Muster wie
-- band_moods_steinbach_festlich_ausgelassen_removal.sql, Kommentarblock
-- "ABSICHTLICH NICHT IDEMPOTENT"): jeder Guard verlangt exakt den hier
-- dokumentierten Ausgangszustand. Nach einem erfolgreichen Lauf
-- veraendert sich dieser Ausgangszustand (Quellzeilen sind dann
-- archiviert, nicht mehr aktiv) -- ein zweiter Lauf bricht bei den
-- Status-Guards kontrolliert ab. Das ist gewollt: der Abbruch bedeutet
-- "bereits erledigt", nicht eine beschaedigte Migration.
--
-- REVERT (nur bei Bedarf, NICHT Teil dieses Skripts): jede Exception vor
-- COMMIT bricht die gesamte Transaktion vollstaendig ab -- ohne
-- jegliche Aenderung. Ein Revert ist nur relevant, falls die Transaktion
-- bereits erfolgreich committed wurde und zurueckgesetzt werden soll:
-- dann muessten fuer jede der 8 Zusammenfuehrungen die betroffenen
-- band_repertoire_styles-Zeilen manuell zurueck auf die jeweilige
-- Quell-ID gesetzt und die Quellzeile wieder auf status='active'
-- gesetzt werden (alle IDs stehen unten je Abschnitt); fuer die 3
-- Umbenennungen muesste der jeweils alte Name manuell wiederhergestellt
-- werden (ebenfalls unten je Abschnitt dokumentiert).
-- ============================================================

begin;

do $$
declare
  -- Globale Vor-/Nachzustands-Zaehlwerte
  v_active_count_before   integer;
  v_archived_count_before integer;
  v_total_count_before    integer;
  v_brs_count_before      integer;
  v_active_count_after    integer;
  v_archived_count_after  integer;
  v_total_count_after     integer;
  v_brs_count_after       integer;

  -- Fingerprints der 7 geschuetzten Referenzbands (style_id=sort_order,
  -- sortiert nach style_id) -- vor und nach der Migration erfasst.
  v_fp_2unplugged_before      text[];
  v_fp_5tobeat_before         text[];
  v_fp_9to5_before            text[];
  v_fp_entprima_before        text[];
  v_fp_herbnbeets_before      text[];
  v_fp_hobnou_before          text[];
  v_fp_sakrisch_before        text[];
  v_fp_2unplugged_after       text[];
  v_fp_5tobeat_after          text[];
  v_fp_9to5_after             text[];
  v_fp_entprima_after         text[];
  v_fp_herbnbeets_after       text[];
  v_fp_hobnou_after           text[];
  v_fp_sakrisch_after         text[];

  -- Wiederverwendete Arbeitsvariablen je Zusammenfuehrung/Umbenennung
  v_src_id           uuid;
  v_src_id2          uuid;
  v_src_id3          uuid;
  v_tgt_id           uuid;
  v_name             text;
  v_slug             text;
  v_status           text;
  v_sort_order       integer;
  v_assignments      text[];
  v_updated          integer;
  v_name_collisions  integer;
  v_slug_collisions  integer;
begin
  -----------------------------------------------------------------
  -- Guard 0: globaler Ausgangsbestand muss exakt den verbindlichen
  -- Preflight-Werten entsprechen (319 aktiv / 3 archiviert / 340
  -- Zuordnungen). Keine Vermutung, kein Erzwingen -- bei Abweichung
  -- sofortiger Abbruch vor jeder Schreiboperation.
  -----------------------------------------------------------------
  select count(*) filter (where status = 'active'),
         count(*) filter (where status = 'archived'),
         count(*)
  into v_active_count_before, v_archived_count_before, v_total_count_before
  from public.repertoire_styles;

  select count(*) into v_brs_count_before from public.band_repertoire_styles;

  if v_active_count_before <> 319 or v_archived_count_before <> 3 or v_total_count_before <> 322 then
    raise exception 'Guard 0: unerwarteter globaler Ausgangsbestand repertoire_styles -- aktiv=%, archiviert=%, gesamt=% (erwartet 319/3/322)',
      v_active_count_before, v_archived_count_before, v_total_count_before;
  end if;

  if v_brs_count_before <> 340 then
    raise exception 'Guard 0: unerwartete Zeilenzahl band_repertoire_styles -- gefunden=% (erwartet 340)', v_brs_count_before;
  end if;

  -----------------------------------------------------------------
  -- Guard 0a: Fingerprint der 7 geschuetzten Referenzbands VOR jeder
  -- Aenderung -- muss exakt dem in dieser Datei dokumentierten,
  -- per Production-Read verifizierten Zustand entsprechen.
  -----------------------------------------------------------------
  select coalesce(array_agg(repertoire_style_id::text || '=' || sort_order::text order by repertoire_style_id), array[]::text[])
  into v_fp_2unplugged_before from public.band_repertoire_styles where band_id = 'f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid;
  if v_fp_2unplugged_before <> array['48ed59a1-8294-402b-a977-b62fac3f1d0c=1','7794ffc9-b050-4feb-b7cf-890fbcf4c38f=3','da5a3b39-d28f-40b8-9d9a-02c0f2466ed6=2'] then
    raise exception 'Guard 0a: Fingerprint "2 unplugged" weicht vor der Migration ab: %', v_fp_2unplugged_before;
  end if;

  select coalesce(array_agg(repertoire_style_id::text || '=' || sort_order::text order by repertoire_style_id), array[]::text[])
  into v_fp_5tobeat_before from public.band_repertoire_styles where band_id = '354e2447-41f0-487a-a46d-a2d209dc890b'::uuid;
  if v_fp_5tobeat_before <> array['4182d9d5-95d9-4ab9-b242-f988bb91bd3c=2','aa8edbf0-04b6-41f0-8a30-4c1d9e1cf6f1=1'] then
    raise exception 'Guard 0a: Fingerprint "5toBeat" weicht vor der Migration ab: %', v_fp_5tobeat_before;
  end if;

  select coalesce(array_agg(repertoire_style_id::text || '=' || sort_order::text order by repertoire_style_id), array[]::text[])
  into v_fp_9to5_before from public.band_repertoire_styles where band_id = '098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid;
  if v_fp_9to5_before <> array['62710caf-ae8d-48ee-ace2-b448618e5b2a=1','c0b1dc22-66a6-4c8c-9a93-6dcdc87fb853=3','ef7a8419-c5b0-4ba0-ac01-4e38a7c8af08=2'] then
    raise exception 'Guard 0a: Fingerprint "9to5" weicht vor der Migration ab: %', v_fp_9to5_before;
  end if;

  select coalesce(array_agg(repertoire_style_id::text || '=' || sort_order::text order by repertoire_style_id), array[]::text[])
  into v_fp_entprima_before from public.band_repertoire_styles where band_id = '82acc533-07d3-4479-82fe-31983711a3e0'::uuid;
  if v_fp_entprima_before <> array['a14b5f7b-d9be-41da-b531-2266b41fc850=1','e35567e8-271a-4094-b27a-1312649ffec9=2'] then
    raise exception 'Guard 0a: Fingerprint "Entprima Live" weicht vor der Migration ab: %', v_fp_entprima_before;
  end if;

  select coalesce(array_agg(repertoire_style_id::text || '=' || sort_order::text order by repertoire_style_id), array[]::text[])
  into v_fp_herbnbeets_before from public.band_repertoire_styles where band_id = '332dfade-6e61-4f6e-b33d-23a03b610d24'::uuid;
  if v_fp_herbnbeets_before <> array['1c0caa4d-f68b-47ed-9c73-5ee745838841=2','d22fa0b1-bdc9-4a88-854d-0ccf3d00f8c1=1'] then
    raise exception 'Guard 0a: Fingerprint "Herb''n Beets" weicht vor der Migration ab: %', v_fp_herbnbeets_before;
  end if;

  select coalesce(array_agg(repertoire_style_id::text || '=' || sort_order::text order by repertoire_style_id), array[]::text[])
  into v_fp_hobnou_before from public.band_repertoire_styles where band_id = '65a12d3a-c654-46b7-b738-0feb94fc7e8a'::uuid;
  if v_fp_hobnou_before <> array['99c99d12-58c4-4f8e-a02e-0f7202ac1937=2','ef09bb47-ab81-46a1-8d71-48b0318a5228=1'] then
    raise exception 'Guard 0a: Fingerprint "Hob Nou" weicht vor der Migration ab: %', v_fp_hobnou_before;
  end if;

  select coalesce(array_agg(repertoire_style_id::text || '=' || sort_order::text order by repertoire_style_id), array[]::text[])
  into v_fp_sakrisch_before from public.band_repertoire_styles where band_id = '5c9bdb9e-d3ad-4950-aa22-7a3aedfb61db'::uuid;
  if v_fp_sakrisch_before <> array['2c1ee950-4171-40e0-9bd1-ffbb047cf8e2=1','cf64fe78-d8c9-429c-94ea-a3cc20dd79f1=3','d88ed3aa-025a-44a2-aa6b-4566b02651df=2'] then
    raise exception 'Guard 0a: Fingerprint "SaKrisch" weicht vor der Migration ab: %', v_fp_sakrisch_before;
  end if;

  -----------------------------------------------------------------
  -- Ab hier: 8 Zusammenfuehrungen. Je Zusammenfuehrung: Guard auf
  -- exakten Quell- UND Zielzustand (id, slug, status), Guard auf exakte
  -- bestehende Zuordnung(en), Guard dass keine Band bereits gleichzeitig
  -- Quelle und Ziel besitzt, dann Umhaengen der band_repertoire_styles-
  -- Zeile(n) (sort_order bleibt unveraendert), dann Archivieren der
  -- Quellzeile. Die Zielzeile wird in keinem Fall veraendert.
  -----------------------------------------------------------------

  -----------------------------------------------------------------
  -- Merge 1: "Bayerisch & international" -> "Bayerisch bis international"
  -- Quellband: Best-of-Band. Revert: band_id a954938c-0c34-4ab3-a379-
  -- 0a5e09c5b8fd zurueck auf repertoire_style_id a2028e17-4363-4530-
  -- a639-8dd61615d1a7 (sort_order 2), Quellzeile zurueck auf 'active'.
  -----------------------------------------------------------------
  select id, slug, status into strict v_src_id, v_slug, v_status
  from public.repertoire_styles where id = 'a2028e17-4363-4530-a639-8dd61615d1a7'::uuid;
  if v_slug <> 'bayerisch-international' or v_status <> 'active' then
    raise exception 'Merge 1 Guard: Quellzeile "Bayerisch & international" weicht ab (slug=%, status=%)', v_slug, v_status;
  end if;

  select id, slug, status into strict v_tgt_id, v_slug, v_status
  from public.repertoire_styles where id = '4089444d-19f7-4de9-9852-03172bb89266'::uuid;
  if v_slug <> 'bayerisch-bis-international' or v_status <> 'active' then
    raise exception 'Merge 1 Guard: Zielzeile "Bayerisch bis international" weicht ab (slug=%, status=%)', v_slug, v_status;
  end if;

  select coalesce(array_agg(band_id::text || '=' || sort_order::text order by band_id), array[]::text[])
  into v_assignments from public.band_repertoire_styles where repertoire_style_id = v_src_id;
  if v_assignments <> array['a954938c-0c34-4ab3-a379-0a5e09c5b8fd=2'] then
    raise exception 'Merge 1 Guard: unerwartete Quell-Zuordnungen %', v_assignments;
  end if;

  if exists (
    select 1 from public.band_repertoire_styles where repertoire_style_id = v_tgt_id
      and band_id in (select band_id from public.band_repertoire_styles where repertoire_style_id = v_src_id)
  ) then
    raise exception 'Merge 1 Guard: mindestens eine Band besitzt bereits Quelle und Ziel gleichzeitig';
  end if;

  update public.band_repertoire_styles set repertoire_style_id = v_tgt_id where repertoire_style_id = v_src_id;
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then raise exception 'Merge 1: erwartete genau 1 umgehaengte Zeile, gefunden %', v_updated; end if;

  update public.repertoire_styles set status = 'archived' where id = v_src_id;

  -----------------------------------------------------------------
  -- Merge 2: "Alpenrock & Volksmusik" -> "Volksmusik bis Alpenrock"
  -- Quellband: d'Zechpreller. Revert: band_id 5e73f690-bb13-4be7-97a5-
  -- 94874e5a2939 zurueck auf repertoire_style_id 2a01cd55-cddf-4162-
  -- 87df-38759881f4fe (sort_order 1), Quellzeile zurueck auf 'active'.
  -----------------------------------------------------------------
  select id, slug, status into strict v_src_id, v_slug, v_status
  from public.repertoire_styles where id = '2a01cd55-cddf-4162-87df-38759881f4fe'::uuid;
  if v_slug <> 'alpenrock-volksmusik' or v_status <> 'active' then
    raise exception 'Merge 2 Guard: Quellzeile "Alpenrock & Volksmusik" weicht ab (slug=%, status=%)', v_slug, v_status;
  end if;

  select id, slug, status into strict v_tgt_id, v_slug, v_status
  from public.repertoire_styles where id = 'afa1967d-e581-4e41-bfb5-849a465a16ab'::uuid;
  if v_slug <> 'volksmusik-bis-alpenrock' or v_status <> 'active' then
    raise exception 'Merge 2 Guard: Zielzeile "Volksmusik bis Alpenrock" weicht ab (slug=%, status=%)', v_slug, v_status;
  end if;

  select coalesce(array_agg(band_id::text || '=' || sort_order::text order by band_id), array[]::text[])
  into v_assignments from public.band_repertoire_styles where repertoire_style_id = v_src_id;
  if v_assignments <> array['5e73f690-bb13-4be7-97a5-94874e5a2939=1'] then
    raise exception 'Merge 2 Guard: unerwartete Quell-Zuordnungen %', v_assignments;
  end if;

  if exists (
    select 1 from public.band_repertoire_styles where repertoire_style_id = v_tgt_id
      and band_id in (select band_id from public.band_repertoire_styles where repertoire_style_id = v_src_id)
  ) then
    raise exception 'Merge 2 Guard: mindestens eine Band besitzt bereits Quelle und Ziel gleichzeitig';
  end if;

  update public.band_repertoire_styles set repertoire_style_id = v_tgt_id where repertoire_style_id = v_src_id;
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then raise exception 'Merge 2: erwartete genau 1 umgehaengte Zeile, gefunden %', v_updated; end if;

  update public.repertoire_styles set status = 'archived' where id = v_src_id;

  -----------------------------------------------------------------
  -- Merge 3: "Alpenrock bis Schlager" -> "Alpenrock & Schlager"
  -- Quellband: De Zwiadn. Revert: band_id 344bdf8a-bcd9-4325-9b44-
  -- 714a65420672 zurueck auf repertoire_style_id c19dc3fa-d633-4c37-
  -- 876c-2320060fe5b1 (sort_order 1), Quellzeile zurueck auf 'active'.
  -----------------------------------------------------------------
  select id, slug, status into strict v_src_id, v_slug, v_status
  from public.repertoire_styles where id = 'c19dc3fa-d633-4c37-876c-2320060fe5b1'::uuid;
  if v_slug <> 'alpenrock-bis-schlager' or v_status <> 'active' then
    raise exception 'Merge 3 Guard: Quellzeile "Alpenrock bis Schlager" weicht ab (slug=%, status=%)', v_slug, v_status;
  end if;

  select id, slug, status into strict v_tgt_id, v_slug, v_status
  from public.repertoire_styles where id = '2055bc75-4205-41d5-8b19-cca0664c8127'::uuid;
  if v_slug <> 'alpenrock-schlager' or v_status <> 'active' then
    raise exception 'Merge 3 Guard: Zielzeile "Alpenrock & Schlager" weicht ab (slug=%, status=%)', v_slug, v_status;
  end if;

  select coalesce(array_agg(band_id::text || '=' || sort_order::text order by band_id), array[]::text[])
  into v_assignments from public.band_repertoire_styles where repertoire_style_id = v_src_id;
  if v_assignments <> array['344bdf8a-bcd9-4325-9b44-714a65420672=1'] then
    raise exception 'Merge 3 Guard: unerwartete Quell-Zuordnungen %', v_assignments;
  end if;

  if exists (
    select 1 from public.band_repertoire_styles where repertoire_style_id = v_tgt_id
      and band_id in (select band_id from public.band_repertoire_styles where repertoire_style_id = v_src_id)
  ) then
    raise exception 'Merge 3 Guard: mindestens eine Band besitzt bereits Quelle und Ziel gleichzeitig';
  end if;

  update public.band_repertoire_styles set repertoire_style_id = v_tgt_id where repertoire_style_id = v_src_id;
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then raise exception 'Merge 3: erwartete genau 1 umgehaengte Zeile, gefunden %', v_updated; end if;

  update public.repertoire_styles set status = 'archived' where id = v_src_id;

  -----------------------------------------------------------------
  -- Merge 4: "Klassiker & aktuelle Hits" / "Aktuelle Hits & Klassiker" /
  -- "Klassiker bis aktuelle Hits" -> "Klassiker & aktuelle Charts"
  -- (GESCHUETZTES Ziel, Referenzband 5toBeat -- wird NICHT umbenannt).
  -- Quellbands: extra ... die Band!, Hally Gally, SPOTLIGHT Eventband.
  -- Revert: band_id c8a602f8-434c-4a7f-892f-1ea65cf54b54 zurueck auf
  -- 56ac12e6-f250-4adb-9814-cb0742dc082f (sort_order 3); band_id
  -- 1ef5a9aa-f6b6-4c63-9a42-d1b95e5062c7 zurueck auf 4a364f68-e14f-
  -- 43ee-957e-9c4836e98317 (sort_order 1); band_id d4a98980-e215-454a-
  -- b6c7-8dc9395bf6d9 zurueck auf 9b23bc57-f937-458c-80b2-c871ad2659bc
  -- (sort_order 1). Alle drei Quellzeilen zurueck auf 'active'.
  -----------------------------------------------------------------
  select id, slug, status into strict v_tgt_id, v_slug, v_status
  from public.repertoire_styles where id = 'aa8edbf0-04b6-41f0-8a30-4c1d9e1cf6f1'::uuid;
  if v_slug <> 'klassiker-aktuelle-charts' or v_status <> 'active' then
    raise exception 'Merge 4 Guard: geschuetztes Ziel "Klassiker & aktuelle Charts" weicht ab (slug=%, status=%)', v_slug, v_status;
  end if;

  select id, slug, status into strict v_src_id, v_slug, v_status
  from public.repertoire_styles where id = '56ac12e6-f250-4adb-9814-cb0742dc082f'::uuid;
  if v_slug <> 'klassiker-aktuelle-hits' or v_status <> 'active' then
    raise exception 'Merge 4 Guard: Quellzeile "Klassiker & aktuelle Hits" weicht ab (slug=%, status=%)', v_slug, v_status;
  end if;

  select id, slug, status into strict v_src_id2, v_slug, v_status
  from public.repertoire_styles where id = '4a364f68-e14f-43ee-957e-9c4836e98317'::uuid;
  if v_slug <> 'aktuelle-hits-klassiker' or v_status <> 'active' then
    raise exception 'Merge 4 Guard: Quellzeile "Aktuelle Hits & Klassiker" weicht ab (slug=%, status=%)', v_slug, v_status;
  end if;

  select id, slug, status into strict v_src_id3, v_slug, v_status
  from public.repertoire_styles where id = '9b23bc57-f937-458c-80b2-c871ad2659bc'::uuid;
  if v_slug <> 'klassiker-bis-aktuelle-hits' or v_status <> 'active' then
    raise exception 'Merge 4 Guard: Quellzeile "Klassiker bis aktuelle Hits" weicht ab (slug=%, status=%)', v_slug, v_status;
  end if;

  select coalesce(array_agg(band_id::text || '=' || sort_order::text order by band_id), array[]::text[])
  into v_assignments from public.band_repertoire_styles where repertoire_style_id = v_src_id;
  if v_assignments <> array['c8a602f8-434c-4a7f-892f-1ea65cf54b54=3'] then
    raise exception 'Merge 4 Guard: unerwartete Zuordnungen "Klassiker & aktuelle Hits" %', v_assignments;
  end if;

  select coalesce(array_agg(band_id::text || '=' || sort_order::text order by band_id), array[]::text[])
  into v_assignments from public.band_repertoire_styles where repertoire_style_id = v_src_id2;
  if v_assignments <> array['1ef5a9aa-f6b6-4c63-9a42-d1b95e5062c7=1'] then
    raise exception 'Merge 4 Guard: unerwartete Zuordnungen "Aktuelle Hits & Klassiker" %', v_assignments;
  end if;

  select coalesce(array_agg(band_id::text || '=' || sort_order::text order by band_id), array[]::text[])
  into v_assignments from public.band_repertoire_styles where repertoire_style_id = v_src_id3;
  if v_assignments <> array['d4a98980-e215-454a-b6c7-8dc9395bf6d9=1'] then
    raise exception 'Merge 4 Guard: unerwartete Zuordnungen "Klassiker bis aktuelle Hits" %', v_assignments;
  end if;

  if exists (
    select 1 from public.band_repertoire_styles where repertoire_style_id = v_tgt_id
      and band_id in (
        select band_id from public.band_repertoire_styles where repertoire_style_id in (v_src_id, v_src_id2, v_src_id3)
      )
  ) then
    raise exception 'Merge 4 Guard: mindestens eine Band besitzt bereits eine der Quellen und das Ziel gleichzeitig';
  end if;

  update public.band_repertoire_styles set repertoire_style_id = v_tgt_id where repertoire_style_id = v_src_id;
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then raise exception 'Merge 4a: erwartete genau 1 umgehaengte Zeile, gefunden %', v_updated; end if;

  update public.band_repertoire_styles set repertoire_style_id = v_tgt_id where repertoire_style_id = v_src_id2;
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then raise exception 'Merge 4b: erwartete genau 1 umgehaengte Zeile, gefunden %', v_updated; end if;

  update public.band_repertoire_styles set repertoire_style_id = v_tgt_id where repertoire_style_id = v_src_id3;
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then raise exception 'Merge 4c: erwartete genau 1 umgehaengte Zeile, gefunden %', v_updated; end if;

  update public.repertoire_styles set status = 'archived' where id in (v_src_id, v_src_id2, v_src_id3);

  -----------------------------------------------------------------
  -- Merge 5: "Aktuelle Charts & Evergreens" -> "Evergreens bis aktuelle
  -- Charts". Vorab per ID eindeutig festgestellt: Quelle haengt an
  -- X'Ploushn, Ziel haengt an James Band.
  -- Revert: band_id bc44b34b-10c1-4532-bbad-ad5602295398 zurueck auf
  -- 0a02fd63-1d3f-41cb-ba5c-f725b19b79c6 (sort_order 2), Quellzeile
  -- zurueck auf 'active'.
  -----------------------------------------------------------------
  select id, slug, status into strict v_src_id, v_slug, v_status
  from public.repertoire_styles where id = '0a02fd63-1d3f-41cb-ba5c-f725b19b79c6'::uuid;
  if v_slug <> 'aktuelle-charts-evergreens' or v_status <> 'active' then
    raise exception 'Merge 5 Guard: Quellzeile "Aktuelle Charts & Evergreens" weicht ab (slug=%, status=%)', v_slug, v_status;
  end if;

  select id, slug, status into strict v_tgt_id, v_slug, v_status
  from public.repertoire_styles where id = '7e6d57e7-f348-400c-ba2e-bb735c49119d'::uuid;
  if v_slug <> 'evergreens-bis-aktuelle-charts' or v_status <> 'active' then
    raise exception 'Merge 5 Guard: Zielzeile "Evergreens bis aktuelle Charts" weicht ab (slug=%, status=%)', v_slug, v_status;
  end if;

  select coalesce(array_agg(band_id::text || '=' || sort_order::text order by band_id), array[]::text[])
  into v_assignments from public.band_repertoire_styles where repertoire_style_id = v_src_id;
  if v_assignments <> array['bc44b34b-10c1-4532-bbad-ad5602295398=2'] then
    raise exception 'Merge 5 Guard: unerwartete Quell-Zuordnungen (erwartet X''Ploushn) %', v_assignments;
  end if;

  select coalesce(array_agg(band_id::text || '=' || sort_order::text order by band_id), array[]::text[])
  into v_assignments from public.band_repertoire_styles where repertoire_style_id = v_tgt_id;
  if v_assignments <> array['a8206639-65be-476f-9dfd-6de10550af6a=2'] then
    raise exception 'Merge 5 Guard: unerwartete Ziel-Zuordnungen (erwartet James Band) %', v_assignments;
  end if;

  if exists (
    select 1 from public.band_repertoire_styles where repertoire_style_id = v_tgt_id
      and band_id in (select band_id from public.band_repertoire_styles where repertoire_style_id = v_src_id)
  ) then
    raise exception 'Merge 5 Guard: mindestens eine Band besitzt bereits Quelle und Ziel gleichzeitig';
  end if;

  update public.band_repertoire_styles set repertoire_style_id = v_tgt_id where repertoire_style_id = v_src_id;
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then raise exception 'Merge 5: erwartete genau 1 umgehaengte Zeile, gefunden %', v_updated; end if;

  update public.repertoire_styles set status = 'archived' where id = v_src_id;

  -----------------------------------------------------------------
  -- Merge 6: "Party-Hits & Evergreens" -> "Partyhits & Evergreens"
  -- (Schreibweise ohne Bindestrich ist verbindlich). Vorab per ID
  -- eindeutig festgestellt: Quelle haengt an Sommerwind, Ziel haengt an
  -- Non Stop.
  -- Revert: band_id 21530533-f0a9-409e-9d78-9af3d4ce46c2 zurueck auf
  -- a97585f5-bb3d-4b70-a85e-45af2ad34984 (sort_order 2), Quellzeile
  -- zurueck auf 'active'.
  -----------------------------------------------------------------
  select id, slug, status into strict v_src_id, v_slug, v_status
  from public.repertoire_styles where id = 'a97585f5-bb3d-4b70-a85e-45af2ad34984'::uuid;
  if v_slug <> 'party-hits-evergreens' or v_status <> 'active' then
    raise exception 'Merge 6 Guard: Quellzeile "Party-Hits & Evergreens" weicht ab (slug=%, status=%)', v_slug, v_status;
  end if;

  select id, slug, status into strict v_tgt_id, v_slug, v_status
  from public.repertoire_styles where id = 'fa2981cb-eef4-4e80-b3bc-0c02ec842f92'::uuid;
  if v_slug <> 'partyhits-evergreens' or v_status <> 'active' then
    raise exception 'Merge 6 Guard: Zielzeile "Partyhits & Evergreens" weicht ab (slug=%, status=%)', v_slug, v_status;
  end if;

  select coalesce(array_agg(band_id::text || '=' || sort_order::text order by band_id), array[]::text[])
  into v_assignments from public.band_repertoire_styles where repertoire_style_id = v_src_id;
  if v_assignments <> array['21530533-f0a9-409e-9d78-9af3d4ce46c2=2'] then
    raise exception 'Merge 6 Guard: unerwartete Quell-Zuordnungen (erwartet Sommerwind) %', v_assignments;
  end if;

  select coalesce(array_agg(band_id::text || '=' || sort_order::text order by band_id), array[]::text[])
  into v_assignments from public.band_repertoire_styles where repertoire_style_id = v_tgt_id;
  if v_assignments <> array['9cf10b17-9190-4da6-8c8c-9b05a03469f2=3'] then
    raise exception 'Merge 6 Guard: unerwartete Ziel-Zuordnungen (erwartet Non Stop) %', v_assignments;
  end if;

  if exists (
    select 1 from public.band_repertoire_styles where repertoire_style_id = v_tgt_id
      and band_id in (select band_id from public.band_repertoire_styles where repertoire_style_id = v_src_id)
  ) then
    raise exception 'Merge 6 Guard: mindestens eine Band besitzt bereits Quelle und Ziel gleichzeitig';
  end if;

  update public.band_repertoire_styles set repertoire_style_id = v_tgt_id where repertoire_style_id = v_src_id;
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then raise exception 'Merge 6: erwartete genau 1 umgehaengte Zeile, gefunden %', v_updated; end if;

  update public.repertoire_styles set status = 'archived' where id = v_src_id;

  -----------------------------------------------------------------
  -- Merge 7: "Volksmusik bis Rock-Klassiker" -> "Volksmusik bis
  -- Rockklassiker" (Schreibweise ohne Bindestrich ist verbindlich).
  -- Quellbands: Non Stop, Urwaidler.
  -- Revert: band_id 9cf10b17-9190-4da6-8c8c-9b05a03469f2 zurueck auf
  -- d118c3b2-41ff-4342-b831-dc96c9d46d69 (sort_order 2); band_id
  -- e48f142c-6ff5-4eb0-854f-8a0f9fb2d88f zurueck auf d118c3b2-41ff-4342-
  -- b831-dc96c9d46d69 (sort_order 1). Quellzeile zurueck auf 'active'.
  -----------------------------------------------------------------
  select id, slug, status into strict v_src_id, v_slug, v_status
  from public.repertoire_styles where id = 'd118c3b2-41ff-4342-b831-dc96c9d46d69'::uuid;
  if v_slug <> 'volksmusik-bis-rock-klassiker' or v_status <> 'active' then
    raise exception 'Merge 7 Guard: Quellzeile "Volksmusik bis Rock-Klassiker" weicht ab (slug=%, status=%)', v_slug, v_status;
  end if;

  select id, slug, status into strict v_tgt_id, v_slug, v_status
  from public.repertoire_styles where id = 'a74f64d5-8a2f-47aa-881c-8ad13f75c84b'::uuid;
  if v_slug <> 'volksmusik-bis-rockklassiker' or v_status <> 'active' then
    raise exception 'Merge 7 Guard: Zielzeile "Volksmusik bis Rockklassiker" weicht ab (slug=%, status=%)', v_slug, v_status;
  end if;

  select coalesce(array_agg(band_id::text || '=' || sort_order::text order by band_id), array[]::text[])
  into v_assignments from public.band_repertoire_styles where repertoire_style_id = v_src_id;
  if v_assignments <> array['9cf10b17-9190-4da6-8c8c-9b05a03469f2=2','e48f142c-6ff5-4eb0-854f-8a0f9fb2d88f=1'] then
    raise exception 'Merge 7 Guard: unerwartete Quell-Zuordnungen (erwartet Non Stop, Urwaidler) %', v_assignments;
  end if;

  select coalesce(array_agg(band_id::text || '=' || sort_order::text order by band_id), array[]::text[])
  into v_assignments from public.band_repertoire_styles where repertoire_style_id = v_tgt_id;
  if v_assignments <> array['21530533-f0a9-409e-9d78-9af3d4ce46c2=1','42cbccd1-4907-457e-a985-915471ef0723=1','e330f96c-ee21-4130-b7bb-fc6459918e94=1'] then
    raise exception 'Merge 7 Guard: unerwartete Ziel-Zuordnungen (erwartet De Gaudimacha, Die Gseea Wepsn, Sommerwind) %', v_assignments;
  end if;

  if exists (
    select 1 from public.band_repertoire_styles where repertoire_style_id = v_tgt_id
      and band_id in (select band_id from public.band_repertoire_styles where repertoire_style_id = v_src_id)
  ) then
    raise exception 'Merge 7 Guard: mindestens eine Band besitzt bereits Quelle und Ziel gleichzeitig';
  end if;

  update public.band_repertoire_styles set repertoire_style_id = v_tgt_id where repertoire_style_id = v_src_id;
  get diagnostics v_updated = row_count;
  if v_updated <> 2 then raise exception 'Merge 7: erwartete genau 2 umgehaengte Zeilen, gefunden %', v_updated; end if;

  update public.repertoire_styles set status = 'archived' where id = v_src_id;

  -----------------------------------------------------------------
  -- Merge 8: "Schlager bis Rock-Klassiker" -> "Rockklassiker & Schlager"
  -- (GESCHUETZTES Ziel, Referenzband SaKrisch -- wird NICHT umbenannt).
  -- Quellband: d'Zechpreller.
  -- Revert: band_id 5e73f690-bb13-4be7-97a5-94874e5a2939 zurueck auf
  -- dee583b1-1543-4cc4-b8da-f49214dd5bf2 (sort_order 2), Quellzeile
  -- zurueck auf 'active'.
  -----------------------------------------------------------------
  select id, slug, status into strict v_src_id, v_slug, v_status
  from public.repertoire_styles where id = 'dee583b1-1543-4cc4-b8da-f49214dd5bf2'::uuid;
  if v_slug <> 'schlager-bis-rock-klassiker' or v_status <> 'active' then
    raise exception 'Merge 8 Guard: Quellzeile "Schlager bis Rock-Klassiker" weicht ab (slug=%, status=%)', v_slug, v_status;
  end if;

  select id, slug, status into strict v_tgt_id, v_slug, v_status
  from public.repertoire_styles where id = 'd88ed3aa-025a-44a2-aa6b-4566b02651df'::uuid;
  if v_slug <> 'rockklassiker-schlager' or v_status <> 'active' then
    raise exception 'Merge 8 Guard: geschuetztes Ziel "Rockklassiker & Schlager" weicht ab (slug=%, status=%)', v_slug, v_status;
  end if;

  select coalesce(array_agg(band_id::text || '=' || sort_order::text order by band_id), array[]::text[])
  into v_assignments from public.band_repertoire_styles where repertoire_style_id = v_src_id;
  if v_assignments <> array['5e73f690-bb13-4be7-97a5-94874e5a2939=2'] then
    raise exception 'Merge 8 Guard: unerwartete Quell-Zuordnungen (erwartet d''Zechpreller) %', v_assignments;
  end if;

  if exists (
    select 1 from public.band_repertoire_styles where repertoire_style_id = v_tgt_id
      and band_id in (select band_id from public.band_repertoire_styles where repertoire_style_id = v_src_id)
  ) then
    raise exception 'Merge 8 Guard: mindestens eine Band besitzt bereits Quelle und Ziel gleichzeitig';
  end if;

  update public.band_repertoire_styles set repertoire_style_id = v_tgt_id where repertoire_style_id = v_src_id;
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then raise exception 'Merge 8: erwartete genau 1 umgehaengte Zeile, gefunden %', v_updated; end if;

  update public.repertoire_styles set status = 'archived' where id = v_src_id;

  -----------------------------------------------------------------
  -- Ab hier: 3 reine Umbenennungen ("gemischt" entfernen). id, slug,
  -- status, sort_order, description und band_repertoire_styles bleiben
  -- unveraendert -- es aendert sich ausschliesslich name.
  -----------------------------------------------------------------

  -----------------------------------------------------------------
  -- Rename 1: "Charts & Klassiker gemischt" -> "Charts & Klassiker"
  -- Band: Onesee. Revert: name zurueck auf 'Charts & Klassiker gemischt'.
  -----------------------------------------------------------------
  select id, name, slug, status, sort_order into strict v_src_id, v_name, v_slug, v_status, v_sort_order
  from public.repertoire_styles where id = '36920071-d602-491f-85a1-ab8fefc7ebd6'::uuid;
  if v_name <> 'Charts & Klassiker gemischt' or v_slug <> 'charts-klassiker-gemischt' or v_status <> 'active' then
    raise exception 'Rename 1 Guard: Ausgangszeile weicht ab (name=%, slug=%, status=%)', v_name, v_slug, v_status;
  end if;

  select count(*) into v_name_collisions from public.repertoire_styles where name = 'Charts & Klassiker' and id <> v_src_id;
  select count(*) into v_slug_collisions from public.repertoire_styles where slug = 'charts-klassiker' and id <> v_src_id;
  if v_name_collisions <> 0 or v_slug_collisions <> 0 then
    raise exception 'Rename 1 Guard: unerwartete Namens- oder Slug-Kollision mit "Charts & Klassiker" (name_hits=%, slug_hits=%)', v_name_collisions, v_slug_collisions;
  end if;

  update public.repertoire_styles set name = 'Charts & Klassiker' where id = v_src_id;

  -----------------------------------------------------------------
  -- Rename 2: "Schlager & Rock gemischt" -> "Schlager & Rock"
  -- Band: Die WoidRocker. Revert: name zurueck auf 'Schlager & Rock
  -- gemischt'.
  -----------------------------------------------------------------
  select id, name, slug, status, sort_order into strict v_src_id, v_name, v_slug, v_status, v_sort_order
  from public.repertoire_styles where id = '0f7e367a-680a-461a-b9c6-eceeab86e1d6'::uuid;
  if v_name <> 'Schlager & Rock gemischt' or v_slug <> 'schlager-rock-gemischt' or v_status <> 'active' then
    raise exception 'Rename 2 Guard: Ausgangszeile weicht ab (name=%, slug=%, status=%)', v_name, v_slug, v_status;
  end if;

  select count(*) into v_name_collisions from public.repertoire_styles where name = 'Schlager & Rock' and id <> v_src_id;
  select count(*) into v_slug_collisions from public.repertoire_styles where slug = 'schlager-rock' and id <> v_src_id;
  if v_name_collisions <> 0 or v_slug_collisions <> 0 then
    raise exception 'Rename 2 Guard: unerwartete Namens- oder Slug-Kollision mit "Schlager & Rock" (name_hits=%, slug_hits=%)', v_name_collisions, v_slug_collisions;
  end if;

  update public.repertoire_styles set name = 'Schlager & Rock' where id = v_src_id;

  -----------------------------------------------------------------
  -- Rename 3: "Bayerisch & Rock gemischt" -> "Bayerisch & Rock"
  -- Band: zruck zu Dir!. Revert: name zurueck auf 'Bayerisch & Rock
  -- gemischt'.
  -----------------------------------------------------------------
  select id, name, slug, status, sort_order into strict v_src_id, v_name, v_slug, v_status, v_sort_order
  from public.repertoire_styles where id = 'a8138c0e-2139-40ee-810e-eb6077e7784a'::uuid;
  if v_name <> 'Bayerisch & Rock gemischt' or v_slug <> 'bayerisch-rock-gemischt' or v_status <> 'active' then
    raise exception 'Rename 3 Guard: Ausgangszeile weicht ab (name=%, slug=%, status=%)', v_name, v_slug, v_status;
  end if;

  select count(*) into v_name_collisions from public.repertoire_styles where name = 'Bayerisch & Rock' and id <> v_src_id;
  select count(*) into v_slug_collisions from public.repertoire_styles where slug = 'bayerisch-rock' and id <> v_src_id;
  if v_name_collisions <> 0 or v_slug_collisions <> 0 then
    raise exception 'Rename 3 Guard: unerwartete Namens- oder Slug-Kollision mit "Bayerisch & Rock" (name_hits=%, slug_hits=%)', v_name_collisions, v_slug_collisions;
  end if;

  update public.repertoire_styles set name = 'Bayerisch & Rock' where id = v_src_id;

  -----------------------------------------------------------------
  -- Sonderfall Let's Fetz: bewusst KEINE Schreiboperation (siehe
  -- Dateikommentar oben). "Bayerisch bis Aktuell" (id f913ca6b-4f56-
  -- 4f7f-b6be-53824e7bf880) bleibt unangetastet.
  -----------------------------------------------------------------

  -----------------------------------------------------------------
  -- Globaler Postcheck: Zaehlwerte muessen exakt 309 aktiv / 13
  -- archiviert / 322 gesamt / 340 Zuordnungen ergeben (10 archivierte
  -- Quellzeilen aus 8 Zusammenfuehrungen, 3 reine Umbenennungen ohne
  -- Statusaenderung, kein Zuordnungs-Zeilenverlust/-zuwachs).
  -----------------------------------------------------------------
  select count(*) filter (where status = 'active'),
         count(*) filter (where status = 'archived'),
         count(*)
  into v_active_count_after, v_archived_count_after, v_total_count_after
  from public.repertoire_styles;

  select count(*) into v_brs_count_after from public.band_repertoire_styles;

  if v_active_count_after <> 309 or v_archived_count_after <> 13 or v_total_count_after <> 322 then
    raise exception 'Postcheck: unerwarteter Endbestand repertoire_styles -- aktiv=%, archiviert=%, gesamt=% (erwartet 309/13/322)',
      v_active_count_after, v_archived_count_after, v_total_count_after;
  end if;

  if v_brs_count_after <> 340 then
    raise exception 'Postcheck: unerwartete Zeilenzahl band_repertoire_styles nach Migration -- gefunden=% (erwartet 340, unveraendert)', v_brs_count_after;
  end if;

  -----------------------------------------------------------------
  -- Postcheck Fingerprint der 7 geschuetzten Referenzbands -- muss
  -- exakt identisch zum vor der Migration erfassten Wert sein.
  -----------------------------------------------------------------
  select coalesce(array_agg(repertoire_style_id::text || '=' || sort_order::text order by repertoire_style_id), array[]::text[])
  into v_fp_2unplugged_after from public.band_repertoire_styles where band_id = 'f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid;
  select coalesce(array_agg(repertoire_style_id::text || '=' || sort_order::text order by repertoire_style_id), array[]::text[])
  into v_fp_5tobeat_after from public.band_repertoire_styles where band_id = '354e2447-41f0-487a-a46d-a2d209dc890b'::uuid;
  select coalesce(array_agg(repertoire_style_id::text || '=' || sort_order::text order by repertoire_style_id), array[]::text[])
  into v_fp_9to5_after from public.band_repertoire_styles where band_id = '098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid;
  select coalesce(array_agg(repertoire_style_id::text || '=' || sort_order::text order by repertoire_style_id), array[]::text[])
  into v_fp_entprima_after from public.band_repertoire_styles where band_id = '82acc533-07d3-4479-82fe-31983711a3e0'::uuid;
  select coalesce(array_agg(repertoire_style_id::text || '=' || sort_order::text order by repertoire_style_id), array[]::text[])
  into v_fp_herbnbeets_after from public.band_repertoire_styles where band_id = '332dfade-6e61-4f6e-b33d-23a03b610d24'::uuid;
  select coalesce(array_agg(repertoire_style_id::text || '=' || sort_order::text order by repertoire_style_id), array[]::text[])
  into v_fp_hobnou_after from public.band_repertoire_styles where band_id = '65a12d3a-c654-46b7-b738-0feb94fc7e8a'::uuid;
  select coalesce(array_agg(repertoire_style_id::text || '=' || sort_order::text order by repertoire_style_id), array[]::text[])
  into v_fp_sakrisch_after from public.band_repertoire_styles where band_id = '5c9bdb9e-d3ad-4950-aa22-7a3aedfb61db'::uuid;

  if v_fp_2unplugged_after <> v_fp_2unplugged_before then
    raise exception 'Postcheck: Fingerprint "2 unplugged" hat sich veraendert (vorher=%, nachher=%)', v_fp_2unplugged_before, v_fp_2unplugged_after;
  end if;
  if v_fp_5tobeat_after <> v_fp_5tobeat_before then
    raise exception 'Postcheck: Fingerprint "5toBeat" hat sich veraendert (vorher=%, nachher=%)', v_fp_5tobeat_before, v_fp_5tobeat_after;
  end if;
  if v_fp_9to5_after <> v_fp_9to5_before then
    raise exception 'Postcheck: Fingerprint "9to5" hat sich veraendert (vorher=%, nachher=%)', v_fp_9to5_before, v_fp_9to5_after;
  end if;
  if v_fp_entprima_after <> v_fp_entprima_before then
    raise exception 'Postcheck: Fingerprint "Entprima Live" hat sich veraendert (vorher=%, nachher=%)', v_fp_entprima_before, v_fp_entprima_after;
  end if;
  if v_fp_herbnbeets_after <> v_fp_herbnbeets_before then
    raise exception 'Postcheck: Fingerprint "Herb''n Beets" hat sich veraendert (vorher=%, nachher=%)', v_fp_herbnbeets_before, v_fp_herbnbeets_after;
  end if;
  if v_fp_hobnou_after <> v_fp_hobnou_before then
    raise exception 'Postcheck: Fingerprint "Hob Nou" hat sich veraendert (vorher=%, nachher=%)', v_fp_hobnou_before, v_fp_hobnou_after;
  end if;
  if v_fp_sakrisch_after <> v_fp_sakrisch_before then
    raise exception 'Postcheck: Fingerprint "SaKrisch" hat sich veraendert (vorher=%, nachher=%)', v_fp_sakrisch_before, v_fp_sakrisch_after;
  end if;

  raise notice 'repertoire_style_catalog_cleanup erfolgreich: % aktiv / % archiviert / % gesamt, % Zuordnungen (unveraendert). Alle 7 geschuetzten Referenzband-Fingerprints unveraendert bestaetigt.',
    v_active_count_after, v_archived_count_after, v_total_count_after, v_brs_count_after;
end $$;

commit;
