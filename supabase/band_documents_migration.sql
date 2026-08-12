-- ============================================================
-- band_documents_migration.sql
--
-- Paket 2A -- Banddokumente + Veranstalter-Modul. Legt die neue Tabelle
-- `band_documents` an: optionale, sortierbare Praesentations-/Info-Dokumente
-- je Band (z.B. PDF-Praesentation fuer Veranstalter), analog zum bestehenden
-- Muster von `media_assets`/`videos` (band-gebundene Content-Tabelle, kein
-- eigenstaendiges Rechtekonzept).
--
-- NOCH NICHT AUSGEFUEHRT. Diese Datei wird in Paket 2A weder gegen die
-- Production-Datenbank (bfyucjjyarvqeftqqihm) noch gegen ein anderes
-- Remote-System ausgefuehrt. Die Ausfuehrung inkl. Verifikation
-- (band_documents_migration_verify.sql) ist Teil von Paket 2B.
--
-- Tabellenname: `band_documents` (nicht `band_dokumente`) -- alle
-- bestehenden band-gebundenen Content-Tabellen verwenden durchgaengig
-- englische Namen (media_assets, videos, social_profiles, reference_events),
-- siehe supabase/proudleut-schema.sql.
--
-- Speichermodell fuer file_url/thumbnail_url: volle oeffentliche URL
-- (Storage-Bucket `band-media`), analog zu media_assets.url -- kein
-- separates Pfad-/Bucket-Feld, siehe lib/bandImages/storagePath.ts.
--
-- Rechtekonzept: identisches Muster wie alle uebrigen band-gebundenen
-- Content-Tabellen (siehe supabase/enable-rls-app-tables.sql und
-- supabase/setup-grants-and-seed.sql). RLS aktiv, anon/authenticated ohne
-- Grundrechte, Public Read nur ueber eine explizite Policy, die den
-- Public-Status der uebergeordneten Band prueft (bands.status = 'active'
-- AND bands.is_published = true -- die reale, bereits gegen Production
-- ausgefuehrte Bedingung, nicht nur status = 'active' wie bei einfachen
-- Katalogtabellen). Kein Public Write. service_role erhaelt volle,
-- explizite Grants fuer direktes Service-Role-DML (kein SECURITY-DEFINER-
-- RPC noetig -- media_assets/videos/reference_events nutzen fuer Admin-
-- Schreibzugriffe ebenfalls direktes DML, siehe
-- app/admin/bands/[id]/actions.ts).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Tabelle band_documents
-- ------------------------------------------------------------
create table public.band_documents (
  id             uuid primary key default gen_random_uuid(),
  band_id        uuid not null references public.bands(id) on delete cascade,
  title          text not null check (char_length(title) <= 200),
  audience_label text not null check (char_length(audience_label) <= 100),
  description    text,
  file_url       text not null,
  thumbnail_url  text,
  sort_order     integer not null default 0 check (sort_order >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.band_documents is
  'Optionale, sortierbare Praesentations-/Info-Dokumente je Band (z.B. PDF-Praesentation fuer Veranstalter). file_url/thumbnail_url speichern volle oeffentliche URLs, analog media_assets.url. Kein Dokumenttyp-Katalog, keine Zielgruppen-Tabelle, keine Statusmaschine -- bewusst minimal (Paket 2A).';

create trigger trg_band_documents_updated_at
  before update on public.band_documents
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 2. Indizes
-- ------------------------------------------------------------
create index idx_band_documents_band_id on public.band_documents(band_id);
create index idx_band_documents_band_sort on public.band_documents(band_id, sort_order);

-- ------------------------------------------------------------
-- 3. RLS aktivieren -- identisches Muster wie
--    supabase/enable-rls-app-tables.sql fuer alle uebrigen
--    band-gebundenen Content-Tabellen.
-- ------------------------------------------------------------
alter table public.band_documents enable row level security;

revoke all privileges on public.band_documents from anon, authenticated;

create policy "band_documents_public_read" on public.band_documents
  for select
  to anon
  using (
    exists (
      select 1 from public.bands b
      where b.id = band_documents.band_id
        and b.status = 'active'
        and b.is_published is true
    )
  );

grant select on public.band_documents to anon;

-- Kein Public Write: bewusst keine Policy und kein Grant fuer
-- insert/update/delete an anon/authenticated.

-- service_role umgeht RLS, benoetigt aber unabhaengig davon eigene
-- Tabellen-Grants (RLS-Bypass ersetzt keine GRANTs, siehe
-- supabase/setup-grants-and-seed.sql -- gleiches Muster wie
-- media_assets/videos/reference_events).
grant select, insert, update, delete on public.band_documents to service_role;

commit;
