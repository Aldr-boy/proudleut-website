'use server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'

function str(fd: FormData, key: string): string {
  return ((fd.get(key) as string) ?? '').trim()
}

function nullIfEmpty(val: string): string | null {
  return val === '' ? null : val
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
  }
  const is_published = formData.get('is_published') === '1'

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
