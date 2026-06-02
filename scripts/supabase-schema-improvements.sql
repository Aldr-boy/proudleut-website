-- ============================================================
-- proudleut Supabase Schema-Verbesserungen
-- Migration Script — non-destructive, safe to run on existing data
-- ============================================================
-- Zusammenfassung:
--   1. band_contacts: Multi-Kontakt mit is_primary_inquiry
--   2. social_profiles: UNIQUE(band_id, platform)
--   3. Indexes auf Junction-Tables + Filter-Spalten
--   4. updated_at Trigger-Funktion
--   5. media_assets: Partial Unique für Hero-Images
--   6. band_relations: Duplikat-Schutz
--   7. bands.status: 'new' hinzufügen
--   8. people + band_memberships (architektonisch vorbereitet)
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- 1. band_contacts: Mehrere Kontakte pro Band erlauben
--    + is_primary_inquiry Flag mit Partial Unique Index
-- ──────────────────────────────────────────────────────────────

-- UNIQUE auf band_id entfernen (erlaubt aktuell nur 1 Kontakt pro Band)
ALTER TABLE public.band_contacts
  DROP CONSTRAINT IF EXISTS band_contacts_band_id_key;

-- Neues Flag: Wer bekommt die Anfragen?
ALTER TABLE public.band_contacts
  ADD COLUMN IF NOT EXISTS is_primary_inquiry boolean NOT NULL DEFAULT false;

-- Genau EIN primärer Anfragekontakt pro Band (Datenbank-Garantie)
CREATE UNIQUE INDEX IF NOT EXISTS idx_band_contacts_one_primary_per_band
  ON public.band_contacts (band_id)
  WHERE is_primary_inquiry = true;

-- Kein doppelter Kontakt mit gleicher Rolle pro Band
CREATE UNIQUE INDEX IF NOT EXISTS idx_band_contacts_unique_role
  ON public.band_contacts (band_id, contact_role);

-- Bestehenden einzelnen Kontakt als primary markieren
UPDATE public.band_contacts
  SET is_primary_inquiry = true
  WHERE id IN (
    SELECT DISTINCT ON (band_id) id
    FROM public.band_contacts
    ORDER BY band_id, created_at ASC
  );


-- ──────────────────────────────────────────────────────────────
-- 2. social_profiles: Duplikat-Schutz
-- ──────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_social_profiles_band_platform
  ON public.social_profiles (band_id, platform);


-- ──────────────────────────────────────────────────────────────
-- 3. Indexes — das Performance-Fundament für den Liveband-Finder
-- ──────────────────────────────────────────────────────────────

-- Junction Tables: PostgreSQL indexiert FK-Spalten NICHT automatisch.
-- Ohne diese Indexes wird jeder Filter-Join ein Sequential Scan.

-- band_event_types
CREATE INDEX IF NOT EXISTS idx_band_event_types_event_type
  ON public.band_event_types (event_type_id);

-- band_band_types
CREATE INDEX IF NOT EXISTS idx_band_band_types_band_type
  ON public.band_band_types (band_type_id);

-- band_lineups
CREATE INDEX IF NOT EXISTS idx_band_lineups_lineup
  ON public.band_lineups (lineup_id);

-- band_sound_worlds
CREATE INDEX IF NOT EXISTS idx_band_sound_worlds_sound_world
  ON public.band_sound_worlds (sound_world_id);

-- band_moods
CREATE INDEX IF NOT EXISTS idx_band_moods_mood
  ON public.band_moods (mood_id);

-- band_services
CREATE INDEX IF NOT EXISTS idx_band_services_service
  ON public.band_services (service_id);

-- band_repertoire_styles
CREATE INDEX IF NOT EXISTS idx_band_repertoire_styles_style
  ON public.band_repertoire_styles (repertoire_style_id);

-- Core filter: "Zeige mir alle aktiven, veröffentlichten Bands"
CREATE INDEX IF NOT EXISTS idx_bands_status_published
  ON public.bands (status, is_published)
  WHERE is_published = true;

-- Media: Hero-Image schnell laden (häufigste Abfrage)
CREATE INDEX IF NOT EXISTS idx_media_assets_band_role
  ON public.media_assets (band_id, role);

-- Videos pro Band
CREATE INDEX IF NOT EXISTS idx_videos_band
  ON public.videos (band_id);

-- Reference Events pro Band
CREATE INDEX IF NOT EXISTS idx_reference_events_band
  ON public.reference_events (band_id);

-- Social Profiles pro Band
CREATE INDEX IF NOT EXISTS idx_social_profiles_band
  ON public.social_profiles (band_id);

