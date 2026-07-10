'use server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { getYouTubeEmbedUrl } from '@/lib/youtube'

function str(fd: FormData, key: string): string {
  return ((fd.get(key) as string) ?? '').trim()
}

function nullIfEmpty(val: string): string | null {
  return val === '' ? null : val
}

function nullableBoolean(fd: FormData, key: string): boolean | null {
  const v = str(fd, key)
  if (v === 'true') return true
  if (v === 'false') return false
  return null
}

// ─────────────────────────────────────────
// Band validation (Sprint 2, unchanged)
// ─────────────────────────────────────────

function validateEditBand(data: {
  name: string
  slug: string
  status: string
  lineup_flexibility: string
  default_member_count: string
  website_url: string
  short_description: string
  slogan: string
  meta_description: string
  price_tier: string
}): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!data.name) errors.name = 'Name ist erforderlich'
  else if (data.name.length > 200) errors.name = 'Max. 200 Zeichen'

  if (!data.slug) errors.slug = 'Slug ist erforderlich'
  else if (!/^[a-z0-9-]+$/.test(data.slug)) errors.slug = 'Nur Kleinbuchstaben, Zahlen und Bindestriche'

  const validStatuses = ['new', 'draft', 'active', 'paused', 'archived']
  if (!validStatuses.includes(data.status)) errors.status = 'Ungültiger Status'

  const validFlexibilities = ['fixed', 'flexible', 'modular', 'unknown']
  if (!validFlexibilities.includes(data.lineup_flexibility)) errors.lineup_flexibility = 'Ungültiger Wert'

  if (data.default_member_count !== '') {
    const n = Number(data.default_member_count)
    if (!Number.isInteger(n) || n < 1 || n > 30) errors.default_member_count = 'Zahl zwischen 1 und 30'
  }

  if (data.website_url !== '') {
    try { new URL(data.website_url) } catch { errors.website_url = 'Ungültige URL' }
  }

  if (data.short_description.length > 300) errors.short_description = 'Max. 300 Zeichen'
  if (data.slogan.length > 200) errors.slogan = 'Max. 200 Zeichen'
  if (data.meta_description.length > 160) errors.meta_description = 'Max. 160 Zeichen'

  const validPriceTiers = ['', 'budget', 'mid', 'premium', 'on_request']
  if (!validPriceTiers.includes(data.price_tier)) errors.price_tier = 'Ungültiger Preis-Tier'

  return errors
}

export async function updateBandAction(formData: FormData): Promise<never> {
  const id = str(formData, 'id')
  if (!id) redirect('/admin/bands')

  const data = {
    name: str(formData, 'name'),
    slug: str(formData, 'slug'),
    status: str(formData, 'status') || 'draft',
    lineup_flexibility: str(formData, 'lineup_flexibility') || 'unknown',
    default_member_count: str(formData, 'default_member_count'),
    website_url: str(formData, 'website_url'),
    short_description: str(formData, 'short_description'),
    slogan: str(formData, 'slogan'),
    meta_description: str(formData, 'meta_description'),
    main_text: str(formData, 'main_text'),
    price_range: str(formData, 'price_range'),
    price_tier: str(formData, 'price_tier'),
    wedding_description: str(formData, 'wedding_description'),
    wedding_possible_playtimes: str(formData, 'wedding_possible_playtimes'),
    wedding_constellation: str(formData, 'wedding_constellation'),
    wedding_fee_range: str(formData, 'wedding_fee_range'),
  }
  const is_published = formData.get('is_published') === '1'
  const wedding_kidnapping_bride = nullableBoolean(formData, 'wedding_kidnapping_bride')
  const wedding_moderation = nullableBoolean(formData, 'wedding_moderation')

  const errors = validateEditBand(data)

  if (Object.keys(errors).length > 0) {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(errors)) p.set(`e_${k}`, v)
    redirect(`/admin/bands/${id}?${p.toString()}`)
  }

  const client = createAdminClient()

  const { error: bandError } = await client
    .from('bands')
    .update({
      name: data.name,
      slug: data.slug,
      status: data.status,
      is_published,
      lineup_flexibility: data.lineup_flexibility,
      default_member_count: data.default_member_count === '' ? null : Number(data.default_member_count),
      website_url: nullIfEmpty(data.website_url),
    })
    .eq('id', id)

  if (bandError) {
    const p = new URLSearchParams()
    if (bandError.code === '23505') {
      p.set('e_slug', 'Dieser Slug ist bereits vergeben')
    } else if (bandError.code === '23514') {
      p.set('e_form', `Constraint-Fehler: ${bandError.message}`)
    } else {
      p.set('e_form', `Datenbankfehler: ${bandError.message}`)
    }
    redirect(`/admin/bands/${id}?${p.toString()}`)
  }

  const { error: profileError } = await client
    .from('band_profiles')
    .upsert(
      {
        band_id: id,
        short_description: nullIfEmpty(data.short_description),
        slogan: nullIfEmpty(data.slogan),
        meta_description: nullIfEmpty(data.meta_description),
        main_text: nullIfEmpty(data.main_text),
        price_range: nullIfEmpty(data.price_range),
        price_tier: nullIfEmpty(data.price_tier),
        wedding_description: nullIfEmpty(data.wedding_description),
        wedding_possible_playtimes: nullIfEmpty(data.wedding_possible_playtimes),
        wedding_constellation: nullIfEmpty(data.wedding_constellation),
        wedding_fee_range: nullIfEmpty(data.wedding_fee_range),
        wedding_kidnapping_bride,
        wedding_moderation,
      },
      { onConflict: 'band_id' },
    )

  if (profileError) {
    const p = new URLSearchParams()
    p.set('e_form', `Profil-Fehler: ${profileError.message}`)
    redirect(`/admin/bands/${id}?${p.toString()}`)
  }

  redirect(`/admin/bands/${id}?saved=1`)
}

