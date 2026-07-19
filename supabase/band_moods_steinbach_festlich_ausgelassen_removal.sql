-- ============================================================
-- band_moods_steinbach_festlich_ausgelassen_removal.sql
--
-- Einmalige Production-Migration (Abschluss der "Klingt nach"-
-- Kuration, Schlussentscheidung Bigband STEINBACH). Entfernt
-- ausschliesslich die bestehende band_moods-Zuordnung "Festlich und
-- ausgelassen" fuer Bigband STEINBACH, da der aktuelle massgebliche
-- Klingt_Nach-Text dafuer keine Textstuetze mehr liefert (siehe
-- docs/klingt-nach-kuration.md, Abschnitt "Sonderfaelle (fachlich
-- abgeschlossen)").
--
-- Ausdruecklich UNVERAENDERT bleiben fuer Bigband STEINBACH:
--   - Tanzflaechen-Garantie (regulaer bestaetigt)
--   - Konzertant & hochwertig (regulaer bestaetigt)
--   - Brass-Power (Sonderfall, Uebergangs-Mood bis Paket D, wird
--     durch dieses Skript nicht angefasst)
--
-- Reines DELETE einer einzelnen Zeile. Keine neuen Zeilen, keine
-- Aenderung an sort_order der verbleibenden Zeilen, keine Aenderung
-- an anderen Baendern, kein Anlegen neuer Moods.
--
-- Dieses Skript ist ein unveraenderliches, vor Ausfuehrung geprueftes
-- Artefakt. Ausfuehrungsstatus und Production-Evidenz werden nicht in
-- dieser Datei, sondern separat gefuehrt unter:
--   docs/migrations/band_moods_steinbach_festlich_ausgelassen_removal.md
--
-- ABSICHTLICH NICHT IDEMPOTENT:
-- Guard 2 verlangt exakt den dokumentierten Ausgangszustand (vier
-- Zeilen, sort_order durchgehend 0 -- siehe
-- supabase/band_moods_batch_1_verify.sql, Abschnitt
-- "existing_expected", das diesen Ausgangszustand bereits vorher
-- unabhaengig bestaetigt hat). Nach einer erfolgreich committeten
-- Migration steht der Zustand auf drei Zeilen, wodurch ein zweiter
-- Lauf bei Guard 2 kontrolliert abbricht ("unerwarteter
-- Ausgangszustand"). Das ist gewollt: der Abbruch bedeutet "bereits
-- erledigt", nicht eine beschaedigte Migration.
--
-- REVERT (nur bei Bedarf, NICHT Teil dieses Skripts, NICHT gemeinsam
-- mit der Migration auszufuehren): Jede Exception vor COMMIT bricht
-- die Transaktion vollstaendig ab -- das DELETE wird dann gar nicht
-- erst persistiert, ein Revert ist dann nicht noetig. Ein Revert ist
-- ausschliesslich fuer den Fall relevant, dass die Transaktion bereits
-- erfolgreich committed wurde und zurueckgesetzt werden soll: dann ist
-- fuer Bigband STEINBACH manuell wieder eine Zeile (mood-slug
-- 'festlich-ausgelassen', sort_order 0) einzufuegen.
-- ============================================================

begin;

do $$
declare
  v_band_id    uuid;
  v_pre_state  text[];
  v_deleted    integer;
  v_post_state text[];
begin
  -- Guard 1: genau eine aktive Band mit slug bigband-steinbach.
  -- STRICT bricht kontrolliert ab, falls 0 oder mehr als 1 Zeile
  -- gefunden wird (no_data_found / too_many_rows).
  select id
  into strict v_band_id
  from public.bands
  where slug = 'bigband-steinbach'
    and status = 'active';

  -- Guard 2: exakter Ausgangszustand. Aggregiert die tatsaechlichen
  -- slug=sort_order-Paare fuer STEINBACH (alphabetisch nach slug) und
  -- vergleicht sie als Array exakt mit dem erwarteten Ausgangszustand.
  -- Beweist gleichzeitig: exakt vier Zeilen, exakt die vier bekannten
  -- Moods, keine zusaetzliche oder fehlende Zeile, keine Dublette,
  -- alle vier Ausgangswerte exakt 0.
  select coalesce(array_agg(m.slug || '=' || bm.sort_order::text order by m.slug), array[]::text[])
  into v_pre_state
  from public.band_moods bm
  join public.moods m on m.id = bm.mood_id
  where bm.band_id = v_band_id;

  if v_pre_state <> array['brass-power=0', 'festlich-ausgelassen=0', 'konzertant-hochwertig=0', 'tanzflaechen-garantie=0'] then
    raise exception 'STEINBACH guard: unerwarteter Ausgangszustand, gefunden %', v_pre_state;
  end if;

  -- Delete: ausschliesslich die eine Zeile Bigband STEINBACH x
  -- "Festlich und ausgelassen" (ueber Mood-Slug, status = 'active').
  -- Kein Effekt auf Tanzflaechen-Garantie, Konzertant & hochwertig,
  -- Brass-Power oder andere Baender.
  delete from public.band_moods bm
  using public.moods m
  where bm.mood_id = m.id
    and m.slug = 'festlich-ausgelassen'
    and m.status = 'active'
    and bm.band_id = v_band_id;

  get diagnostics v_deleted = row_count;

  if v_deleted <> 1 then
    raise exception 'STEINBACH delete: erwartete genau 1 geloeschte Zeile, gefunden %', v_deleted;
  end if;

  -- Postcheck: exakter Zielzustand. Aggregiert die tatsaechlichen
  -- slug=sort_order-Paare nach dem DELETE erneut und vergleicht sie
  -- als Array exakt mit dem Zielzustand. Beweist gleichzeitig: exakt
  -- drei verbleibende Zeilen, richtige Mood-Menge, sort_order der
  -- verbleibenden Zeilen unveraendert bei 0, keine zusaetzliche oder
  -- fehlende Zeile.
  select coalesce(array_agg(m.slug || '=' || bm.sort_order::text order by m.slug), array[]::text[])
  into v_post_state
  from public.band_moods bm
  join public.moods m on m.id = bm.mood_id
  where bm.band_id = v_band_id;

  if v_post_state <> array['brass-power=0', 'konzertant-hochwertig=0', 'tanzflaechen-garantie=0'] then
    raise exception 'STEINBACH postcheck: erwartete exakten Zielzustand, gefunden %', v_post_state;
  end if;
end $$;

commit;
