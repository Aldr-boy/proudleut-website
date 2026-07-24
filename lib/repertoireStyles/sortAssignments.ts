// Deterministische Sortierung fuer bestehende band_repertoire_styles-
// Zuordnungen. Muss exakt der Sortierlogik der oeffentlichen Bandseite
// entsprechen (siehe lib/supabase/normalizeBand.ts, Abschnitt
// "musikalischVerortet"): ausschliesslich band_repertoire_styles.sort_order.
// Anders als bei band_moods gibt es dort KEINEN zusaetzlichen
// Tie-Breaker ueber den Katalog oder den Namen -- kein neuer erfunden.

export type RepertoireStyleCatalogEntry = {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
  sort_order: number
}

export type BandRepertoireStyleAssignment = {
  repertoire_style_id: string
  sort_order: number
  // null, wenn die zugeordnete repertoire_style_id im aktuell geladenen
  // Katalog nicht gefunden wurde (z. B. historische Zuordnung zu einem
  // inzwischen entfernten Eintrag). Wird von der aufrufenden Stelle
  // separat als Datenkonflikt behandelt, nicht hier stillschweigend
  // gefiltert.
  repertoire_style: RepertoireStyleCatalogEntry | null
}

export function compareBandRepertoireStyleAssignments(
  a: BandRepertoireStyleAssignment,
  b: BandRepertoireStyleAssignment,
): number {
  return a.sort_order - b.sort_order
}

export function sortBandRepertoireStyleAssignments(
  assignments: BandRepertoireStyleAssignment[],
): BandRepertoireStyleAssignment[] {
  return [...assignments].sort(compareBandRepertoireStyleAssignments)
}

// Reine Ableitung des Ziel-Arrays fuer den RPC-Write: entfernt leere
// Zwischenplaetze (null/leerer String) und behaelt die verbleibende
// Reihenfolge bei. Die eigentliche sort_order-Vergabe (1..n) uebernimmt
// die RPC anhand der Array-Position -- diese Funktion liefert nur die
// kompaktierte ID-Reihenfolge, schreibt nichts.
export function compactRankSlots(slots: (string | null)[]): string[] {
  return slots.filter((v): v is string => v !== null && v !== '')
}
