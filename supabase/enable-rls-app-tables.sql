-- ============================================================
-- supabase/enable-rls-app-tables.sql
-- RLS-Aktivierung — App-Tabellen (proudleut)
--
-- AUSGEFÜHRT: 08.07.2026 im Supabase SQL Editor
-- Projekt: bfyucjjyarvqeftqqihm
-- Ausgeführt durch Xandi, transaktional, Ergebnis: Success.
-- Verifiziert per Audit:
-- - RLS-Status
-- - pg_policies
-- - Table-Grants
-- - Column-Privileges
-- Zusätzlich verifiziert per REST-Abnahmetests a-h
-- sowie Public-Smoke-Tests und Admin-Smoke-Tests.
-- Alle Tests bestanden.
--
-- ACHTUNG:
-- Diese Migration ist bereits gegen Production gelaufen.
-- Nicht erneut ausführen ohne Anlass.
-- Sie ist idempotent, aber ein Re-Run ist eine bewusste Entscheidung.
--
-- Berührt KEINE PostGIS-/Extension-Objekte (Block B separat,
-- supabase/harden-postgis-objects.sql, NICHT Teil dieser Ausführung).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. RLS ENABLE — alle 26 App-Tabellen
-- ------------------------------------------------------------
alter table public.bands                    enable row level security;
alter table public.band_profiles             enable row level security;
alter table public.band_contacts             enable row level security;
alter table public.event_types                enable row level security;
alter table public.band_types                 enable row level security;
alter table public.lineups                    enable row level security;
alter table public.sound_worlds               enable row level security;
alter table public.moods                      enable row level security;
alter table public.locations                  enable row level security;
alter table public.plz_reference              enable row level security;
alter table public.media_assets               enable row level security;
alter table public.videos                     enable row level security;
alter table public.social_profiles            enable row level security;
alter table public.reference_events           enable row level security;
alter table public.services                   enable row level security;
alter table public.band_event_types           enable row level security;
alter table public.band_band_types            enable row level security;
alter table public.band_lineups               enable row level security;
alter table public.band_sound_worlds          enable row level security;
alter table public.band_moods                 enable row level security;
alter table public.band_services              enable row level security;
alter table public.band_relations             enable row level security;
alter table public.repertoire_styles          enable row level security;
alter table public.band_repertoire_styles     enable row level security;
alter table public.people                     enable row level security;
alter table public.band_memberships           enable row level security;

-- ------------------------------------------------------------
-- 2. Revoke all privileges — explizite 26-Tabellen-Liste
-- ------------------------------------------------------------
revoke all privileges on
  public.bands, public.band_profiles, public.band_contacts,
  public.event_types, public.band_types, public.lineups,
  public.sound_worlds, public.moods, public.locations,
  public.plz_reference, public.media_assets, public.videos,
  public.social_profiles, public.reference_events, public.services,
  public.band_event_types, public.band_band_types, public.band_lineups,
  public.band_sound_worlds, public.band_moods, public.band_services,
  public.band_relations, public.repertoire_styles, public.band_repertoire_styles,
  public.people, public.band_memberships
from anon, authenticated;

-- ------------------------------------------------------------
-- 3. Alte Policies droppen (idempotent) + neue enge Policies
-- ------------------------------------------------------------

drop policy if exists "Public read access" on public.bands;
drop policy if exists "bands_public_read" on public.bands;
create policy "bands_public_read" on public.bands
  for select to anon
  using (status = 'active' and is_published is true);

drop policy if exists "Public read access" on public.event_types;
drop policy if exists "event_types_public_read" on public.event_types;
create policy "event_types_public_read" on public.event_types
  for select to anon using (status = 'active');

drop policy if exists "Public read access" on public.band_types;
drop policy if exists "band_types_public_read" on public.band_types;
create policy "band_types_public_read" on public.band_types
  for select to anon using (status = 'active');

