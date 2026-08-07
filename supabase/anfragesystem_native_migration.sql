-- ============================================================
-- anfragesystem_native_migration.sql
--
-- Block L-A1 — natives Anfragesystem (Next.js -> Supabase -> Resend -> Admin).
-- Legt die beiden Kerntabellen `anfragen` und `anfrage_bands` sowie eine
-- kleine, datenbankgestuetzte Rate-Limit-Struktur an.
--
-- NOCH NICHT AUSGEFUEHRT. Diese Datei darf gemaess Auftrag ausschliesslich
-- gegen eine lokale Supabase-Instanz oder ein ausdruecklich als Test-/
-- Preview-System ausgewiesenes System ausgefuehrt werden -- NICHT gegen
-- die reale Production-Datenbank ohne separate Freigabe (siehe CUTOVER.md).
--
-- Enthaelt bewusst KEINE Aenderung an bands/band_contacts/band_relations --
-- diese Tabellen bleiben unangetastet. Verwendet die bereits bestehende
-- globale Trigger-Funktion public.set_updated_at() (siehe
-- supabase/proudleut-schema.sql) fuer updated_at-Pflege, legt sie nicht
-- erneut an.
--
-- Rechtekonzept (siehe Completion Report fuer ausfuehrliche Begruendung):
-- Der initiale, idempotenzkritische Schreibvorgang (eine anfragen-Zeile +
-- alle zugehoerigen anfrage_bands-Zeilen in einem Schritt, inkl.
-- Race-sicherem Umgang mit doppelt eingereichten idempotency_keys) laeuft
-- ausschliesslich ueber die atomare SECURITY-DEFINER-Funktion
-- public.create_anfrage_with_bands() (siehe
-- supabase/fn_create_anfrage_with_bands.sql) -- reines DB-Schreiben ohne
-- externes I/O dazwischen, ein klassischer RPC-Fall. Die NACHGELAGERTEN
-- Status-Updates je Zeile (nach jedem einzelnen Resend-Aufruf: gesendet/
-- fehlgeschlagen/ungeklaert, Attempts, Message-ID) laufen dagegen per
-- direktem Service-Role-DML aus dem Anfrage-Service (lib/anfrage/service.ts)
-- -- diese Schritte sind zwangslaeufig mit externen HTTP-Aufrufen an
-- Resend verschraenkt und lassen sich nicht in eine einzelne SQL-Funktion
-- pressen; ein einzelnes "UPDATE ... WHERE id = ..." ist ohnehin bereits
-- atomar auf Zeilenebene, eine eigene RPC brächte hier keinen
-- zusaetzlichen Schutz. RLS ist unabhaengig davon aktiv und verweigert
-- anon/authenticated jeglichen Zugriff (service_role umgeht RLS
-- grundsaetzlich, wie im gesamten Projekt ueblich). Die Rate-Limit-Pruefung
-- ist die zweite echte Race-Condition-kritische Operation dieses Pakets
-- und bekommt ebenfalls eine eigene atomare SECURITY-DEFINER-Funktion
-- (siehe unten).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Tabelle anfragen — eine gemeinsame Anfrage
-- ------------------------------------------------------------
create table public.anfragen (
  id                                    uuid primary key default gen_random_uuid(),

  idempotency_key                       text not null unique
    check (char_length(idempotency_key) between 8 and 128)
    check (idempotency_key ~ '^[A-Za-z0-9_-]+$'),

  vorname                               text not null check (char_length(vorname) between 1 and 100),
  nachname                              text check (nachname is null or char_length(nachname) <= 100),
  email                                 text not null
    check (char_length(email) <= 254)
    check (email !~ '[\r\n]')
    check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  telefon                               text check (telefon is null or char_length(telefon) <= 40),
  anlass                                text check (anlass is null or char_length(anlass) <= 200),

  -- Zusaetzlich zu den im Auftrag genannten Mindestfeldern: die beiden im
  -- bestehenden AnfrageModal bereits vorhandenen Freitextfelder
  -- Gaestezahl/Spielzeit werden NICHT verworfen (kein Datenverlust
  -- gegenueber dem bisherigen Formular) -- additiv, "Mindestens"-Klausel.
  gaestezahl                            text check (gaestezahl is null or char_length(gaestezahl) <= 50),
  spielzeit                             text check (spielzeit is null or char_length(spielzeit) <= 100),

  -- Veranstaltungsdatum bleibt bewusst Freitext (Produktentscheidung) --
  -- "20.06.2027", "September/Oktober 2026", "Samstag, 05.06.2027",
  -- mehrere moegliche Termine. Keine normalisierte Datumsspalte in L-A1.
  datum_text                            text not null check (char_length(datum_text) between 1 and 300),

  location                              text check (location is null or char_length(location) <= 200),
  plz_ort                               text check (plz_ort is null or char_length(plz_ort) <= 200),
  nachricht                             text check (nachricht is null or char_length(nachricht) <= 3000),

  source                                text not null default 'proudleut-next' check (char_length(source) <= 50),
  status                                text not null default 'eingegangen'
    check (status in ('eingegangen', 'teilweise_versendet', 'versendet', 'fehlerhaft', 'ungeklaert')),

  -- Datenschutz-Nachweis
  datenschutz_accepted_at               timestamptz not null,
  datenschutz_version                   text not null check (char_length(datenschutz_version) <= 20),

  -- Protokoll der EINEN gemeinsamen Veranstalter-Bestaetigung
  confirmation_recipient                text not null
    check (char_length(confirmation_recipient) <= 254)
    check (confirmation_recipient !~ '[\r\n]')
    check (confirmation_recipient ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  confirmation_reply_to                 text
    check (confirmation_reply_to is null or char_length(confirmation_reply_to) <= 254)
    check (confirmation_reply_to is null or confirmation_reply_to !~ '[\r\n]'),
  confirmation_status                   text not null default 'ausstehend'
    check (confirmation_status in ('ausstehend', 'gesendet', 'fehlgeschlagen', 'ungeklaert')),
  confirmation_attempts                 integer not null default 0 check (confirmation_attempts >= 0),
  confirmation_last_attempt_at          timestamptz,
  confirmation_sent_at                  timestamptz,
  confirmation_message_id               text check (confirmation_message_id is null or char_length(confirmation_message_id) <= 200),
  confirmation_provider_idempotency_key text not null unique
    check (char_length(confirmation_provider_idempotency_key) between 1 and 256),
  confirmation_error                    text check (confirmation_error is null or char_length(confirmation_error) <= 2000),
  confirmation_subject                  text check (confirmation_subject is null or char_length(confirmation_subject) <= 300),
  confirmation_body_text                text check (confirmation_body_text is null or char_length(confirmation_body_text) <= 20000),
  confirmation_template_version         text not null check (char_length(confirmation_template_version) <= 50),

  created_at                            timestamptz not null default now(),
  updated_at                            timestamptz not null default now()
);

comment on table public.anfragen is
  'L-A1: eine gemeinsame Bandanfrage eines Veranstalters (1-8 Bands ueber anfrage_bands). Datum bleibt Freitext (datum_text).';

-- ------------------------------------------------------------
-- 2. Tabelle anfrage_bands — ausgewaehlte Bands + Versandstatus
-- ------------------------------------------------------------
create table public.anfrage_bands (
  id                        uuid primary key default gen_random_uuid(),
  anfrage_id                uuid not null references public.anfragen(id) on delete cascade,
  band_id                   uuid not null references public.bands(id),

  position                  smallint not null check (position between 1 and 8),

  -- Snapshots zum Sendezeitpunkt -- Empfaenger-/Namensaenderungen bei der
  -- Band duerfen ein bereits protokolliertes Ergebnis nicht nachtraeglich
  -- verfaelschen (siehe Auftrag: "kein Live-Join fuer historische Mails").
  band_name_snapshot        text not null check (char_length(band_name_snapshot) <= 200),
  recipient_email           text not null
    check (char_length(recipient_email) <= 254)
    check (recipient_email !~ '[\r\n]')
    check (recipient_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  reply_to                  text not null
    check (char_length(reply_to) <= 254)
    check (reply_to !~ '[\r\n]')
    check (reply_to ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),

  template_version          text not null check (char_length(template_version) <= 50),
  provider_idempotency_key  text not null unique check (char_length(provider_idempotency_key) between 1 and 256),
  subject                   text not null check (char_length(subject) <= 300),
  body_text                 text not null check (char_length(body_text) <= 20000),

  send_status               text not null default 'ausstehend'
    check (send_status in ('ausstehend', 'gesendet', 'fehlgeschlagen', 'ungeklaert')),
  attempts                  integer not null default 0 check (attempts >= 0),
  last_attempt_at           timestamptz,
  sent_at                   timestamptz,
  resend_message_id         text check (resend_message_id is null or char_length(resend_message_id) <= 200),
  error_message             text check (error_message is null or char_length(error_message) <= 2000),

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  unique (anfrage_id, band_id),
  unique (anfrage_id, position)
);

comment on table public.anfrage_bands is
  'L-A1: eine Zeile pro innerhalb einer Anfrage ausgewaehlter Band inkl. Empfaenger-/Versand-Snapshot und Resend-Idempotency-Key.';

-- ------------------------------------------------------------
-- 3. updated_at-Trigger (bestehende globale Funktion wiederverwenden)
-- ------------------------------------------------------------
create trigger trg_anfragen_updated_at
  before update on public.anfragen
  for each row execute function public.set_updated_at();

create trigger trg_anfrage_bands_updated_at
  before update on public.anfrage_bands
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 4. Indizes
-- ------------------------------------------------------------
create index idx_anfragen_created_at on public.anfragen(created_at desc);
create index idx_anfragen_status on public.anfragen(status);
create index idx_anfragen_confirmation_status on public.anfragen(confirmation_status);

create index idx_anfrage_bands_anfrage_id on public.anfrage_bands(anfrage_id);
create index idx_anfrage_bands_band_id on public.anfrage_bands(band_id);
create index idx_anfrage_bands_send_status on public.anfrage_bands(send_status);

-- ------------------------------------------------------------
-- 5. Rate-Limit-Struktur — datenbankgestuetzt, kein In-Memory-State
--    (Produktentscheidung: muss in Serverless zuverlaessig funktionieren)
-- ------------------------------------------------------------
create table public.anfrage_rate_limit (
  id             uuid primary key default gen_random_uuid(),
  -- Server-seitig mit ANFRAGE_RATE_LIMIT_SALT gehashte IP (HMAC-SHA256,
  -- hex) -- niemals eine rohe IP-Adresse und niemals ein vom Client
  -- uebernommener Hash. Feste Laenge 64 (hex-SHA256).
  ip_hash        text not null check (char_length(ip_hash) = 64),
  window_start   timestamptz not null,
  request_count  integer not null default 0 check (request_count >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (ip_hash, window_start)
);

comment on table public.anfrage_rate_limit is
  'L-A1 Rate-Limiting: feste Zeitfenster pro gehashter IP. Aufbewahrung kurz -- alte Fenster werden opportunistisch von check_and_consume_anfrage_rate_limit() geloescht (kein pg_cron noetig, siehe Funktionskommentar). Keine rohen IPs.';

create trigger trg_anfrage_rate_limit_updated_at
  before update on public.anfrage_rate_limit
  for each row execute function public.set_updated_at();

create index idx_anfrage_rate_limit_window on public.anfrage_rate_limit(window_start);

-- ------------------------------------------------------------
-- 6. RLS aktivieren — anon/authenticated ohne jeden Zugriff.
--    service_role umgeht RLS (Supabase-Standard, wie im gesamten Projekt).
-- ------------------------------------------------------------
alter table public.anfragen enable row level security;
alter table public.anfrage_bands enable row level security;
alter table public.anfrage_rate_limit enable row level security;

revoke all privileges on public.anfragen, public.anfrage_bands, public.anfrage_rate_limit
  from anon, authenticated;

-- Keine einzige Policy fuer anon/authenticated -- RLS ohne Policy heisst
-- "kein Zugriff", das ist hier ausdruecklich gewollt (siehe Kommentar
-- oben: kein direkter anon-/authenticated-Zugriff auf diese Tabellen).

-- service_role umgeht zwar RLS, benoetigt aber unabhaengig davon eigene
-- Tabellen-Grants (RLS-Bypass ersetzt keine GRANTs). Das Default-ACL-Schema
-- fuer vom postgres-Rolle angelegte Tabellen vergibt an service_role
-- lediglich REFERENCES/TRIGGER/TRUNCATE/MAINTAIN, nicht aber SELECT/INSERT/
-- UPDATE (per Cutover-Test in einer isolierten Testumgebung bestaetigt) --
-- ohne diese expliziten Grants schlagen alle direkten Service-Role-Zugriffe
-- aus lib/anfrage/service.ts (Statusupdates nach Resend-Aufrufen) und den
-- Admin-Anfrageseiten (app/admin/anfragen/*) fehl.
grant select, insert, update on public.anfragen, public.anfrage_bands to service_role;

-- ------------------------------------------------------------
-- 7. Atomare, race-freie Rate-Limit-Pruefung (SECURITY DEFINER)
--
-- Festes Zeitfenster (fixed window), Bucket = floor(epoch/p_window_seconds).
-- Ein einzelnes INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING ist
-- durch den UNIQUE-Index (ip_hash, window_start) atomar und race-frei --
-- kein explizites LOCK TABLE noetig, da genau eine Zeile betroffen ist.
--
-- Cleanup/TTL-Prinzip: statt eines separaten pg_cron-Jobs (nicht
-- garantiert verfuegbar) loescht diese Funktion bei jedem Aufruf
-- opportunistisch Fenster, die aelter als das doppelte Zeitfenster sind --
-- die Tabelle bleibt dadurch von selbst klein, ohne zusaetzliche externe
-- Infrastruktur.
-- ------------------------------------------------------------
create or replace function public.check_and_consume_anfrage_rate_limit(
  p_ip_hash text,
  p_window_seconds integer default 3600,
  p_max_requests integer default 5
)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_window_start   timestamptz;
  v_window_end     timestamptz;
  v_current_count  integer;
begin
  if p_ip_hash is null or char_length(p_ip_hash) <> 64 then
    raise exception 'rate_limit_ip_hash_invalid'
      using errcode = 'RL001', detail = 'ip_hash must be a 64-char hex HMAC-SHA256 digest';
  end if;

  if p_window_seconds is null or p_window_seconds < 1 then
    raise exception 'rate_limit_window_invalid'
      using errcode = 'RL002', detail = 'window_seconds must be a positive integer';
  end if;

  if p_max_requests is null or p_max_requests < 1 then
    raise exception 'rate_limit_max_invalid'
      using errcode = 'RL003', detail = 'max_requests must be a positive integer';
  end if;

  -- Opportunistisches Cleanup alter Fenster (TTL-Ersatz ohne pg_cron).
  delete from public.anfrage_rate_limit
   where window_start < now() - make_interval(secs => p_window_seconds * 2);

  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_window_end := v_window_start + make_interval(secs => p_window_seconds);

  insert into public.anfrage_rate_limit (ip_hash, window_start, request_count)
  values (p_ip_hash, v_window_start, 1)
  on conflict (ip_hash, window_start)
  do update set request_count = public.anfrage_rate_limit.request_count + 1,
                updated_at = now()
  returning request_count into v_current_count;

  if v_current_count > p_max_requests then
    return query select false, greatest(0, ceil(extract(epoch from (v_window_end - now())))::integer);
  else
    return query select true, 0;
  end if;
end;
$$;

revoke all on function public.check_and_consume_anfrage_rate_limit(text, integer, integer) from public;
revoke all on function public.check_and_consume_anfrage_rate_limit(text, integer, integer) from anon;
revoke all on function public.check_and_consume_anfrage_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.check_and_consume_anfrage_rate_limit(text, integer, integer) to service_role;

commit;
