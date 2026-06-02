'use server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'

function str(fd: FormData, key: string): string {
  return ((fd.get(key) as string) ?? '').trim()
}

function buildRedirect(base: string, fields: Record<string, string>, errors: Record<string, string>): never {
  const p = new URLSearchParams(fields)
  for (const [k, v] of Object.entries(errors)) p.set(`e_${k}`, v)
  redirect(`${base}?${p.toString()}`)
}

export async function createBandAction(formData: FormData): Promise<never> {
  const name = str(formData, 'name')
  const slug = str(formData, 'slug')
  const status = str(formData, 'status') || 'draft'
  const is_published = formData.get('is_published') === '1'

  const errors: Record<string, string> = {}

  if (!name) errors.name = 'Name ist erforderlich'
  else if (name.length > 200) errors.name = 'Name: max. 200 Zeichen'

  if (!slug) errors.slug = 'Slug ist erforderlich'
  else if (!/^[a-z0-9-]+$/.test(slug)) errors.slug = 'Nur Kleinbuchstaben, Zahlen und Bindestriche'

  if (status !== 'new' && status !== 'draft') errors.status = 'Ungültiger Status'

  if (Object.keys(errors).length > 0) {
    buildRedirect('/admin/bands/new', { name, slug, status }, errors)
  }

  const client = createAdminClient()

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
    buildRedirect('/admin/bands/new', { name, slug, status }, { [field]: errMsg })
  }

  // Leeres Profil anlegen – Fehler hier ignorieren (auf der Detailseite editierbar)
  await client.from('band_profiles').insert({ band_id: band!.id })

  redirect(`/admin/bands/${band!.id}?created=1`)
}
