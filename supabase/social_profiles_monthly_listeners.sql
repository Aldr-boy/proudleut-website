-- ============================================================
-- social_profiles_monthly_listeners.sql
--
-- Zweck: Spotify "Monatliche Hoerer*innen" als eigene Social-Kennzahl.
-- Spotify zaehlt Hoerer*innen ueber einen rollierenden Zeitraum von 28
-- Tagen -- jeder erfasste Wert braucht deshalb ein Erfassungsdatum.
--
-- Datenmodell (Option 1, freigegeben): zwei neue Spalten an der
-- bestehenden Zeile social_profiles (platform = 'spotify'), getrennt von
-- current_followers / last_checked_at (Follower-Kennzahl). Die Spalten
-- werden nie mit Follower-Werten verrechnet.
--
--   monthly_listeners        integer      Wert
--   monthly_listeners_as_of  timestamptz  Erfassungsdatum (UTC-Mitternacht,
--                                          wie last_checked_at)
--
-- CHECKs:
--   social_profiles_monthly_listeners_pair_chk
--       beide NULL oder beide gesetzt (kein Datum ohne Wert, kein Wert
--       ohne Datum)
--   social_profiles_monthly_listeners_nonneg_chk
--       Wert >= 0
--   social_profiles_monthly_listeners_spotify_only_chk
--       Wert nur bei platform = 'spotify'
--
-- Schreibzugriff: bewusst KEIN RPC (social_profiles ist kein RPC-only-
-- Modell, siehe social_profiles_admin_grant.sql). Der Admin schreibt wie
-- bei den Follower-Zahlen direkt per service_role. Die bestehenden
-- Table-Level-Grants (SELECT/INSERT/UPDATE/DELETE fuer service_role,
-- SELECT fuer anon) decken die neuen Spalten ab -- es gibt laut
-- social_profiles_admin_grant.sql keine Column-Level-Grants. Diese Datei
-- aendert KEINE Grants.
--
-- Bestehende Zeilen: beide Spalten bleiben NULL (kein Backfill).
--
-- Rollout: wird manuell im SQL-Editor der Production
-- (bfyucjjyarvqeftqqihm) ausgefuehrt. Das ist eine bewusste Ausnahme
-- vom ueblichen 2A/2B-Ablauf (Test -> Production): die TEST-Datenbank
-- wird fuer diese kleine, rein ergaenzende Aenderung nicht verwendet.
--
-- Idempotent: Spalten per IF NOT EXISTS, Constraints nur wenn noch nicht
-- vorhanden.
-- ============================================================

BEGIN;

ALTER TABLE public.social_profiles
  ADD COLUMN IF NOT EXISTS monthly_listeners integer,
  ADD COLUMN IF NOT EXISTS monthly_listeners_as_of timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.social_profiles'::regclass
      AND conname = 'social_profiles_monthly_listeners_pair_chk'
  ) THEN
    ALTER TABLE public.social_profiles
      ADD CONSTRAINT social_profiles_monthly_listeners_pair_chk
      CHECK ((monthly_listeners IS NULL) = (monthly_listeners_as_of IS NULL));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.social_profiles'::regclass
      AND conname = 'social_profiles_monthly_listeners_nonneg_chk'
  ) THEN
    ALTER TABLE public.social_profiles
      ADD CONSTRAINT social_profiles_monthly_listeners_nonneg_chk
      CHECK (monthly_listeners IS NULL OR monthly_listeners >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.social_profiles'::regclass
      AND conname = 'social_profiles_monthly_listeners_spotify_only_chk'
  ) THEN
    ALTER TABLE public.social_profiles
      ADD CONSTRAINT social_profiles_monthly_listeners_spotify_only_chk
      CHECK (monthly_listeners IS NULL OR platform = 'spotify');
  END IF;
END
$$;

COMMIT;
