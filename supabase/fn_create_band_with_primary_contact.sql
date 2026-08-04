-- ============================================================
-- fn_create_band_with_primary_contact.sql
--
-- Block L-A1 — Kontaktintegritaet im Band-Admin (Teilpaket 3).
--
-- NOCH NICHT AUSGEFUEHRT. Nur gegen lokale/Test-/Preview-Instanz, nicht
-- gegen Production ohne separate Freigabe (siehe CUTOVER.md).
--
-- Legt eine neue Band UND ihren primaeren Anfragekontakt atomar an:
-- entweder entstehen beide Datensaetze, oder keiner (Produktentscheidung
-- 22 / Definition of Done 24). Da eine PL/pgSQL-Funktion ohne eigenen
-- EXCEPTION-Block innerhalb genau einer Transaktion laeuft, rollt jeder
-- "raise exception" -- auch ein roher Constraint-Verstoss beim zweiten
-- INSERT -- automatisch BEIDE Inserts zurueck. Kein separates
-- Rollback-Handling noetig.
--
-- Ruft ausschliesslich bands und band_contacts an -- band_profiles/
-- band_band_types bleiben wie bisher nicht-atomare Folgeschritte in
-- app/admin/bands/new/actions.ts (unveraendertes, bestehendes Verhalten,
-- nicht Teil dieses Auftrags).
--
-- Fehlercodes (5-stellig, gleiches Muster wie fn_moods_catalog_admin.sql):
--   BCC01  band_name_required
--   BCC02  band_slug_invalid
--   BCC03  band_status_invalid
--   BCC05  band_slug_conflict
--   BCC10  contact_email_required
--   BCC11  contact_email_invalid
--
-- Sicherheit (identisches Modell zu fn_moods_catalog_admin.sql):
--   SECURITY DEFINER, SET search_path = pg_catalog, pg_temp, vollstaendig
--   schemaqualifiziert. REVOKE ALL FROM PUBLIC/anon/authenticated + GRANT
--   EXECUTE nur an service_role.
-- ============================================================

create or replace function public.create_band_with_primary_contact(
  p_name text,
  p_slug text,
  p_status text,
  p_is_published boolean,
  p_contact_email text,
  p_contact_name text,
  p_contact_phone text,
  p_contact_role text
)
returns public.bands
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_name          text;
  v_slug          text;
  v_status        text;
  v_email         text;
  v_contact_name  text;
  v_contact_phone text;
  v_contact_role  text;
  v_band          public.bands;
begin
  v_name := coalesce(trim(p_name), '');
  v_slug := coalesce(trim(p_slug), '');
  v_status := coalesce(trim(p_status), '');
  v_email := coalesce(trim(p_contact_email), '');
  v_contact_name := nullif(trim(coalesce(p_contact_name, '')), '');
  v_contact_phone := nullif(trim(coalesce(p_contact_phone, '')), '');
  v_contact_role := nullif(trim(coalesce(p_contact_role, '')), '');

  if v_name = '' or char_length(v_name) > 200 then
    raise exception 'band_name_required'
      using errcode = 'BCC01', detail = 'name must be 1..200 chars after trim';
  end if;

  if v_slug = '' or v_slug !~ '^[a-z0-9-]+$' then
    raise exception 'band_slug_invalid'
      using errcode = 'BCC02', detail = format('slug=%s does not match ^[a-z0-9-]+$', v_slug);
  end if;

  if v_status not in ('new', 'draft') then
    raise exception 'band_status_invalid'
      using errcode = 'BCC03', detail = format('status=%s not allowed at creation, expected new|draft', v_status);
  end if;

  if v_email = '' then
    raise exception 'contact_email_required'
      using errcode = 'BCC10', detail = 'contact email must not be empty';
  end if;

  if char_length(v_email) > 254 or v_email ~ '[\r\n]' or v_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'contact_email_invalid'
      using errcode = 'BCC11', detail = 'contact email failed format/length/CRLF validation';
  end if;

  if exists (select 1 from public.bands where slug = v_slug) then
    raise exception 'band_slug_conflict'
      using errcode = 'BCC05', detail = format('slug=%s already exists', v_slug);
  end if;

  insert into public.bands (name, slug, status, is_published)
  values (v_name, v_slug, v_status, coalesce(p_is_published, false))
  returning * into v_band;

  insert into public.band_contacts (
    band_id, contact_name, email, phone, contact_role, is_public, is_primary_inquiry
  )
  values (
    v_band.id, v_contact_name, v_email, v_contact_phone,
    coalesce(v_contact_role, 'management'), false, true
  );

  return v_band;
end;
$$;

revoke all on function public.create_band_with_primary_contact(text, text, text, boolean, text, text, text, text) from public;
revoke all on function public.create_band_with_primary_contact(text, text, text, boolean, text, text, text, text) from anon;
revoke all on function public.create_band_with_primary_contact(text, text, text, boolean, text, text, text, text) from authenticated;
grant execute on function public.create_band_with_primary_contact(text, text, text, boolean, text, text, text, text) to service_role;
