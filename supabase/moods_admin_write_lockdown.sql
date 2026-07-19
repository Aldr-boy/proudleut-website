-- ============================================================
-- moods_admin_write_lockdown.sql
--
-- NOCH NICHT AUSGEFUEHRT. Nach fn_moods_catalog_admin.sql auszufuehren
-- (siehe Completion Report fuer die genaue Reihenfolge).
--
-- Sprint: Admin "Klingt nach" -- Mood-Katalogverwaltung
-- Datum des Entwurfs: 20.07.2026
--
-- Vorbild/Muster: supabase/band_relations_admin_read_grant.sql und
-- supabase/band_moods_admin_write_lockdown.sql (identisches Prinzip).
--
-- Bewusst NUR SELECT fuer service_role auf moods. Schreiben laeuft ab
-- sofort ausschliesslich ueber die vier SECURITY DEFINER Funktionen
-- create_mood/update_mood/archive_mood/reactivate_mood (siehe
-- supabase/fn_moods_catalog_admin.sql).
--
-- Bisheriger Zustand (siehe supabase/setup-grants-and-seed.sql und
-- supabase/grant-service-role-permissions-v2.sql): service_role hatte
-- volles SELECT, INSERT, UPDATE, DELETE auf moods -- notwendig fuer die
-- bisherigen, einmaligen Katalog-Migrationen (Paket B1 description-
-- Backfill, Paket B2 Status-Umstellung). Diese Migrationen sind
-- abgeschlossen -- der laufende Admin-Betrieb braucht diese direkten
-- Schreibrechte nicht mehr.
--
-- Kein RLS-Bezug: service_role hat BYPASSRLS.
--
-- WICHTIG -- Reihenfolge: Diese Datei darf erst NACH erfolgreicher
-- Ausfuehrung von fn_moods_catalog_admin.sql ausgefuehrt werden.
-- ============================================================

-- Sollzustand-Deklaration (idempotent):
-- Schreiben auf moods laeuft ausschliesslich ueber
-- create_mood/update_mood/archive_mood/reactivate_mood (siehe
-- supabase/fn_moods_catalog_admin.sql). service_role bekommt hier
-- bewusst KEIN INSERT/UPDATE/DELETE auf die Tabelle.
revoke insert, update, delete on public.moods from service_role;

grant select on public.moods to service_role;