// ─────────────────────────────────────────
// Contact helpers (Sprint 3)
// ─────────────────────────────────────────

const VALID_CONTACT_ROLES = ['management', 'booking', 'band_direct', 'technik', 'press'] as const
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type ContactErrorCode =
  | 'missing_fields'
  | 'too_long'
  | 'invalid_role'
  | 'invalid_email'
  | 'duplicate_role'
  | 'primary_conflict'
  | 'check_failed'
  | 'invalid_contact'
  | 'db_error'

function validateContact(data: {
  contact_name: string
  email: string
  phone: string
  contact_role: string
}): ContactErrorCode | null {
  if (!data.contact_name && !data.email && !data.phone) return 'missing_fields'
  if (data.contact_name.length > 200) return 'too_long'
  if (data.phone.length > 80) return 'too_long'
  if (data.email.length > 254) return 'too_long'
  if (data.email && !EMAIL_REGEX.test(data.email)) return 'invalid_email'
  if (data.contact_role && !(VALID_CONTACT_ROLES as readonly string[]).includes(data.contact_role)) {
    return 'invalid_role'
  }
  return null
}

function pgContactErrorCode(error: { code?: string; message?: string }): ContactErrorCode {
  if (error.code === '23505') {
    if (error.message?.includes('idx_band_contacts_unique_role')) return 'duplicate_role'
    if (error.message?.includes('idx_band_contacts_one_primary_per_band')) return 'primary_conflict'
    // Constraint name not identifiable → neutral fallback
    return 'duplicate_role'
  }
  if (error.code === '23514') return 'check_failed'
  return 'db_error'
}

// ─────────────────────────────────────────
// createContactAction (Sprint 3)
// ─────────────────────────────────────────