drop policy if exists "Public read access" on public.lineups;
drop policy if exists "lineups_public_read" on public.lineups;
create policy "lineups_public_read" on public.lineups
  for select to anon using (status = 'active');

drop policy if exists "Public read access" on public.sound_worlds;
drop policy if exists "sound_worlds_public_read" on public.sound_worlds;
create policy "sound_worlds_public_read" on public.sound_worlds
  for select to anon using (status = 'active');

drop policy if exists "Public read access" on public.moods;
drop policy if exists "moods_public_read" on public.moods;
create policy "moods_public_read" on public.moods
  for select to anon using (status = 'active');

drop policy if exists "Public read access" on public.services;
drop policy if exists "services_public_read" on public.services;
create policy "services_public_read" on public.services
  for select to anon using (status = 'active');

drop policy if exists "Public read access" on public.repertoire_styles;
drop policy if exists "repertoire_styles_public_read" on public.repertoire_styles;
create policy "repertoire_styles_public_read" on public.repertoire_styles
  for select to anon using (status = 'active');

drop policy if exists "Public read access" on public.band_profiles;
drop policy if exists "band_profiles_public_read" on public.band_profiles;
create policy "band_profiles_public_read" on public.band_profiles
  for select to anon
  using (
    exists (
      select 1 from public.bands b
      where b.id = band_profiles.band_id
        and b.status = 'active' and b.is_published is true
    )
  );

drop policy if exists "Public read access" on public.locations;
drop policy if exists "locations_public_read" on public.locations;
create policy "locations_public_read" on public.locations
  for select to anon
  using (
    exists (
      select 1 from public.bands b
      where b.home_location_id = locations.id
        and b.status = 'active' and b.is_published is true
    )
  );

drop policy if exists "Public read access" on public.media_assets;
drop policy if exists "media_assets_public_read" on public.media_assets;
create policy "media_assets_public_read" on public.media_assets
  for select to anon
  using (
    exists (
      select 1 from public.bands b
      where b.id = media_assets.band_id
        and b.status = 'active' and b.is_published is true
    )
  );

drop policy if exists "Public read access" on public.videos;
drop policy if exists "videos_public_read" on public.videos;
create policy "videos_public_read" on public.videos
  for select to anon
  using (
    exists (
      select 1 from public.bands b
      where b.id = videos.band_id
        and b.status = 'active' and b.is_published is true
    )
  );

drop policy if exists "Public read access" on public.social_profiles;
drop policy if exists "social_profiles_public_read" on public.social_profiles;
create policy "social_profiles_public_read" on public.social_profiles
  for select to anon
  using (
    exists (
      select 1 from public.bands b
      where b.id = social_profiles.band_id
        and b.status = 'active' and b.is_published is true
    )
  );

drop policy if exists "Public read access" on public.reference_events;
drop policy if exists "reference_events_public_read" on public.reference_events;
create policy "reference_events_public_read" on public.reference_events
  for select to anon
  using (
    exists (
      select 1 from public.bands b
      where b.id = reference_events.band_id
        and b.status = 'active' and b.is_published is true
    )
  );

drop policy if exists "Public read access" on public.band_event_types;
drop policy if exists "band_event_types_public_read" on public.band_event_types;
create policy "band_event_types_public_read" on public.band_event_types
  for select to anon
  using (
    exists (
      select 1 from public.bands b
      where b.id = band_event_types.band_id
        and b.status = 'active' and b.is_published is true
    )
  );

drop policy if exists "Public read access" on public.band_band_types;
drop policy if exists "band_band_types_public_read" on public.band_band_types;
create policy "band_band_types_public_read" on public.band_band_types
  for select to anon
  using (
    exists (
      select 1 from public.bands b
      where b.id = band_band_types.band_id
        and b.status = 'active' and b.is_published is true
    )
  );

