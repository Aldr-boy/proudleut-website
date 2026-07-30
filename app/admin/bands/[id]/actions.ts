'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { getYouTubeEmbedUrl } from '@/lib/youtube'
import { compactRankSlots } from '@/lib/moods/sortAssignments'
import { compactRankSlots as compactRepertoireStyleSlots } from '@/lib/repertoireStyles/sortAssignments'
import { validateBandImageFile } from '@/lib/bandImages/validateImageFile'
import { buildBandImageStoragePath, extractBandMediaStoragePath, BAND_MEDIA_BUCKET } from '@/lib/bandImages/storagePath'
import { resolvePubliclyUsedMediaRow } from '@/lib/bandImages/resolveMediaRow'
import { BAND_CARD_REVALIDATION_PATHS } from '@/lib/bandImages/cardRevalidation'
import { requireAdminSession } from '@/lib/admin/requireAdminSession'

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
    .select('id, plz, city_name, landkreis, regierungsbezirk, bundesland, country, country_code, latitude, longitude')
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
    geo_complete: loc.latitude != null && loc.longitude != null,
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

// ─────────────────────────────────────────
// updateBandMoodsAction (RPC public.set_band_moods)
// Schreibt ausschliesslich ueber die SECURITY DEFINER RPC -- service_role
// hat bewusst KEINE INSERT/UPDATE/DELETE-Table-Grants auf band_moods
// (siehe supabase/band_moods_admin_write_lockdown.sql). Maximal-4-/
// Duplikat-/Aktiv-Pruefung laeuft atomar in der RPC; diese Action
// mapped nur die resultierenden PL-Fehlercodes auf stabile String-Codes
// fuer die Fehlermeldungs-Map in page.tsx.
// ─────────────────────────────────────────

const MOOD_ERRCODE_TO_SLUG: Record<string, string> = {
  PM001: 'mood_band_not_found',
  PM002: 'mood_targets_required',
  PM003: 'mood_too_many',
  PM004: 'mood_null_target',
  PM005: 'mood_duplicate',
  PM006: 'mood_not_found',
  PM007: 'mood_not_active',
}

const MOOD_MESSAGE_SLUGS = new Set(Object.values(MOOD_ERRCODE_TO_SLUG))

// Primaer ueber error.code (PL-ERRCODE), error.message (Slug) nur als
// Fallback, danach genereller db_error-Fallback.
function moodErrorCode(error: { code?: string | null; message?: string | null }): string {
  if (error.code && MOOD_ERRCODE_TO_SLUG[error.code]) return MOOD_ERRCODE_TO_SLUG[error.code]
  if (error.message && MOOD_MESSAGE_SLUGS.has(error.message)) return error.message
  return 'db_error'
}

export async function updateBandMoodsAction(formData: FormData): Promise<never> {
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

  if (!bandRow) redirect(`/admin/bands?mood_error=mood_band_not_found`)

  // Slot-Werte -- leere Zwischenplaetze herausfiltern, Reihenfolge =
  // Rang-Reihenfolge. Kompaktierung passiert hier (lib/moods/sortAssignments.ts);
  // die RPC kompaktiert selbst nicht nach, sie nimmt die Array-Position
  // als sort_order.
  const p_mood_ids = compactRankSlots([
    str(formData, 'slot_1') || null,
    str(formData, 'slot_2') || null,
    str(formData, 'slot_3') || null,
    str(formData, 'slot_4') || null,
  ])

  const { error } = await client.rpc('set_band_moods', {
    p_band_id: bandRow.id,
    p_mood_ids,
  })

  if (error) redirect(`/admin/bands/${bandRow.id}?mood_error=${moodErrorCode(error)}`)

  redirect(`/admin/bands/${bandRow.id}?mood_saved=1`)
}