export async function createContactAction(formData: FormData): Promise<never> {
  const band_id = str(formData, 'band_id')
  const contact_name = str(formData, 'contact_name')
  const email = str(formData, 'email')
  const phone = str(formData, 'phone')
  const contact_role = str(formData, 'contact_role')
  const is_public = formData.get('is_public') === '1'
  const is_primary_inquiry = formData.get('is_primary_inquiry') === '1'

  const client = createAdminClient()

  // Band-Existenzprüfung
  const { data: band } = await client
    .from('bands')
    .select('id')
    .eq('id', band_id)
    .maybeSingle()
  if (!band) redirect(`/admin/bands?contact_error=invalid_contact`)

  // Feldvalidierung
  const validationError = validateContact({ contact_name, email, phone, contact_role })
  if (validationError) redirect(`/admin/bands/${band_id}?contact_error=${validationError}`)

  // Rollenkonflikt-Vorabprüfung (vor jedem Schreibvorgang)
  if (contact_role) {
    const { data: roleConflict } = await client
      .from('band_contacts')
      .select('id')
      .eq('band_id', band_id)
      .eq('contact_role', contact_role)
      .maybeSingle()
    if (roleConflict) redirect(`/admin/bands/${band_id}?contact_error=duplicate_role`)
  }

  const payload = {
    band_id,
    contact_name: nullIfEmpty(contact_name),
    email: nullIfEmpty(email),
    phone: nullIfEmpty(phone),
    contact_role: nullIfEmpty(contact_role),
    is_public,
  }

  if (is_primary_inquiry) {
    // Schritt 1: Andere Primärkontakte der Band clearen
    const { error: clearError } = await client
      .from('band_contacts')
      .update({ is_primary_inquiry: false })
      .eq('band_id', band_id)
    if (clearError) redirect(`/admin/bands/${band_id}?contact_error=${pgContactErrorCode(clearError)}`)

    // Schritt 2: Zielkontakt anlegen mit is_primary_inquiry = true
    const { error: insertError } = await client
      .from('band_contacts')
      .insert({ ...payload, is_primary_inquiry: true })
    if (insertError) redirect(`/admin/bands/${band_id}?contact_error=${pgContactErrorCode(insertError)}`)
  } else {
    const { error: insertError } = await client
      .from('band_contacts')
      .insert({ ...payload, is_primary_inquiry: false })
    if (insertError) redirect(`/admin/bands/${band_id}?contact_error=${pgContactErrorCode(insertError)}`)
  }

  redirect(`/admin/bands/${band_id}?contact_created=1`)
}

// ─────────────────────────────────────────
// updateContactAction (Sprint 3)
// ─────────────────────────────────────────

export async function updateContactAction(formData: FormData): Promise<never> {
  const contact_id = str(formData, 'contact_id')
  const band_id = str(formData, 'band_id')
  const contact_name = str(formData, 'contact_name')
  const email = str(formData, 'email')
  const phone = str(formData, 'phone')
  const contact_role = str(formData, 'contact_role')
  const is_public = formData.get('is_public') === '1'
  const is_primary_inquiry = formData.get('is_primary_inquiry') === '1'

  const client = createAdminClient()

  // Ownership-Prüfung: Kontakt laden und band_id aus DB gegen Form-Wert prüfen
  const { data: existingContact } = await client
    .from('band_contacts')
    .select('band_id')
    .eq('id', contact_id)
    .maybeSingle()
  if (!existingContact || existingContact.band_id !== band_id) {
    redirect(`/admin/bands/${band_id}?contact_error=invalid_contact`)
  }

  // Feldvalidierung
  const validationError = validateContact({ contact_name, email, phone, contact_role })
  if (validationError) redirect(`/admin/bands/${band_id}?contact_error=${validationError}`)

  // Rollenkonflikt-Vorabprüfung (vor jedem Schreibvorgang)
  if (contact_role) {
    const { data: roleConflict } = await client
      .from('band_contacts')
      .select('id')
      .eq('band_id', band_id)
      .eq('contact_role', contact_role)
      .neq('id', contact_id)
      .maybeSingle()
    if (roleConflict) redirect(`/admin/bands/${band_id}?contact_error=duplicate_role`)
  }

  const payload = {
    contact_name: nullIfEmpty(contact_name),
    email: nullIfEmpty(email),
    phone: nullIfEmpty(phone),
    contact_role: nullIfEmpty(contact_role),
    is_public,
  }

  if (is_primary_inquiry) {
    // Schritt 1: Andere Kontakte der Band auf false setzen
    const { error: clearError } = await client
      .from('band_contacts')
      .update({ is_primary_inquiry: false })
      .eq('band_id', band_id)
      .neq('id', contact_id)
    if (clearError) redirect(`/admin/bands/${band_id}?contact_error=${pgContactErrorCode(clearError)}`)

    // Schritt 2: Zielkontakt aktualisieren mit is_primary_inquiry = true
    const { error: updateError } = await client
      .from('band_contacts')
      .update({ ...payload, is_primary_inquiry: true })
      .eq('id', contact_id)
    if (updateError) redirect(`/admin/bands/${band_id}?contact_error=${pgContactErrorCode(updateError)}`)
  } else {
    const { error: updateError } = await client
      .from('band_contacts')
      .update({ ...payload, is_primary_inquiry: false })
      .eq('id', contact_id)
    if (updateError) redirect(`/admin/bands/${band_id}?contact_error=${pgContactErrorCode(updateError)}`)
  }

  redirect(`/admin/bands/${band_id}?contact_saved=1`)
}

