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
