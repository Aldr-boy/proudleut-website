-- ============================================================
-- people_data_foundation_v1.sql
--
-- Paket 1 -- Datenfundament Musiker-/Personenebene V1.
--
-- Repariert die bereits vorhandenen, aber ungenutzten Tabellen
-- public.people / public.band_memberships (siehe
-- scripts/supabase-schema-improvements.sql, Abschnitt 8 --
-- "architektonisch vorbereitet, noch nicht im Frontend genutzt")
-- und legt zwei neue Tabellen fuer ein strukturiertes
-- Instrumentenmodell an.
--
-- Bewusst NICHT Teil dieser Datei (siehe Analyse-/Preflight-Berichte):
--   person_affiliations, person_credits, Rollen-Katalog,
--   mehrere historische Stints (UNIQUE(band_id, person_id) bleibt),
--   withdrawn/review-Status, approval_note, Instrument-Seedliste,
--   Personendaten (kein Dominik Palmer).
--
-- Sichtbarkeitsmodell (RLS, keine View):
--   people:                     status = 'active'
--   band_memberships:           is_public = true
--                                AND people.status = 'active'
--                                AND bands.status = 'active' AND bands.is_published
--   instruments:                status = 'active'
--   band_membership_instruments: nur wenn die zugehoerige Membership
--                                 nach obiger Regel selbst sichtbar waere
--                                 (erneute vollstaendige Pruefung in der
--                                 eigenen Policy -- kein Verlass auf RLS
--                                 einer anderen Tabelle, identisches Prinzip
--                                 wie reference_events_public_read).
--
-- Rollout-Umfang dieser Datei: AUSSCHLIESSLICH TEST (jqzqpizykymjdjumwdoj).
-- Production (bfyucjjyarvqeftqqihm) bleibt unveraendert.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. people: approved_at ergaenzen
-- ------------------------------------------------------------
alter table public.people
  add column if not exists approved_at timestamptz;

-- Status-CHECK, Statuswerte und alle uebrigen Spalten bleiben unveraendert
-- (draft/active/archived, kein withdrawn/review -- siehe Preflight-Bericht).

-- ------------------------------------------------------------
-- 2. band_memberships reparieren
-- ------------------------------------------------------------

-- is_active entfernen -- Source of Truth fuer zeitliche Aktivitaet ist
-- ausschliesslich left_at IS NULL (0 Verbraucher, 0 Zeilen, siehe Preflight).
alter table public.band_memberships
  drop column if exists is_active;

-- instrument (Singular-Freitext) entfernen -- Instrumente werden ab V1
-- ausschliesslich strukturiert ueber instruments/band_membership_instruments
-- gefuehrt (0 Verbraucher, 0 Zeilen, siehe Preflight).
alter table public.band_memberships
  drop column if exists instrument;

-- FKs auf ON DELETE CASCADE umstellen (Konsistenz mit dem uebrigen Schema).
alter table public.band_memberships
  drop constraint if exists band_memberships_band_id_fkey;
alter table public.band_memberships
  add constraint band_memberships_band_id_fkey
  foreign key (band_id) references public.bands(id) on delete cascade;

alter table public.band_memberships
  drop constraint if exists band_memberships_person_id_fkey;
alter table public.band_memberships
  add constraint band_memberships_person_id_fkey
  foreign key (person_id) references public.people(id) on delete cascade;

-- role bleibt Freitext, UNIQUE(band_id, person_id) bleibt unveraendert
-- (mehrere historische Stints sind bewusst nicht Teil dieses Pakets).

