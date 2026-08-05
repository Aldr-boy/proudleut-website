-- ============================================================
-- fn_set_primary_inquiry_contact.sql
--
-- Codex-Nachtrag PR #26, zweiter Review -- Befund 1+2: vollstaendig
-- atomare Kontaktanlage/-bearbeitung inkl. optionalem Primaerwechsel.
--
-- NOCH NICHT AUSGEFUEHRT. Nur gegen lokale/Test-/Preview-Instanz, nicht
-- gegen Production ohne separate Freigabe. Da die gesamte L-A1-Migration
-- noch nirgends ausgefuehrt wurde, wurde diese Datei bewusst konsolidiert
-- (kein Production-Rollback der vorherigen Fassung noetig).
--
-- Vorherige Fassung dieser Datei enthielt ausschliesslich
-- set_primary_inquiry_contact(p_band_id, p_contact_id) -- das loeste NUR
-- den Primaerwechsel selbst atomar, nicht aber das vorgelagerte
-- Anlegen/Aktualisieren der Kontaktfelder: app/admin/bands/[id]/actions.ts
-- legte den Kontakt zunaechst per direktem INSERT/UPDATE an, bevor die RPC
-- aufgerufen wurde. Schlug DIESER zweite Schritt fehl, blieb die bereits
-- geschriebene (bei createContactAction: nicht-primaere, aber real
-- existierende; bei updateContactAction: bereits mit den NEUEN Feldwerten
-- ueberschriebene) Kontaktzeile trotz Fehlermeldung im Admin bestehen --
-- kein vollstaendiger Rollback des GESAMTEN Vorgangs.
--
-- Diese Fassung ersetzt set_primary_inquiry_contact() durch zwei neue,
-- jeweils vollstaendig in EINEM Funktionsaufruf (= einer Transaktion)
-- ablaufende Funktionen, die Feldschreibung UND optionalen Primaerwechsel
-- gemeinsam atomar durchfuehren:
--
--   public.create_band_contact(p_band_id, p_contact_name, p_email,
--     p_phone, p_contact_role, p_is_public, p_is_primary_inquiry)
--     returns public.band_contacts
--
--   public.update_band_contact(p_contact_id, p_band_id, p_contact_name,
--     p_email, p_phone, p_contact_role, p_is_public, p_is_primary_inquiry)
--     returns public.band_contacts
--
-- Beide Funktionen validieren vollstaendig (Pflichtfeld-Kombination,
-- Laengen, E-Mail-Format/CRLF, Rollen-Wertebereich, Rollenkonflikt
-- innerhalb derselben Band) und verlangen eine gueltige E-Mail-Adresse fuer
-- p_is_primary_inquiry=true NUR, wenn die Band status='active' hat
-- (inaktive/Draft-Bands werden nicht unnoetig verschaerft). Schlaegt IRGEND
-- eine Pruefung fehl, bricht die Funktion per raise exception ab, BEVOR
-- irgendein INSERT/UPDATE ausgefuehrt wird -- der vorherige Zustand bleibt
-- dadurch in jedem Fehlerfall vollstaendig unveraendert (Postgres rollt
-- eine fehlgeschlagene Funktion als Ganzes zurueck, da kein eigener
-- EXCEPTION-Block existiert, der den Fehler abfangen wuerde).
--
-- Ist p_is_primary_inquiry=true, wird ein bisheriger Primaerkontakt der
-- Band erst NACH erfolgreicher Validierung UND erfolgreichem Schreiben der
-- eigentlichen Kontaktfelder, in DERSELBEN Transaktion, zurueckgesetzt und
-- der Zielkontakt anschliessend primaer gesetzt -- kein Zwischenzustand
-- ohne jeden primaeren Kontakt, keine teilweise geschriebene Kontaktzeile.
--
-- update_band_contact setzt is_primary_inquiry bei p_is_primary_inquiry=
-- false explizit auf false (identisch zum bisherigen TS-Verhalten) --
-- app/admin/bands/[id]/actions.ts sichert VOR diesem Aufruf weiterhin per
-- bestehendem TS-Guard ab, dass der aktuell primaere Kontakt einer aktiven
-- Band nicht auf diesem Weg entprimarisiert werden kann, ohne dass ein
-- anderer Kontakt gleichzeitig uebernimmt (unveraenderte, bereits
-- bestehende Integritaetsregel, nicht Teil dieses Nachtrags).
--
-- Fehlercodes (5-stellig, gleiches Muster wie fn_moods_catalog_admin.sql,
-- von beiden Funktionen gemeinsam genutzt):
--   CC001  contact_band_not_found
--   CC002  contact_missing_fields       (weder Name noch E-Mail noch Telefon)
--   CC003  contact_field_too_long
--   CC004  contact_invalid_email        (Format/Laenge/CRLF)
--   CC005  contact_invalid_role
--   CC006  contact_duplicate_role       (Rolle bereits an anderen Kontakt vergeben)
--   CC007  contact_primary_email_required_active (nur bei status='active')
--   CC010  contact_not_found            (nur update_band_contact)
--   CC011  contact_band_mismatch        (nur update_band_contact)
--
-- Sicherheit (identisches Modell zu fn_moods_catalog_admin.sql):
--   SECURITY DEFINER, SET search_path = pg_catalog, pg_temp, vollstaendig
--   schemaqualifiziert, FOR UPDATE auf Band- und (bei update) Kontaktzeile
--   fuer Race-Sicherheit, keine dynamischen SQL-Fragmente. REVOKE ALL FROM
--   PUBLIC/anon/authenticated + GRANT EXECUTE nur an service_role.
-- ============================================================

