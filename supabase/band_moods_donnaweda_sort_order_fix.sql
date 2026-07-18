-- ============================================================
-- band_moods_donnaweda_sort_order_fix.sql
--
-- Einmalige Production-Migration (Paket C). Setzt
-- band_moods.sort_order fuer die Band mit slug 'donnaweda' von
-- Default 0 auf die kuratierte Reihenfolge 1/2/3 (Festzeltenergie=1,
-- Bayerisch & frech=2, Mitsing-Faktor=3). Reines UPDATE, keine neuen
-- Zeilen, keine geloeschten Zeilen. Scope ausschliesslich Donnawedas
-- band_id -- alle anderen Baender (u.a. STEINBACH) sind nicht
-- betroffen. band_sound_worlds wird nicht veraendert.
--
-- Dieses Skript ist ein unveraenderliches, vor Ausfuehrung geprueftes
-- Artefakt. Ausfuehrungsstatus und Production-Evidenz werden nicht in
-- dieser Datei, sondern separat gefuehrt unter:
--   docs/migrations/band_moods_donnaweda_sort_order_fix.md
--
-- ABSICHTLICH NICHT IDEMPOTENT:
-- Guard 3 verlangt exakt den Ausgangszustand 0/0/0. Vor einer
-- erfolgreichen Migration ist das der Fall. Nach einer erfolgreich
-- committeten Migration steht der Zustand auf 1/2/3, wodurch ein
-- zweiter Lauf bei Guard 3 kontrolliert abbricht ("unerwarteter
-- Ausgangszustand"). Das ist gewollt: der Abbruch bedeutet "bereits
-- erledigt" bzw. "nicht mehr im erlaubten Ausgangszustand", nicht eine
-- beschaedigte Migration.
--
-- REVERT (nur bei Bedarf, NICHT Teil dieses Skripts, NICHT gemeinsam
-- mit der Migration auszufuehren): Jede Exception vor COMMIT bricht
-- die Transaktion vollstaendig ab -- das UPDATE wird in diesem Fall
-- gar nicht erst persistiert, ein Revert ist dann nicht noetig. Ein
-- Revert ist ausschliesslich fuer den Fall relevant, dass die
-- Transaktion bereits erfolgreich committed wurde und zurueckgesetzt
-- werden soll: dann sind fuer die drei betroffenen Zeilen (Donnawedas
-- band_id, moods mit slug in festzeltenergie/bayerisch-frech/
-- mitsing-faktor) die sort_order-Werte manuell wieder auf 0 zu
-- setzen.
-- ============================================================

begin;

do $$
declare
  v_band_id           uuid;
  v_target_mood_count integer;
  v_pre_state         text[];
  v_updated           integer;
  v_post_state        text[];
begin
  -- Guard 1: genau eine aktive Band mit slug donnaweda. STRICT bricht
  -- kontrolliert ab, falls 0 oder mehr als 1 Zeile gefunden wird
  -- (no_data_found / too_many_rows).
  select id
  into strict v_band_id
  from public.bands
  where slug = 'donnaweda'
    and status = 'active';

  -- Guard 2: genau die drei Ziel-Moods aktiv im Katalog, ueber slug.
  select count(*)
  into v_target_mood_count
  from public.moods
  where slug in ('festzeltenergie', 'bayerisch-frech', 'mitsing-faktor')
    and status = 'active';

  if v_target_mood_count <> 3 then
    raise exception 'C guard: erwartete 3 aktive Ziel-Moods im Katalog, gefunden %', v_target_mood_count;
  end if;

  -- Guard 3: exakter Ausgangszustand. Aggregiert die tatsaechlichen
  -- slug=sort_order-Paare fuer Donnaweda (alphabetisch nach slug) und
  -- vergleicht sie als Array exakt mit dem erwarteten Ausgangszustand.
  -- Beweist gleichzeitig: exakt drei Zeilen, exakt die drei Ziel-
  -- Slugs, keine zusaetzliche Mood, keine fehlende Mood, keine
  -- Dublette, alle drei Ausgangswerte exakt 0.
  select coalesce(array_agg(m.slug || '=' || bm.sort_order::text order by m.slug), array[]::text[])
  into v_pre_state
  from public.band_moods bm
  join public.moods m on m.id = bm.mood_id
  where bm.band_id = v_band_id;

  if v_pre_state <> array['bayerisch-frech=0', 'festzeltenergie=0', 'mitsing-faktor=0'] then
    raise exception 'C guard: unerwarteter Ausgangszustand fuer Donnaweda, gefunden %', v_pre_state;
  end if;

  -- Update: sort_order gemaess Zielreihenfolge setzen. Scope: nur
  -- Donnawedas band_id (v_band_id aus Guard 1), nur die drei Ziel-
  -- mood-slugs, nur Moods mit status = 'active'. Kein DELETE, kein
  -- INSERT, keine Aenderung an band_sound_worlds, keine Aenderung an
  -- STEINBACH oder anderen Baendern.
  update public.band_moods bm
  set sort_order = target.new_sort_order
  from (
    select m.id as mood_id, v.new_sort_order
    from public.moods m
    join (values
      ('festzeltenergie', 1),
      ('bayerisch-frech', 2),
      ('mitsing-faktor', 3)
    ) as v(slug, new_sort_order) on v.slug = m.slug
    where m.status = 'active'
  ) as target
  where bm.mood_id = target.mood_id
    and bm.band_id = v_band_id;

  get diagnostics v_updated = row_count;

  if v_updated <> 3 then
    raise exception 'C update: erwartete 3 aktualisierte Zeilen, gefunden %', v_updated;
  end if;

  -- Postcheck: exakter Zielzustand. Aggregiert die tatsaechlichen
  -- slug=sort_order-Paare nach dem UPDATE erneut und vergleicht sie
  -- als Array exakt mit dem Zielzustand. Beweist gleichzeitig: exakt
  -- drei Zeilen, richtige Mood-Menge, keine zusaetzliche oder
  -- fehlende Mood, keine Dublette, exakte Slug-zu-sort_order-
  -- Zuordnung.
  select coalesce(array_agg(m.slug || '=' || bm.sort_order::text order by m.slug), array[]::text[])
  into v_post_state
  from public.band_moods bm
  join public.moods m on m.id = bm.mood_id
  where bm.band_id = v_band_id;

  if v_post_state <> array['bayerisch-frech=2', 'festzeltenergie=1', 'mitsing-faktor=3'] then
    raise exception 'C postcheck: erwartete exakte Mood-Sortierung, gefunden %', v_post_state;
  end if;
end $$;

commit;
