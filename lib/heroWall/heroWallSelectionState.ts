import type { HeroFocus } from './resolveHeroFocus'

// Schwellenwerte fuer den Admin-Editor.
export const HERO_WALL_MIN_RECOMMENDED = 10

export function isBelowRecommendedMinimum(selectedCount: number): boolean {
  return selectedCount < HERO_WALL_MIN_RECOMMENDED
}

export type HeroWallSelectionItem = { id: string; heroFocus: HeroFocus }

// Ordnungssensitiver Vergleich zweier Auswahl-Zustaende (id UND
// hero_focus je Position muessen uebereinstimmen). Dient dem Admin-Editor
// dazu, "gibt es ungespeicherte Aenderungen?" ohne eigene Diff-Mengen-
// Logik zu bestimmen -- bei jedem Save wird ohnehin der komplette
// gewuenschte Zielzustand uebertragen (siehe
// supabase/fn_update_hero_wall_selection.sql), ein Add/Remove-Diff ist
// hier anders als bei den Mood-/Event-Type-Bulk-Editoren nicht noetig.
export function heroWallSelectionsAreEqual(
  a: readonly HeroWallSelectionItem[],
  b: readonly HeroWallSelectionItem[]
): boolean {
  if (a.length !== b.length) return false
  return a.every((item, i) => item.id === b[i]?.id && item.heroFocus === b[i]?.heroFocus)
}
