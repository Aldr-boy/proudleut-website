-- ============================================================
-- band_introductions_migration.sql
--
-- Paket 2A -- "Bandseite anfragen": Erstkontakt einer Band mit proudleut.
-- Legt ausschliesslich die Tabelle `band_introductions` an. Schreibt NICHT
-- in bands/band_contacts/band_relations oder eine andere Live-Profiltabelle
-- -- diese bleiben unangetastet. Keine band_id-Spalte: eine Band kann sich
-- vorstellen, obwohl sie im System noch nicht existiert (siehe
-- app/fuer-bands, Architektur-Leitplanke "Zubringer-/Submission-Schicht").
--
-- NOCH NICHT AUF PRODUCTION AUSGEFUEHRT (Paket 2A). Die Ausfuehrung gegen
-- die reale Production-Datenbank ist ausdruecklich Paket 2B und erfolgt
-- separat nach Abnahme dieses Pakets.
--
-- Rechtekonzept: `band_introductions` enthaelt personenbezogene, nicht
-- oeffentliche Daten (Kontaktdaten der vorstellenden Person). Absichtlich
-- KEINE Policies fuer anon/authenticated -- RLS ohne Policy bedeutet
-- vollstaendig kein Zugriff. service_role bekommt ausschliesslich INSERT
-- (kein SELECT/UPDATE/DELETE): diese Tabelle hat in Paket 2A keinerlei
-- Admin-Lesepfad (kein Admin-Review-Cockpit, siehe Auftrag Abschnitt 2), es
-- gibt also nichts, das service_role hier lesen/aendern muesste. Anders als
-- bei supabase/anfragesystem_native_migration.sql (dort braucht service_role
-- zusaetzlich SELECT/UPDATE fuer Admin-Retry-Seiten und bekommt INSERT
-- deshalb bewusst nur indirekt ueber eine SECURITY-DEFINER-Funktion) genuegt
-- hier ein enger direkter INSERT-Grant -- eine zusaetzliche RPC-Indirektion
-- waere fuer einen reinen Einzeilen-Insert ohne begleitende breitere Rechte
-- keine zusaetzliche Sicherheitsgrenze, nur unnoetige Komplexitaet. Entsteht
-- in einem spaeteren Paket ein Admin-Lesepfad, ist das der richtige
-- Zeitpunkt, dieses Rechtekonzept erneut zu bewerten.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 0. Hilfsfunktion fuer die additional_links-CHECK-Constraint
--
-- Postgres CHECK-Constraints duerfen KEINE Subqueries enthalten (auch nicht
-- "exists (select ... from unnest(...))") -- deshalb hier eine schlichte,
-- IMMUTABLE SQL-Funktion, die ausschliesslich ihr eigenes Argument prueft
-- (kein Tabellenzugriff, kein externer Zustand) und aus der Tabellen-CHECK-
-- Constraint unten aufgerufen wird. bool_and() liefert NULL fuer ein leeres
-- Array -- coalesce(..., true) macht ein leeres additional_links-Array
-- explizit gueltig (Website und zusaetzliche Links duerfen gemeinsam leer
-- sein).
-- ------------------------------------------------------------
create or replace function public.band_introductions_links_are_well_formed(links text[])
returns boolean
language sql
immutable
as $$
  select coalesce(
    bool_and(char_length(link) <= 2048 and link ~* '^https?://'),
    true
  )
  from unnest(links) as link;
$$;

-- ------------------------------------------------------------
-- 1. Tabelle band_introductions
-- ------------------------------------------------------------
create table public.band_introductions (
  id                       uuid primary key default gen_random_uuid(),
  created_at               timestamptz not null default now(),

  -- Client-seitig einmal pro Formularaufenthalt erzeugt (gleiches Muster wie
  -- anfragen.idempotency_key) -- schuetzt vor doppelten Zeilen bei einem
  -- technischen Retry desselben Submits (z. B. Netzwerk-Timeout), OHNE eine
  -- eigene Retry-/Statuspipeline zu benoetigen: ein zweiter Insert mit
  -- demselben Key schlaegt einfach am UNIQUE-Constraint fehl und wird vom
  -- Service als bereits eingegangen behandelt.
  idempotency_key          text not null unique
    check (char_length(idempotency_key) between 8 and 128)
    check (idempotency_key ~ '^[A-Za-z0-9_-]+$'),

  band_name                text not null check (char_length(band_name) between 1 and 200),
  region                   text not null check (char_length(region) between 1 and 200),

  website_url              text
    check (website_url is null or char_length(website_url) <= 500)
    check (website_url is null or website_url ~* '^https?://'),

  -- Bewusst EIN einfaches URL-Array statt eines Plattform-Schemas
  -- ({platform, url}) -- keine Plattformerkennung wird persistiert (siehe
  -- Auftrag Abschnitt 5). Reihenfolge der Eingabe bleibt erhalten (kein
  -- ORDER BY beim Lesen/Schreiben).
  additional_links         text[] not null default '{}'::text[],

  description              text not null check (char_length(description) between 30 and 1500),

  first_name               text not null check (char_length(first_name) between 1 and 100),
  last_name                text check (last_name is null or char_length(last_name) <= 100),
  nickname                 text check (nickname is null or char_length(nickname) <= 100),
  email                    text not null
    check (char_length(email) <= 254)
    check (email !~ '[\r\n]')
    check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  phone                    text check (phone is null or char_length(phone) <= 40),

  -- Datenschutz-Nachweis -- identisches Muster wie anfragen.*: niemals vom
  -- Client uebernommen, ausschliesslich serverseitig gesetzt.
  datenschutz_accepted_at  timestamptz not null,
  datenschutz_version      text not null check (char_length(datenschutz_version) <= 20),

  -- Additional-Links-Constraints als eigene, benannte table-level CHECKs
  -- (max. 6 Eintraege, jeder Eintrag http(s) und laengenbegrenzt). Die
  -- Element-Pruefung laeuft ueber die IMMUTABLE Hilfsfunktion oben (siehe
  -- dortiger Kommentar zum Subquery-Verbot in CHECK-Constraints).
  constraint band_introductions_additional_links_max_six
    check (array_length(additional_links, 1) is null or array_length(additional_links, 1) <= 6),
  constraint band_introductions_additional_links_well_formed
    check (public.band_introductions_links_are_well_formed(additional_links))
);

comment on table public.band_introductions is
  'Paket 2A "Bandseite anfragen": Erstkontakt einer Band mit proudleut (app/fuer-bands). Kein Live-Bandprofil, keine band_id -- eigenstaendiger, dauerhafter Eingang unabhaengig davon, ob spaeter eine Zusammenarbeit entsteht.';

create index idx_band_introductions_created_at on public.band_introductions(created_at desc);

-- ------------------------------------------------------------
-- 2. RLS aktivieren -- anon/authenticated ohne jeden Zugriff.
--    service_role umgeht RLS (Supabase-Standard, wie im gesamten Projekt),
--    braucht aber unabhaengig davon eigene, explizite Tabellen-Grants.
-- ------------------------------------------------------------
alter table public.band_introductions enable row level security;

revoke all privileges on public.band_introductions from anon, authenticated;

-- Keine einzige Policy fuer anon/authenticated -- RLS ohne Policy heisst
-- "kein Zugriff", das ist hier ausdruecklich gewollt: der Browser darf
-- band_introductions weder lesen noch beschreiben, ausschliesslich der
-- server-seitige Route-Handler mit service_role-Client darf schreiben.
revoke insert, select, update, delete on public.band_introductions from service_role;
grant insert on public.band_introductions to service_role;

commit;