-- Locations: Geo-Suche (falls PostGIS aktiv)
CREATE INDEX IF NOT EXISTS idx_locations_geo_point
  ON public.locations USING GIST (geo_point);

-- Locations: PLZ-Suche
CREATE INDEX IF NOT EXISTS idx_locations_plz
  ON public.locations (plz);

-- Band Contacts pro Band
CREATE INDEX IF NOT EXISTS idx_band_contacts_band
  ON public.band_contacts (band_id);

-- Band Relations (beide Richtungen)
CREATE INDEX IF NOT EXISTS idx_band_relations_source
  ON public.band_relations (source_band_id);
CREATE INDEX IF NOT EXISTS idx_band_relations_target
  ON public.band_relations (target_band_id);


-- ──────────────────────────────────────────────────────────────
-- 4. updated_at Trigger — automatische Aktualisierung
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger auf alle Tabellen mit updated_at
-- DROP + CREATE statt IF NOT EXISTS (erst ab PG 17 verfügbar, PG-versions-agnostisch)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'bands', 'band_profiles', 'band_contacts', 'band_types',
      'event_types', 'lineups', 'sound_worlds', 'moods',
      'services', 'repertoire_styles', 'locations',
      'media_assets', 'videos', 'social_profiles',
      'reference_events', 'band_relations', 'band_band_types'
    ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at
       BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;


-- ──────────────────────────────────────────────────────────────
-- 5. media_assets: Nur EIN Hero-Image pro Band
-- ──────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_assets_one_hero_per_band
  ON public.media_assets (band_id)
  WHERE role = 'hero';


-- ──────────────────────────────────────────────────────────────
-- 6. band_relations: Duplikat-Schutz
-- ──────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_band_relations_unique_pair
  ON public.band_relations (source_band_id, target_band_id, relation_type);


-- ──────────────────────────────────────────────────────────────
-- 7. bands.status: 'new' hinzufügen
-- ──────────────────────────────────────────────────────────────

-- Bestehende CHECK Constraint ersetzen
ALTER TABLE public.bands
  DROP CONSTRAINT IF EXISTS bands_status_check;

ALTER TABLE public.bands
  ADD CONSTRAINT bands_status_check
  CHECK (status = ANY (ARRAY[
    'new'::text,
    'draft'::text,
    'active'::text,
    'paused'::text,
    'archived'::text
  ]));

-- Default bleibt 'draft' (nicht 'new'), weil manuell angelegte Bands
-- direkt in Draft starten. 'new' ist für den automatischen Import
-- via Tally → Make → Supabase.


-- ──────────────────────────────────────────────────────────────
-- 8. people + band_memberships (architektonisch vorbereitet)
--    → Tabellen existieren, werden noch nicht im Frontend genutzt
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.people (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) <= 200),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'::text),
  bio text,
  image_url text,
  website_url text,
  status text NOT NULL DEFAULT 'draft'::text
    CHECK (status = ANY (ARRAY['active'::text, 'draft'::text, 'archived'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT people_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.band_memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  band_id uuid NOT NULL,
  person_id uuid NOT NULL,
  role text,                          -- z.B. 'Frontmann', 'Bandleader', 'Gast'
  instrument text,                    -- z.B. 'Gitarre', 'Gesang', 'Drums'
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  joined_at date,
  left_at date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT band_memberships_pkey PRIMARY KEY (id),
  CONSTRAINT band_memberships_band_id_fkey FOREIGN KEY (band_id) REFERENCES public.bands(id),
  CONSTRAINT band_memberships_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id),
  CONSTRAINT band_memberships_unique_active UNIQUE (band_id, person_id)
);

-- Indexes für band_memberships
CREATE INDEX IF NOT EXISTS idx_band_memberships_band
  ON public.band_memberships (band_id);
CREATE INDEX IF NOT EXISTS idx_band_memberships_person
  ON public.band_memberships (person_id);

-- updated_at Trigger für die neuen Tabellen
-- (Nutzt die gleiche Funktion von oben)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['people', 'band_memberships'])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', tbl, tbl
    );
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at
       BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;


-- ============================================================
-- DONE. Zusammenfassung der Änderungen:
-- ============================================================
-- ✓ band_contacts: Multi-Kontakt + is_primary_inquiry (Partial Unique)
-- ✓ social_profiles: UNIQUE(band_id, platform)
-- ✓ 20+ Indexes auf Junction-Tables, Filter-Spalten, Geo
-- ✓ updated_at Trigger auf allen relevanten Tabellen
-- ✓ media_assets: Max 1 Hero pro Band
-- ✓ band_relations: Keine Duplikate
-- ✓ bands.status: 'new' als Option hinzugefügt
-- ✓ people + band_memberships: Architektonisch vorbereitet
-- ============================================================
