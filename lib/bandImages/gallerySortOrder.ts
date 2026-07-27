// Reine sort_order-Hilfslogik fuer die Galerie (media_assets, role='gallery').
// Mehrere Zeilen pro Band sind hier normal (anders als bei Hero/Thumbnail).
// Kein Netzwerk-/DB-Zugriff -- die aufrufende Server Action fuehrt die
// zurueckgelieferten Zeilen als EINEN atomaren PostgREST-Bulk-upsert()
// aus (ein HTTP-Request, ein SQL-Statement, dadurch bereits atomar --
// siehe Begruendung im Abschlussbericht). Dadurch bleibt kein
// inkonsistenter Zwischenzustand (doppelte sort_order, Luecken,
// Teil-Update) moeglich, ohne dass dafuer eine eigene
// RPC/SECURITY-DEFINER-Funktion noetig waere.
//
// Wichtig fuer den Bulk-upsert(): PostgreSQL prueft NOT-NULL-Constraints
// auf der vorgeschlagenen Zeile bereits WAEHREND der Zeilenkonstruktion --
// unabhaengig davon, ob am Ende ueber ON CONFLICT DO UPDATE tatsaechlich
// eingefuegt oder aktualisiert wird (empirisch gegen die echte DB
// verifiziert). Ein upsert() mit nur {id, sort_order} scheitert deshalb
// an band_id/url/role (NOT NULL, kein Default in public.media_assets).
// Die Zeilen hier fuehren band_id, url und role deshalb IMMER
// unveraendert mit -- sie werden dadurch zwar Teil der DO-UPDATE-SET-
// Klausel, behalten aber exakt ihren bisherigen Wert. alt_text/
// source_provider/created_at bleiben unangetastet, weil sie gar nicht
// im Payload auftauchen.

export const MAX_GALLERY_IMAGES = 10

export type GallerySortRow = { id: string; band_id: string; role: string; url: string; sort_order: number }

// Naechste freie Position fuer ein neu hinzugefuegtes Bild -- ans Ende
// der Galerie. Leere Galerie -> 1 (Konvention: 1-basiert, wie im
// bestehenden Live-Bestand).
export function nextGallerySortOrder(rows: { sort_order: number }[]): number {
  if (rows.length === 0) return 1
  return Math.max(...rows.map((r) => r.sort_order)) + 1
}

// Liefert die Zielwerte fuer eine luecken- und duplikatfreie
// Neudurchnummerierung 1..n, sortiert nach der aktuellen sort_order
// (stabil bei Gleichstand). Reine Ableitung -- schreibt nichts.
export function renumberGallerySequentially<T extends GallerySortRow>(
  rows: T[],
): GallerySortRow[] {
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row, index) => ({ id: row.id, band_id: row.band_id, role: row.role, url: row.url, sort_order: index + 1 }))
}

export type SwapDirection = 'up' | 'down'

// Liefert die beiden Zeilen, deren sort_order-Werte fuer eine
// "hoch"/"runter"-Aktion getauscht werden muessen, oder null, wenn die
// Aktion nicht moeglich ist (Zeile nicht gefunden, oder bereits am
// jeweiligen Rand der Galerie). Reine Ableitung -- schreibt nichts.
export function swapGalleryOrder<T extends GallerySortRow>(
  rows: T[],
  targetId: string,
  direction: SwapDirection,
): [GallerySortRow, GallerySortRow] | null {
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order)
  const index = sorted.findIndex((r) => r.id === targetId)
  if (index === -1) return null

  const neighborIndex = direction === 'up' ? index - 1 : index + 1
  if (neighborIndex < 0 || neighborIndex >= sorted.length) return null

  const current = sorted[index]
  const neighbor = sorted[neighborIndex]
  return [
    { id: current.id, band_id: current.band_id, role: current.role, url: current.url, sort_order: neighbor.sort_order },
    { id: neighbor.id, band_id: neighbor.band_id, role: neighbor.role, url: neighbor.url, sort_order: current.sort_order },
  ]
}
