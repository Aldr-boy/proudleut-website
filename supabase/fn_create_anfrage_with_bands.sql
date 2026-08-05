-- ============================================================
-- fn_create_anfrage_with_bands.sql
--
-- Block L-A1 — atomarer, idempotenzsicherer Erstschreibvorgang fuer eine
-- native Bandanfrage (Teilpaket 2/4).
--
-- NOCH NICHT AUSGEFUEHRT. Nur gegen lokale/Test-/Preview-Instanz, nicht
-- gegen Production ohne separate Freigabe (siehe CUTOVER.md). Setzt
-- voraus, dass supabase/anfragesystem_native_migration.sql bereits
-- ausgefuehrt wurde (anfragen/anfrage_bands muessen existieren).
--
-- Zweck: legt in EINEM atomaren Schritt eine anfragen-Zeile UND alle
-- zugehoerigen anfrage_bands-Zeilen an. Persistenz muss laut Auftrag
-- vollstaendig abgeschlossen sein, BEVOR der erste Resend-Aufruf
-- passiert -- ein Zwei-Schritt-Vorgehen (erst anfragen per Service-Role
-- INSERT, danach anfrage_bands per separatem INSERT) koennte bei einem
-- Fehler zwischen beiden Schritten eine anfragen-Zeile ohne zugehoerige
-- Bandzeilen hinterlassen. Schlimmer noch: ein Retry mit demselben
-- idempotency_key wuerde die bereits existierende (aber unvollstaendige)
-- Zeile als "bereits eingegangen" erkennen und NIE Bandzeilen oder Mails
-- nachholen. Diese Funktion verhindert das durch echte Atomaritaet.
--
-- Race-sicherer Umgang mit doppelt eingereichten idempotency_keys: SELECT
-- vor dem INSERT deckt den Normalfall ab; das INSERT selbst nutzt
-- zusaetzlich ON CONFLICT (idempotency_key) DO NOTHING, damit auch zwei
-- echt gleichzeitige Requests mit demselben Key nie zu zwei Zeilen fuehren
-- -- der zweite erkennt ueber den anschliessenden Re-SELECT die vom
-- ersten gerade angelegte Zeile.
--
-- p_anfrage: JSONB-Objekt mit allen anfragen-Spalten als Text-Keys (siehe
-- Aufrufer in lib/anfrage/service.ts fuer die exakte Form).
-- p_bands: JSONB-Array, ein Objekt pro Band (id, band_id, position,
-- band_name_snapshot, recipient_email, reply_to, template_version,
-- provider_idempotency_key, subject, body_text).
--
-- Rueckgabe: genau eine Zeile (anfrage_id, was_created). was_created=false
-- bedeutet: es existierte bereits eine Anfrage mit diesem
-- idempotency_key -- der Aufrufer darf dann KEINE Mails erneut versenden
-- und KEINE neuen anfrage_bands-Zeilen anlegen (Doppel-Submit-Schutz).
--
-- Sicherheit (identisches Modell zu fn_moods_catalog_admin.sql):
--   SECURITY DEFINER, SET search_path = pg_catalog, pg_temp, vollstaendig
--   schemaqualifiziert. REVOKE ALL FROM PUBLIC/anon/authenticated + GRANT
--   EXECUTE nur an service_role.
-- ============================================================

create or replace function public.create_anfrage_with_bands(
  p_anfrage jsonb,
  p_bands jsonb
)
returns table(anfrage_id uuid, was_created boolean)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_id          uuid;
  v_existing_id uuid;
  v_key         text;
  v_band        jsonb;
begin
  v_key := p_anfrage->>'idempotency_key';
  if v_key is null or char_length(v_key) = 0 then
    raise exception 'anfrage_idempotency_key_required'
      using errcode = 'AN001', detail = 'idempotency_key must not be empty';
  end if;

  select id into v_existing_id from public.anfragen where idempotency_key = v_key;
  if v_existing_id is not null then
    return query select v_existing_id, false;
    return;
  end if;

  v_id := (p_anfrage->>'id')::uuid;

  insert into public.anfragen (
    id, idempotency_key, vorname, nachname, email, telefon, anlass, datum_text,
    location, plz_ort, nachricht, gaestezahl, spielzeit, source, status,
    datenschutz_accepted_at, datenschutz_version,
    confirmation_recipient, confirmation_reply_to, confirmation_status,
    confirmation_provider_idempotency_key, confirmation_subject,
    confirmation_body_text, confirmation_template_version
  ) values (
    v_id,
    v_key,
    p_anfrage->>'vorname',
    p_anfrage->>'nachname',
    p_anfrage->>'email',
    p_anfrage->>'telefon',
    p_anfrage->>'anlass',
    p_anfrage->>'datum_text',
    p_anfrage->>'location',
    p_anfrage->>'plz_ort',
    p_anfrage->>'nachricht',
    p_anfrage->>'gaestezahl',
    p_anfrage->>'spielzeit',
    coalesce(p_anfrage->>'source', 'proudleut-next'),
    'eingegangen',
    (p_anfrage->>'datenschutz_accepted_at')::timestamptz,
    p_anfrage->>'datenschutz_version',
    p_anfrage->>'confirmation_recipient',
    p_anfrage->>'confirmation_reply_to',
    'ausstehend',
    p_anfrage->>'confirmation_provider_idempotency_key',
    p_anfrage->>'confirmation_subject',
    p_anfrage->>'confirmation_body_text',
    p_anfrage->>'confirmation_template_version'
  )
  on conflict (idempotency_key) do nothing
  returning id into v_id;

  if v_id is null then
    -- Echte Race: ein paralleler Request hat zwischen dem SELECT oben und
    -- diesem INSERT denselben idempotency_key gesetzt.
    select id into v_existing_id from public.anfragen where idempotency_key = v_key;
    return query select v_existing_id, false;
    return;
  end if;

  for v_band in select * from jsonb_array_elements(p_bands)
  loop
    insert into public.anfrage_bands (
      id, anfrage_id, band_id, position, band_name_snapshot, recipient_email,
      reply_to, template_version, provider_idempotency_key, subject, body_text,
      send_status, attempts
    ) values (
      (v_band->>'id')::uuid,
      v_id,
      (v_band->>'band_id')::uuid,
      (v_band->>'position')::smallint,
      v_band->>'band_name_snapshot',
      v_band->>'recipient_email',
      v_band->>'reply_to',
      v_band->>'template_version',
      v_band->>'provider_idempotency_key',
      v_band->>'subject',
      v_band->>'body_text',
      'ausstehend',
      0
    );
  end loop;

  return query select v_id, true;
end;
$$;

revoke all on function public.create_anfrage_with_bands(jsonb, jsonb) from public;
revoke all on function public.create_anfrage_with_bands(jsonb, jsonb) from anon;
revoke all on function public.create_anfrage_with_bands(jsonb, jsonb) from authenticated;
grant execute on function public.create_anfrage_with_bands(jsonb, jsonb) to service_role;