// ─────────────────────────────────────────
// updateBandRepertoireStylesAction (RPC public.set_band_repertoire_styles)
// Schreibt ausschliesslich ueber die bereits live ausgerollte, bestehende
// SECURITY DEFINER RPC public.set_band_repertoire_styles (siehe
// supabase/fn_set_band_repertoire_styles.sql -- Production-Rollout
// "Musikalisch verortet" abgeschlossen und verifiziert). Diese Datei wird
// fuer den Admin-Schreibpfad unveraendert wiederverwendet, keine zweite
// RPC. service_role hat bewusst KEINE INSERT/UPDATE/DELETE-Table-Grants
// auf band_repertoire_styles. Maximal-3-/Duplikat-/Aktiv-Pruefung laeuft
// atomar in der RPC; diese Action mapped nur die resultierenden
// PL-Fehlercodes (PR001-PR007) auf stabile String-Codes fuer die
// Fehlermeldungs-Map in page.tsx.
// ─────────────────────────────────────────

const REPERTOIRE_STYLE_ERRCODE_TO_SLUG: Record<string, string> = {
  PR001: 'repertoire_band_not_found',
  PR002: 'repertoire_targets_required',
  PR003: 'repertoire_too_many',
  PR004: 'repertoire_null_target',
  PR005: 'repertoire_duplicate',
  PR006: 'repertoire_style_not_found',
  PR007: 'repertoire_style_not_active',
}

const REPERTOIRE_STYLE_MESSAGE_SLUGS = new Set(Object.values(REPERTOIRE_STYLE_ERRCODE_TO_SLUG))

// Primaer ueber error.code (PL-ERRCODE), error.message (Slug) nur als
// Fallback, danach genereller db_error-Fallback.
function repertoireStyleErrorCode(error: { code?: string | null; message?: string | null }): string {
  if (error.code && REPERTOIRE_STYLE_ERRCODE_TO_SLUG[error.code]) return REPERTOIRE_STYLE_ERRCODE_TO_SLUG[error.code]
  if (error.message && REPERTOIRE_STYLE_MESSAGE_SLUGS.has(error.message)) return error.message
  return 'db_error'
}

export async function updateBandRepertoireStylesAction(formData: FormData): Promise<never> {
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

  if (!bandRow) redirect(`/admin/bands?repertoire_error=repertoire_band_not_found`)

  // Rang-Werte -- leere Zwischenplaetze herausfiltern, Reihenfolge = Rang-
  // Reihenfolge. Kompaktierung passiert hier (lib/repertoireStyles/
  // sortAssignments.ts); die RPC kompaktiert selbst nicht nach, sie nimmt
  // die Array-Position als sort_order.
  const p_repertoire_style_ids = compactRepertoireStyleSlots([
    str(formData, 'slot_1') || null,
    str(formData, 'slot_2') || null,
    str(formData, 'slot_3') || null,
  ])

  const { error } = await client.rpc('set_band_repertoire_styles', {
    p_band_id: bandRow.id,
    p_repertoire_style_ids,
  })

  if (error) redirect(`/admin/bands/${bandRow.id}?repertoire_error=${repertoireStyleErrorCode(error)}`)

  redirect(`/admin/bands/${bandRow.id}?repertoire_saved=1`)
}

