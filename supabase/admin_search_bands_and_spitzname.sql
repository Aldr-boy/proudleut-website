-- ============================================================
-- admin_search_bands_and_spitzname.sql
--
-- Auftrag "Admin-Bandsuche über Ansprechpartner + Feld Spitzname".
-- Fuegt band_contacts.spitzname hinzu, erweitert create_band_contact/
-- update_band_contact um p_spitzname (DEFAULT NULL, Rueckwaertskompatibel)
-- und legt admin_search_bands() an: durchsucht Bandname/Slug UND
-- Ansprechpartner (contact_name/spitzname/email) kombiniert mit dem
-- bestehenden Status-Filter, unaccent-faehig.
--
-- VERIFIZIERT per Rollback-Probelauf gegen Produktion (bfyucjjyarvqeftqqihm,
-- BEGIN...ROLLBACK, PROD_DB_URL_MIGRATION, ein pg.Client) am 2026-09-28.
-- Alle sieben Nachweise (a-g, siehe Freigabe-Bericht) bestanden:
--   a) genau 1 Zeile pro Band trotz mehrerer Kontakte (EXISTS/Unterabfrage,
--      kein direkter Join im Hauptresultat)
--   b) "Muller" (ohne Umlaut) findet Kontakt "Müller" (unaccent Zwei-
--      Argument-Form mit explizitem regdictionary, da search_path in den
--      SECURITY DEFINER-Funktionen gesperrt ist)
--   c) Suche nach Spitzname liefert match_source='contact' und korrektes
--      match_value
--   d) Suche kombiniert mit Status-Filter funktioniert
--   e) je Kontakt-RPC existiert nach dem Umbau genau eine Signatur
--   f) update_band_contact OHNE p_spitzname (alter Aufrufstil) funktioniert
--      weiterhin unveraendert (DEFAULT NULL greift)
--   g) anon hat keinen Zugriff auf admin_search_bands (REVOKE ALL FROM
--      public/anon/authenticated, GRANT EXECUTE nur an service_role)
--
-- WICHTIG (aus dem Probelauf gelernt): die PL/pgSQL-Ausdruecke hier NIE
-- durch eine JS-Template-Literal-Schicht route -- \s, \r\n, \. und die
-- \/\\-Verdopplung fuer das LIKE-Escaping werden von JS' eigenem String-
-- Escaping sonst stillschweigend veraendert (beobachtet waehrend der
-- ersten Probelauf-Iteration: [^\s@] wurde zu [^s@], brach die E-Mail-
-- Validierung fuer jede Adresse mit einem "s" vor dem @). Diese Datei ist
-- reines SQL und wird 1:1 ausgefuehrt (psql, Supabase SQL-Editor, oder ein
-- Runner, der die Datei unveraendert per readFileSync einliest) -- nie
-- Zeile fuer Zeile in JS-Stringliterale umschreiben.
--
-- Reihenfolge: zuerst TEST, danach Produktion mit separater Freigabe
-- (siehe migration-notes.md / Projektkonvention). NICHT eigenmaechtig
-- ausfuehren.
-- ============================================================

-- ------------------------------------------------------------
-- 1. unaccent-Extension
-- ------------------------------------------------------------
create schema if not exists extensions;
create extension if not exists unaccent schema extensions;

-- ------------------------------------------------------------
-- 2. spitzname-Spalte (admin-only, nie oeffentlich ausgegeben --
--    band_contacts bleibt RLS-gesperrt fuer anon, siehe
--    supabase/enable-rls-app-tables.sql + grant-service-role-permissions.sql)
-- ------------------------------------------------------------
alter table public.band_contacts
  add column if not exists spitzname text check (char_length(spitzname) <= 100);

-- ------------------------------------------------------------
-- 3. Alte Kontakt-RPC-Signaturen droppen (explizit, nicht per
--    CREATE OR REPLACE) -- danach existiert je Funktion garantiert genau
--    eine Signatur.
-- ------------------------------------------------------------
drop function if exists public.create_band_contact(uuid, text, text, text, text, boolean, boolean);
drop function if exists public.update_band_contact(uuid, uuid, text, text, text, text, boolean, boolean);

