'use server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { slugifyMoodName } from '@/lib/moods/slug'
import { extractUsageCountFromDetail } from '@/lib/moods/usageCount'
import { requireAdminSession } from '@/lib/admin/requireAdminSession'

function str(fd: FormData, key: string): string {
  return ((fd.get(key) as string) ?? '').trim()
}

// ─────────────────────────────────────────
// Fehlercode-Mapping (RPCs public.create_mood / update_mood /
// archive_mood / reactivate_mood, siehe supabase/fn_moods_catalog_admin.sql)
// Primaer ueber error.code (PL-ERRCODE), error.message (Slug) nur als
// Fallback, danach genereller db_error-Fallback -- identisches Muster
// zu SIMILAR_ERRCODE_TO_SLUG / MOOD_ERRCODE_TO_SLUG in
// app/admin/bands/[id]/actions.ts.
// ─────────────────────────────────────────

const MOODS_ERRCODE_TO_SLUG: Record<string, string> = {
  MC001: 'moods_name_required',
  MC002: 'moods_description_required',
  MC003: 'moods_slug_required',
  MC004: 'moods_slug_invalid',
  MC005: 'moods_slug_conflict',
  MC010: 'moods_not_found',
  MC011: 'moods_archive_in_use',
  MC012: 'moods_archive_not_active',
  MC013: 'moods_reactivate_not_archived',
}

const MOODS_MESSAGE_SLUGS = new Set(Object.values(MOODS_ERRCODE_TO_SLUG))

function moodsCatalogErrorCode(error: { code?: string | null; message?: string | null }): string {
  if (error.code && MOODS_ERRCODE_TO_SLUG[error.code]) return MOODS_ERRCODE_TO_SLUG[error.code]
  if (error.message && MOODS_MESSAGE_SLUGS.has(error.message)) return error.message
  return 'db_error'
}

function redirectWithError(error: { code?: string | null; message?: string | null; details?: string | null }): never {
  const slug = moodsCatalogErrorCode(error)
  const params = new URLSearchParams({ moods_error: slug })
  if (slug === 'moods_archive_in_use') {
    const count = extractUsageCountFromDetail(error.details)
    if (count) params.set('moods_error_count', count)
  }
  redirect(`/admin/moods?${params.toString()}`)
}

export async function createMoodAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const name = str(formData, 'name')
  const description = str(formData, 'description')

  // Slug wird hier deterministisch aus dem Namen abgeleitet (siehe
  // lib/moods/slug.ts) und der RPC nur zur atomaren Kollisionspruefung
  // uebergeben -- die reine Namensfunktion selbst hat kein Race-Risiko,
  // im Gegensatz zu sort_order = max+1, das in der RPC per Table-Lock
  // race-frei berechnet wird.
  const slug = slugifyMoodName(name)

  const client = createAdminClient()

  const { error } = await client.rpc('create_mood', {
    p_name: name,
    p_slug: slug,
    p_description: description,
  })

  if (error) redirectWithError(error)

  redirect('/admin/moods?moods_created=1')
}

export async function updateMoodAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const mood_id = str(formData, 'mood_id')
  if (!mood_id) redirect('/admin/moods')

  const name = str(formData, 'name')
  const description = str(formData, 'description')

  const client = createAdminClient()

  const { error } = await client.rpc('update_mood', {
    p_mood_id: mood_id,
    p_name: name,
    p_description: description,
  })

  if (error) redirectWithError(error)

  redirect('/admin/moods?moods_updated=1')
}

export async function archiveMoodAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const mood_id = str(formData, 'mood_id')
  if (!mood_id) redirect('/admin/moods')

  const client = createAdminClient()

  const { error } = await client.rpc('archive_mood', { p_mood_id: mood_id })

  if (error) redirectWithError(error)

  redirect('/admin/moods?moods_archived=1')
}

export async function reactivateMoodAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const mood_id = str(formData, 'mood_id')
  if (!mood_id) redirect('/admin/moods')

  const client = createAdminClient()

  const { error } = await client.rpc('reactivate_mood', { p_mood_id: mood_id })

  if (error) redirectWithError(error)

  redirect('/admin/moods?moods_reactivated=1')
}