// ─────────────────────────────────────────
// deleteContactAction (Sprint 3 Stabilisierung)
// ─────────────────────────────────────────

export async function deleteContactAction(formData: FormData): Promise<never> {
  const contact_id = str(formData, 'contact_id')
  const band_id = str(formData, 'band_id')

  const client = createAdminClient()

  const { data: existingContact } = await client
    .from('band_contacts')
    .select('band_id')
    .eq('id', contact_id)
    .maybeSingle()
  if (!existingContact || existingContact.band_id !== band_id) {
    redirect(`/admin/bands/${band_id}?contact_error=invalid_contact`)
  }

  const { error } = await client
    .from('band_contacts')
    .delete()
    .eq('id', contact_id)
    .eq('band_id', band_id)

  if (error) redirect(`/admin/bands/${band_id}?contact_error=db_error`)

  redirect(`/admin/bands/${band_id}?contact_deleted=1`)
}

// ─────────────────────────────────────────
// updateBandEventTypesAction (Sprint 4A)
// ─────────────────────────────────────────

export async function updateBandEventTypesAction(formData: FormData): Promise<never> {
  const band_id = str(formData, 'band_id')
  const selected_ids = (formData.getAll('event_type_id') as string[])
    .map(v => v.trim())
    .filter(Boolean)

  if (!band_id) redirect('/admin/bands')

  const client = createAdminClient()

  // Band-Existenzprüfung
  const { data: band } = await client
    .from('bands')
    .select('id')
    .eq('id', band_id)
    .maybeSingle()
  if (!band) redirect(`/admin/bands?event_types_error=invalid_band`)

  // Aktuelle Zuordnungen der Band lesen
  const { data: currentData, error: currentError } = await client
    .from('band_event_types')
    .select('event_type_id')
    .eq('band_id', band_id)
  if (currentError) redirect(`/admin/bands/${band_id}?event_types_error=db_error`)

  const current_ids = new Set(
    (currentData ?? []).map(r => (r as { event_type_id: string }).event_type_id),
  )

  // Eingabe validieren: alle gewählten IDs müssen aktiv oder bereits zugeordnet sein
  if (selected_ids.length > 0) {
    const { data: activeData, error: activeError } = await client
      .from('event_types')
      .select('id')
      .eq('status', 'active')
    if (activeError) redirect(`/admin/bands/${band_id}?event_types_error=db_error`)

    const active_ids = new Set((activeData ?? []).map(t => (t as { id: string }).id))
    const allowed_ids = new Set([...active_ids, ...current_ids])
    if (selected_ids.some(id => !allowed_ids.has(id))) {
      redirect(`/admin/bands/${band_id}?event_types_error=invalid_event_type`)
    }
  }

  // Differenz berechnen
  const target_ids = new Set(selected_ids)
  const to_add = selected_ids.filter(id => !current_ids.has(id))
  const to_remove = [...current_ids].filter(id => !target_ids.has(id))

  // INSERT neue Zuordnungen
  if (to_add.length > 0) {
    const { error: insertError } = await client
      .from('band_event_types')
      .insert(to_add.map(event_type_id => ({ band_id, event_type_id, sort_order: 0 })))
    if (insertError) redirect(`/admin/bands/${band_id}?event_types_error=db_error`)
  }

  // DELETE entfernte Zuordnungen – doppelt abgesichert via band_id + event_type_id
  if (to_remove.length > 0) {
    const { error: deleteError } = await client
      .from('band_event_types')
      .delete()
      .eq('band_id', band_id)
      .in('event_type_id', to_remove)
    if (deleteError) redirect(`/admin/bands/${band_id}?event_types_error=db_error`)
  }

  redirect(`/admin/bands/${band_id}?event_types_saved=1`)
}

// ─────────────────────────────────────────
// updateBandBandTypesAction (Sprint 5)
// ─────────────────────────────────────────

