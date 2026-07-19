-- ============================================================
-- drop-geo-point-postgis-cleanup.sql
--
-- NACHTRAEGLICH DOKUMENTIERENDE Migration. Der eigentliche Drop von
-- public.locations.geo_point wurde bereits direkt in Supabase
-- Production ausgefuehrt, OHNE zuvor als versionierte SQL-Datei unter
-- supabase/ committet zu sein -- ein Verstoss gegen das in CLAUDE.md
-- festgelegte Prinzip "Supabase-Writes nur ueber versionierte,
-- gepruefte SQL-Dateien". Diese Datei schliesst die Luecke
-- nachtraeglich: sie haelt den Ist-Zustand fest und ist als
-- Sollzustand-Deklaration idempotent/sicher (erneut) ausfuehrbar --
-- unabhaengig davon, ob geo_point, der Trigger oder die Funktion zum
-- Ausfuehrungszeitpunkt noch existieren.
--
-- Auffindungskontext: Admin-Route /admin/bands/[id] warf einen 404,
-- weil die dortige Supabase-Query geo_point im locations-Embed
-- abfragte und PostgREST mit "ERROR 42703: column \"geo_point\" does
-- not exist" antwortete. Die Query gab dadurch einen Fehler statt
-- Daten zurueck, und der (inzwischen behobene) Code-Pfad hat jeden
-- Query-Fehler blind als notFound() behandelt. Siehe Commit
-- 4a2a029 "fix(admin): remove dropped geo_point column from queries;
-- surface query errors instead of masking as 404".
--
-- Ursprungsschema (vor dem Drop), zum Vergleich siehe
-- supabase/proudleut-schema.sql:
--   CREATE EXTENSION IF NOT EXISTS postgis;
--   ...
--   geo_point geography(Point, 4326)                       -- Spalte
--   CREATE INDEX idx_locations_geo_point                   -- GIST-Index
--     ON locations USING GIST (geo_point);
--   CREATE FUNCTION update_geo_point() ...                 -- Trigger-Funktion,
--     NEW.geo_point := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
--   CREATE TRIGGER trg_locations_geo_point                 -- Trigger
--     BEFORE INSERT OR UPDATE OF latitude, longitude ON locations
--     FOR EACH ROW EXECUTE FUNCTION update_geo_point();
--
-- Diese Migration entfernt Trigger, Trigger-Funktion und Spalte
-- gemeinsam (alle IF EXISTS). Grund: Waere nur die Spalte
-- verschwunden, aber der Trigger noch aktiv, wuerde JEDES
-- INSERT/UPDATE von latitude/longitude auf locations zur Laufzeit mit
-- einem Fehler ("record \"new\" has no field \"geo_point\"")
-- abbrechen -- das waere kein sauberer Zustand, sondern ein neuer,
-- versteckter Bug. Der GIST-Index idx_locations_geo_point haengt
-- ausschliesslich an der Spalte und wird von Postgres beim DROP
-- COLUMN automatisch mit entfernt; der explizite DROP INDEX IF EXISTS
-- unten ist rein dokumentierend/defensiv.
--
-- AUSDRUECKLICH NICHT TEIL DIESER MIGRATION: die postgis-Extension
-- selbst (CREATE EXTENSION postgis) wird NICHT entfernt. Es liegt
-- keine Bestaetigung vor, ob die Extension in Production bereits
-- entfernt wurde oder noch aktiv ist; ein DROP EXTENSION ist eine
-- separate, folgenreichere Entscheidung und wird hier bewusst nicht
-- getroffen. locations.geo_point war laut supabase/proudleut-schema.sql
-- und scripts/supabase-schema-improvements.sql die einzige
-- geography/geometry-Nutzung im gesamten Schema -- falls die
-- Extension ebenfalls entfernt werden soll, ist das eine gesonderte,
-- ausdruecklich zu beauftragende Migration.
--
-- Alle Statements sind IF EXISTS und damit sicher wiederholbar sowie
-- sicher gegen einen bereits erledigten Zustand.
-- ============================================================

begin;

do $$
declare
  v_column_existed_before  boolean;
  v_trigger_existed_before boolean;
  v_function_existed_before boolean;
  v_column_exists_after    boolean;
begin
  -- Ist-Zustand vor der Migration festhalten (nur Protokoll, kein Guard --
  -- jeder Zustand ist hier gueltig, da diese Migration idempotent ist).
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'locations' and column_name = 'geo_point'
  ) into v_column_existed_before;

  select exists (
    select 1 from pg_trigger
    where tgname = 'trg_locations_geo_point'
      and tgrelid = 'public.locations'::regclass
  ) into v_trigger_existed_before;

  select exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'update_geo_point'
  ) into v_function_existed_before;

  raise notice 'Ist-Zustand vor Migration: geo_point-Spalte vorhanden=%, Trigger vorhanden=%, Funktion vorhanden=%',
    v_column_existed_before, v_trigger_existed_before, v_function_existed_before;

  -- Trigger zuerst entfernen (haengt von der Funktion ab).
  drop trigger if exists trg_locations_geo_point on public.locations;

  -- Trigger-Funktion entfernen.
  drop function if exists public.update_geo_point();

  -- Rein dokumentierend/defensiv: GIST-Index wuerde ohnehin automatisch
  -- mit der Spalte verschwinden.
  drop index if exists public.idx_locations_geo_point;

  -- Spalte entfernen.
  alter table public.locations drop column if exists geo_point;

  -- Postcheck: Spalte muss danach in jedem Fall weg sein.
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'locations' and column_name = 'geo_point'
  ) into v_column_exists_after;

  if v_column_exists_after then
    raise exception 'geo-point cleanup guard: geo_point existiert nach DROP COLUMN weiterhin -- unerwarteter Zustand';
  end if;

  raise notice 'geo-point cleanup abgeschlossen: geo_point-Spalte, Trigger trg_locations_geo_point und Funktion update_geo_point() sind entfernt (bzw. waren es bereits). postgis-Extension unveraendert.';
end $$;

commit;
