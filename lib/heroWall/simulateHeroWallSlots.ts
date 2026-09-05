// Reine Simulationslogik fuer den 40-Slot-Hero-Bildwand-Pool (Paket 1,
// docs/spezifikation-hero-bildwand.md Abschnitt 6). Bildet exakt die
// spaetere Frontend-Regel nach: slot[s] = pool[s mod N], serverseitig
// deterministisch, kein Shuffle, keine Zufallslogik -- hier verwendet, um
// dem Admin-Redakteur VOR dem Speichern zuverlaessig anzuzeigen, ob zwei
// vollstaendige 8er-Spalten dieselbe Bildfolge ergeben wuerden.
//
// Bewusst keine hartkodierte Liste "problematischer" N (8, 12, 16, 24,
// 32) -- die Spec verlangt ausdruecklich, dass echte erzeugte Sequenzen
// verglichen werden, nicht eine vorab bekannte Zahlenliste. Bleibt damit
// gueltig, falls Slotzahl oder Spaltenzahl spaeter geaendert werden.

export const HERO_WALL_TOTAL_SLOTS = 40
export const HERO_WALL_COLUMNS = 5
export const HERO_WALL_SLOTS_PER_COLUMN = HERO_WALL_TOTAL_SLOTS / HERO_WALL_COLUMNS

// slot[s] = pool[s mod N]. Leerer Pool ergibt einen leeren Slot-Array
// (kein Fehler, keine Division durch 0).
export function buildHeroWallSlots<T>(pool: readonly T[]): T[] {
  if (pool.length === 0) return []
  return Array.from({ length: HERO_WALL_TOTAL_SLOTS }, (_, s) => pool[s % pool.length])
}

// Spalte i erhaelt Slots i*8 .. i*8+7 (siehe Spec Abschnitt 6, Punkt 3).
export function splitIntoColumns<T>(slots: readonly T[]): T[][] {
  const columns: T[][] = []
  for (let i = 0; i < HERO_WALL_COLUMNS; i++) {
    columns.push(slots.slice(i * HERO_WALL_SLOTS_PER_COLUMN, i * HERO_WALL_SLOTS_PER_COLUMN + HERO_WALL_SLOTS_PER_COLUMN))
  }
  return columns
}

export type IdenticalColumnPair = { columnIndexA: number; columnIndexB: number }

// Vergleicht ALLE Spaltenpaare auf vollstaendig identische Bildfolge
// (gleiche Laenge, gleiche Werte an jeder Position, in Reihenfolge).
// Erwartet vergleichbare Identifikatoren (z. B. media_asset-IDs), keine
// Objektreferenzen.
export function findIdenticalColumnPairs(columns: readonly (readonly string[])[]): IdenticalColumnPair[] {
  const pairs: IdenticalColumnPair[] = []
  for (let i = 0; i < columns.length; i++) {
    for (let j = i + 1; j < columns.length; j++) {
      const a = columns[i]
      const b = columns[j]
      if (a.length > 0 && a.length === b.length && a.every((value, idx) => value === b[idx])) {
        pairs.push({ columnIndexA: i, columnIndexB: j })
      }
    }
  }
  return pairs
}

// Bequemlichkeitsfunktion fuer den Admin-Editor: aus dem sortierten Pool
// (Ids) heraus direkt die Spaltengleichheits-Warnung ermitteln.
export function findIdenticalHeroWallColumns(poolIds: readonly string[]): IdenticalColumnPair[] {
  const slots = buildHeroWallSlots(poolIds)
  const columns = splitIntoColumns(slots)
  return findIdenticalColumnPairs(columns)
}