-- ------------------------------------------------------------
-- 4. create_band_contact (neu, 8 Parameter: p_spitzname text DEFAULT NULL
--    als letzter Parameter -- Rueckwaertskompatibel zu bestehenden
--    Aufrufen ohne dieses Argument)
-- ------------------------------------------------------------
create function public.create_band_contact(
  p_band_id uuid,
  p_contact_name text,
  p_email text,
  p_phone text,
  p_contact_role text,
  p_is_public boolean,
  p_is_primary_inquiry boolean,
  p_spitzname text DEFAULT NULL
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
  v_spitzname     text;
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
  v_spitzname    := nullif(btrim(coalesce(p_spitzname, '')), '');

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
  if v_spitzname is not null and char_length(v_spitzname) > 100 then
    raise exception 'contact_field_too_long' using errcode = 'CC003', detail = 'spitzname too long';
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
    band_id, contact_name, email, phone, contact_role, is_public, is_primary_inquiry, spitzname
  )
  values (
    p_band_id, v_contact_name, v_email, v_phone, v_contact_role, coalesce(p_is_public, false), false, v_spitzname
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

revoke all on function public.create_band_contact(uuid, text, text, text, text, boolean, boolean, text) from public;
revoke all on function public.create_band_contact(uuid, text, text, text, text, boolean, boolean, text) from anon;
revoke all on function public.create_band_contact(uuid, text, text, text, text, boolean, boolean, text) from authenticated;
grant execute on function public.create_band_contact(uuid, text, text, text, text, boolean, boolean, text) to service_role;

-- ------------------------------------------------------------
-- 5. update_band_contact (neu, 9 Parameter, gleiches Prinzip)
-- ------------------------------------------------------------
create function public.update_band_contact(
  p_contact_id uuid,
  p_band_id uuid,
  p_contact_name text,
  p_email text,
  p_phone text,
  p_contact_role text,
  p_is_public boolean,
  p_is_primary_inquiry boolean,
  p_spitzname text DEFAULT NULL
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
  v_spitzname           text;
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
  v_spitzname    := nullif(btrim(coalesce(p_spitzname, '')), '');

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
  if v_spitzname is not null and char_length(v_spitzname) > 100 then
    raise exception 'contact_field_too_long' using errcode = 'CC003', detail = 'spitzname too long';
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
         is_public    = coalesce(p_is_public, false),
         spitzname    = v_spitzname
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

revoke all on function public.update_band_contact(uuid, uuid, text, text, text, text, boolean, boolean, text) from public;
revoke all on function public.update_band_contact(uuid, uuid, text, text, text, text, boolean, boolean, text) from anon;
revoke all on function public.update_band_contact(uuid, uuid, text, text, text, text, boolean, boolean, text) from authenticated;
grant execute on function public.update_band_contact(uuid, uuid, text, text, text, text, boolean, boolean, text) to service_role;

-- ------------------------------------------------------------
-- 6. admin_search_bands -- durchsucht bands.name/slug UND
--    band_contacts.contact_name/spitzname/email, kombinierbar mit
--    Status-Filter. Kontaktsuche ausschliesslich ueber EXISTS (Filter)
--    und korrelierte Skalar-Unterabfragen (match_value) -- KEIN direkter
--    Join auf band_contacts im Hauptresultat, damit eine Band mit
--    mehreren Kontakten trotzdem genau eine Ergebniszeile liefert.
--    % und _ in der Nutzereingabe werden vor dem Aufbau des ILIKE-Musters
--    escaped (Backslash zuerst verdoppeln, dann % und _ escapen).
-- ------------------------------------------------------------
create function public.admin_search_bands(p_query text, p_status text default null)
returns table (
  id uuid,
  name text,
  slug text,
  status text,
  is_published boolean,
  updated_at timestamptz,
  city_name text,
  match_source text,
  match_value text
)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_query   text;
  v_pattern text;
  v_dict    regdictionary := 'extensions.unaccent'::regdictionary;
begin
  v_query := nullif(btrim(coalesce(p_query, '')), '');
  if v_query is not null then
    v_pattern := '%' || replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  return query
  select
    b.id, b.name, b.slug, b.status, b.is_published, b.updated_at,
    l.city_name,
    case
      when v_query is null then null
      when extensions.unaccent(v_dict, lower(b.name)) ilike extensions.unaccent(v_dict, lower(v_pattern)) escape '\' then 'name'
      when extensions.unaccent(v_dict, lower(b.slug))  ilike extensions.unaccent(v_dict, lower(v_pattern)) escape '\' then 'slug'
      when exists (
        select 1 from public.band_contacts c
        where c.band_id = b.id
          and (
            extensions.unaccent(v_dict, lower(coalesce(c.contact_name, ''))) ilike extensions.unaccent(v_dict, lower(v_pattern)) escape '\'
            or extensions.unaccent(v_dict, lower(coalesce(c.spitzname, '')))  ilike extensions.unaccent(v_dict, lower(v_pattern)) escape '\'
            or extensions.unaccent(v_dict, lower(coalesce(c.email, '')))      ilike extensions.unaccent(v_dict, lower(v_pattern)) escape '\'
          )
      ) then 'contact'
      else null
    end as match_source,
    case
      when v_query is null then null
      when extensions.unaccent(v_dict, lower(b.name)) ilike extensions.unaccent(v_dict, lower(v_pattern)) escape '\' then b.name
      when extensions.unaccent(v_dict, lower(b.slug))  ilike extensions.unaccent(v_dict, lower(v_pattern)) escape '\' then b.slug
      else (
        select coalesce(
          (select c.contact_name from public.band_contacts c
            where c.band_id = b.id
              and extensions.unaccent(v_dict, lower(coalesce(c.contact_name,''))) ilike extensions.unaccent(v_dict, lower(v_pattern)) escape '\'
            order by c.created_at limit 1),
          (select c.spitzname from public.band_contacts c
            where c.band_id = b.id
              and extensions.unaccent(v_dict, lower(coalesce(c.spitzname,''))) ilike extensions.unaccent(v_dict, lower(v_pattern)) escape '\'
            order by c.created_at limit 1),
          (select c.email from public.band_contacts c
            where c.band_id = b.id
              and extensions.unaccent(v_dict, lower(coalesce(c.email,''))) ilike extensions.unaccent(v_dict, lower(v_pattern)) escape '\'
            order by c.created_at limit 1)
        )
      )
    end as match_value
  from public.bands b
  left join public.locations l on l.id = b.home_location_id
  where (p_status is null or p_status = 'all' or b.status = p_status)
    and (
      v_query is null
      or extensions.unaccent(v_dict, lower(b.name)) ilike extensions.unaccent(v_dict, lower(v_pattern)) escape '\'
      or extensions.unaccent(v_dict, lower(b.slug))  ilike extensions.unaccent(v_dict, lower(v_pattern)) escape '\'
      or exists (
        select 1 from public.band_contacts c
        where c.band_id = b.id
          and (
            extensions.unaccent(v_dict, lower(coalesce(c.contact_name, ''))) ilike extensions.unaccent(v_dict, lower(v_pattern)) escape '\'
            or extensions.unaccent(v_dict, lower(coalesce(c.spitzname, '')))  ilike extensions.unaccent(v_dict, lower(v_pattern)) escape '\'
            or extensions.unaccent(v_dict, lower(coalesce(c.email, '')))      ilike extensions.unaccent(v_dict, lower(v_pattern)) escape '\'
          )
      )
    )
  order by b.name;
end;
$$;

revoke all on function public.admin_search_bands(text, text) from public;
revoke all on function public.admin_search_bands(text, text) from anon;
revoke all on function public.admin_search_bands(text, text) from authenticated;
grant execute on function public.admin_search_bands(text, text) to service_role;
