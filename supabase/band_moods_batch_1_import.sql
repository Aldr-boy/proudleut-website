-- ============================================================
-- band_moods_batch_1_import.sql
--
-- Einmaliger Production-Import: Batch 1 des "Klingt nach"-Rollouts.
-- Fuegt fuer 14 fachlich freigegebene Bands insgesamt 32 kuratierte
-- band_moods-Zuordnungen ein. Ausschliesslich INSERT, kein DELETE,
-- kein UPDATE, kein UPSERT. Keine Aenderung an anderen Bands, an
-- moods, an Donnaweda oder an Bigband STEINBACH. Hochdruck Böhmische
-- ist ausdruecklich NICHT Teil dieses Batches (zurueckgestellt,
-- keine Ersatz- oder Notloesung).
--
-- Minimal-robuster Guard-Ansatz (kein Dual-State-System wie B2 --
-- dieser Import ist naturgemaess einmalig: existiert fuer eine der
-- 14 Bands bereits eine band_moods-Zeile, bricht Guard 4 kontrolliert
-- ab, statt einen No-op-Pfad zu simulieren).
--
-- Die 32 Soll-Zuordnungen werden als literale (values ...)-Liste
-- mehrfach innerhalb dieses Blocks referenziert (keine Temp-Table,
-- keine Persistenz ueber das Skriptende hinaus -- B1-Praezedenz).
--
-- Schutz der 7 bestehenden band_moods-Zeilen ausserhalb des Batches
-- (Donnaweda, Bigband STEINBACH): kompakter Vorher-/Nachher-Vergleich
-- (COUNT + deterministisches Aggregat) ausschliesslich fuer Zeilen
-- mit band_id NICHT in den 14 Batch-Bands -- kein universelles
-- Fingerprint-System.
-- ============================================================

-- ============================================================
-- AUSFUEHRUNGS- UND VERIFIKATIONSVERMERK
--
-- Ausgefuehrt: 19.07.2026, durch Xandi im Supabase SQL Editor gegen
-- Production.
--
-- Erster Versuch: fehlgeschlagen. Abbruch innerhalb der Transaktion
-- mit "ERROR: 42883: operator does not exist: integer[] <> bigint[]"
-- in Guard 7+8 (sort_order lueckenlos ab 1, max 4 pro Band). Ursache:
-- die lokale Variable n (aus count(*), immer bigint) wurde
-- unveraendert an generate_series(1, n) uebergeben, wodurch die
-- generate_series(bigint, bigint)-Ueberladung griff und array_agg(g)
-- bigint[] statt integer[] lieferte -- inkompatibel mit orders
-- (integer[], abgeleitet aus den sort_order-Literalen der
-- Soll-Liste). Da die Transaktion vor COMMIT abbrach, wurde nichts
-- persistiert; das anschliessende Verify bestaetigte 0 Zeilen fuer
-- alle 14 Batch-Bands.
--
-- Minimale Korrektur: generate_series(1, n) -> generate_series(1,
-- n::int) -- erzwingt die generate_series(int, int)-Ueberladung,
-- wodurch beide Seiten des Vergleichs integer[] sind. Keine sonstige
-- Zeile veraendert; die Korrektur ist Bestandteil des unten stehenden
-- ausfuehrbaren SQL.
--
-- Zweiter Versuch: erfolgreich. Ergebnis "Success. No rows
-- returned".
--
-- Verify-Ergebnis (supabase/band_moods_batch_1_verify.sql, separat
-- ausgefuehrt): 19 Zeilen, alle match = true. 14 von 14 Batch-Bands
-- exakt passend, 32 tatsaechliche Zuordnungen. Donnaweda und Bigband
-- STEINBACH unveraendert (3 bzw. 4 Zeilen, identisch zum
-- dokumentierten Vorzustand). Insgesamt 16 Baender mit mindestens
-- einem band_moods-Eintrag. Steuerungszahl: 15 von 141 (14
-- Batch-Bands + Donnaweda; Bigband STEINBACH zaehlt weiterhin nicht
-- als fertig).
-- ============================================================

begin;

do $$
declare
  v_expected_row_count   integer;
  v_distinct_band_count  integer;
  v_distinct_mood_count  integer;
  v_dup_slug_count       integer;
  v_gap_or_limit_count   integer;
  v_over_limit_count     integer;

  v_missing_or_uncohort  integer;
  v_bad_mood_count       integer;
  v_existing_conflict    integer;

  v_bm_other_before_count       integer;
  v_bm_other_before_fingerprint text;
  v_bm_other_after_count        integer;
  v_bm_other_after_fingerprint  text;

  v_distinct_bands_before integer;
  v_distinct_bands_after  integer;

  v_inserted_count        integer;
  v_mismatch_count        integer;
  v_extra_count           integer;