-- ------------------------------------------------------------
-- create_band_contact -- Kontakt anlegen + optional atomar primaer setzen
-- ------------------------------------------------------------
create or replace function public.create_band_contact(
  p_band_id uuid,
  p_contact_name text,
  p_email text,
  p_phone text,
  p_contact_role text,
  p_is_public boolean,
  p_is_primary_inquiry boolean
)
returns public.band_contacts
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_band_status   text;
  v_contact_name  text;
  v_email         text;
  v_phone         text;
  v_contact_role  text;
  v_row           public.band_contacts;
begin
  select status into v_band_status
    from public.bands
   where id = p_band_id
     for update;
  if not found then
    raise exception 'contact_band_not_found'
      using errcode = 'CC001', detail = format('band_id=%s not found', p_band_id);
  end if;

  v_contact_name := nullif(btrim(coalesce(p_contact_name, '')), '');
  v_email        := nullif(btrim(coalesce(p_email, '')), '');
  v_phone        := nullif(btrim(coalesce(p_phone, '')), '');
  v_contact_role := nullif(btrim(coalesce(p_contact_role, '')), '');

  if v_contact_name is null and v_email is null and v_phone is null then
    raise exception 'contact_missing_fields'
      using errcode = 'CC002', detail = 'at least one of contact_name/email/phone is required';
  end if;

  if v_contact_name is not null and char_length(v_contact_name) > 200 then
    raise exception 'contact_field_too_long' using errcode = 'CC003', detail = 'contact_name too long';
  end if;
  if v_phone is not null and char_length(v_phone) > 80 then
    raise exception 'contact_field_too_long' using errcode = 'CC003', detail = 'phone too long';
  end if;
  if v_email is not null and char_length(v_email) > 254 then
    raise exception 'contact_field_too_long' using errcode = 'CC003', detail = 'email too long';
  end if;

  if v_email is not null and (
       v_email ~ '[\r\n]'
    or v_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  ) then
    raise exception 'contact_invalid_email' using errcode = 'CC004', detail = 'email format invalid';
  end if;

  if v_contact_role is not null
     and v_contact_role not in ('management', 'booking', 'band_direct', 'technik', 'press')
  then
    raise exception 'contact_invalid_role'
      using errcode = 'CC005', detail = format('role=%s not allowed', v_contact_role);
  end if;

  if v_contact_role is not null and exists (
    select 1 from public.band_contacts
     where band_id = p_band_id and contact_role = v_contact_role
  ) then
    raise exception 'contact_duplicate_role'
      using errcode = 'CC006', detail = format('role=%s already assigned for band_id=%s', v_contact_role, p_band_id);
  end if;

  if coalesce(p_is_primary_inquiry, false) and v_band_status = 'active' and v_email is null then
    raise exception 'contact_primary_email_required_active'
      using errcode = 'CC007', detail = 'active band requires a valid email for the primary inquiry contact';
  end if;

  insert into public.band_contacts (
    band_id, contact_name, email, phone, contact_role, is_public, is_primary_inquiry
  )
  values (
    p_band_id, v_contact_name, v_email, v_phone, v_contact_role, coalesce(p_is_public, false), false
  )
  returning * into v_row;

  if coalesce(p_is_primary_inquiry, false) then
    update public.band_contacts
       set is_primary_inquiry = false
     where band_id = p_band_id
       and id <> v_row.id
       and is_primary_inquiry = true;

    update public.band_contacts
       set is_primary_inquiry = true
     where id = v_row.id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

revoke all on function public.create_band_contact(uuid, text, text, text, text, boolean, boolean) from public;
revoke all on function public.create_band_contact(uuid, text, text, text, text, boolean, boolean) from anon;
revoke all on function public.create_band_contact(uuid, text, text, text, text, boolean, boolean) from authenticated;
grant execute on function public.create_band_contact(uuid, text, text, text, text, boolean, boolean) to service_role;