export async function updateBandBandTypesAction(formData: FormData): Promise<never> {
  const band_id = str(formData, 'band_id')
  const primary_band_type_id = str(formData, 'primary_band_type_id')
  const secondary_ids = (formData.getAll('secondary_band_type_id') as string[])
    .map(v => v.trim())
    .filter(Boolean)

  if (!band_id) redirect('/admin/bands')

  if (!primary_band_type_id) {
    redirect(`/admin/bands/${band_id}?band_types_error=missing_primary`)
  }

  if (secondary_ids.includes(primary_band_type_id)) {
    redirect(`/admin/bands/${band_id}?band_types_error=primary_in_secondary`)
  }

  const client = createAdminClient()

  // Band-Existenzprüfung
  const { data: band } = await client
    .from('bands')
    .select('id')
    .eq('id', band_id)
    .maybeSingle()
  if (!band) redirect(`/admin/bands?band_types_error=invalid_band`)

  // Alle übergebenen IDs gegen aktive band_types validieren
  const { data: activeData, error: activeError } = await client
    .from('band_types')
    .select('id')
    .eq('status', 'active')
  if (activeError) redirect(`/admin/bands/${band_id}?band_types_error=db_error`)

  const active_ids = new Set((activeData ?? []).map(t => (t as { id: string }).id))
  const all_submitted_ids = [primary_band_type_id, ...secondary_ids]
  if (all_submitted_ids.some(id => !active_ids.has(id))) {
    redirect(`/admin/bands/${band_id}?band_types_error=invalid_band_type`)
  }

  // Aktuellen Stand lesen
  const { data: currentData, error: currentError } = await client
    .from('band_band_types')
    .select('band_type_id, is_primary')
    .eq('band_id', band_id)
  if (currentError) redirect(`/admin/bands/${band_id}?band_types_error=db_error`)

  const current = (currentData ?? []) as { band_type_id: string; is_primary: boolean }[]
  const currentIds = new Set(current.map(r => r.band_type_id))

  // Schritt 1: Alte Primärzeile(n) zurücksetzen – MUSS vor Schritt 2 laufen
  const { error: clearError } = await client
    .from('band_band_types')
    .update({ is_primary: false })
    .eq('band_id', band_id)
    .eq('is_primary', true)
  if (clearError) redirect(`/admin/bands/${band_id}?band_types_error=db_error`)

  // Schritt 2: Neue Primärzeile setzen
  const { error: primaryError } = await client
    .from('band_band_types')
    .upsert(
      { band_id, band_type_id: primary_band_type_id, is_primary: true, sort_order: 0 },
      { onConflict: 'band_id,band_type_id' },
    )
  if (primaryError) redirect(`/admin/bands/${band_id}?band_types_error=db_error`)

  // Schritt 3: Sekundär-Diff
  const target_secondary = new Set(secondary_ids)

  const to_add = secondary_ids.filter(id => !currentIds.has(id))

  // Primärzeile explizit ausschließen – darf nie gelöscht werden
  const to_remove = current
    .filter(r => r.band_type_id !== primary_band_type_id && !target_secondary.has(r.band_type_id))
    .map(r => r.band_type_id)

  if (to_add.length > 0) {
    const { error: insertError } = await client
      .from('band_band_types')
      .insert(to_add.map(band_type_id => ({ band_id, band_type_id, is_primary: false, sort_order: 0 })))
    if (insertError) redirect(`/admin/bands/${band_id}?band_types_error=db_error`)
  }

  if (to_remove.length > 0) {
    const { error: deleteError } = await client
      .from('band_band_types')
      .delete()
      .eq('band_id', band_id)
      .in('band_type_id', to_remove)
    if (deleteError) redirect(`/admin/bands/${band_id}?band_types_error=db_error`)
  }

  redirect(`/admin/bands/${band_id}?band_types_saved=1`)
}

// ─────────────────────────────────────────
// updateBandVideoAction
// ─────────────────────────────────────────

