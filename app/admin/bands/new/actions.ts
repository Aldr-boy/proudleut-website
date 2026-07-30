'use server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminSession } from '@/lib/admin/requireAdminSession'

function str(fd: FormData, key: string): string {
  return ((fd.get(key) as string) ?? '').trim()
}

function buildRedirect(base: string, fields: Record<string, string>, errors: Record<string, string>): never {
  const p = new URLSearchParams(fields)
  for (const [k, v] of Object.entries(errors)) p.set(`e_${k}`, v)
  redirect(`${base}?${p.toString()}`)
}

export async function createBandAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const name = str(formData, 'name')
  const slug = str(formData, 'slug')
  const status = str(formData, 'status') || 'draft'
  const is_published = formData.get('is_published') === '1'
  const primary_band_type_id = str(formData, 'primary_band_type_id')

  const errors: Record<string, string> = {}

  if (!name) errors.name = 'Name ist erforderlich'
  else if (name.length > 200) errors.name = 'Name: max. 200 Zeichen'

  if (!slug) errors.slug = 'Slug ist erforderlich'
  else if (!/^[a-z0-9-]+$/.test(slug)) errors.slug = 'Nur Kleinbuchstaben, Zahlen und Bindestriche'

  if (status !== 'new' && status !== 'draft') errors.status = 'Ungültiger Status'

  if (!primary_band_type_id) errors.primary_band_type_id = 'Bitte eine primäre Bandart auswählen'

  if (Object.keys(errors).length > 0) {
    buildRedirect('/admin/bands/new', { name, slug, status, primary_band_type_id }, errors)
  }

  const client = createAdminClient()

  const { data: bandTypeCheck } = await client
    .from('band_types')
    .select('id')
    .eq('id', primary_band_type_id)
    .eq('status', 'active')
    .maybeSingle()
  if (!bandTypeCheck) {
    buildRedirect('/admin/bands/new', { name, slug, status, primary_band_type_id },
      { primary_band_type_id: 'Ungültige Bandart — bitte Seite neu laden' })
  }

  const { data: band, error: bandError } = await client
    .from('bands')
    .insert({ name, slug, status, is_published })
    .select('id')
    .single()

  if (bandError) {
    const errMsg =
      bandError.code === '23505'
        ? 'Dieser Slug ist bereits vergeben'
        : bandError.code === '23514'
          ? `Constraint-Fehler: ${bandError.message}`
          : `Datenbankfehler: ${bandError.message}`
    const field = bandError.code === '23505' ? 'slug' : 'form'
    buildRedirect('/admin/bands/new', { name, slug, status, primary_band_type_id }, { [field]: errMsg })
  }

  // Leeres Profil anlegen – Fehler hier ignorieren (auf der Detailseite editierbar)
  await client.from('band_profiles').insert({ band_id: band!.id })

  const { error: junctionError } = await client
    .from('band_band_types')
    .insert({ band_id: band!.id, band_type_id: primary_band_type_id, is_primary: true, sort_order: 0 })
  if (junctionError) redirect(`/admin/bands/${band!.id}?band_types_error=db_error`)

  redirect(`/admin/bands/${band!.id}?created=1`)
}
