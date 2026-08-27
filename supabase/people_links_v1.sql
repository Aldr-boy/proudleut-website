-- ============================================================
-- people_links_v1.sql
--
-- Paket 4C-B -- Person Links V1.
--
-- Generische, kleine Link-Ebene fuer oeffentliche Musikerprofile,
-- zusaetzlich zu people.website_url (bleibt unveraendert Hauptwebsite,
-- wird NICHT nach person_links migriert). V1 bewusst ohne Link-Type-
-- Katalog/Enum -- nur label/url/sort_order/is_public.
--
-- Sichtbarkeitsmodell (RLS, keine View, identisches Prinzip wie
-- supabase/people_data_foundation_v1.sql):
--   person_links: is_public = true AND people.status = 'active'
--   (vollstaendige Pruefung in der eigenen Policy, kein Verlass auf RLS
--   einer anderen Tabelle).
--
-- Rollout-Umfang dieser Datei: AUSSCHLIESSLICH TEST (jqzqpizykymjdjumwdoj).
-- Production (bfyucjjyarvqeftqqihm) bleibt unveraendert.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. person_links
-- ------------------------------------------------------------
create table if not exists public.person_links (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid not null references public.people(id) on delete cascade,
  label      text not null check (char_length(btrim(label)) > 0 and char_length(label) <= 60),
  -- Nur https:// -- lehnt http:, javascript:, data: und relative URLs
  -- bereits auf DB-Ebene ab (keine reine Render-Time-Sicherheit).
  url        text not null check (char_length(url) <= 2048 and url ~* '^https://'),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_public  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (person_id, url)
);

create index if not exists idx_person_links_person on public.person_links (person_id);

drop trigger if exists trg_person_links_updated_at on public.person_links;
create trigger trg_person_links_updated_at
  before update on public.person_links
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2. RLS -- person_links
--    Kein eigenstaendiges Sichtbarkeitskriterium ausserhalb der eigenen
--    Policy -- vollstaendig erneut geprueft (is_public + Personenstatus),
--    identisches Prinzip wie band_memberships_public_read.
-- ------------------------------------------------------------
alter table public.person_links enable row level security;
revoke all on public.person_links from anon, authenticated;

drop policy if exists "person_links_public_read" on public.person_links;
create policy "person_links_public_read" on public.person_links
  for select
  to anon
  using (
    is_public = true
    and exists (
      select 1 from public.people p
      where p.id = person_links.person_id
        and p.status = 'active'
    )
  );

grant select on public.person_links to anon;

-- ------------------------------------------------------------
-- 3. service_role -- Admin-CRUD (identisches Muster wie
--    supabase/people_data_foundation_v1.sql)
-- ------------------------------------------------------------
revoke truncate, references, trigger, maintain
  on public.person_links from service_role;
grant select, insert, update, delete
  on public.person_links to service_role;

commit;