export async function updateBandVideoAction(formData: FormData): Promise<never> {
  const band_id = str(formData, 'band_id')
  if (!band_id) redirect('/admin/bands')

  // Datenverlust-Schutz: Sentinel ist nur vorhanden wenn das Video-Query beim
  // Seitenaufruf erfolgreich war. Fehlt er, brechen wir ab statt leer zu schreiben.
  const videoLoadedSentinel = formData.get('video_loaded')
  if (videoLoadedSentinel === null) {
    redirect(`/admin/bands/${band_id}?video_error=load_failed`)
  }

  const rawUrl = str(formData, 'youtube_url')
  const client = createAdminClient()

  if (!rawUrl) {
    // Leerfeld → bestehende YouTube-Row dieser Band löschen (kein Touch anderer Rows)
    const { error } = await client
      .from('videos')
      .delete()
      .eq('band_id', band_id)
      .eq('platform', 'youtube')
    if (error) redirect(`/admin/bands/${band_id}?video_error=db_error`)
    redirect(`/admin/bands/${band_id}?video_saved=1`)
  }

  // URL validieren
  if (!getYouTubeEmbedUrl(rawUrl)) {
    redirect(`/admin/bands/${band_id}?video_error=invalid_url`)
  }

  // DELETE + INSERT (kein upsert – kein bestätigter UNIQUE-Constraint auf videos(band_id, platform))
  const { error: deleteError } = await client
    .from('videos')
    .delete()
    .eq('band_id', band_id)
    .eq('platform', 'youtube')
  if (deleteError) redirect(`/admin/bands/${band_id}?video_error=db_error`)

  const { error: insertError } = await client
    .from('videos')
    .insert({ band_id, platform: 'youtube', url: rawUrl, sort_order: 1 })
  if (insertError) redirect(`/admin/bands/${band_id}?video_error=db_error`)

  redirect(`/admin/bands/${band_id}?video_saved=1`)
}

// ─────────────────────────────────────────
// updateLocationAction (Variante A-safe)
// Erlaubt nur UPDATE bestehender, exklusiver Locations.
// Kein INSERT, kein Clone, kein Umhängen von home_location_id.
// geo_point wird niemals geschrieben — Trigger trg_locations_geo_point übernimmt das.
// ─────────────────────────────────────────

export async function updateLocationAction(formData: FormData): Promise<never> {
  const band_id = str(formData, 'band_id')
  if (!band_id) redirect('/admin/bands')

  const client = createAdminClient()

  // home_location_id immer frisch aus DB lesen — nie aus hidden form field vertrauen
  const { data: bandRow } = await client
    .from('bands')
    .select('home_location_id')
    .eq('id', band_id)
    .maybeSingle()

  if (!bandRow) redirect(`/admin/bands?location_error=invalid_band`)

  const home_location_id = bandRow.home_location_id as string | null
  if (!home_location_id) redirect(`/admin/bands/${band_id}?location_error=no_location`)

  // Eingabe validieren
  const plzRaw = str(formData, 'plz')
  const city_name = str(formData, 'city_name')
  const latStr = str(formData, 'latitude')
  const lonStr = str(formData, 'longitude')

  if (plzRaw !== '' && !/^\d{4,5}$/.test(plzRaw)) {
    redirect(`/admin/bands/${band_id}?location_error=invalid_plz`)
  }
  if (!city_name || city_name.length > 200) {
    redirect(`/admin/bands/${band_id}?location_error=invalid_city`)
  }

  // latitude und longitude müssen gemeinsam gesetzt oder gemeinsam leer sein
  const hasLat = latStr !== ''
  const hasLon = lonStr !== ''
  if (hasLat !== hasLon) {
    redirect(`/admin/bands/${band_id}?location_error=invalid_coordinates`)
  }

  let latitude: number | null = null
  let longitude: number | null = null
  if (hasLat && hasLon) {
    latitude = parseFloat(latStr)
    longitude = parseFloat(lonStr)
    if (!isFinite(latitude) || !isFinite(longitude)) {
      redirect(`/admin/bands/${band_id}?location_error=invalid_coordinates`)
    }
  }

  // Exklusivitätsprüfung: wie viele Bands nutzen dieselbe home_location_id?
  const { count: usageCount, error: countError } = await client
    .from('bands')
    .select('*', { count: 'exact', head: true })
    .eq('home_location_id', home_location_id)

  if (countError || usageCount === null) {
    redirect(`/admin/bands/${band_id}?location_error=db_error`)
  }
  if (usageCount !== 1) {
    redirect(`/admin/bands/${band_id}?location_error=shared_location`)
  }

  // UPDATE — nur erlaubte Felder, geo_point niemals in payload
  const { error: updateError } = await client
    .from('locations')
    .update({
      plz: plzRaw || null,
      city_name,
      latitude,
      longitude,
    })
    .eq('id', home_location_id)

  if (updateError) redirect(`/admin/bands/${band_id}?location_error=db_error`)

  redirect(`/admin/bands/${band_id}?location_saved=1`)
}

