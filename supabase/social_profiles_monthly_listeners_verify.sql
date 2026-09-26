-- ============================================================
-- social_profiles_monthly_listeners_verify.sql
--
-- Verifikation von social_profiles_monthly_listeners.sql. Nach Ausfuehrung
-- der Migration gegen dieselbe Instanz laufen lassen. Die Verhaltenstests
-- laufen in einer Transaktion mit ROLLBACK -- es bleiben keine Daten
-- zurueck.
-- ============================================================

\pset pager off

\echo '=== Spalten vorhanden, Typen, Nullable ==='
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'social_profiles'
  AND column_name IN ('monthly_listeners', 'monthly_listeners_as_of')
ORDER BY column_name;

\echo '=== Erwartung: monthly_listeners = integer, monthly_listeners_as_of = timestamp with time zone, beide YES ==='

\echo '=== CHECK-Constraints (erwartet: pair_chk, nonneg_chk, spotify_only_chk) ==='
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.social_profiles'::regclass
  AND conname LIKE 'social_profiles_monthly_listeners_%'
ORDER BY conname;

\echo '=== Kein Backfill: erwartet 0 Zeilen mit neuen Werten direkt nach der Migration ==='
SELECT count(*) AS rows_with_monthly_listeners
FROM public.social_profiles
WHERE monthly_listeners IS NOT NULL OR monthly_listeners_as_of IS NOT NULL;

\echo '=== Grants unveraendert: relacl (service_role erwartet arwd, anon r); attacl der neuen Spalten NULL ==='
SELECT relacl FROM pg_class WHERE relname = 'social_profiles' AND relnamespace = 'public'::regnamespace;
SELECT a.attname, a.attacl
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
WHERE c.relname = 'social_profiles' AND c.relnamespace = 'public'::regnamespace
  AND a.attname IN ('monthly_listeners', 'monthly_listeners_as_of')
ORDER BY a.attname;

\echo '=== Verhaltenstests (BEGIN ... ROLLBACK): gueltige Zustaende angenommen, ungueltige abgelehnt ==='
BEGIN;

CREATE TEMP TABLE _verify_results (test text, result text) ON COMMIT DROP;

DO $$
DECLARE
  v_band uuid;
  v_other uuid;
  v_sp uuid;
  v_followers integer;
  v_checked timestamptz;
BEGIN
  SELECT id INTO v_band FROM public.bands ORDER BY id LIMIT 1;
  IF v_band IS NULL THEN
    INSERT INTO _verify_results VALUES ('Vorbedingung: mindestens eine Band', 'FAIL (keine Band vorhanden)');
    RETURN;
  END IF;

  -- Testzeilen (werden per ROLLBACK verworfen). tiktok wird vom Admin
  -- nicht gepflegt; spotify wird nur angelegt, wenn die Band noch keine hat.
  INSERT INTO public.social_profiles (band_id, platform, url)
    VALUES (v_band, 'tiktok', 'https://verify.invalid/tiktok')
    ON CONFLICT (band_id, platform) DO UPDATE SET url = EXCLUDED.url
    RETURNING id INTO v_other;

  INSERT INTO public.social_profiles (band_id, platform, url)
    VALUES (v_band, 'spotify', 'https://verify.invalid/spotify')
    ON CONFLICT (band_id, platform) DO UPDATE SET url = public.social_profiles.url
    RETURNING id INTO v_sp;

  BEGIN
    UPDATE public.social_profiles SET monthly_listeners = 12686, monthly_listeners_as_of = '2026-09-01T00:00:00Z' WHERE id = v_sp;
    INSERT INTO _verify_results VALUES ('01 gueltig: Wert + Datum auf Spotify', 'PASS');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _verify_results VALUES ('01 gueltig: Wert + Datum auf Spotify', 'FAIL ' || SQLERRM);
  END;

  BEGIN
    UPDATE public.social_profiles SET monthly_listeners = 0, monthly_listeners_as_of = '2026-09-01T00:00:00Z' WHERE id = v_sp;
    INSERT INTO _verify_results VALUES ('02 gueltig: Wert 0 + Datum', 'PASS');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _verify_results VALUES ('02 gueltig: Wert 0 + Datum', 'FAIL ' || SQLERRM);
  END;

  BEGIN
    UPDATE public.social_profiles SET monthly_listeners = NULL, monthly_listeners_as_of = NULL WHERE id = v_sp;
    INSERT INTO _verify_results VALUES ('03 gueltig: Wert + Datum gemeinsam leeren', 'PASS');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _verify_results VALUES ('03 gueltig: Wert + Datum gemeinsam leeren', 'FAIL ' || SQLERRM);
  END;

  BEGIN
    UPDATE public.social_profiles SET monthly_listeners = 5, monthly_listeners_as_of = NULL WHERE id = v_sp;
    INSERT INTO _verify_results VALUES ('04 abgelehnt: Wert ohne Datum', 'FAIL (angenommen)');
  EXCEPTION WHEN check_violation THEN
    INSERT INTO _verify_results VALUES ('04 abgelehnt: Wert ohne Datum', 'PASS');
  END;

  BEGIN
    UPDATE public.social_profiles SET monthly_listeners = NULL, monthly_listeners_as_of = '2026-09-01T00:00:00Z' WHERE id = v_sp;
    INSERT INTO _verify_results VALUES ('05 abgelehnt: Datum ohne Wert', 'FAIL (angenommen)');
  EXCEPTION WHEN check_violation THEN
    INSERT INTO _verify_results VALUES ('05 abgelehnt: Datum ohne Wert', 'PASS');
  END;

  BEGIN
    UPDATE public.social_profiles SET monthly_listeners = -1, monthly_listeners_as_of = '2026-09-01T00:00:00Z' WHERE id = v_sp;
    INSERT INTO _verify_results VALUES ('06 abgelehnt: negativer Wert', 'FAIL (angenommen)');
  EXCEPTION WHEN check_violation THEN
    INSERT INTO _verify_results VALUES ('06 abgelehnt: negativer Wert', 'PASS');
  END;

  BEGIN
    UPDATE public.social_profiles SET monthly_listeners = 5, monthly_listeners_as_of = '2026-09-01T00:00:00Z' WHERE id = v_other;
    INSERT INTO _verify_results VALUES ('07 abgelehnt: Wert bei Nicht-Spotify-Plattform', 'FAIL (angenommen)');
  EXCEPTION WHEN check_violation THEN
    INSERT INTO _verify_results VALUES ('07 abgelehnt: Wert bei Nicht-Spotify-Plattform', 'PASS');
  END;

  -- Follower-Spalten bleiben vom Spotify-Wert unberuehrt.
  UPDATE public.social_profiles SET monthly_listeners = 7, monthly_listeners_as_of = '2026-09-01T00:00:00Z' WHERE id = v_sp;
  SELECT current_followers, last_checked_at INTO v_followers, v_checked FROM public.social_profiles WHERE id = v_sp;
  INSERT INTO _verify_results VALUES (
    '08 getrennt: current_followers/last_checked_at unberuehrt',
    CASE WHEN v_followers IS NULL AND v_checked IS NULL THEN 'PASS' ELSE 'FAIL' END
  );
END
$$;

SELECT test, result FROM _verify_results ORDER BY test;

ROLLBACK;

\echo '=== Erwartung: alle 8 Zeilen PASS; danach ROLLBACK, keine Daten veraendert ==='
