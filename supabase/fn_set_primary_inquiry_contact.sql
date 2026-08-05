-- ============================================================
-- fn_set_primary_inquiry_contact.sql
--
-- Codex-Nachtrag PR #26, Befund 4 -- atomarer Primärkontakt-Wechsel.
--
-- NOCH NICHT AUSGEFUEHRT. Nur gegen lokale/Test-/Preview-Instanz, nicht
-- gegen Production ohne separate Freigabe. Da die gesamte L-A1-Migration
-- noch nirgends ausgefuehrt wurde, ist diese Datei Teil der weiterhin
-- unveroeffentlichten Vorbereitung (kein Production-Rollback noetig).
--
-- Problem: Bei einer aktiven Band konnte ein bisher nicht primaerer
-- Kontakt OHNE gueltige E-Mail-Adresse als neuer is_primary_inquiry-Kontakt
-- gespeichert werden (der bisherige Primaerkontakt wurde dabei zuerst per
-- separatem UPDATE zurueckgesetzt) -- Ergebnis: die aktive Band war
-- anschliessend nicht mehr anfragbar. Ausserdem war der Wechsel ueber zwei
-- getrennte Supabase-JS-Aufrufe (erst UPDATE ... SET is_primary_inquiry =
-- false, dann INSERT/UPDATE des Zielkontakts) nicht atomar -- ein
-- Prozessabbruch dazwischen konnte die Band voruebergehend (oder bei einem
-- echten Absturz dauerhaft) ohne jeden primaeren Kontakt zurücklassen.
--
-- Loesung: EIN Funktionsaufruf validiert die E-Mail (nur fuer aktive
-- Bands verpflichtend -- Punkt 6 des Auftrags: inaktive/Draft-Bands werden
-- nicht unnoetig verschaerft) und raeumt einen bisherigen Primaerkontakt
-- erst NACH erfolgreicher Validierung, in derselben Transaktion wie das
-- Setzen des neuen Primaerkontakts, ab. Schlaegt die Validierung fehl,
-- bleibt der bisherige Primaerkontakt vollstaendig unveraendert (die
-- Funktion bricht per raise exception ab, BEVOR irgendein UPDATE
-- ausgefuehrt wird).
--
-- Wird sowohl beim Anlegen eines neuen, sofort primaeren Kontakts
-- (createContactAction: erst nicht-primaer einfuegen, dann befoerdern) als
-- auch beim Befoerdern eines bestehenden Kontakts (updateContactAction)
-- verwendet -- kein separater Pfad fuer "neu" vs. "bestehend" noetig, da
-- diese Funktion ausschliesslich ueber den band_id+contact_id-Bezug
-- arbeitet, unabhaengig davon, wie alt der Kontakt ist.
--
-- Respektiert bestehende Semantik: is_public und contact_role werden von
-- dieser Funktion nicht angefasst (bleiben, wie sie sind); ausschliesslich
-- is_primary_inquiry wird hier gesetzt/zurueckgesetzt.
--
-- Fehlercodes (5-stellig, gleiches Muster wie fn_moods_catalog_admin.sql):
--   PC001  primary_contact_band_not_found
--   PC002  primary_contact_not_found
--   PC003  primary_contact_band_mismatch
--   PC004  primary_contact_email_invalid   (nur bei status='active')
--
-- Sicherheit (identisches Modell zu fn_moods_catalog_admin.sql):
--   SECURITY DEFINER, SET search_path = pg_catalog, pg_temp, vollstaendig
--   schemaqualifiziert, FOR UPDATE auf beide betroffenen Zeilen (Band +
--   Zielkontakt) fuer Race-Sicherheit. REVOKE ALL FROM
--   PUBLIC/anon/authenticated + GRANT EXECUTE nur an service_role.
-- ============================================================

create or replace function public.set_primary_inquiry_contact(
  p_band_id uuid,
  p_contact_id uuid
)
returns public.band_contacts
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_band_status    text;
  v_contact_band   uuid;
  v_contact_email  text;
  v_row            public.band_contacts;
begin
  select status into v_band_status
    from public.bands
   where id = p_band_id
     for update;
  if not found then
    raise exception 'primary_contact_band_not_found'
      using errcode = 'PC001', detail = format('band_id=%s not found', p_band_id);
  end if;

  select band_id, email into v_contact_band, v_contact_email
    from public.band_contacts
   where id = p_contact_id
     for update;
  if not found then
    raise exception 'primary_contact_not_found'
      using errcode = 'PC002', detail = format('contact_id=%s not found', p_contact_id);
  end if;

  if v_contact_band <> p_band_id then
    raise exception 'primary_contact_band_mismatch'
      using errcode = 'PC003',
            detail = format('contact_id=%s does not belong to band_id=%s', p_contact_id, p_band_id);
  end if;

  -- E-Mail-Pflicht nur fuer aktive Bands (Punkt 6: inaktive/Draft-Bands
  -- nicht unnoetig verschaerfen) -- identische Format-/CRLF-Pruefung wie
  -- lib/admin/bandContactValidation.ts#isValidContactEmail.
  if v_band_status = 'active' then
    if v_contact_email is null
       or btrim(v_contact_email) = ''
       or char_length(v_contact_email) > 254
       or v_contact_email ~ '[\r\n]'
       or v_contact_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
    then
      raise exception 'primary_contact_email_invalid'
        using errcode = 'PC004',
              detail = format('contact_id=%s has no valid email, required for active band', p_contact_id);
    end if;
  end if;

  -- Erst NACH erfolgreicher Validierung: bisherigen Primaerkontakt abraeumen
  -- und den Zielkontakt in DERSELBEN Transaktion befoerdern. Kein
  -- Zwischenzustand ohne jeden primaeren Kontakt -- entweder gelingt der
  -- gesamte Wechsel, oder (bei einem Fehler weiter unten) rollt alles
  -- automatisch zurueck.
  update public.band_contacts
     set is_primary_inquiry = false
   where band_id = p_band_id
     and id <> p_contact_id
     and is_primary_inquiry = true;

  update public.band_contacts
     set is_primary_inquiry = true
   where id = p_contact_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.set_primary_inquiry_contact(uuid, uuid) from public;
revoke all on function public.set_primary_inquiry_contact(uuid, uuid) from anon;
revoke all on function public.set_primary_inquiry_contact(uuid, uuid) from authenticated;
grant execute on function public.set_primary_inquiry_contact(uuid, uuid) to service_role;