// ─────────────────────────────────────────
// searchLocationsAction (Home-Location wechseln — Suche)
// Reiner Read gegen public.locations. Gibt Treffer direkt zurück
// (kein redirect) — bewusste Abweichung vom sonstigen Actions-Muster,
// weil eine Trefferliste (bis zu 20 Zeilen) über Redirect/searchParams
// zu serialisieren unnötig fragil wäre. plz-coords.json wird hier
// NICHT verwendet — das ist die Frontend-Suchquelle für /bands, nicht
// die DB-Wahrheit.
// ─────────────────────────────────────────

export type LocationSearchResult = {
  id: string
  plz: string | null
  city_name: string
  landkreis: string | null
  regierungsbezirk: string | null
  bundesland: string | null
  country: string | null
  country_code: string | null
  geo_complete: boolean
  band_count: number
}

export type LocationSearchOutcome =
  | { ok: true; results: LocationSearchResult[] }
  | { ok: false; error: 'empty_query' | 'db_error' }

export async function searchLocationsAction(query: string): Promise<LocationSearchOutcome> {
  const trimmed = query.trim()
  if (!trimmed) return { ok: false, error: 'empty_query' }

  const client = createAdminClient()
  const isPlzLike = /^\d{4,5}$/.test(trimmed)

  let dbQuery = client
    .from('locations')
    .select('id, plz, city_name, landkreis, regierungsbezirk, bundesland, country, country_code, latitude, longitude, geo_point')
    .limit(20)

  dbQuery = isPlzLike
    ? dbQuery.eq('plz', trimmed)
    : dbQuery.ilike('city_name', `%${trimmed}%`)

  const { data, error } = await dbQuery
  if (error) return { ok: false, error: 'db_error' }

  const rows = data ?? []
  if (rows.length === 0) return { ok: true, results: [] }

  // band_count für alle Treffer gebündelt ermitteln (1 Query statt bis zu 20 Einzel-Counts)
  const locationIds = rows.map((loc) => loc.id as string)
  const { data: usageRows, error: usageError } = await client
    .from('bands')
    .select('home_location_id')
    .in('home_location_id', locationIds)

  if (usageError) return { ok: false, error: 'db_error' }

  const countByLocationId = new Map<string, number>()
  for (const row of usageRows ?? []) {
    const locId = row.home_location_id as string | null
    if (!locId) continue
    countByLocationId.set(locId, (countByLocationId.get(locId) ?? 0) + 1)
  }

  // Reihenfolge von rows bleibt unverändert – Map liefert nur die Zusatzwerte
  const results: LocationSearchResult[] = rows.map((loc) => ({
    id: loc.id as string,
    plz: loc.plz as string | null,
    city_name: loc.city_name as string,
    landkreis: loc.landkreis as string | null,
    regierungsbezirk: loc.regierungsbezirk as string | null,
    bundesland: loc.bundesland as string | null,
    country: loc.country as string | null,
    country_code: loc.country_code as string | null,
    geo_complete: loc.latitude != null && loc.longitude != null && loc.geo_point != null,
    band_count: countByLocationId.get(loc.id as string) ?? 0,
  }))

  return { ok: true, results }
}

// ─────────────────────────────────────────
// reassignLocationAction (Home-Location wechseln — Write)
// Einziges geschriebenes Feld: bands.home_location_id.
// Kein Insert/Update an locations, kein geo_point-Write, kein
// updated_at im Payload (Trigger trg_bands_updated_at übernimmt das,
// per SQL Editor verifiziert). Kein Exklusivitäts-Gate nötig, da der
// Write nur eine Zeile in bands betrifft, keine geteilte locations-Zeile.
// ─────────────────────────────────────────

