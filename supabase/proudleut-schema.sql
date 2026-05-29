-- ============================================================
-- proudleut.com — Supabase SQL Schema
-- Runde 3, basierend auf ERD Runde 2 v1.2
-- ============================================================

-- PostGIS + pgcrypto Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- A — KERN: BAND-IDENTITÄT
-- ============================================================

CREATE TABLE bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) <= 200),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'paused', 'archived')),
  is_published boolean NOT NULL DEFAULT false,
  lineup_flexibility text NOT NULL DEFAULT 'unknown' CHECK (lineup_flexibility IN ('fixed', 'flexible', 'modular', 'unknown')),
  default_member_count integer CHECK (default_member_count >= 1 AND default_member_count <= 30),
  home_location_id uuid,  -- FK wird nach locations-Tabelle gesetzt
  website_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE band_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid NOT NULL UNIQUE REFERENCES bands(id) ON DELETE CASCADE,
  short_description text CHECK (char_length(short_description) <= 300),
  main_text text,
  slogan text CHECK (char_length(slogan) <= 200),
  meta_description text CHECK (char_length(meta_description) <= 160),
  price_range text,
  price_tier text CHECK (price_tier IS NULL OR price_tier IN ('budget', 'mid', 'premium', 'on_request')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE band_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid NOT NULL UNIQUE REFERENCES bands(id) ON DELETE CASCADE,
  contact_name text,
  email text,
  phone text,
  contact_role text DEFAULT 'management' CHECK (contact_role IS NULL OR contact_role IN ('management', 'booking', 'band_direct', 'technik', 'press')),
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- B — ANLASS
-- ============================================================

CREATE TABLE event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) <= 100),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  parent_id uuid REFERENCES event_types(id) ON DELETE SET NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- C — BANDART & BESETZUNG
-- ============================================================

CREATE TABLE band_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) <= 100),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lineups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) <= 50),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  member_count integer CHECK (member_count >= 1),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- D — KLANG & CHARAKTER
-- ============================================================

CREATE TABLE sound_worlds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) <= 100),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE moods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) <= 50),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- E — GEOGRAFIE
-- ============================================================

CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plz text NOT NULL,
  city_name text NOT NULL,
  landkreis text,
  regierungsbezirk text,
  bundesland text,
  country text NOT NULL DEFAULT 'Deutschland',
  country_code text NOT NULL DEFAULT 'de' CHECK (char_length(country_code) = 2),
  latitude decimal CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  longitude decimal CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  geo_point geography(Point, 4326),
  plz_prefix2 text,
  plz_prefix3 text,
  is_anchor_city boolean NOT NULL DEFAULT false,
  anchor_class text,
  default_radius_km integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, plz)
);

-- GIST-Index für Umkreissuche
CREATE INDEX idx_locations_geo_point ON locations USING GIST (geo_point);

-- Trigger: geo_point automatisch aus lat/lon berechnen
CREATE OR REPLACE FUNCTION update_geo_point()
RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geo_point := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_locations_geo_point
  BEFORE INSERT OR UPDATE OF latitude, longitude ON locations
  FOR EACH ROW EXECUTE FUNCTION update_geo_point();

-- FK für bands.home_location_id jetzt setzen
ALTER TABLE bands ADD CONSTRAINT fk_bands_home_location
  FOREIGN KEY (home_location_id) REFERENCES locations(id) ON DELETE SET NULL;

-- Infrastruktur-Tabelle: Roh-PLZ-Daten (DE + AT)
CREATE TABLE plz_reference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plz text NOT NULL,
  city_name text NOT NULL,
  bundesland text,
  gemeindecode integer,  -- nur AT
  country_code text NOT NULL DEFAULT 'de',
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- F — MEDIEN
-- ============================================================

CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  url text NOT NULL,
  role text NOT NULL CHECK (role IN ('hero', 'thumbnail', 'gallery', 'logo', 'press', 'og_image')),
  alt_text text,
  source_provider text NOT NULL DEFAULT 'webflow' CHECK (source_provider IN ('webflow', 'supabase_storage', 'cloudinary', 'sanity', 'external')),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text,
  platform text NOT NULL DEFAULT 'youtube' CHECK (platform IN ('youtube', 'vimeo', 'other')),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- G — SOCIAL PROOF
-- ============================================================

CREATE TABLE social_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('facebook', 'instagram', 'youtube', 'spotify', 'tiktok')),
  url text NOT NULL,
  current_followers integer,
  current_following integer,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (band_id, platform)
);

CREATE TABLE reference_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  year integer CHECK (year >= 1900 AND year <= 2100),
  location_name text,
  city text,
  event_type_id uuid REFERENCES event_types(id) ON DELETE SET NULL,
  description text,
  url text,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- H — SERVICES
-- ============================================================

CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) <= 100),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- VERBINDUNGSTABELLEN
-- ============================================================

CREATE TABLE band_event_types (
  band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  event_type_id uuid NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (band_id, event_type_id)
);

CREATE TABLE band_band_types (
  band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  band_type_id uuid NOT NULL REFERENCES band_types(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (band_id, band_type_id)
);

-- Pro Band maximal eine primäre Bandart
CREATE UNIQUE INDEX one_primary_band_type_per_band
  ON band_band_types (band_id) WHERE is_primary = true;

CREATE TABLE band_lineups (
  band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  lineup_id uuid NOT NULL REFERENCES lineups(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (band_id, lineup_id)
);

CREATE TABLE band_sound_worlds (
  band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  sound_world_id uuid NOT NULL REFERENCES sound_worlds(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (band_id, sound_world_id)
);

CREATE TABLE band_moods (
  band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  mood_id uuid NOT NULL REFERENCES moods(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (band_id, mood_id)
);

CREATE TABLE band_services (
  band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (band_id, service_id)
);

CREATE TABLE band_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  target_band_id uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  relation_type text NOT NULL DEFAULT 'similar' CHECK (relation_type IN ('similar', 'alternative', 'often_together', 'same_sound_world')),
  rank integer CHECK (rank IS NULL OR rank > 0),
  is_manual boolean NOT NULL DEFAULT true,
  reason text,
  confidence_score decimal CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_band_id, target_band_id, relation_type),
  CHECK (source_band_id != target_band_id)
);

-- Pro Band + Beziehungstyp jede Rangposition nur einmal
CREATE UNIQUE INDEX one_rank_per_band_relation_type
  ON band_relations (source_band_id, relation_type, rank)
  WHERE rank IS NOT NULL;

-- ============================================================
-- GLOBALER updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für alle Tabellen mit updated_at
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'bands', 'band_profiles', 'band_contacts',
      'event_types', 'band_types', 'lineups',
      'sound_worlds', 'moods', 'services',
      'locations',
      'media_assets', 'videos', 'social_profiles', 'reference_events',
      'band_band_types', 'band_relations'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ============================================================
-- PERFORMANCE-INDEXES
-- ============================================================

CREATE INDEX idx_bands_status ON bands(status) WHERE status = 'active';
CREATE INDEX idx_bands_slug ON bands(slug);
CREATE INDEX idx_bands_home_location ON bands(home_location_id);
CREATE INDEX idx_band_profiles_band ON band_profiles(band_id);
CREATE INDEX idx_media_assets_band_role ON media_assets(band_id, role);
CREATE INDEX idx_videos_band ON videos(band_id);
CREATE INDEX idx_social_profiles_band ON social_profiles(band_id);
CREATE INDEX idx_reference_events_band ON reference_events(band_id);
CREATE INDEX idx_band_relations_source ON band_relations(source_band_id, relation_type);
CREATE INDEX idx_locations_anchor ON locations(is_anchor_city) WHERE is_anchor_city = true;
CREATE INDEX idx_locations_country_plz ON locations(country_code, plz_prefix2);
