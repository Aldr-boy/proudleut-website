'use server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminSession } from '@/lib/admin/requireAdminSession'
import { slugifyRepertoireStyleName } from '@/lib/repertoireStyles/slug'

function str(fd: FormData, key: string): string {
  return ((fd.get(key) as string) ?? '').trim()
}

// ─────────────────────────────────────────
// Fehlercode-Mapping (RPCs public.create_repertoire_style /
// update_repertoire_style / archive_repertoire_style /
// reactivate_repertoire_style, siehe
// supabase/fn_repertoire_styles_catalog_admin.sql). Primaer ueber
// error.code (PL-ERRCODE), error.message (Slug) nur als Fallback, danach
// genereller db_error-Fallback -- identisches Muster zu
// MOODS_ERRCODE_TO_SLUG in app/admin/moods/actions.ts.
// ─────────────────────────────────────────

const REPERTOIRE_STYLES_ERRCODE_TO_SLUG: Record<string, string> = {
  RC001: 'repertoire_styles_name_required',
  RC003: 'repertoire_styles_slug_required',
  RC004: 'repertoire_styles_slug_invalid',
  RC005: 'repertoire_styles_slug_conflict',
  RC006: 'repertoire_styles_name_conflict',
  RC010: 'repertoire_styles_not_found',
  RC011: 'repertoire_styles_archive_in_use',
  RC012: 'repertoire_styles_archive_not_active',
  RC013: 'repertoire_styles_reactivate_not_archived',
}

const REPERTOIRE_STYLES_MESSAGE_SLUGS = new Set(Object.values(REPERTOIRE_STYLES_ERRCODE_TO_SLUG))

function repertoireStylesCatalogErrorCode(error: { code?: string | null; message?: string | null }): string {
  if (error.code && REPERTOIRE_STYLES_ERRCODE_TO_SLUG[error.code]) return REPERTOIRE_STYLES_ERRCODE_TO_SLUG[error.code]
  if (error.message && REPERTOIRE_STYLES_MESSAGE_SLUGS.has(error.message)) return error.message
  return 'db_error'
}

function redirectWithError(error: { code?: string | null; message?: string | null }): never {
  const slug = repertoireStylesCatalogErrorCode(error)
  redirect(`/admin/repertoire-styles?repertoire_styles_error=${slug}`)
}

// Keine revalidatePath()-Aufrufe: /admin/repertoire-styles (diese Seite),
// /admin/bands/[id] und die oeffentliche /band/[slug]-Seite sind alle
// bereits `export const dynamic = 'force-dynamic'` (per Analysebericht
// direkt am jeweiligen page.tsx verifiziert) -- es gibt dadurch keinen
// Data-Cache, den eine Aenderung hier stale lassen koennte. Identisches,
// bereits etabliertes Muster wie app/admin/moods/actions.ts (dort
// ebenfalls keine revalidatePath-Aufrufe).

export async function createRepertoireStyleAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const name = str(formData, 'name')
  const description = str(formData, 'description')

  // Slug wird hier deterministisch aus dem Namen abgeleitet (siehe
  // lib/repertoireStyles/slug.ts) und der RPC nur zur atomaren
  // Kollisionspruefung uebergeben -- die reine Namensfunktion selbst hat
  // kein Race-Risiko, im Gegensatz zu sort_order = max+1, das in der RPC
  // per Table-Lock race-frei berechnet wird.
  const slug = slugifyRepertoireStyleName(name)

  const client = createAdminClient()

  const { error } = await client.rpc('create_repertoire_style', {
    p_name: name,
    p_slug: slug,
    p_description: description,
  })

  if (error) redirectWithError(error)

  redirect('/admin/repertoire-styles?repertoire_styles_created=1')
}

export async function updateRepertoireStyleAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const repertoire_style_id = str(formData, 'repertoire_style_id')
  if (!repertoire_style_id) redirect('/admin/repertoire-styles')

  const name = str(formData, 'name')
  const description = str(formData, 'description')

  const client = createAdminClient()

  const { error } = await client.rpc('update_repertoire_style', {
    p_repertoire_style_id: repertoire_style_id,
    p_name: name,
    p_description: description,
  })

  if (error) redirectWithError(error)

  redirect('/admin/repertoire-styles?repertoire_styles_updated=1')
}

export async function archiveRepertoireStyleAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const repertoire_style_id = str(formData, 'repertoire_style_id')
  if (!repertoire_style_id) redirect('/admin/repertoire-styles')

  const client = createAdminClient()

  const { error } = await client.rpc('archive_repertoire_style', { p_repertoire_style_id: repertoire_style_id })

  if (error) redirectWithError(error)

  redirect('/admin/repertoire-styles?repertoire_styles_archived=1')
}

export async function reactivateRepertoireStyleAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const repertoire_style_id = str(formData, 'repertoire_style_id')
  if (!repertoire_style_id) redirect('/admin/repertoire-styles')

  const client = createAdminClient()

  const { error } = await client.rpc('reactivate_repertoire_style', { p_repertoire_style_id: repertoire_style_id })

  if (error) redirectWithError(error)

  redirect('/admin/repertoire-styles?repertoire_styles_reactivated=1')
}