export async function reassignLocationAction(formData: FormData): Promise<never> {
  const band_id = str(formData, 'band_id')
  const new_location_id = str(formData, 'new_location_id')

  if (!band_id) redirect('/admin/bands')
  if (!new_location_id) {
    redirect(`/admin/bands/${band_id}?location_reassign_error=missing_target`)
  }

  const client = createAdminClient()

  // home_location_id immer frisch aus DB lesen — nie aus hidden form field vertrauen
  const { data: bandRow } = await client
    .from('bands')
    .select('home_location_id')
    .eq('id', band_id)
    .maybeSingle()

  if (!bandRow) redirect(`/admin/bands?location_reassign_error=band_not_found`)

  const current_location_id = bandRow.home_location_id as string | null

  // No-Op-Guard: Ziel ist bereits die aktuelle Home-Location
  if (current_location_id === new_location_id) {
    redirect(`/admin/bands/${band_id}?location_reassign_error=same_location`)
  }

  // Existenzprüfung der Ziel-Location
  const { data: targetLocation } = await client
    .from('locations')
    .select('id')
    .eq('id', new_location_id)
    .maybeSingle()

  if (!targetLocation) {
    redirect(`/admin/bands/${band_id}?location_reassign_error=location_not_found`)
  }

  // Einziger Write: nur home_location_id, kein Touch an locations
  const { error: updateError } = await client
    .from('bands')
    .update({ home_location_id: new_location_id })
    .eq('id', band_id)

  if (updateError) redirect(`/admin/bands/${band_id}?location_reassign_error=db_error`)

  redirect(`/admin/bands/${band_id}?location_reassign_saved=1`)
}

// ─────────────────────────────────────────
// updateSimilarBandsAction (RPC public.set_similar_bands)
// Schreibt ausschliesslich ueber die SECURITY DEFINER RPC -- service_role
// hat bewusst KEINE INSERT/UPDATE/DELETE-Table-Grants auf band_relations.
// Duplikat-/Selbstreferenz-/Max-3-/Status-Pruefung laeuft atomar in der
// RPC; diese Action mapped nur die resultierenden PL-Fehlercodes auf
// stabile String-Codes fuer die Fehlermeldungs-Map in page.tsx.
// ─────────────────────────────────────────

const SIMILAR_ERRCODE_TO_SLUG: Record<string, string> = {
  PL001: 'similar_source_not_found',
  PL002: 'similar_target_not_found',
  PL003: 'similar_target_not_active',
  PL004: 'similar_self_reference',
  PL005: 'similar_too_many_targets',
  PL006: 'similar_duplicate_target',
  PL007: 'similar_targets_required',
  PL008: 'similar_null_target',
}

const SIMILAR_MESSAGE_SLUGS = new Set(Object.values(SIMILAR_ERRCODE_TO_SLUG))

// Primaer ueber error.code (PL-ERRCODE), error.message (Slug) nur als
// Fallback, danach genereller db_error-Fallback.
function similarErrorCode(error: { code?: string | null; message?: string | null }): string {
  if (error.code && SIMILAR_ERRCODE_TO_SLUG[error.code]) return SIMILAR_ERRCODE_TO_SLUG[error.code]
  if (error.message && SIMILAR_MESSAGE_SLUGS.has(error.message)) return error.message
  return 'db_error'
}

export async function updateSimilarBandsAction(formData: FormData): Promise<never> {
  const band_id = str(formData, 'band_id')
  if (!band_id) redirect('/admin/bands')

  const client = createAdminClient()

  // band_id ist nur Lookup-Key -- Band frisch aus der DB lesen, nie aus
  // dem Hidden Field selbst fuer die RPC vertrauen
  const { data: bandRow } = await client
    .from('bands')
    .select('id')
    .eq('id', band_id)
    .maybeSingle()

  if (!bandRow) redirect(`/admin/bands?similar_error=similar_source_not_found`)

  // Slot-Werte -- leere Slots herausfiltern, Reihenfolge = Rank-Reihenfolge.
  // Kompaktierung passiert hier; die RPC kompaktiert selbst nicht nach.
  const p_target_band_ids = [
    str(formData, 'slot_1'),
    str(formData, 'slot_2'),
    str(formData, 'slot_3'),
  ].filter((v) => v !== '')

  const { error } = await client.rpc('set_similar_bands', {
    p_source_band_id: bandRow.id,
    p_target_band_ids,
  })

  if (error) redirect(`/admin/bands/${bandRow.id}?similar_error=${similarErrorCode(error)}`)

  redirect(`/admin/bands/${bandRow.id}?similar_saved=1`)
}