begin
  -----------------------------------------------------------------
  -- Guard 5: exakt 32 Soll-Zuordnungen im Skript selbst definiert
  -----------------------------------------------------------------
  select count(*)
  into v_expected_row_count
  from (
    values
      ('ba000002-0000-0000-0000-000000000001'::uuid, 'festzeltenergie', 1),
      ('ba000002-0000-0000-0000-000000000001'::uuid, 'bayerisch-frech', 2),
      ('ba000002-0000-0000-0000-000000000001'::uuid, 'rockig-mitreissend', 3),
      ('ba000002-0000-0000-0000-000000000001'::uuid, 'generationenverbindend', 4),
      ('6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid, 'festzeltenergie', 1),
      ('6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid, 'party-pur', 2),
      ('f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid, 'lagerfeuer-atmosphaere', 1),
      ('f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid, 'mitsing-faktor', 2),
      ('098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid, 'konzertant-hochwertig', 1),
      ('098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid, 'generationenverbindend', 2),
      ('712f40db-723f-4fea-a204-13f68f62b819'::uuid, 'emotional-beruehrend', 1),
      ('712f40db-723f-4fea-a204-13f68f62b819'::uuid, 'herzlich-nahbar', 2),
      ('d7bf4672-364f-4807-a80c-8f2031d69093'::uuid, 'authentisch-handgemacht', 1),
      ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'bayerisch-frech', 1),
      ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'festlich-ausgelassen', 2),
      ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'rockig-mitreissend', 3),
      ('aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid, 'authentisch-handgemacht', 1),
      ('aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid, 'herzlich-nahbar', 2),
      ('180c5296-8440-4540-a8f8-60ee16333259'::uuid, 'tanzflaechen-garantie', 1),
      ('180c5296-8440-4540-a8f8-60ee16333259'::uuid, 'generationenverbindend', 2),
      ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'tanzflaechen-garantie', 1),
      ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'rockig-mitreissend', 2),
      ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'mitsing-faktor', 3),
      ('e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid, 'emotional-beruehrend', 1),
      ('e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid, 'herzlich-nahbar', 2),
      ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'festzeltenergie', 1),
      ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'rockig-mitreissend', 2),
      ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'generationenverbindend', 3),
      ('3365db14-dbcd-41a5-8801-ca535a80c3a3'::uuid, 'rockig-mitreissend', 1),
      ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'tanzflaechen-garantie', 1),
      ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'generationenverbindend', 2),
      ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'rockig-mitreissend', 3)
  ) as expected(band_id, mood_slug, sort_order);

  if v_expected_row_count <> 32 then
    raise exception 'Batch1 guard: erwartete 32 Soll-Zuordnungen im Skript, gefunden %', v_expected_row_count;
  end if;

  select count(distinct band_id)
  into v_distinct_band_count
  from (
    values
      ('ba000002-0000-0000-0000-000000000001'::uuid, 'festzeltenergie', 1),
      ('ba000002-0000-0000-0000-000000000001'::uuid, 'bayerisch-frech', 2),
      ('ba000002-0000-0000-0000-000000000001'::uuid, 'rockig-mitreissend', 3),
      ('ba000002-0000-0000-0000-000000000001'::uuid, 'generationenverbindend', 4),
      ('6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid, 'festzeltenergie', 1),
      ('6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid, 'party-pur', 2),
      ('f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid, 'lagerfeuer-atmosphaere', 1),
      ('f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid, 'mitsing-faktor', 2),
      ('098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid, 'konzertant-hochwertig', 1),
      ('098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid, 'generationenverbindend', 2),
      ('712f40db-723f-4fea-a204-13f68f62b819'::uuid, 'emotional-beruehrend', 1),
      ('712f40db-723f-4fea-a204-13f68f62b819'::uuid, 'herzlich-nahbar', 2),
      ('d7bf4672-364f-4807-a80c-8f2031d69093'::uuid, 'authentisch-handgemacht', 1),
      ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'bayerisch-frech', 1),
      ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'festlich-ausgelassen', 2),
      ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'rockig-mitreissend', 3),
      ('aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid, 'authentisch-handgemacht', 1),
      ('aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid, 'herzlich-nahbar', 2),
      ('180c5296-8440-4540-a8f8-60ee16333259'::uuid, 'tanzflaechen-garantie', 1),
      ('180c5296-8440-4540-a8f8-60ee16333259'::uuid, 'generationenverbindend', 2),
      ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'tanzflaechen-garantie', 1),
      ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'rockig-mitreissend', 2),
      ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'mitsing-faktor', 3),
      ('e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid, 'emotional-beruehrend', 1),
      ('e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid, 'herzlich-nahbar', 2),
      ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'festzeltenergie', 1),
      ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'rockig-mitreissend', 2),
      ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'generationenverbindend', 3),
      ('3365db14-dbcd-41a5-8801-ca535a80c3a3'::uuid, 'rockig-mitreissend', 1),
      ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'tanzflaechen-garantie', 1),
      ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'generationenverbindend', 2),
      ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'rockig-mitreissend', 3)
  ) as expected(band_id, mood_slug, sort_order);

  if v_distinct_band_count <> 14 then
    raise exception 'Batch1 guard: erwartete 14 distinkte Band-IDs in der Soll-Liste, gefunden %', v_distinct_band_count;
  end if;

  select count(distinct mood_slug)
  into v_distinct_mood_count
  from (
    values
      ('ba000002-0000-0000-0000-000000000001'::uuid, 'festzeltenergie', 1),
      ('ba000002-0000-0000-0000-000000000001'::uuid, 'bayerisch-frech', 2),
      ('ba000002-0000-0000-0000-000000000001'::uuid, 'rockig-mitreissend', 3),
      ('ba000002-0000-0000-0000-000000000001'::uuid, 'generationenverbindend', 4),
      ('6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid, 'festzeltenergie', 1),
      ('6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid, 'party-pur', 2),
      ('f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid, 'lagerfeuer-atmosphaere', 1),
      ('f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid, 'mitsing-faktor', 2),
      ('098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid, 'konzertant-hochwertig', 1),
      ('098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid, 'generationenverbindend', 2),
      ('712f40db-723f-4fea-a204-13f68f62b819'::uuid, 'emotional-beruehrend', 1),
      ('712f40db-723f-4fea-a204-13f68f62b819'::uuid, 'herzlich-nahbar', 2),
      ('d7bf4672-364f-4807-a80c-8f2031d69093'::uuid, 'authentisch-handgemacht', 1),
      ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'bayerisch-frech', 1),
      ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'festlich-ausgelassen', 2),
      ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'rockig-mitreissend', 3),
      ('aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid, 'authentisch-handgemacht', 1),
      ('aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid, 'herzlich-nahbar', 2),
      ('180c5296-8440-4540-a8f8-60ee16333259'::uuid, 'tanzflaechen-garantie', 1),
      ('180c5296-8440-4540-a8f8-60ee16333259'::uuid, 'generationenverbindend', 2),
      ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'tanzflaechen-garantie', 1),
      ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'rockig-mitreissend', 2),
      ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'mitsing-faktor', 3),
      ('e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid, 'emotional-beruehrend', 1),
      ('e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid, 'herzlich-nahbar', 2),
      ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'festzeltenergie', 1),
      ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'rockig-mitreissend', 2),
      ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'generationenverbindend', 3),
      ('3365db14-dbcd-41a5-8801-ca535a80c3a3'::uuid, 'rockig-mitreissend', 1),
      ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'tanzflaechen-garantie', 1),
      ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'generationenverbindend', 2),
      ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'rockig-mitreissend', 3)
  ) as expected(band_id, mood_slug, sort_order);

  if v_distinct_mood_count <> 13 then
    raise exception 'Batch1 guard: erwartete 13 distinkte Mood-Slugs in der Soll-Liste, gefunden %', v_distinct_mood_count;
  end if;

  -----------------------------------------------------------------
  -- Guard 6: pro Band keine doppelten Mood-Slugs
  -----------------------------------------------------------------
  select count(*)
  into v_dup_slug_count
  from (
    select band_id, mood_slug, count(*) as c
    from (
      values
        ('ba000002-0000-0000-0000-000000000001'::uuid, 'festzeltenergie', 1),
        ('ba000002-0000-0000-0000-000000000001'::uuid, 'bayerisch-frech', 2),
        ('ba000002-0000-0000-0000-000000000001'::uuid, 'rockig-mitreissend', 3),
        ('ba000002-0000-0000-0000-000000000001'::uuid, 'generationenverbindend', 4),
        ('6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid, 'festzeltenergie', 1),
        ('6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid, 'party-pur', 2),
        ('f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid, 'lagerfeuer-atmosphaere', 1),
        ('f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid, 'mitsing-faktor', 2),
        ('098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid, 'konzertant-hochwertig', 1),
        ('098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid, 'generationenverbindend', 2),
        ('712f40db-723f-4fea-a204-13f68f62b819'::uuid, 'emotional-beruehrend', 1),
        ('712f40db-723f-4fea-a204-13f68f62b819'::uuid, 'herzlich-nahbar', 2),
        ('d7bf4672-364f-4807-a80c-8f2031d69093'::uuid, 'authentisch-handgemacht', 1),
        ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'bayerisch-frech', 1),
        ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'festlich-ausgelassen', 2),
        ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'rockig-mitreissend', 3),
        ('aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid, 'authentisch-handgemacht', 1),
        ('aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid, 'herzlich-nahbar', 2),
        ('180c5296-8440-4540-a8f8-60ee16333259'::uuid, 'tanzflaechen-garantie', 1),
        ('180c5296-8440-4540-a8f8-60ee16333259'::uuid, 'generationenverbindend', 2),
        ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'tanzflaechen-garantie', 1),
        ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'rockig-mitreissend', 2),
        ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'mitsing-faktor', 3),
        ('e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid, 'emotional-beruehrend', 1),
        ('e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid, 'herzlich-nahbar', 2),
        ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'festzeltenergie', 1),
        ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'rockig-mitreissend', 2),
        ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'generationenverbindend', 3),
        ('3365db14-dbcd-41a5-8801-ca535a80c3a3'::uuid, 'rockig-mitreissend', 1),
        ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'tanzflaechen-garantie', 1),
        ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'generationenverbindend', 2),
        ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'rockig-mitreissend', 3)
    ) as expected(band_id, mood_slug, sort_order)
    group by band_id, mood_slug
    having count(*) > 1
  ) dups;

  if v_dup_slug_count <> 0 then
    raise exception 'Batch1 guard: % Band(s) mit doppeltem Mood-Slug in der Soll-Liste', v_dup_slug_count;
  end if;

  -----------------------------------------------------------------
  -- Guard 7+8: sort_order pro Band lueckenlos ab 1, max 4 pro Band
  -----------------------------------------------------------------
  select count(*)
  into v_gap_or_limit_count
  from (
    select band_id,
           count(*) as n,
           array_agg(sort_order order by sort_order) as orders
    from (
      values
        ('ba000002-0000-0000-0000-000000000001'::uuid, 'festzeltenergie', 1),
        ('ba000002-0000-0000-0000-000000000001'::uuid, 'bayerisch-frech', 2),
        ('ba000002-0000-0000-0000-000000000001'::uuid, 'rockig-mitreissend', 3),
        ('ba000002-0000-0000-0000-000000000001'::uuid, 'generationenverbindend', 4),
        ('6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid, 'festzeltenergie', 1),
        ('6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid, 'party-pur', 2),
        ('f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid, 'lagerfeuer-atmosphaere', 1),
        ('f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid, 'mitsing-faktor', 2),
        ('098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid, 'konzertant-hochwertig', 1),
        ('098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid, 'generationenverbindend', 2),
        ('712f40db-723f-4fea-a204-13f68f62b819'::uuid, 'emotional-beruehrend', 1),
        ('712f40db-723f-4fea-a204-13f68f62b819'::uuid, 'herzlich-nahbar', 2),
        ('d7bf4672-364f-4807-a80c-8f2031d69093'::uuid, 'authentisch-handgemacht', 1),
        ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'bayerisch-frech', 1),
        ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'festlich-ausgelassen', 2),
        ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'rockig-mitreissend', 3),
        ('aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid, 'authentisch-handgemacht', 1),
        ('aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid, 'herzlich-nahbar', 2),
        ('180c5296-8440-4540-a8f8-60ee16333259'::uuid, 'tanzflaechen-garantie', 1),
        ('180c5296-8440-4540-a8f8-60ee16333259'::uuid, 'generationenverbindend', 2),
        ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'tanzflaechen-garantie', 1),
        ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'rockig-mitreissend', 2),
        ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'mitsing-faktor', 3),
        ('e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid, 'emotional-beruehrend', 1),
        ('e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid, 'herzlich-nahbar', 2),
        ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'festzeltenergie', 1),
        ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'rockig-mitreissend', 2),
        ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'generationenverbindend', 3),
        ('3365db14-dbcd-41a5-8801-ca535a80c3a3'::uuid, 'rockig-mitreissend', 1),
        ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'tanzflaechen-garantie', 1),
        ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'generationenverbindend', 2),
        ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'rockig-mitreissend', 3)
    ) as expected(band_id, mood_slug, sort_order)
    group by band_id
  ) per_band
  where n > 4
     or orders <> (select array_agg(g) from generate_series(1, n::int) g);

  if v_gap_or_limit_count <> 0 then
    raise exception 'Batch1 guard: % Band(s) mit sort_order-Luecke, falscher Startwert oder mehr als 4 Zuordnungen', v_gap_or_limit_count;
  end if;

  -----------------------------------------------------------------
  -- Guard 1+2: alle 14 Band-IDs existieren UND gehoeren zur
  -- oeffentlich relevanten Rollout-Kohorte (status=active,
  -- is_published=true)
  -----------------------------------------------------------------
  select count(*)
  into v_missing_or_uncohort
  from (
    select distinct band_id
    from (
      values
        ('ba000002-0000-0000-0000-000000000001'::uuid),
        ('6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid),
        ('f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid),
        ('098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid),
        ('712f40db-723f-4fea-a204-13f68f62b819'::uuid),
        ('d7bf4672-364f-4807-a80c-8f2031d69093'::uuid),
        ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid),
        ('aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid),
        ('180c5296-8440-4540-a8f8-60ee16333259'::uuid),
        ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid),
        ('e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid),
        ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid),
        ('3365db14-dbcd-41a5-8801-ca535a80c3a3'::uuid),
        ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid)
    ) as batch_ids(band_id)
  ) bi
  left join public.bands b on b.id = bi.band_id
  where b.id is null or b.status <> 'active' or b.is_published <> true;

  if v_missing_or_uncohort <> 0 then
    raise exception 'Batch1 guard: % Band(s) fehlen oder gehoeren nicht zur Rollout-Kohorte (status=active, is_published=true)', v_missing_or_uncohort;
  end if;

  -----------------------------------------------------------------
  -- Guard 3: alle 13 Mood-Slugs existieren und sind active
  -----------------------------------------------------------------
  select count(*)
  into v_bad_mood_count
  from (
    select distinct mood_slug
    from (
      values
        ('festzeltenergie'), ('bayerisch-frech'), ('rockig-mitreissend'),
        ('generationenverbindend'), ('party-pur'), ('lagerfeuer-atmosphaere'),
        ('mitsing-faktor'), ('konzertant-hochwertig'), ('emotional-beruehrend'),
        ('herzlich-nahbar'), ('authentisch-handgemacht'), ('festlich-ausgelassen'),
        ('tanzflaechen-garantie')
    ) as batch_moods(mood_slug)
  ) bm
  left join public.moods m on m.slug = bm.mood_slug
  where m.id is null or m.status <> 'active';

  if v_bad_mood_count <> 0 then
    raise exception 'Batch1 guard: % Mood-Slug(s) fehlen oder sind nicht active', v_bad_mood_count;
  end if;

  -----------------------------------------------------------------
  -- Guard 4: fuer keine der 14 Bands existiert bereits eine
  -- band_moods-Zeile
  -----------------------------------------------------------------
  select count(*)
  into v_existing_conflict
  from public.band_moods bm
  where bm.band_id in (
    values
      ('ba000002-0000-0000-0000-000000000001'::uuid),
      ('6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid),
      ('f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid),
      ('098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid),
      ('712f40db-723f-4fea-a204-13f68f62b819'::uuid),
      ('d7bf4672-364f-4807-a80c-8f2031d69093'::uuid),
      ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid),
      ('aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid),
      ('180c5296-8440-4540-a8f8-60ee16333259'::uuid),
      ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid),
      ('e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid),
      ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid),
      ('3365db14-dbcd-41a5-8801-ca535a80c3a3'::uuid),
      ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid)
  );

  if v_existing_conflict <> 0 then
    raise exception 'Batch1 guard: % bestehende band_moods-Zeile(n) fuer Batch-1-Bands gefunden -- Abbruch vor INSERT', v_existing_conflict;
  end if;

  -----------------------------------------------------------------
  -- Schutz der 7 bestehenden Zeilen ausserhalb des Batches (VOR der
  -- Schreiboperation erfasst)
  -----------------------------------------------------------------
  select count(*),
         md5(coalesce(string_agg(
           band_id::text || ':' || mood_id::text || ':' || coalesce(sort_order::text, '<NULL>'),
           ',' order by band_id, mood_id, sort_order nulls first
         ), '')),
         count(distinct band_id)
  into v_bm_other_before_count, v_bm_other_before_fingerprint, v_distinct_bands_before
  from public.band_moods
  where band_id not in (
    values
      ('ba000002-0000-0000-0000-000000000001'::uuid),
      ('6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid),
      ('f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid),
      ('098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid),
      ('712f40db-723f-4fea-a204-13f68f62b819'::uuid),
      ('d7bf4672-364f-4807-a80c-8f2031d69093'::uuid),
      ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid),
      ('aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid),
      ('180c5296-8440-4540-a8f8-60ee16333259'::uuid),
      ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid),
      ('e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid),
      ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid),
      ('3365db14-dbcd-41a5-8801-ca535a80c3a3'::uuid),
      ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid)
  );

  if v_bm_other_before_count <> 7 then
    raise exception 'Batch1 guard: erwartete 7 bestehende band_moods-Zeilen ausserhalb des Batches (Donnaweda+STEINBACH), gefunden %', v_bm_other_before_count;
  end if;

  -----------------------------------------------------------------
  -- INSERT: ausschliesslich die 32 freigegebenen Zuordnungen
  -----------------------------------------------------------------
  insert into public.band_moods (band_id, mood_id, sort_order)
  select e.band_id, m.id, e.sort_order
  from (
    values
      ('ba000002-0000-0000-0000-000000000001'::uuid, 'festzeltenergie', 1),
      ('ba000002-0000-0000-0000-000000000001'::uuid, 'bayerisch-frech', 2),
      ('ba000002-0000-0000-0000-000000000001'::uuid, 'rockig-mitreissend', 3),
      ('ba000002-0000-0000-0000-000000000001'::uuid, 'generationenverbindend', 4),
      ('6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid, 'festzeltenergie', 1),
      ('6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid, 'party-pur', 2),
      ('f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid, 'lagerfeuer-atmosphaere', 1),
      ('f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid, 'mitsing-faktor', 2),
      ('098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid, 'konzertant-hochwertig', 1),
      ('098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid, 'generationenverbindend', 2),
      ('712f40db-723f-4fea-a204-13f68f62b819'::uuid, 'emotional-beruehrend', 1),
      ('712f40db-723f-4fea-a204-13f68f62b819'::uuid, 'herzlich-nahbar', 2),
      ('d7bf4672-364f-4807-a80c-8f2031d69093'::uuid, 'authentisch-handgemacht', 1),
      ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'bayerisch-frech', 1),
      ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'festlich-ausgelassen', 2),
      ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'rockig-mitreissend', 3),
      ('aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid, 'authentisch-handgemacht', 1),
      ('aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid, 'herzlich-nahbar', 2),
      ('180c5296-8440-4540-a8f8-60ee16333259'::uuid, 'tanzflaechen-garantie', 1),
      ('180c5296-8440-4540-a8f8-60ee16333259'::uuid, 'generationenverbindend', 2),
      ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'tanzflaechen-garantie', 1),
      ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'rockig-mitreissend', 2),
      ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'mitsing-faktor', 3),
      ('e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid, 'emotional-beruehrend', 1),
      ('e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid, 'herzlich-nahbar', 2),
      ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'festzeltenergie', 1),
      ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'rockig-mitreissend', 2),
      ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'generationenverbindend', 3),
      ('3365db14-dbcd-41a5-8801-ca535a80c3a3'::uuid, 'rockig-mitreissend', 1),
      ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'tanzflaechen-garantie', 1),
      ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'generationenverbindend', 2),
      ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'rockig-mitreissend', 3)
  ) as e(band_id, mood_slug, sort_order)
  join public.moods m on m.slug = e.mood_slug;

  get diagnostics v_inserted_count = row_count;

  if v_inserted_count <> 32 then
    raise exception 'Batch1 postcheck: erwartete 32 eingefuegte Zeilen, gefunden %', v_inserted_count;
  end if;

  -----------------------------------------------------------------
  -- Postcheck: jede Band besitzt exakt die freigegebenen Slugs und
  -- sort_order-Werte, keine zusaetzliche Zuordnung
  -----------------------------------------------------------------
  select count(*)
  into v_mismatch_count
  from (
    values
      ('ba000002-0000-0000-0000-000000000001'::uuid, 'festzeltenergie', 1),
      ('ba000002-0000-0000-0000-000000000001'::uuid, 'bayerisch-frech', 2),
      ('ba000002-0000-0000-0000-000000000001'::uuid, 'rockig-mitreissend', 3),
      ('ba000002-0000-0000-0000-000000000001'::uuid, 'generationenverbindend', 4),
      ('6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid, 'festzeltenergie', 1),
      ('6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid, 'party-pur', 2),
      ('f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid, 'lagerfeuer-atmosphaere', 1),
      ('f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid, 'mitsing-faktor', 2),
      ('098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid, 'konzertant-hochwertig', 1),
      ('098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid, 'generationenverbindend', 2),
      ('712f40db-723f-4fea-a204-13f68f62b819'::uuid, 'emotional-beruehrend', 1),
      ('712f40db-723f-4fea-a204-13f68f62b819'::uuid, 'herzlich-nahbar', 2),
      ('d7bf4672-364f-4807-a80c-8f2031d69093'::uuid, 'authentisch-handgemacht', 1),
      ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'bayerisch-frech', 1),
      ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'festlich-ausgelassen', 2),
      ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'rockig-mitreissend', 3),
      ('aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid, 'authentisch-handgemacht', 1),
      ('aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid, 'herzlich-nahbar', 2),
      ('180c5296-8440-4540-a8f8-60ee16333259'::uuid, 'tanzflaechen-garantie', 1),
      ('180c5296-8440-4540-a8f8-60ee16333259'::uuid, 'generationenverbindend', 2),
      ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'tanzflaechen-garantie', 1),
      ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'rockig-mitreissend', 2),
      ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'mitsing-faktor', 3),
      ('e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid, 'emotional-beruehrend', 1),
      ('e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid, 'herzlich-nahbar', 2),
      ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'festzeltenergie', 1),
      ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'rockig-mitreissend', 2),
      ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'generationenverbindend', 3),
      ('3365db14-dbcd-41a5-8801-ca535a80c3a3'::uuid, 'rockig-mitreissend', 1),
      ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'tanzflaechen-garantie', 1),
      ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'generationenverbindend', 2),
      ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'rockig-mitreissend', 3)
  ) as e(band_id, mood_slug, sort_order)
  left join public.band_moods bm
    on bm.band_id = e.band_id and bm.sort_order = e.sort_order
  left join public.moods m
    on m.id = bm.mood_id and m.slug = e.mood_slug
  where m.id is null;

  if v_mismatch_count <> 0 then
    raise exception 'Batch1 postcheck: % Soll-Zuordnung(en) nach INSERT nicht exakt gefunden', v_mismatch_count;
  end if;

  select count(*)
  into v_extra_count
  from public.band_moods bm
  where bm.band_id in (
    values
      ('ba000002-0000-0000-0000-000000000001'::uuid),
      ('6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid),
      ('f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid),
      ('098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid),
      ('712f40db-723f-4fea-a204-13f68f62b819'::uuid),
      ('d7bf4672-364f-4807-a80c-8f2031d69093'::uuid),
      ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid),
      ('aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid),
      ('180c5296-8440-4540-a8f8-60ee16333259'::uuid),
      ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid),
      ('e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid),
      ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid),
      ('3365db14-dbcd-41a5-8801-ca535a80c3a3'::uuid),
      ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid)
  )
  and not exists (
    select 1
    from (
      values
        ('ba000002-0000-0000-0000-000000000001'::uuid, 'festzeltenergie', 1),
        ('ba000002-0000-0000-0000-000000000001'::uuid, 'bayerisch-frech', 2),
        ('ba000002-0000-0000-0000-000000000001'::uuid, 'rockig-mitreissend', 3),
        ('ba000002-0000-0000-0000-000000000001'::uuid, 'generationenverbindend', 4),
        ('6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid, 'festzeltenergie', 1),
        ('6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid, 'party-pur', 2),
        ('f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid, 'lagerfeuer-atmosphaere', 1),
        ('f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid, 'mitsing-faktor', 2),
        ('098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid, 'konzertant-hochwertig', 1),
        ('098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid, 'generationenverbindend', 2),
        ('712f40db-723f-4fea-a204-13f68f62b819'::uuid, 'emotional-beruehrend', 1),
        ('712f40db-723f-4fea-a204-13f68f62b819'::uuid, 'herzlich-nahbar', 2),
        ('d7bf4672-364f-4807-a80c-8f2031d69093'::uuid, 'authentisch-handgemacht', 1),
        ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'bayerisch-frech', 1),
        ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'festlich-ausgelassen', 2),
        ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid, 'rockig-mitreissend', 3),
        ('aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid, 'authentisch-handgemacht', 1),
        ('aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid, 'herzlich-nahbar', 2),
        ('180c5296-8440-4540-a8f8-60ee16333259'::uuid, 'tanzflaechen-garantie', 1),
        ('180c5296-8440-4540-a8f8-60ee16333259'::uuid, 'generationenverbindend', 2),
        ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'tanzflaechen-garantie', 1),
        ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'rockig-mitreissend', 2),
        ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid, 'mitsing-faktor', 3),
        ('e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid, 'emotional-beruehrend', 1),
        ('e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid, 'herzlich-nahbar', 2),
        ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'festzeltenergie', 1),
        ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'rockig-mitreissend', 2),
        ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid, 'generationenverbindend', 3),
        ('3365db14-dbcd-41a5-8801-ca535a80c3a3'::uuid, 'rockig-mitreissend', 1),
        ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'tanzflaechen-garantie', 1),
        ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'generationenverbindend', 2),
        ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid, 'rockig-mitreissend', 3)
    ) as e2(band_id, mood_slug, sort_order)
    join public.moods m2 on m2.slug = e2.mood_slug
    where e2.band_id = bm.band_id and m2.id = bm.mood_id and e2.sort_order = bm.sort_order
  );

  if v_extra_count <> 0 then
    raise exception 'Batch1 postcheck: % zusaetzliche, nicht freigegebene band_moods-Zeile(n) fuer Batch-1-Bands gefunden', v_extra_count;
  end if;

  -----------------------------------------------------------------
  -- Postcheck: Bands mit mindestens einem band_moods-Eintrag um
  -- exakt 14 gestiegen
  -----------------------------------------------------------------
  select count(distinct band_id) into v_distinct_bands_after from public.band_moods;

  if v_distinct_bands_after - v_distinct_bands_before <> 14 then
    raise exception 'Batch1 postcheck: erwartete Zunahme um 14 Baender mit band_moods-Eintrag, tatsaechlich % (vorher %, nachher %)',
      v_distinct_bands_after - v_distinct_bands_before, v_distinct_bands_before, v_distinct_bands_after;
  end if;

  -----------------------------------------------------------------
  -- Postcheck: die 7 bestehenden Zeilen ausserhalb des Batches
  -- (Donnaweda, STEINBACH) unveraendert
  -----------------------------------------------------------------
  select count(*),
         md5(coalesce(string_agg(
           band_id::text || ':' || mood_id::text || ':' || coalesce(sort_order::text, '<NULL>'),
           ',' order by band_id, mood_id, sort_order nulls first
         ), ''))
  into v_bm_other_after_count, v_bm_other_after_fingerprint
  from public.band_moods
  where band_id not in (
    values
      ('ba000002-0000-0000-0000-000000000001'::uuid),
      ('6d21393b-0a30-4d4a-86f2-713b96c8fb46'::uuid),
      ('f9baa4fc-d396-4a52-8991-dd7d63e01baf'::uuid),
      ('098a9022-9d58-4348-8157-ba6688f2e9bf'::uuid),
      ('712f40db-723f-4fea-a204-13f68f62b819'::uuid),
      ('d7bf4672-364f-4807-a80c-8f2031d69093'::uuid),
      ('17cbb6a9-888c-4e0b-91fd-ac9fa9b65318'::uuid),
      ('aff092f9-9547-46ac-8fc0-b1d5eeba3711'::uuid),
      ('180c5296-8440-4540-a8f8-60ee16333259'::uuid),
      ('b8a2281a-6941-466c-9f32-900460b48d34'::uuid),
      ('e03af73e-ceed-44e9-919a-02e74a1964bc'::uuid),
      ('a7317b3e-621e-45fb-8e5d-43e66fa6fe3c'::uuid),
      ('3365db14-dbcd-41a5-8801-ca535a80c3a3'::uuid),
      ('2ea3f8c2-742c-4675-87fa-ccd0a3de0cd5'::uuid)
  );

  if v_bm_other_after_count <> v_bm_other_before_count or v_bm_other_after_fingerprint <> v_bm_other_before_fingerprint then
    raise exception 'Batch1 guard: die 7 bestehenden band_moods-Zeilen ausserhalb des Batches haben sich veraendert (COUNT vorher=%, nachher=%; Fingerprint vorher=%, nachher=%)',
      v_bm_other_before_count, v_bm_other_after_count, v_bm_other_before_fingerprint, v_bm_other_after_fingerprint;
  end if;

  raise notice 'Batch 1 Import erfolgreich: 32 Zeilen fuer 14 Baender eingefuegt. Bestehende 7 Zeilen (Donnaweda/STEINBACH) unveraendert: COUNT=%, Fingerprint=%. Baender mit band_moods: % -> %.',
    v_bm_other_before_count, v_bm_other_before_fingerprint, v_distinct_bands_before, v_distinct_bands_after;
end $$;

commit;
