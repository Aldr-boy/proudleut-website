import type { HeroFocus } from './resolveHeroFocus'

// Schwellenwerte aus der Spec (docs/spezifikation-hero-bildwand.md,
// Abschnitt 7 "Warnungen" und Abschnitt 9 DoD Punkt 11).
export const HERO_WALL_MIN_RECOMMENDED = 10
export const HERO_WALL_MOBILE_POOL_SIZE = 16

export function isBelowRecommendedMinimum(selectedCount: number): boolean {
  return selectedCount < HERO_WALL_MIN_RECOMMENDED
}

// Spec Abschnitt 7: "Die ersten 16 Positionen des ausgewaehlten Pools"
// (Spalte 1 + Spalte 2 des spaeteren Frontends) -- bezieht sich auf die
// Position INNERHALB der Redakteurs-Auswahl selbst, nicht auf die
// 40-Slot-Simulation. index ist 0-basiert.
export function isInMobilePool(index: number): boolean {
  return index < HERO_WALL_MOBILE_POOL_SIZE
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
