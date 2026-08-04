'use server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminSession } from '@/lib/admin/requireAdminSession'
import { isValidContactEmail, mapCreateBandRpcError } from '@/lib/admin/bandContactValidation'

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
  const contact_email = str(formData, 'contact_email')

  const fieldsForRedirect = { name, slug, status, primary_band_type_id, contact_email }

  const errors: Record<string, string> = {}

  if (!name) errors.name = 'Name ist erforderlich'
  else if (name.length > 200) errors.name = 'Name: max. 200 Zeichen'

  if (!slug) errors.slug = 'Slug ist erforderlich'
  else if (!/^[a-z0-9-]+$/.test(slug)) errors.slug = 'Nur Kleinbuchstaben, Zahlen und Bindestriche'

  if (status !== 'new' && status !== 'draft') errors.status = 'Ungültiger Status'

  if (!primary_band_type_id) errors.primary_band_type_id = 'Bitte eine primäre Bandart auswählen'

  // Anfrage-E-Mail ist Pflichtfeld (Produktentscheidung 21) — serverseitig
  // unabhaengig von der Browser-Validierung geprueft, kein Vertrauen auf
  // reine HTML-Attribute.
  if (!contact_email) errors.contact_email = 'Anfrage-E-Mail ist erforderlich'
  else if (!isValidContactEmail(contact_email)) errors.contact_email = 'Bitte eine gültige Anfrage-E-Mail-Adresse eingeben'

  if (Object.keys(errors).length > 0) {
    buildRedirect('/admin/bands/new', fieldsForRedirect, errors)
  }

  const client = createAdminClient()

  const { data: bandTypeCheck } = await client
    .from('band_types')
    .select('id')
    .eq('id', primary_band_type_id)
    .eq('status', 'active')
    .maybeSingle()
  if (!bandTypeCheck) {
    buildRedirect('/admin/bands/new', fieldsForRedirect,
      { primary_band_type_id: 'Ungültige Bandart — bitte Seite neu laden' })
  }

  // Band + primaerer Anfragekontakt werden atomar angelegt (Produktentscheidung
  // 22 / DoD 24): supabase/fn_create_band_with_primary_contact.sql. Entweder
  // entstehen beide Zeilen, oder keine — kein Zustand "Band angelegt, Kontakt
  // fehlgeschlagen".
  // .rpc() kennt die Rueckgabespalten dieser neuen Funktion ohne generierte
  // Supabase-DB-Typen nicht (kein Database-Generic auf createAdminClient()
  // konfiguriert, siehe lib/supabase/server.ts) -- expliziter Cast auf die
  // tatsaechliche SQL-RETURNS-Form von create_band_with_primary_contact
  // (supabase/fn_create_band_with_primary_contact.sql: `returns public.bands`).
  const { data: bandRaw, error: rpcError } = await client
    .rpc('create_band_with_primary_contact', {
      p_name: name,
      p_slug: slug,
      p_status: status,
      p_is_published: is_published,
      p_contact_email: contact_email,
      p_contact_name: null,
      p_contact_phone: null,
      p_contact_role: 'management',
    })
    .single()
  const band = bandRaw as { id: string } | null

  if (rpcError || !band) {
    const { field, message } = mapCreateBandRpcError(rpcError ?? {})
    buildRedirect('/admin/bands/new', fieldsForRedirect, { [field]: message })
  }

  // Leeres Profil anlegen – Fehler hier ignorieren (auf der Detailseite editierbar)
  await client.from('band_profiles').insert({ band_id: band.id })

  const { error: junctionError } = await client
    .from('band_band_types')
    .insert({ band_id: band.id, band_type_id: primary_band_type_id, is_primary: true, sort_order: 0 })
  if (junctionError) redirect(`/admin/bands/${band.id}?band_types_error=db_error`)

  redirect(`/admin/bands/${band.id}?created=1`)
}