drop policy if exists "Public read access" on public.band_lineups;
drop policy if exists "band_lineups_public_read" on public.band_lineups;
create policy "band_lineups_public_read" on public.band_lineups
  for select to anon
  using (
    exists (
      select 1 from public.bands b
      where b.id = band_lineups.band_id
        and b.status = 'active' and b.is_published is true
    )
  );

drop policy if exists "Public read access" on public.band_sound_worlds;
drop policy if exists "band_sound_worlds_public_read" on public.band_sound_worlds;
create policy "band_sound_worlds_public_read" on public.band_sound_worlds
  for select to anon
  using (
    exists (
      select 1 from public.bands b
      where b.id = band_sound_worlds.band_id
        and b.status = 'active' and b.is_published is true
    )
  );

drop policy if exists "Public read access" on public.band_moods;
drop policy if exists "band_moods_public_read" on public.band_moods;
create policy "band_moods_public_read" on public.band_moods
  for select to anon
  using (
    exists (
      select 1 from public.bands b
      where b.id = band_moods.band_id
        and b.status = 'active' and b.is_published is true
    )
  );

drop policy if exists "Public read access" on public.band_services;
drop policy if exists "band_services_public_read" on public.band_services;
create policy "band_services_public_read" on public.band_services
  for select to anon
  using (
    exists (
      select 1 from public.bands b
      where b.id = band_services.band_id
        and b.status = 'active' and b.is_published is true
    )
  );

drop policy if exists "Public read access" on public.band_repertoire_styles;
drop policy if exists "band_repertoire_styles_public_read" on public.band_repertoire_styles;
create policy "band_repertoire_styles_public_read" on public.band_repertoire_styles
  for select to anon
  using (
    exists (
      select 1 from public.bands b
      where b.id = band_repertoire_styles.band_id
        and b.status = 'active' and b.is_published is true
    )
  );

drop policy if exists "Public read access" on public.band_relations;
drop policy if exists "band_relations_public_read" on public.band_relations;
create policy "band_relations_public_read" on public.band_relations
  for select to anon
  using (
    exists (
      select 1 from public.bands b
      where b.id = band_relations.source_band_id
        and b.status = 'active' and b.is_published is true
    )
  );

-- band_contacts, plz_reference, people, band_memberships: keine Policy
drop policy if exists "Public read access" on public.band_contacts;
drop policy if exists "Public read access" on public.plz_reference;
drop policy if exists "Public read access" on public.people;
drop policy if exists "Public read access" on public.band_memberships;

-- ------------------------------------------------------------
-- 4. Gezielte Re-Grants
-- ------------------------------------------------------------
grant select on
  public.bands, public.event_types, public.band_types, public.lineups,
  public.sound_worlds, public.moods, public.services, public.repertoire_styles,
  public.locations, public.media_assets, public.videos, public.social_profiles,
  public.reference_events, public.band_event_types, public.band_band_types,
  public.band_lineups, public.band_sound_worlds, public.band_moods,
  public.band_services, public.band_repertoire_styles
to anon;

grant select (
  band_id, short_description, main_text, slogan, meta_description,
  wedding_description, wedding_possible_playtimes, wedding_constellation,
  wedding_kidnapping_bride, wedding_moderation
) on public.band_profiles to anon;

grant select (
  source_band_id, target_band_id, relation_type, rank
) on public.band_relations to anon;

-- ------------------------------------------------------------
-- 5. Default Privileges für künftige Tabellen
-- ------------------------------------------------------------
alter default privileges in schema public
  revoke all privileges on tables from anon, authenticated;

-- ------------------------------------------------------------
-- 6. Hinweis für die Zukunft
-- ------------------------------------------------------------
-- band_profile_submissions o. ä. Intake-Features brauchen später die
-- UMGEKEHRTE Logik: anon darf INSERT, aber kein SELECT. Nicht als
-- "Policy kopieren" von den Public-Read-Tabellen behandeln.

commit;
