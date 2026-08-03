-- ============================================================
-- event_type_festzelt_label_cleanup.sql
--
-- Einmalige, versionierte Production-Migration: kuerzt das
-- event_types.name-Label fuer slug = 'festzelt' von
-- "Festzelt & Volksfest" auf "Festzelt". "Volksfest" bleibt als
-- konkreter Anlass innerhalb dieses Clusters in H1, Einleitung und
-- SEO-Text der oeffentlichen Themenwelt /veranstaltung/festzelt
-- prominent erhalten (siehe lib/categories.ts) -- es wird KEINE eigene
-- Volksfest-Kategorie angelegt. Reine Namensaenderung: id, slug,
-- status, sort_order, description und alle Bandzuordnungen
-- (band_event_types) bleiben unveraendert.
--
-- WICHTIG -- Befund aus read-only Production-Preflight (03.08.2026):
-- event_types.name fuer slug='festzelt' lautet in Production BEREITS
-- "Festzelt" (nicht mehr "Festzelt & Volksfest"), id
-- e0000001-0000-0000-0000-000000000002, status=active, sort_order=2,
-- 96 bestehende band_event_types-Zuordnungen zu dieser event_type_id,
-- keine andere Zeile bereits mit dem Namen "Festzelt". Diese Migration
-- ist damit fuer den aktuellen Production-Stand ein Idempotenz-Guard-
-- Fall -- identisches, bereits etabliertes Muster wie
-- supabase/band_moods_steinbach_festlich_ausgelassen_removal.sql
-- (Kommentarblock "ABSICHTLICH NICHT IDEMPOTENT"): der Guard unten
-- bricht bei einem vom erwarteten Ausgangszustand abweichenden Namen
-- kontrolliert ab -- das bedeutet hier konkret "bereits erledigt",
-- keine beschaedigte Migration. Eine Ausfuehrung ist fuer die
-- Erfuellung des fachlichen Ziels (Label = "Festzelt") aktuell NICHT
-- erforderlich, da Production bereits korrekt ist. Diese Datei bleibt
-- trotzdem versioniert vorbereitet -- z. B. falls ein frueherer Stand
-- wiederhergestellt werden muesste -- und als dokumentiertes,
-- abgesichertes Muster fuer diese Aenderung.
--
-- NOCH NICHT AUSGEFUEHRT (und nach obigem Befund aktuell auch nicht
-- notwendig). Nur bei Bedarf manuell durch Xandi im Supabase SQL
-- Editor auszufuehren -- ausschliesslich falls sich der
-- Ausgangszustand zwischenzeitlich wieder auf "Festzelt & Volksfest"
-- geaendert haben sollte. Siehe zugehoerige Verify-Datei
-- supabase/event_type_festzelt_label_cleanup_verify.sql fuer
-- Preflight (vor Ausfuehrung) und Postflight (nach Ausfuehrung).
--
-- KEIN Zusammenhang mit band_event_types oder anderen Zuordnungs-
-- tabellen -- diese werden von dieser Datei an keiner Stelle gelesen
-- oder geschrieben (auch nicht lesend zur Zaehlung), da die
-- Zuordnungszahl fuer diese reine Namensaenderung fachlich irrelevant
-- ist (anders als beim Archivieren eines Katalogwerts).
-- ============================================================

begin;

do $$
declare
  v_id         uuid;
  v_name       text;
  v_slug       text;
  v_status     text;
  v_sort_order integer;
  v_updated    integer;
begin
  -- Guard 1: genau eine Zeile mit slug='festzelt' (STRICT bricht bei 0
  -- oder mehr als 1 Treffer automatisch kontrolliert ab). FOR UPDATE
  -- sperrt die Zeile fuer die Dauer der Transaktion.
  select id, name, slug, status, sort_order
    into strict v_id, v_name, v_slug, v_status, v_sort_order
  from public.event_types
  where slug = 'festzelt'
  for update;

  -- Guard 2: exakter Ausgangszustand. Siehe Dateikommentar oben --
  -- weicht dieser Guard ab, bedeutet das nach aktuellem Kenntnisstand
  -- "bereits erledigt", nicht eine beschaedigte Migration.
  if v_name <> 'Festzelt & Volksfest' or v_status <> 'active' then
    raise exception 'Guard: unerwarteter Ausgangszustand fuer event_types.slug=festzelt (name=%, status=%) -- erwartet name=''Festzelt & Volksfest'', status=''active''. Siehe Dateikommentar: vermutlich bereits erledigt oder anderer Stand -- keine Aenderung noetig.',
      v_name, v_status;
  end if;

  -- Guard 3: keine andere Zeile traegt bereits den Zielnamen (verhindert
  -- zwei event_types mit identischem sichtbarem Label).
  if exists (select 1 from public.event_types where name = 'Festzelt' and id <> v_id) then
    raise exception 'Guard: unerwartete Namenskollision -- eine andere Zeile heisst bereits "Festzelt" (Ziel-id=%)', v_id;
  end if;

  -- Write: ausschliesslich das Namensfeld aendern. id, slug, status,
  -- sort_order, description bleiben unangetastet.
  update public.event_types
     set name = 'Festzelt'
   where id = v_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Postcheck: erwartete genau 1 aktualisierte Zeile, gefunden %', v_updated;
  end if;

  -- Postcheck: exakter Zielzustand -- id, slug, status, sort_order
  -- identisch zum Ausgangszustand, ausschliesslich name geaendert.
  perform 1 from public.event_types
   where id = v_id
     and slug = 'festzelt'
     and name = 'Festzelt'
     and status = v_status
     and sort_order = v_sort_order;
  if not found then
    raise exception 'Postcheck: Zeile nach UPDATE weicht vom erwarteten Zielzustand ab (id=%)', v_id;
  end if;

  raise notice 'event_type_festzelt_label_cleanup erfolgreich: id=%, slug=festzelt, name jetzt "Festzelt" (status=%, sort_order=% unveraendert, band_event_types nicht beruehrt).',
    v_id, v_status, v_sort_order;
end $$;

commit;
