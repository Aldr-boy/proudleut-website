'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminSession } from '@/lib/admin/requireAdminSession'

// ─────────────────────────────────────────
// updateHeroWallSelectionAction (RPC public.update_hero_wall_selection,
// siehe supabase/fn_update_hero_wall_selection.sql). Wird direkt aus der
// Client-Komponente aufgerufen (kein <form action>, da der Editor
// staged Client-State fuer Auswahl/Reihenfolge/Fokus braucht) --
// identisches Aufrufmuster wie updateEventTypeBandAssignmentsAction.
// Anders als dort wird kein Add/Remove-Diff uebertragen, sondern bei
// jedem Save der vollstaendige gewuenschte Zielzustand (siehe
// Begruendung im SQL-Kommentar).
// ─────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_FOCUS = new Set(['top', 'center', 'bottom'])

const ERRCODE_TO_MESSAGE: Record<string, string> = {
  HW001: 'Ungültige Auswahl (fehlende Bild-ID) – bitte Seite neu laden.',
  HW002: 'Ungültige Auswahl (Duplikat) – bitte Seite neu laden und erneut versuchen.',
  HW003: 'Ein ausgewähltes Bild wurde nicht gefunden – bitte Seite neu laden.',
  HW004: 'Ungültiger Fokus-Wert – bitte Seite neu laden.',
  // HW005/HW006 werden durch die client-seitige Validierung oben (Array-
  // Check, UUID-Check) bereits abgefangen, bevor die RPC ueberhaupt
  // aufgerufen wird -- diese Eintraege sind Verteidigung in der Tiefe,
  // falls die RPC direkt (ausserhalb dieser Action) aufgerufen wird.
  HW005: 'Ungültige Auswahl (kein Array) – bitte Seite neu laden.',
  HW006: 'Ungültige Auswahl (falsches Format) – bitte Seite neu laden.',
}

export type HeroWallSelectionInputItem = { id: string; heroFocus: string | null }

export type UpdateHeroWallSelectionResult =
  | { success: true; positions: { id: string; position: number }[] }
  | { success: false; message: string }

export async function updateHeroWallSelectionAction(
  items: HeroWallSelectionInputItem[]
): Promise<UpdateHeroWallSelectionResult> {
  await requireAdminSession()

  if (!Array.isArray(items)) {
    return { success: false, message: 'Ungültige Auswahl – bitte Seite neu laden.' }
  }

  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !UUID_RE.test(item.id)) {
      return { success: false, message: 'Ungültige Auswahl – bitte Seite neu laden.' }
    }
    if (item.heroFocus !== null && !VALID_FOCUS.has(item.heroFocus)) {
      return { success: false, message: 'Ungültiger Fokus-Wert – bitte Seite neu laden.' }
    }
  }

  if (new Set(items.map((i) => i.id)).size !== items.length) {
    return { success: false, message: 'Ungültige Auswahl (Duplikat) – bitte Seite neu laden und erneut versuchen.' }
  }

  const client = createAdminClient()

  const { data, error } = await client.rpc('update_hero_wall_selection', {
    p_items: items.map((i) => ({ id: i.id, hero_focus: i.heroFocus })),
  })

  if (error) {
    const message = (error.code && ERRCODE_TO_MESSAGE[error.code]) || 'Datenbankfehler – bitte erneut versuchen.'
    return { success: false, message: `Speichern nicht möglich: ${message}` }
  }

  const positions = ((data ?? []) as { media_asset_id: string; hero_wall_position: number }[]).map((row) => ({
    id: row.media_asset_id,
    position: row.hero_wall_position,
  }))

  revalidatePath('/admin/hero-images')

  return { success: true, positions }
}
