-- ============================================================
-- social_profiles_admin_grant.sql
--
-- Zweck: service_role kann public.social_profiles aktuell weder lesen
-- noch schreiben (live bestaetigt gegen Production UND Test, echter
-- service_role-/PostgREST-Anwendungspfad: HTTP 403, Postgres 42501
-- "permission denied for table social_profiles"). Voraussetzung fuer den
-- bereits gebauten, unit-getesteten Social-Link-Admin
-- (/admin/bands/[id], "Links"-Abschnitt).
--
-- Ursache (read-only Audit vom 2026-08-25, Production + Test):
--   1. service_role besitzt aktuell REFERENCES/TRIGGER/TRUNCATE/MAINTAIN
--      auf social_profiles, aber kein SELECT/INSERT/UPDATE/DELETE. Diese
--      Struktur-Rechte stammen NICHT aus einem projekteigenen Grant
--      (kein supabase/*.sql-Skript gewaehrt sie explizit), sondern aus
--      einer bereits bestehenden schemaweiten
--      ALTER-DEFAULT-PRIVILEGES-Regel fuer Rolle postgres im Schema
--      public (gilt automatisch fuer jede von postgres neu angelegte
--      Tabelle -- identisches Muster bereits fuer band_moods
--      dokumentiert, siehe band_moods_admin_write_lockdown.sql). Diese
--      Default-Privilege-Regel wird durch dieses Skript NICHT veraendert.
--   2. Der eigentlich vorgesehene volle Grant fuer service_role wurde
--      bereits DREIFACH im Repo dokumentiert
--      (supabase/grant-service-role-permissions.sql,
--      supabase/grant-service-role-permissions-v2.sql,
--      supabase/setup-grants-and-seed.sql -- alle jeweils
--      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.social_profiles
--      TO service_role;"), aber gegen Production nachweislich nie
--      (vollstaendig) angewendet. Exakt dieselbe Diagnose wurde bereits
--      fuer public.reference_events gestellt und dort behoben (siehe
--      supabase/reference_events_admin_read_grant.sql, 2026-08-16 --
--      dessen Kommentar benennt social_profiles ausdruecklich als eine
--      von acht weiteren betroffenen, aber dort bewusst NICHT
--      mitbehandelten Tabellen).
--
-- Architekturentscheidung (bewusst KEIN RPC-only-Modell): anders als
-- band_relations und reference_events (dort: SELECT-only fuer
-- service_role, Schreiben ausschliesslich ueber SECURITY DEFINER RPCs)
-- gibt es fuer social_profiles KEINE eindeutige Repo-Entscheidung fuer
-- ein RPC-only-Modell. Der bereits gebaute Social-Link-Admin
-- (app/admin/bands/[id]/actions.ts, resolveSocialLinkWrite) schreibt
-- bewusst direkt auf die Tabelle -- passend zum urspruenglich
-- dokumentierten Volltreffer-Grant oben. Dieses Skript stellt exakt
-- diesen historisch vorgesehenen, aber nie vollstaendig angewendeten
-- Sollzustand her, erfindet keine neue Architektur.
--
-- Sollzustand fuer service_role auf public.social_profiles:
--   SELECT      ja
--   INSERT      ja
--   UPDATE      ja
--   DELETE      ja
--   TRUNCATE    nein
--   REFERENCES  nein
--   TRIGGER     nein
--   MAINTAIN    nein
--
-- Hinweis TRIGGER: das Entziehen von TRIGGER verhindert nur, dass
-- service_role SELBST neue Trigger auf dieser Tabelle anlegen darf. Es
-- deaktiviert KEINE bestehenden Trigger -- insbesondere laeuft
-- trg_social_profiles_updated_at bei UPDATEs unveraendert weiter (durch
-- Test in Schritt 9A dieses Audits bestaetigt).
--
-- Ausdruecklich NICHT Teil dieses Skripts (siehe Abschlussbericht fuer
-- den vollstaendigen Audit-Befund):
--   - keine Aenderung an ALTER DEFAULT PRIVILEGES
--   - keine Aenderung an anderen Tabellen (u. a. anfrage_rate_limit,
--     band_lineups, band_memberships, band_services, band_sound_worlds,
--     lineups, people, plz_reference, services, sound_worlds zeigen
--     dasselbe Symptom, sind aber ausdruecklich nicht Teil dieses
--     Auftrags)
--   - keine Aenderung an RLS-Policies
--   - keine Column-Level-Grants (Audit hat keine expliziten
--     Column-ACL-Ueberschreibungen fuer social_profiles gefunden --
--     pg_attribute.attacl ist fuer alle Spalten dieser Tabelle NULL,
--     ein einfacher Table-Level-Grant genuegt)
--
-- Rollout-Umfang dieser Datei: AUSSCHLIESSLICH Test
-- (jqzqpizykymjdjumwdoj). Production (bfyucjjyarvqeftqqihm) bleibt
-- unveraendert -- Production-Rollout ist ausdruecklich Bestandteil einer
-- spaeteren Phase 2B.
-- ============================================================

BEGIN;

REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON public.social_profiles FROM service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.social_profiles TO service_role;

COMMIT;
