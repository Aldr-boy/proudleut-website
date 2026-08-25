'use server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminSession } from '@/lib/admin/requireAdminSession'
import { extractUuidFromDetail } from '@/lib/moods/extractIdFromDetail'

// ─────────────────────────────────────────
// updateMoodBandAssignmentsAction (RPC public.update_mood_band_assignments)
// Mood-zentrierter Bulk-Schreibweg fuer /admin/moods/[slug]/bands. Schreibt
// -- wie der bestehende band-zentrierte Weg (updateBandMoodsAction in
// app/admin/bands/[id]/actions.ts) -- ausschliesslich ueber eine SECURITY
// DEFINER RPC, niemals direkt auf band_moods (siehe
// supabase/band_moods_admin_write_lockdown.sql: service_role hat bewusst
// KEINE INSERT/UPDATE/DELETE-Table-Grants auf band_moods). Wird direkt aus
// einer Client-Komponente aufgerufen (kein <form action>, da der Editor
// staged Client-State mit Live-Warnhinweisen braucht) -- gibt deshalb ein
// serialisierbares Ergebnisobjekt zurueck statt redirect()/Suchparameter.
// ─────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Passthrough-Codes aus der intern von update_mood_band_assignments
// wiederverwendeten set_band_moods-RPC (siehe dortige MOOD_ERRCODE_TO_SLUG
// in app/admin/bands/[id]/actions.ts) UND die neuen, bulk-eigenen Codes --
// ein gemeinsames Mapping, damit keine zweite, abweichende Fehlersemantik
// entsteht.
const ERRCODE_TO_SLUG: Record<string, string> = {
  // update_mood_band_assignments (siehe supabase/fn_update_mood_band_assignments.sql)
  MB001: 'mood_bands_mood_required',
  MB002: 'mood_bands_null_target',
  MB003: 'mood_bands_mood_not_found',
  MB004: 'mood_bands_mood_not_active',
  MB005: 'mood_bands_band_not_found',
  MB006: 'mood_bands_duplicate',
  MB007: 'mood_bands_overlap',
  // durchgereicht aus set_band_moods (siehe supabase/fn_set_band_moods.sql)
  PM001: 'mood_band_not_found',
  PM002: 'mood_targets_required',
  PM003: 'mood_too_many',
  PM004: 'mood_null_target',
  PM005: 'mood_duplicate',
  PM006: 'mood_not_found',
  PM007: 'mood_not_active',
}

const KNOWN_SLUGS = new Set(Object.values(ERRCODE_TO_SLUG))

function resolveErrorSlug(error: { code?: string | null; message?: string | null }): string {
  if (error.code && ERRCODE_TO_SLUG[error.code]) return ERRCODE_TO_SLUG[error.code]
  if (error.message && KNOWN_SLUGS.has(error.message)) return error.message
  return 'db_error'
}

// Codes, bei denen `detail` potenziell eine Band-ID enthaelt (entweder
// direkt -- MB005 -- oder ueber die "band_id=<uuid>: ..."-Ummantelung in
// fn_update_mood_band_assignments.sql fuer durchgereichte PM00x-Fehler).
const BAND_IDENTIFIED_SLUGS = new Set([
  'mood_bands_band_not_found',
  'mood_band_not_found',
  'mood_too_many',
  'mood_duplicate',
  'mood_null_target',
  'mood_not_found',
  'mood_not_active',
])

const GENERIC_MESSAGES: Record<string, string> = {
  mood_bands_mood_required: 'Kein Mood ausgewählt – bitte Seite neu laden.',
  mood_bands_null_target: 'Ungültige Auswahl – bitte Seite neu laden und erneut versuchen.',
  mood_bands_mood_not_found: 'Dieser Mood wurde nicht gefunden – bitte Seite neu laden.',
  mood_bands_mood_not_active: 'Dieser Mood ist nicht mehr aktiv – bitte Seite neu laden.',
  mood_bands_band_not_found: 'Eine ausgewählte Band wurde nicht gefunden – bitte Seite neu laden.',
  mood_bands_duplicate: 'Ungültige Auswahl (Duplikat) – bitte Seite neu laden und erneut versuchen.',
  mood_bands_overlap: 'Ungültige Auswahl – eine Band steht gleichzeitig auf Hinzufügen und Entfernen.',
  mood_band_not_found: 'Eine ausgewählte Band wurde nicht gefunden – bitte Seite neu laden.',
  mood_targets_required: 'Unerwarteter Fehler – bitte erneut versuchen.',
  mood_too_many: 'hat inzwischen bereits 4 Moods. Bitte Seite neu laden und erneut prüfen.',
  mood_null_target: 'Unerwarteter Fehler – bitte erneut versuchen.',
  mood_duplicate: 'Unerwarteter Fehler (Duplikat) – bitte Seite neu laden und erneut versuchen.',
  mood_not_found: 'Ein zugeordneter Mood wurde nicht gefunden – bitte Seite neu laden.',
  mood_not_active: 'hat eine weitere, inzwischen nicht mehr aktive Mood-Zuordnung. Bitte zuerst in der Bandansicht prüfen.',
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
      // mood_too_many/mood_not_active sind als Fortsetzungssatz formuliert
      // ("... hat inzwischen bereits 4 Moods."), die uebrigen als
      // eigenstaendige Meldung -- beide Faelle ergeben mit vorangestelltem
      // Bandnamen einen lesbaren Satz.
      if (slug === 'mood_too_many' || slug === 'mood_not_active') {
        return `Speichern nicht möglich: „${bandName}“ ${base}`
      }
      return `Speichern nicht möglich: „${bandName}“ – ${base}`
    }
  }

  return `Speichern nicht möglich: ${base}`
}

export type UpdateMoodBandAssignmentsResult =
  | { success: true }
  | { success: false; message: string }

export async function updateMoodBandAssignmentsAction(input: {
  moodId: string
  addBandIds: string[]
  removeBandIds: string[]
}): Promise<UpdateMoodBandAssignmentsResult> {
  await requireAdminSession()

  const { moodId, addBandIds, removeBandIds } = input

  if (!moodId || !UUID_RE.test(moodId)) {
    return { success: false, message: 'Ungültiger Mood – bitte Seite neu laden.' }
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

  const { error } = await client.rpc('update_mood_band_assignments', {
    p_mood_id: moodId,
    p_add_band_ids: add,
    p_remove_band_ids: remove,
  })

  if (error) {
    const message = await buildErrorMessage(error)
    return { success: false, message }
  }

  return { success: true }
}
