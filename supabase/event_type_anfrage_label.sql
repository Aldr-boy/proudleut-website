-- ============================================================
-- event_type_anfrage_label.sql
--
-- Block "Event-Type-Anfrage-Label V1" (Owner-Entscheidung, eingefroren):
-- legt die neue, nullable Spalte public.event_types.anfrage_label an.
--
-- Zweck: fuer ausgewaehlte Event Types eine kurze, natuerliche
-- Anlassbezeichnung fuers native Anfrageformular bereitstellen, ohne
-- den kanonischen event_types.name zu veraendern. Fallback ueberall:
-- anfrage_label ?? name.
--
-- Ausdruecklich NICHT Bestandteil dieser Datei:
--   - keine Befuellung (separat in
--     supabase/event_type_anfrage_label_erstbefuellung.sql)
--   - keine Aenderung an name, slug, parent_id, status, sort_order,
--     description
--   - keine Aenderung an band_event_types
--   - kein neues Boolean-Feld ("show_in_anfrageformular"), keine neue
--     Tabelle -- ausdruecklich nicht Bestandteil von V1
--
-- Grants: anon besitzt bereits effektives Tabellen-SELECT auf
-- public.event_types (RLS-Policy "event_types_public_read", siehe
-- supabase/enable-rls-app-tables.sql). Eine neue Spalte ist davon
-- automatisch umfasst -- kein zusaetzliches GRANT-Statement noetig
-- (identische Begruendung wie supabase/moods_description_backfill.sql).
--
-- updated_at: der bestehende Trigger trg_event_types_updated_at (BEFORE
-- UPDATE, siehe supabase/proudleut-schema.sql) ist bereits an
-- event_types gebunden. Diese Migration selbst fuehrt kein UPDATE aus
-- (nur ADD COLUMN) und setzt updated_at daher nirgends manuell.
--
-- Idempotenz: "add column if not exists" plus anschliessende fail-closed
-- Schemaform-Pruefung -- identisches, bereits etabliertes Muster wie
-- supabase/moods_description_backfill.sql. Ein zweiter Lauf legt die
-- Spalte nicht erneut an und schlaegt nicht fehl.
-- ============================================================

begin;

alter table public.event_types
  add column if not exists anfrage_label text
    check (anfrage_label is null or char_length(anfrage_label) <= 100);

-- Fail-closed Schemaform-Pruefung: akzeptiert keine abweichend definierte
-- vorhandene Spalte still (identisches Muster wie
-- moods_description_backfill.sql, Abschnitt 2).
do $$
declare
  v_data_type      text;
  v_is_nullable    text;
  v_column_default text;
  v_is_identity    text;
  v_is_generated   text;
begin
  select data_type, is_nullable, column_default, is_identity, is_generated
  into v_data_type, v_is_nullable, v_column_default, v_is_identity, v_is_generated
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'event_types'
    and column_name = 'anfrage_label';

  if v_data_type is null then
    raise exception 'Guard: anfrage_label-Spalte fehlt nach ADD COLUMN IF NOT EXISTS -- unerwarteter Zustand';
  end if;

  if v_data_type <> 'text' then
    raise exception 'Guard: event_types.anfrage_label hat data_type %, erwartet text', v_data_type;
  end if;

  if v_is_nullable <> 'YES' then
    raise exception 'Guard: event_types.anfrage_label ist NOT NULL, erwartet nullable';
  end if;

  if v_column_default is not null then
    raise exception 'Guard: event_types.anfrage_label hat einen Default (%), erwartet keinen', v_column_default;
  end if;

  if v_is_identity <> 'NO' then
    raise exception 'Guard: event_types.anfrage_label ist eine Identity-Spalte, erwartet keine';
  end if;

  if v_is_generated <> 'NEVER' then
    raise exception 'Guard: event_types.anfrage_label ist eine Generated-Spalte, erwartet keine';
  end if;
end $$;

commit;

-- ============================================================
-- Manueller Rollback-Hinweis (NICHT automatisch ausfuehrbar):
--
-- Ein pauschales
--   alter table public.event_types drop column anfrage_label;
-- ist absichtlich NICHT Bestandteil dieser Datei. "add column if not
-- exists" beweist nicht, dass DIESE Migration die Spalte urspruenglich
-- angelegt hat -- ein automatischer DROP COLUMN koennte fremde Daten
-- oder eine unabhaengige spaetere Aenderung zerstoeren.
--
-- Falls ein Rueckbau jemals noetig wird: nur nach gesonderter Pruefung
-- im SQL Editor, und nur als manuell einzeln ausgefuehrtes Statement --
-- niemals als Teil eines automatisierten Skripts.
-- ============================================================
