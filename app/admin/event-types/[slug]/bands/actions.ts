'use server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminSession } from '@/lib/admin/requireAdminSession'
import { extractUuidFromDetail } from '@/lib/moods/extractIdFromDetail'

// ─────────────────────────────────────────
// updateEventTypeBandAssignmentsAction (RPC
// public.update_event_type_band_assignments)
// Event-Type-zentrierter Bulk-Schreibweg fuer
// /admin/event-types/[slug]/bands. Identisches Aufrufmuster wie
// updateMoodBandAssignmentsAction in app/admin/moods/[slug]/bands/actions.ts
// -- wird direkt aus einer Client-Komponente aufgerufen (kein
// <form action>, da der Editor staged Client-State braucht), gibt
// deshalb ein serialisierbares Ergebnisobjekt zurueck statt
// redirect()/Suchparameter. Ersetzt NICHT updateBandEventTypesAction
// (app/admin/bands/[id]/actions.ts) -- der band-zentrierte Schreibweg
// bleibt unveraendert bestehen.
// ─────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ERRCODE_TO_SLUG: Record<string, string> = {
  EB001: 'event_type_bands_type_required',
  EB002: 'event_type_bands_null_target',
  EB003: 'event_type_bands_type_not_found',
  EB004: 'event_type_bands_type_not_active',
  EB005: 'event_type_bands_band_not_found',
  EB006: 'event_type_bands_duplicate',
  EB007: 'event_type_bands_overlap',
}

const KNOWN_SLUGS = new Set(Object.values(ERRCODE_TO_SLUG))

function resolveErrorSlug(error: { code?: string | null; message?: string | null }): string {
  if (error.code && ERRCODE_TO_SLUG[error.code]) return ERRCODE_TO_SLUG[error.code]
  if (error.message && KNOWN_SLUGS.has(error.message)) return error.message
  return 'db_error'
}

// Codes, bei denen `detail` eine Band-ID enthaelt (EB005 direkt).
const BAND_IDENTIFIED_SLUGS = new Set(['event_type_bands_band_not_found'])

const GENERIC_MESSAGES: Record<string, string> = {
  event_type_bands_type_required: 'Kein Veranstaltungstyp ausgewählt – bitte Seite neu laden.',
  event_type_bands_null_target: 'Ungültige Auswahl – bitte Seite neu laden und erneut versuchen.',
  event_type_bands_type_not_found: 'Dieser Veranstaltungstyp wurde nicht gefunden – bitte Seite neu laden.',
  event_type_bands_type_not_active: 'Dieser Veranstaltungstyp ist nicht mehr aktiv – bitte Seite neu laden.',
  event_type_bands_band_not_found: 'Eine ausgewählte Band wurde nicht gefunden – bitte Seite neu laden.',
  event_type_bands_duplicate: 'Ungültige Auswahl (Duplikat) – bitte Seite neu laden und erneut versuchen.',
  event_type_bands_overlap: 'Ungültige Auswahl – eine Band steht gleichzeitig auf Hinzufügen und Entfernen.',
  db_error: 'Datenbankfehler – bitte erneut versuchen.',
}

async function resolveBandName(bandId: string | null): Promise<string | null> {
  if (!bandId) return null
  const client = createAdminClient()
  const { data } = await client.from('bands').select('name').eq('id', bandId).maybeSingle()
  return data?.name ?? null
}

async function buildErrorMessage(error: { code?: string | null; message?: string | null; details?: string | null }): Promise<string> {
  const slug = resolveErrorSlug(error)
  const base = GENERIC_MESSAGES[slug] ?? GENERIC_MESSAGES.db_error

  if (BAND_IDENTIFIED_SLUGS.has(slug)) {
    const bandId = extractUuidFromDetail(error.details)
    const bandName = await resolveBandName(bandId)
    if (bandName) {
      return `Speichern nicht möglich: „${bandName}“ – ${base}`
    }
  }

  return `Speichern nicht möglich: ${base}`
}

export type UpdateEventTypeBandAssignmentsResult =
  | { success: true }
  | { success: false; message: string }

export async function updateEventTypeBandAssignmentsAction(input: {
  eventTypeId: string
  addBandIds: string[]
  removeBandIds: string[]
}): Promise<UpdateEventTypeBandAssignmentsResult> {
  await requireAdminSession()

  const { eventTypeId, addBandIds, removeBandIds } = input

  if (!eventTypeId || !UUID_RE.test(eventTypeId)) {
    return { success: false, message: 'Ungültiger Veranstaltungstyp – bitte Seite neu laden.' }
  }

  const add = Array.isArray(addBandIds) ? addBandIds : []
  const remove = Array.isArray(removeBandIds) ? removeBandIds : []

  if (add.some((id) => !UUID_RE.test(id)) || remove.some((id) => !UUID_RE.test(id))) {
    return { success: false, message: 'Ungültige Band-Auswahl – bitte Seite neu laden.' }
  }

  if (new Set(add).size !== add.length || new Set(remove).size !== remove.length) {
    return { success: false, message: 'Ungültige Auswahl (Duplikat) – bitte Seite neu laden und erneut versuchen.' }
  }

  const addSet = new Set(add)
  if (remove.some((id) => addSet.has(id))) {
    return { success: false, message: 'Ungültige Auswahl – eine Band steht gleichzeitig auf Hinzufügen und Entfernen.' }
  }

  if (add.length === 0 && remove.length === 0) {
    return { success: true }
  }

  const client = createAdminClient()

  const { error } = await client.rpc('update_event_type_band_assignments', {
    p_event_type_id: eventTypeId,
    p_add_band_ids: add,
    p_remove_band_ids: remove,
  })

  if (error) {
    const message = await buildErrorMessage(error)
    return { success: false, message }
  }

  return { success: true }
}
