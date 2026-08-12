// Reine Reorder-Logik fuer die Admin-Dokumentverwaltung (Paket 2C),
// bewusst ausgelagert fuer deterministische Tests. Berechnet aus der
// aktuellen, bereits nach compareBandDocuments sortierten ID-Liste
// (lib/bands/bandDocumentsSort.ts) das zu tauschende Zeilenpaar samt
// neuer sort_order-Werte.
//
// Die neuen sort_order-Werte sind die ZIEL-INDIZES der beiden Zeilen
// (nicht die alten Rohwerte vertauscht) -- das bewegt eine Zeile auch
// dann zuverlaessig, wenn zwei Nachbarn zufaellig denselben alten
// sort_order hatten (Gleichstand, sonst aufgeloest ueber created_at/id)
// und ein reiner Werttausch wirkungslos waere.
export type ReorderDirection = 'up' | 'down'

export type BandDocumentSwap = {
  aId: string
  aOrder: number
  bId: string
  bOrder: number
}

export function computeBandDocumentSwap(
  orderedIds: string[],
  targetId: string,
  direction: ReorderDirection
): BandDocumentSwap | null {
  const index = orderedIds.indexOf(targetId)
  if (index === -1) return null

  const neighborIndex = direction === 'up' ? index - 1 : index + 1
  if (neighborIndex < 0 || neighborIndex >= orderedIds.length) return null

  return {
    aId: targetId,
    aOrder: neighborIndex,
    bId: orderedIds[neighborIndex],
    bOrder: index,
  }
}
