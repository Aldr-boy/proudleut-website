-- ============================================================
-- event_types_admin_write_lockdown.sql
--
-- NOCH NICHT AUSGEFUEHRT. Nach fn_event_types_catalog_admin.sql
-- auszufuehren (siehe Abschlussbericht fuer die genaue Reihenfolge).
--
-- Sprint: Admin "Veranstaltungstypen" -- event_types-Katalogverwaltung
--
-- Vorbild/Muster: supabase/moods_admin_write_lockdown.sql (identisches
-- Prinzip).
--
-- Bewusst NUR SELECT fuer service_role auf event_types. Schreiben laeuft
-- ab sofort ausschliesslich ueber die vier SECURITY DEFINER Funktionen
-- create_event_type/update_event_type/archive_event_type/
-- reactivate_event_type (siehe supabase/fn_event_types_catalog_admin.sql).
--
-- Bisheriger Zustand (siehe supabase/setup-grants-and-seed.sql Zeile 38):
-- service_role hatte volles SELECT, INSERT, UPDATE, DELETE auf
-- event_types -- notwendig fuer bisherige, einmalige Katalog-Migrationen
-- (initialer Import, event_type_anfrage_label_erstbefuellung.sql). Diese
-- Migrationen sind abgeschlossen -- der laufende Admin-Betrieb braucht
-- diese direkten Schreibrechte nicht mehr.
--
-- Kein RLS-Bezug: service_role hat BYPASSRLS.
--
-- WICHTIG -- Reihenfolge: Diese Datei darf erst NACH erfolgreicher
-- Ausfuehrung von fn_event_types_catalog_admin.sql ausgefuehrt werden.
-- ============================================================

-- Sollzustand-Deklaration (idempotent):
-- Schreiben auf event_types laeuft ausschliesslich ueber
-- create_event_type/update_event_type/archive_event_type/
-- reactivate_event_type (siehe supabase/fn_event_types_catalog_admin.sql).
-- service_role bekommt hier bewusst KEIN INSERT/UPDATE/DELETE auf die
-- Tabelle.
revoke insert, update, delete on public.event_types from service_role;

grant select on public.event_types to service_role;
