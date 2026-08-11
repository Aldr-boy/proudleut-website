'use server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminSession } from '@/lib/admin/requireAdminSession'
import { slugifyEventTypeName } from '@/lib/eventTypes/slug'

function str(fd: FormData, key: string): string {
  return ((fd.get(key) as string) ?? '').trim()
}

// ─────────────────────────────────────────
// Fehlercode-Mapping (RPCs public.create_event_type / update_event_type /
// archive_event_type / reactivate_event_type, siehe
// supabase/fn_event_types_catalog_admin.sql). Primaer ueber error.code
// (PL-ERRCODE), error.message (Slug) nur als Fallback, danach genereller
// db_error-Fallback -- identisches Muster zu
// REPERTOIRE_STYLES_ERRCODE_TO_SLUG in app/admin/repertoire-styles/actions.ts
// und MOODS_ERRCODE_TO_SLUG in app/admin/moods/actions.ts.
// ─────────────────────────────────────────

const EVENT_TYPES_ERRCODE_TO_SLUG: Record<string, string> = {
  ET001: 'event_types_name_required',
  ET003: 'event_types_slug_required',
  ET004: 'event_types_slug_invalid',
  ET005: 'event_types_slug_conflict',
  ET010: 'event_types_not_found',
  ET012: 'event_types_archive_not_active',
  ET013: 'event_types_reactivate_not_archived',
}

const EVENT_TYPES_MESSAGE_SLUGS = new Set(Object.values(EVENT_TYPES_ERRCODE_TO_SLUG))

function eventTypesCatalogErrorCode(error: { code?: string | null; message?: string | null }): string {
  if (error.code && EVENT_TYPES_ERRCODE_TO_SLUG[error.code]) return EVENT_TYPES_ERRCODE_TO_SLUG[error.code]
  if (error.message && EVENT_TYPES_MESSAGE_SLUGS.has(error.message)) return error.message
  return 'db_error'
}

function redirectWithError(error: { code?: string | null; message?: string | null }): never {
  const slug = eventTypesCatalogErrorCode(error)
  redirect(`/admin/event-types?event_types_error=${slug}`)
}

// Keine revalidatePath()-Aufrufe: /admin/event-types (diese Seite) ist
// `export const dynamic = 'force-dynamic'` -- identisches, bereits
// etabliertes Muster wie app/admin/moods/actions.ts und
// app/admin/repertoire-styles/actions.ts (dort ebenfalls keine
// revalidatePath-Aufrufe). Die oeffentliche /veranstaltung/[slug]-Seite
// und Band-Detailseiten lesen event_types ueber ihre eigenen,
// unveraenderten ISR-Revalidierungsintervalle -- diese Datei aendert
// daran nichts.

export async function createEventTypeAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const name = str(formData, 'name')
  const anfrage_label = str(formData, 'anfrage_label')

  // Slug wird hier deterministisch aus dem Namen abgeleitet (siehe
  // lib/eventTypes/slug.ts) und der RPC nur zur atomaren
  // Kollisionspruefung uebergeben -- identisches Muster zu
  // createRepertoireStyleAction/createMoodAction. Nach dem Anlegen ist
  // der Slug eine stabile Identitaet -- kein Rename-Pfad in diesem Paket.
  const slug = slugifyEventTypeName(name)

  const client = createAdminClient()

  const { error } = await client.rpc('create_event_type', {
    p_name: name,
    p_slug: slug,
    p_anfrage_label: anfrage_label,
  })

  if (error) redirectWithError(error)

  redirect('/admin/event-types?event_types_created=1')
}

export async function updateEventTypeAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const event_type_id = str(formData, 'event_type_id')
  if (!event_type_id) redirect('/admin/event-types')

  const name = str(formData, 'name')
  const anfrage_label = str(formData, 'anfrage_label')

  // Bewusst kein p_slug-Parameter: der bestehende Slug bleibt bei einer
  // normalen Bearbeitung immer unveraendert (siehe update_event_type in
  // supabase/fn_event_types_catalog_admin.sql).
  const client = createAdminClient()

  const { error } = await client.rpc('update_event_type', {
    p_event_type_id: event_type_id,
    p_name: name,
    p_anfrage_label: anfrage_label,
  })

  if (error) redirectWithError(error)

  redirect('/admin/event-types?event_types_updated=1')
}

export async function archiveEventTypeAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const event_type_id = str(formData, 'event_type_id')
  if (!event_type_id) redirect('/admin/event-types')

  const client = createAdminClient()

  const { error } = await client.rpc('archive_event_type', { p_event_type_id: event_type_id })

  if (error) redirectWithError(error)

  redirect('/admin/event-types?event_types_archived=1')
}

export async function reactivateEventTypeAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const event_type_id = str(formData, 'event_type_id')
  if (!event_type_id) redirect('/admin/event-types')

  const client = createAdminClient()

  const { error } = await client.rpc('reactivate_event_type', { p_event_type_id: event_type_id })

  if (error) redirectWithError(error)

  redirect('/admin/event-types?event_types_reactivated=1')
}
