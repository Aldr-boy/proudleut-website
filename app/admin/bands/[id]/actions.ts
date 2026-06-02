'use server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'

function str(fd: FormData, key: string): string {
  return ((fd.get(key) as string) ?? '').trim()
}

function nullIfEmpty(val: string): string | null {
  return val === '' ? null : val
}

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