// ─────────────────────────────────────────
// updateBandHeroImageAction
//
// Ersetzt ausschliesslich das Hero-Bild (media_assets.role='hero') einer
// Band. Kein neuer Schreibweg: derselbe service_role-Server-Action-Pfad
// wie alle anderen Admin-Mutationen in dieser Datei (createAdminClient()
// bypasst RLS fuer Tabellen UND Storage gleichermassen -- kein direkter
// Client-Upload, keine neue RPC, keine Supabase-Auth).
//
// Ablauf (siehe Analysebericht "Bandbilder pflegen"):
//   1. Datei validieren (Groesse + tatsaechliche Datei-Signatur, nicht nur
//      Name/MIME-Type -- lib/bandImages/validateImageFile.ts)
//   2. Neues Objekt unter NEUEM, eindeutigem Pfad hochladen (altes Objekt
//      bleibt zu diesem Zeitpunkt unangetastet)
//   3. Bestehenden hero-Datensatz gezielt per id aktualisieren (nur
//      `url`, `updated_at` wird durch den bestehenden DB-Trigger
//      trg_media_assets_updated_at automatisch gepflegt) -- oder, falls
//      keiner existiert, genau einen neuen anlegen. Kein Delete-then-
//      Insert, kein pauschales Loeschen vor dem Update.
//   4. Erst NACH erfolgreichem DB-Write wird versucht, das alte
//      Storage-Objekt zu entfernen (best effort, nicht kritisch)
//   5. Admin-Seite, oeffentliche Bandseite UND dieselben Card-Routen wie
//      beim Thumbnail-Wechsel revalidieren (/bands, /veranstaltung/[slug])
//      -- BandCard zeigt thumbnailImage ?? heroImage, ein Hero-Wechsel bei
//      einer Band ohne Thumbnail wirkt also auch dort (Codex-Review PR #16)
//
// Bei mehreren bestehenden hero-Zeilen (kein UNIQUE-Constraint auf
// (band_id, role) in public.media_assets) wird ueber
// lib/bandImages/resolveMediaRow.ts exakt die Zeile ermittelt, die das
// oeffentliche Frontend tatsaechlich anzeigt (kleinster sort_order,
// identisch zu lib/supabase/normalizeBand.ts). Nur bei echtem
// sort_order-Gleichstand (nicht sicher bestimmbar, welche Zeile oeffentlich
// verwendet wird) bricht die Action fail-closed ab, ohne zu schreiben.
// ─────────────────────────────────────────

function heroImageErrorRedirect(bandId: string, code: string): never {
  redirect(`/admin/bands/${bandId}?hero_image_error=${code}`)
}

