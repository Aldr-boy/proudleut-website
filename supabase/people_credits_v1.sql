-- ============================================================
-- people_credits_v1.sql
--
-- Musikerseite-Redesign V1 -- Person Credits V1.
--
-- Kleine, generische Referenzenliste ("Zusammengearbeitet mit") fuer
-- oeffentliche Musikerprofile. Reiner Anzeigename/String pro Eintrag,
-- keine Verknuepfung zu externen Personen, keine Logos, keine URLs.
-- Bewusst dasselbe Muster wie supabase/people_links_v1.sql -- nur ohne
-- URL-Feld/-Constraint, dafuer UNIQUE(person_id, name) gegen Duplikate.
--
-- Sichtbarkeitsmodell (RLS, keine View, identisches Prinzip wie
-- supabase/people_links_v1.sql):
--   person_credits: is_public = true AND people.status = 'active'
--   (vollstaendige Pruefung in der eigenen Policy, kein Verlass auf RLS
--   einer anderen Tabelle).
--
-- Rollout-Stand: in TEST (jqzqpizykymjdjumwdoj) und Production
-- (bfyucjjyarvqeftqqihm) angewendet.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. person_credits
-- ------------------------------------------------------------
create table if not exists public.person_credits (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid not null references public.people(id) on delete cascade,
  name       text not null check (char_length(btrim(name)) > 0 and char_length(name) <= 80),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_public  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (person_id, name)
);

create index if not exists idx_person_credits_person on public.person_credits (person_id);

drop trigger if exists trg_person_credits_updated_at on public.person_credits;
create trigger trg_person_credits_updated_at
  before update on public.person_credits
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2. RLS -- person_credits
--    Kein eigenstaendiges Sichtbarkeitskriterium ausserhalb der eigenen
--    Policy -- vollstaendig erneut geprueft (is_public + Personenstatus),
--    identisches Prinzip wie person_links_public_read.
-- ------------------------------------------------------------
alter table public.person_credits enable row level security;
revoke all on public.person_credits from anon, authenticated;

drop policy if exists "person_credits_public_read" on public.person_credits;
create policy "person_credits_public_read" on public.person_credits
  for select
  to anon
  using (
    is_public = true
    and exists (
      select 1 from public.people p
      where p.id = person_credits.person_id
        and p.status = 'active'
    )
  );

grant select on public.person_credits to anon;

-- ------------------------------------------------------------
-- 3. service_role -- Admin-CRUD (identisches Muster wie
--    supabase/people_links_v1.sql / supabase/people_data_foundation_v1.sql)
-- ------------------------------------------------------------
revoke truncate, references, trigger, maintain
  on public.person_credits from service_role;
grant select, insert, update, delete
  on public.person_credits to service_role;

commit;
