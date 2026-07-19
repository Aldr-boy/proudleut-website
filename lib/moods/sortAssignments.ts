// Deterministische Sortierung fuer bestehende band_moods-Zuordnungen.
// Muss exakt der Sortierlogik der oeffentlichen Bandseite entsprechen
// (siehe lib/supabase/normalizeBand.ts, Abschnitt "klingtNach"):
//   1. band_moods.sort_order (kuratierte Prioritaet)
//   2. bei Gleichstand: moods.sort_order (Katalogreihenfolge)
//   3. bei weiterem Gleichstand: moods.name (stabiler Tie-Breaker)
// Historische Gleichstaende (z. B. mehrere band_moods-Zeilen mit
// sort_order = 0) duerfen dabei niemals eine instabile/zufaellige
// Reihenfolge erzeugen -- deshalb der dritte Tie-Breaker.

export type MoodCatalogEntry = {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
  sort_order: number
}

export type BandMoodAssignment = {
  mood_id: string
  sort_order: number
  // null, wenn die zugeordnete mood_id im aktuell geladenen (aktiven)
  // Katalog nicht gefunden wurde -- z. B. historische Zuordnung zu
  // einem inzwischen archivierten Mood. Wird von der aufrufenden Stelle
  // separat behandelt (Datenkonflikt), nicht hier stillschweigend
  // gefiltert.
  mood: MoodCatalogEntry | null
}

export function compareBandMoodAssignments(
  a: BandMoodAssignment,
  b: BandMoodAssignment,
): number {
  const bandPriorityDiff = a.sort_order - b.sort_order
  if (bandPriorityDiff !== 0) return bandPriorityDiff

  const aCatalogSort = a.mood?.sort_order ?? 0
  const bCatalogSort = b.mood?.sort_order ?? 0
  const catalogSortDiff = aCatalogSort - bCatalogSort
  if (catalogSortDiff !== 0) return catalogSortDiff

  const aName = a.mood?.name ?? ''
  const bName = b.mood?.name ?? ''
  return aName.localeCompare(bName)
}

export function sortBandMoodAssignments(
  assignments: BandMoodAssignment[],
): BandMoodAssignment[] {
  return [...assignments].sort(compareBandMoodAssignments)
}

// Reine Ableitung des Ziel-Arrays fuer den RPC-Write: entfernt leere
// Zwischenplaetze (null) und behaelt die verbleibende Reihenfolge bei.
// Die eigentliche sort_order-Vergabe (1..n) uebernimmt die RPC anhand
// der Array-Position -- diese Funktion liefert nur die kompaktierte
// Mood-ID-Reihenfolge, schreibt nichts.
export function compactRankSlots(slots: (string | null)[]): string[] {
  return slots.filter((v): v is string => v !== null && v !== '')
}