-- ------------------------------------------------------------
-- 3. instruments -- kleiner Katalog nach bestehendem Muster
--    (moods/band_types/sound_worlds/services)
-- ------------------------------------------------------------
create table if not exists public.instruments (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) <= 100),
  slug       text not null unique check (slug ~ '^[a-z0-9-]+$'),
  status     text not null default 'active' check (status in ('active', 'draft', 'archived')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_instruments_updated_at on public.instruments;
create trigger trg_instruments_updated_at
  before update on public.instruments
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 4. band_membership_instruments -- Join-Tabelle, mehrere
--    Instrumente pro Mitgliedschaft, kontrollierte Reihenfolge
-- ------------------------------------------------------------
create table if not exists public.band_membership_instruments (
  membership_id uuid not null references public.band_memberships(id) on delete cascade,
  instrument_id uuid not null references public.instruments(id) on delete cascade,
  sort_order    integer not null default 0 check (sort_order >= 0),
  created_at    timestamptz not null default now(),
  primary key (membership_id, instrument_id)
);

create index if not exists idx_band_membership_instruments_membership
  on public.band_membership_instruments (membership_id);
create index if not exists idx_band_membership_instruments_instrument
  on public.band_membership_instruments (instrument_id);

-- ------------------------------------------------------------
-- 5. RLS -- people
-- ------------------------------------------------------------
alter table public.people enable row level security;
revoke all on public.people from anon, authenticated;

drop policy if exists "people_public_read" on public.people;
create policy "people_public_read" on public.people
  for select
  to anon
  using (status = 'active');

grant select on public.people to anon;

-- ------------------------------------------------------------
-- 6. RLS -- band_memberships
-- ------------------------------------------------------------
alter table public.band_memberships enable row level security;
revoke all on public.band_memberships from anon, authenticated;

drop policy if exists "band_memberships_public_read" on public.band_memberships;
create policy "band_memberships_public_read" on public.band_memberships
  for select
  to anon
  using (
    is_public = true
    and exists (
      select 1 from public.people p
      where p.id = band_memberships.person_id
        and p.status = 'active'
    )
    and exists (
      select 1 from public.bands b
      where b.id = band_memberships.band_id
        and b.status = 'active'
        and b.is_published is true
    )
  );

grant select on public.band_memberships to anon;

-- ------------------------------------------------------------
-- 7. RLS -- instruments
-- ------------------------------------------------------------
alter table public.instruments enable row level security;
revoke all on public.instruments from anon, authenticated;

drop policy if exists "instruments_public_read" on public.instruments;
create policy "instruments_public_read" on public.instruments
  for select
  to anon
  using (status = 'active');

grant select on public.instruments to anon;

-- ------------------------------------------------------------
-- 8. RLS -- band_membership_instruments
--    Kein eigenstaendiges Sichtbarkeitskriterium -- nur sichtbar, wenn
--    die zugehoerige Membership selbst nach der oeffentlichen Regel
--    sichtbar waere (vollstaendig erneut geprueft, kein Verlass auf
--    RLS einer anderen Tabelle).
-- ------------------------------------------------------------
alter table public.band_membership_instruments enable row level security;
revoke all on public.band_membership_instruments from anon, authenticated;

drop policy if exists "band_membership_instruments_public_read" on public.band_membership_instruments;
create policy "band_membership_instruments_public_read" on public.band_membership_instruments
  for select
  to anon
  using (
    exists (
      select 1
      from public.band_memberships bm
      join public.people p on p.id = bm.person_id
      join public.bands b on b.id = bm.band_id
      where bm.id = band_membership_instruments.membership_id
        and bm.is_public = true
        and p.status = 'active'
        and b.status = 'active'
        and b.is_published is true
    )
  );

grant select on public.band_membership_instruments to anon;

-- ------------------------------------------------------------
-- 9. service_role -- Admin-CRUD fuer spaetere Verwaltung
--    (identisches Muster wie supabase/social_profiles_admin_grant.sql:
--    strukturelle Default-Privilege-Rechte entziehen, expliziten
--    CRUD-Grant setzen. ALTER DEFAULT PRIVILEGES bleibt unveraendert.)
-- ------------------------------------------------------------
revoke truncate, references, trigger, maintain
  on public.people from service_role;
grant select, insert, update, delete
  on public.people to service_role;

revoke truncate, references, trigger, maintain
  on public.band_memberships from service_role;
grant select, insert, update, delete
  on public.band_memberships to service_role;

revoke truncate, references, trigger, maintain
  on public.instruments from service_role;
grant select, insert, update, delete
  on public.instruments to service_role;

revoke truncate, references, trigger, maintain
  on public.band_membership_instruments from service_role;
grant select, insert, update, delete
  on public.band_membership_instruments to service_role;

commit;