-- ------------------------------------------------------------
-- update_band_contact -- Kontaktfelder aktualisieren + optional atomar
-- primaer setzen/zuruecksetzen, alles in einer Transaktion.
-- ------------------------------------------------------------
create or replace function public.update_band_contact(
  p_contact_id uuid,
  p_band_id uuid,
  p_contact_name text,
  p_email text,
  p_phone text,
  p_contact_role text,
  p_is_public boolean,
  p_is_primary_inquiry boolean
)
returns public.band_contacts
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_band_status        text;
  v_existing_band_id    uuid;
  v_contact_name        text;
  v_email               text;
  v_phone               text;
  v_contact_role        text;
  v_row                 public.band_contacts;
begin
  select status into v_band_status
    from public.bands
   where id = p_band_id
     for update;
  if not found then
    raise exception 'contact_band_not_found'
      using errcode = 'CC001', detail = format('band_id=%s not found', p_band_id);
  end if;

  select band_id into v_existing_band_id
    from public.band_contacts
   where id = p_contact_id
     for update;
  if not found then
    raise exception 'contact_not_found'
      using errcode = 'CC010', detail = format('contact_id=%s not found', p_contact_id);
  end if;

  if v_existing_band_id <> p_band_id then
    raise exception 'contact_band_mismatch'
      using errcode = 'CC011',
            detail = format('contact_id=%s does not belong to band_id=%s', p_contact_id, p_band_id);
  end if;

  v_contact_name := nullif(btrim(coalesce(p_contact_name, '')), '');
  v_email        := nullif(btrim(coalesce(p_email, '')), '');
  v_phone        := nullif(btrim(coalesce(p_phone, '')), '');
  v_contact_role := nullif(btrim(coalesce(p_contact_role, '')), '');

  if v_contact_name is null and v_email is null and v_phone is null then
    raise exception 'contact_missing_fields'
      using errcode = 'CC002', detail = 'at least one of contact_name/email/phone is required';
  end if;

  if v_contact_name is not null and char_length(v_contact_name) > 200 then
    raise exception 'contact_field_too_long' using errcode = 'CC003', detail = 'contact_name too long';
  end if;
  if v_phone is not null and char_length(v_phone) > 80 then
    raise exception 'contact_field_too_long' using errcode = 'CC003', detail = 'phone too long';
  end if;
  if v_email is not null and char_length(v_email) > 254 then
    raise exception 'contact_field_too_long' using errcode = 'CC003', detail = 'email too long';
  end if;

  if v_email is not null and (
       v_email ~ '[\r\n]'
    or v_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  ) then
    raise exception 'contact_invalid_email' using errcode = 'CC004', detail = 'email format invalid';
  end if;

  if v_contact_role is not null
     and v_contact_role not in ('management', 'booking', 'band_direct', 'technik', 'press')
  then
    raise exception 'contact_invalid_role'
      using errcode = 'CC005', detail = format('role=%s not allowed', v_contact_role);
  end if;

  if v_contact_role is not null and exists (
    select 1 from public.band_contacts
     where band_id = p_band_id and contact_role = v_contact_role and id <> p_contact_id
  ) then
    raise exception 'contact_duplicate_role'
      using errcode = 'CC006', detail = format('role=%s already assigned for band_id=%s', v_contact_role, p_band_id);
  end if;

  if coalesce(p_is_primary_inquiry, false) and v_band_status = 'active' and v_email is null then
    raise exception 'contact_primary_email_required_active'
      using errcode = 'CC007', detail = 'active band requires a valid email for the primary inquiry contact';
  end if;

  update public.band_contacts
     set contact_name = v_contact_name,
         email        = v_email,
         phone        = v_phone,
         contact_role = v_contact_role,
         is_public    = coalesce(p_is_public, false)
   where id = p_contact_id
  returning * into v_row;

  if coalesce(p_is_primary_inquiry, false) then
    update public.band_contacts
       set is_primary_inquiry = false
     where band_id = p_band_id
       and id <> p_contact_id
       and is_primary_inquiry = true;

    update public.band_contacts
       set is_primary_inquiry = true
     where id = p_contact_id
    returning * into v_row;
  else
    update public.band_contacts
       set is_primary_inquiry = false
     where id = p_contact_id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

revoke all on function public.update_band_contact(uuid, uuid, text, text, text, text, boolean, boolean) from public;
revoke all on function public.update_band_contact(uuid, uuid, text, text, text, text, boolean, boolean) from anon;
revoke all on function public.update_band_contact(uuid, uuid, text, text, text, text, boolean, boolean) from authenticated;
grant execute on function public.update_band_contact(uuid, uuid, text, text, text, text, boolean, boolean) to service_role;