export async function updateBandHeroImageAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const band_id = str(formData, 'band_id')
  if (!band_id) redirect('/admin/bands')

  const client = createAdminClient()

  // band_id ist nur Lookup-Key -- Band frisch aus der DB lesen
  const { data: bandRow } = await client
    .from('bands')
    .select('id, slug, name')
    .eq('id', band_id)
    .maybeSingle()

  if (!bandRow) redirect(`/admin/bands?hero_image_error=hero_image_band_not_found`)

  // ---- 1. Datei aus dem FormData lesen ----
  const file = formData.get('hero_image')
  if (!(file instanceof File) || file.size === 0) {
    heroImageErrorRedirect(bandRow.id, 'hero_image_file_required')
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const validation = await validateBandImageFile(bytes)
  if (!validation.ok) {
    heroImageErrorRedirect(bandRow.id, `hero_image_${validation.errorCode}`)
  }

  // ---- Bestehende hero-Zeile(n) laden (jeglicher Status, fuer die
  // Konfliktbestimmung -- media_assets kennt keinen "status" wie
  // repertoire_styles, daher hier nur Existenz/Mehrfachbestand relevant) ----
  const { data: existingHeroRows, error: heroLoadError } = await client
    .from('media_assets')
    .select('id, url, alt_text, role, sort_order, source_provider')
    .eq('band_id', bandRow.id)
    .eq('role', 'hero')

  if (heroLoadError) heroImageErrorRedirect(bandRow.id, 'hero_image_load_failed')

  const resolution = resolvePubliclyUsedMediaRow(existingHeroRows ?? [])
  if (resolution.kind === 'ambiguous') {
    // Mehrere hero-Zeilen mit identischem sort_order: nicht sicher
    // bestimmbar, welche das oeffentliche Frontend zeigt. Fail-closed --
    // kein Upload, kein Write. Struktureller Mehrfachbestand ist ein
    // B-Punkt (Datenhygiene), kein automatisches Aufraeumen hier.
    heroImageErrorRedirect(bandRow.id, 'hero_image_ambiguous')
  }

  // ---- 2. Upload unter neuem, eindeutigem Pfad ----
  const uniqueSuffix = crypto.randomUUID()
  const storagePath = buildBandImageStoragePath(bandRow.slug, 'hero', validation.ext, uniqueSuffix)

  const { error: uploadError } = await client.storage
    .from(BAND_MEDIA_BUCKET)
    .upload(storagePath, bytes, { contentType: validation.contentType, upsert: false })

  if (uploadError) heroImageErrorRedirect(bandRow.id, 'hero_image_upload_failed')

  const newUrl = client.storage.from(BAND_MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl

  // ---- 3. Bestehende Zeile gezielt per id aktualisieren, oder genau
  // eine neue anlegen. Kein Delete-then-Insert. ----
  let dbError: { message: string } | null = null
  let oldStoragePath: string | null = null

  if (resolution.kind === 'resolved' && resolution.row) {
    oldStoragePath = extractBandMediaStoragePath(resolution.row.url)
    const { error } = await client
      .from('media_assets')
      .update({ url: newUrl })
      .eq('id', resolution.row.id)
    dbError = error
  } else {
    const { error } = await client.from('media_assets').insert({
      band_id: bandRow.id,
      url: newUrl,
      role: 'hero',
      alt_text: `${bandRow.name} live`,
      source_provider: 'supabase_storage',
      sort_order: 0,
    })
    dbError = error
  }

  if (dbError) {
    // DB-Write fehlgeschlagen: bestehendes Bild bleibt referenziert. Das
    // gerade hochgeladene, noch nicht verwendete Objekt wird best effort
    // wieder entfernt -- ein Fehler dabei wird nur geloggt, aendert aber
    // nichts am (weiterhin funktionierenden) alten Zustand.
    const { error: cleanupError } = await client.storage.from(BAND_MEDIA_BUCKET).remove([storagePath])
    if (cleanupError) {
      console.error(`[hero-image] Cleanup nach fehlgeschlagenem DB-Update nicht moeglich (${storagePath}): ${cleanupError.message}`)
    }
    heroImageErrorRedirect(bandRow.id, 'hero_image_db_update_failed')
  }

  // ---- 4. Altes Storage-Objekt erst jetzt entfernen (best effort) ----
  if (oldStoragePath) {
    const { error: deleteOldError } = await client.storage.from(BAND_MEDIA_BUCKET).remove([oldStoragePath])
    if (deleteOldError) {
      console.error(`[hero-image] Altes Objekt konnte nach erfolgreichem Bildwechsel nicht geloescht werden (${oldStoragePath}): ${deleteOldError.message}`)
    }
  }

  // ---- 5. Revalidieren: Admin-Seite (force-dynamic ohnehin immer frisch,
  // hier zur Explizitheit), oeffentliche Bandseite, sowie dieselben
  // Card-Routen wie beim Thumbnail-Wechsel (lib/bandImages/cardRevalidation.ts).
  // Ohne diese Revalidierung wuerde die ISR-gecachte Card (revalidate=300)
  // bis zu 5 Minuten das alte Hero-Bild zeigen. Keine globale Site-Invalidierung. ----
  revalidatePath(`/admin/bands/${bandRow.id}`)
  revalidatePath(`/band/${bandRow.slug}`)
  for (const { path, type } of BAND_CARD_REVALIDATION_PATHS) revalidatePath(path, type)

  redirect(`/admin/bands/${bandRow.id}?hero_image_saved=1`)
}

// ─────────────────────────────────────────
// updateBandThumbnailAction
//
// Ersetzt ausschliesslich das Thumbnail (media_assets.role='thumbnail')
// einer Band -- das eigenstaendig gepflegte Bild fuer Band-Cards. Ein
// Hero-Wechsel aendert dieses Bild nicht und umgekehrt (beide Editoren
// laden/aktualisieren jeweils nur ihre eigene role-Zeile).
//
// Gleicher Ablauf und dieselben rollenneutralen lib/bandImages-Module wie
// beim Hero-Upload (validateBandImageFile, buildBandImageStoragePath,
// resolvePubliclyUsedMediaRow, extractBandMediaStoragePath) -- keine
// zweite Validierungs- oder Konfliktaufloesungslogik. Kein neuer
// Schreibweg: derselbe service_role-Server-Action-Pfad wie alle anderen
// Admin-Mutationen (createAdminClient()).
//
// Revalidierung unterscheidet sich bewusst vom Hero-Pfad: BandCard
// (components/BandCard.tsx) zeigt `thumbnailImage ?? heroImage` und wird
// auf /bands (BandExplorer) und /veranstaltung/[slug] (BandGrid, ISR mit
// generateStaticParams) gerendert -- beide lesen ueber
// getAllBandsFromSupabase() media_assets inkl. role. /band/[slug] selbst
// ist `force-dynamic` (immer frisch, kein Cache zum Invalidieren) und
// zeigt das Thumbnail dieser Band nirgends direkt (nur als interner
// heroImage-Fallback, falls kein Hero existiert -- durch force-dynamic
// ohnehin ohne revalidatePath sofort aktuell). Homepage und
// /ueber-mich beziehen Banddaten weiterhin aus Airtable, nicht aus
// media_assets, und werden daher bewusst nicht revalidiert.
// ─────────────────────────────────────────

function thumbnailErrorRedirect(bandId: string, code: string): never {
  redirect(`/admin/bands/${bandId}?thumbnail_error=${code}`)
}

export async function updateBandThumbnailAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const band_id = str(formData, 'band_id')
  if (!band_id) redirect('/admin/bands')

  const client = createAdminClient()

  const { data: bandRow } = await client
    .from('bands')
    .select('id, slug, name')
    .eq('id', band_id)
    .maybeSingle()

  if (!bandRow) redirect(`/admin/bands?thumbnail_error=thumbnail_band_not_found`)

  // ---- 1. Datei aus dem FormData lesen ----
  const file = formData.get('thumbnail_image')
  if (!(file instanceof File) || file.size === 0) {
    thumbnailErrorRedirect(bandRow.id, 'thumbnail_file_required')
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const validation = await validateBandImageFile(bytes)
  if (!validation.ok) {
    thumbnailErrorRedirect(bandRow.id, `thumbnail_${validation.errorCode}`)
  }

  // ---- Bestehende thumbnail-Zeile(n) laden ----
  const { data: existingThumbnailRows, error: thumbnailLoadError } = await client
    .from('media_assets')
    .select('id, url, alt_text, role, sort_order, source_provider')
    .eq('band_id', bandRow.id)
    .eq('role', 'thumbnail')

  if (thumbnailLoadError) thumbnailErrorRedirect(bandRow.id, 'thumbnail_load_failed')

  const resolution = resolvePubliclyUsedMediaRow(existingThumbnailRows ?? [])
  if (resolution.kind === 'ambiguous') {
    // Mehrere thumbnail-Zeilen mit identischem sort_order: nicht sicher
    // bestimmbar, welche das oeffentliche Frontend zeigt. Fail-closed --
    // kein Upload, kein Write. Struktureller Mehrfachbestand ist ein
    // B-Punkt (Datenhygiene), kein automatisches Aufraeumen hier.
    thumbnailErrorRedirect(bandRow.id, 'thumbnail_ambiguous')
  }

  // ---- 2. Upload unter neuem, eindeutigem Pfad ----
  const uniqueSuffix = crypto.randomUUID()
  const storagePath = buildBandImageStoragePath(bandRow.slug, 'thumbnail', validation.ext, uniqueSuffix)

  const { error: uploadError } = await client.storage
    .from(BAND_MEDIA_BUCKET)
    .upload(storagePath, bytes, { contentType: validation.contentType, upsert: false })

  if (uploadError) thumbnailErrorRedirect(bandRow.id, 'thumbnail_upload_failed')

  const newUrl = client.storage.from(BAND_MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl

  // ---- 3. Bestehende Zeile gezielt per id aktualisieren, oder genau
  // eine neue anlegen. Kein Delete-then-Insert. ----
  let dbError: { message: string } | null = null
  let oldStoragePath: string | null = null

  if (resolution.kind === 'resolved' && resolution.row) {
    oldStoragePath = extractBandMediaStoragePath(resolution.row.url)
    const { error } = await client
      .from('media_assets')
      .update({ url: newUrl })
      .eq('id', resolution.row.id)
    dbError = error
  } else {
    const { error } = await client.from('media_assets').insert({
      band_id: bandRow.id,
      url: newUrl,
      role: 'thumbnail',
      alt_text: `${bandRow.name} live`,
      source_provider: 'supabase_storage',
      sort_order: 0,
    })
    dbError = error
  }

  if (dbError) {
    // DB-Write fehlgeschlagen: bestehendes Bild bleibt referenziert. Das
    // gerade hochgeladene, noch nicht verwendete Objekt wird best effort
    // wieder entfernt -- ein Fehler dabei wird nur geloggt, aendert aber
    // nichts am (weiterhin funktionierenden) alten Zustand.
    const { error: cleanupError } = await client.storage.from(BAND_MEDIA_BUCKET).remove([storagePath])
    if (cleanupError) {
      console.error(`[thumbnail-image] Cleanup nach fehlgeschlagenem DB-Update nicht moeglich (${storagePath}): ${cleanupError.message}`)
    }
    thumbnailErrorRedirect(bandRow.id, 'thumbnail_db_update_failed')
  }

  // ---- 4. Altes Storage-Objekt erst jetzt entfernen (best effort) ----
  if (oldStoragePath) {
    const { error: deleteOldError } = await client.storage.from(BAND_MEDIA_BUCKET).remove([oldStoragePath])
    if (deleteOldError) {
      console.error(`[thumbnail-image] Altes Objekt konnte nach erfolgreichem Bildwechsel nicht geloescht werden (${oldStoragePath}): ${deleteOldError.message}`)
    }
  }

  // ---- 5. Revalidieren: Admin-Seite, sowie dieselben Card-Routen wie
  // beim Hero-Wechsel (lib/bandImages/cardRevalidation.ts). /band/[slug]
  // ist force-dynamic (kein Cache) und zeigt hier nicht das eigene
  // Thumbnail, daher bewusst nicht Teil dieser Liste -- siehe
  // Funktions-Kommentar oben. ----
  revalidatePath(`/admin/bands/${bandRow.id}`)
  for (const { path, type } of BAND_CARD_REVALIDATION_PATHS) revalidatePath(path, type)

  redirect(`/admin/bands/${bandRow.id}?thumbnail_saved=1`)
}

// ─────────────────────────────────────────
// Galerie (media_assets.role='gallery')
//
// Anders als Hero/Thumbnail sind hier mehrere Zeilen pro Band normal.
// Reihenfolge ueber sort_order; nach jedem Schreibvorgang luecken- und
// duplikatfrei 1..n.
//
// Architektur (Codex-Review PR #16, supabase/fn_band_gallery_mutations_v2.sql):
// Add, Delete und Reorder derselben Band laufen ausschliesslich ueber
// drei RPCs, die jeweils zu Beginn ihrer Transaktion dieselbe
// public.bands-Zeile per SELECT ... FOR UPDATE sperren. Dadurch
// serialisieren sich alle drei Mutationstypen fuer dieselbe Band
// gegeneinander (Operationen anderer Bands bleiben unabhaengig) -- ein
// vorheriger, rein PostgREST-seitiger Ansatz (getrennte Read-then-Write-
// Schritte fuer Add, Bulk-upsert() fuer Reorder) konnte bei parallelen
// Aufrufen fuer dieselbe Band das Limit von 10 Bildern verletzen (Add)
// oder eine zwischenzeitlich geloeschte Zeile per upsert() erneut
// einfuegen (Reorder-Resurrection). Reorder verwendet serverseitig
// ausschliesslich UPDATE auf bereits durch FOR UPDATE bestaetigte,
// existierende Zeilen -- nie INSERT/UPSERT.
// ─────────────────────────────────────────

function galleryErrorRedirect(bandId: string, code: string): never {
  redirect(`/admin/bands/${bandId}?gallery_error=${code}`)
}

// Fehlercodes aller drei Galerie-RPCs (siehe
// supabase/fn_band_gallery_mutations_v2.sql) auf stabile String-Codes fuer
// die Fehlermeldungs-Map in page.tsx mappen -- gleiches Muster wie
// repertoireStyleErrorCode() fuer set_band_repertoire_styles.
const GALLERY_RPC_ERRCODE_TO_SLUG: Record<string, string> = {
  GA001: 'gallery_target_not_found',
  GA002: 'gallery_target_wrong_band',
  GA003: 'gallery_target_wrong_role',
  GA004: 'gallery_band_not_found',
  GA005: 'gallery_limit_reached',
  GA006: 'gallery_invalid_direction',
}

const GALLERY_RPC_MESSAGE_SLUGS = new Set(Object.values(GALLERY_RPC_ERRCODE_TO_SLUG))

function galleryRpcErrorCode(error: { code?: string | null; message?: string | null }): string {
  if (error.code && GALLERY_RPC_ERRCODE_TO_SLUG[error.code]) return GALLERY_RPC_ERRCODE_TO_SLUG[error.code]
  if (error.message && GALLERY_RPC_MESSAGE_SLUGS.has(error.message)) return error.message
  return 'db_error'
}

export async function addBandGalleryImageAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const band_id = str(formData, 'band_id')
  if (!band_id) redirect('/admin/bands')

  const client = createAdminClient()

  const { data: bandRow } = await client
    .from('bands')
    .select('id, slug, name')
    .eq('id', band_id)
    .maybeSingle()

  if (!bandRow) redirect(`/admin/bands?gallery_error=gallery_band_not_found`)

  // ---- 1. Datei aus dem FormData lesen ----
  const file = formData.get('gallery_image')
  if (!(file instanceof File) || file.size === 0) {
    galleryErrorRedirect(bandRow.id, 'gallery_file_required')
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const validation = await validateBandImageFile(bytes)
  if (!validation.ok) {
    galleryErrorRedirect(bandRow.id, `gallery_${validation.errorCode}`)
  }

  // ---- 2. Upload unter neuem, eindeutigem Pfad ----
  const uniqueSuffix = crypto.randomUUID()
  const storagePath = buildBandImageStoragePath(bandRow.slug, 'gallery', validation.ext, uniqueSuffix)

  const { error: uploadError } = await client.storage
    .from(BAND_MEDIA_BUCKET)
    .upload(storagePath, bytes, { contentType: validation.contentType, upsert: false })

  if (uploadError) galleryErrorRedirect(bandRow.id, 'gallery_upload_failed')

  const newUrl = client.storage.from(BAND_MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl

  // ---- 3. Atomare Add-RPC: Limitpruefung (max. 10, fachliche Autoritaet
  // -- eine etwaige UI-Vorabpruefung ist nur Komfort), Positionsvergabe
  // und Insert in EINER Transaktion, serialisiert per Bandzeilen-Lock
  // gegen gleichzeitige Add/Delete/Reorder-Aufrufe derselben Band. ----
  const { error: rpcError } = await client.rpc('add_band_gallery_image', {
    p_band_id: bandRow.id,
    p_url: newUrl,
    p_alt_text: `${bandRow.name} live`,
  })

  if (rpcError) {
    // DB-Write fehlgeschlagen (z. B. Limit erreicht): das gerade
    // hochgeladene, noch nicht verwendete Objekt wird best effort wieder
    // entfernt.
    const { error: cleanupError } = await client.storage.from(BAND_MEDIA_BUCKET).remove([storagePath])
    if (cleanupError) {
      console.error(`[gallery-image] Cleanup nach fehlgeschlagenem Add-RPC-Aufruf nicht moeglich (${storagePath}): ${cleanupError.message}`)
    }
    galleryErrorRedirect(bandRow.id, galleryRpcErrorCode(rpcError))
  }

  revalidatePath(`/admin/bands/${bandRow.id}`)
  revalidatePath(`/band/${bandRow.slug}`)

  redirect(`/admin/bands/${bandRow.id}?gallery_saved=1`)
}

export async function deleteBandGalleryImageAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const band_id = str(formData, 'band_id')
  const media_asset_id = str(formData, 'media_asset_id')
  if (!band_id) redirect('/admin/bands')

  const client = createAdminClient()

  const { data: bandRow } = await client
    .from('bands')
    .select('id, slug')
    .eq('id', band_id)
    .maybeSingle()

  if (!bandRow) redirect(`/admin/bands?gallery_error=gallery_band_not_found`)
  if (!media_asset_id) galleryErrorRedirect(bandRow.id, 'gallery_target_required')

  // ---- Atomare Loeschung + Neudurchnummerierung ueber die RPC
  // delete_band_gallery_image (supabase/fn_band_gallery_mutations_v2.sql,
  // CREATE OR REPLACE der urspruenglich in
  // supabase/fn_delete_band_gallery_image.sql ausgefuehrten Funktion --
  // identische Signatur, zusaetzlich Bandzeilen-Lock zu Beginn). Beide
  // Schritte laufen weiterhin in EINER Postgres-Transaktion innerhalb der
  // Funktion. Die Funktion prueft selbst Bandexistenz (GA004), Zielzeilen-
  // Existenz/Band-Zugehoerigkeit/role='gallery' (GA001-GA003) und sichert
  // die geloeschte URL fuer den Storage-Cleanup. ----
  const { data: rpcRows, error: rpcError } = await client.rpc('delete_band_gallery_image', {
    p_band_id: bandRow.id,
    p_media_asset_id: media_asset_id,
  })

  if (rpcError) galleryErrorRedirect(bandRow.id, galleryRpcErrorCode(rpcError))

  // ---- Storage-Objekt der geloeschten Zeile erst jetzt entfernen (best
  // effort) -- erst NACH erfolgreicher, atomarer DB-Aenderung ----
  const deletedUrl = rpcRows?.[0]?.deleted_url
  if (deletedUrl) {
    const oldStoragePath = extractBandMediaStoragePath(deletedUrl)
    if (oldStoragePath) {
      const { error: deleteObjectError } = await client.storage.from(BAND_MEDIA_BUCKET).remove([oldStoragePath])
      if (deleteObjectError) {
        console.error(`[gallery-image] Altes Objekt konnte nach erfolgreicher Loeschung nicht entfernt werden (${oldStoragePath}): ${deleteObjectError.message}`)
      }
    }
  }

  revalidatePath(`/admin/bands/${bandRow.id}`)
  revalidatePath(`/band/${bandRow.slug}`)

  redirect(`/admin/bands/${bandRow.id}?gallery_saved=1`)
}

export async function moveBandGalleryImageAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const band_id = str(formData, 'band_id')
  const media_asset_id = str(formData, 'media_asset_id')
  const direction = str(formData, 'direction')
  if (!band_id) redirect('/admin/bands')

  const client = createAdminClient()

  const { data: bandRow } = await client
    .from('bands')
    .select('id, slug')
    .eq('id', band_id)
    .maybeSingle()

  if (!bandRow) redirect(`/admin/bands?gallery_error=gallery_band_not_found`)
  if (!media_asset_id) galleryErrorRedirect(bandRow.id, 'gallery_target_required')
  if (direction !== 'up' && direction !== 'down') galleryErrorRedirect(bandRow.id, 'gallery_invalid_direction')

  // ---- Atomare Move-RPC: sperrt Band-, Ziel- und Nachbarzeile per FOR
  // UPDATE und tauscht ausschliesslich per UPDATE auf bereits bestaetigte,
  // existierende Zeilen -- niemals INSERT/UPSERT (siehe
  // supabase/fn_band_gallery_mutations_v2.sql). Eine zwischenzeitlich
  // geloeschte Nachbarzeile kann dadurch strukturell nicht wieder
  // eingefuegt werden. Bereits am Rand der Galerie -> die RPC liefert
  // einen sauberen No-op (kein Fehler), kein separater Codepfad noetig.
  // Der frueher hier verwendete Bulk-upsert() (insert-faehig) entfaellt
  // vollstaendig. ----
  const { error: rpcError } = await client.rpc('move_band_gallery_image', {
    p_band_id: bandRow.id,
    p_media_asset_id: media_asset_id,
    p_direction: direction,
  })

  if (rpcError) galleryErrorRedirect(bandRow.id, galleryRpcErrorCode(rpcError))

  revalidatePath(`/admin/bands/${bandRow.id}`)
  revalidatePath(`/band/${bandRow.slug}`)

  redirect(`/admin/bands/${bandRow.id}?gallery_saved=1`)
}
