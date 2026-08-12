// Reine Sortier-Logik fuer band_documents (Paket 2A), bewusst ausgelagert
// fuer deterministische Tests. Die bestehende bySortOrder()-Hilfsfunktion in
// lib/supabase/normalizeBand.ts hat keinen Tie-Breaker -- bei gleichem
// sort_order waere die Reihenfolge instabil (abhaengig von der von
// PostgREST gelieferten Zeilenreihenfolge). compareBandDocuments() ergaenzt
// created_at und zuletzt id als stabile Tie-Breaker, damit die Anzeige bei
// gleichem sort_order deterministisch bleibt.

// Record<string, unknown> statt benannter Felder, damit die Funktion direkt
// als Comparator fuer die rohen Supabase-Zeilen (lib/supabase/normalizeBand.ts,
// dort als `Row = Record<string, unknown>` typisiert) verwendet werden kann.
type SortableBandDocumentRow = Record<string, unknown>;

export function compareBandDocuments(a: SortableBandDocumentRow, b: SortableBandDocumentRow): number {
  const sortA = typeof a.sort_order === 'number' ? a.sort_order : 0;
  const sortB = typeof b.sort_order === 'number' ? b.sort_order : 0;
  if (sortA !== sortB) return sortA - sortB;

  const createdA = typeof a.created_at === 'string' ? a.created_at : '';
  const createdB = typeof b.created_at === 'string' ? b.created_at : '';
  if (createdA !== createdB) return createdA < createdB ? -1 : 1;

  const idA = typeof a.id === 'string' ? a.id : '';
  const idB = typeof b.id === 'string' ? b.id : '';
  if (idA === idB) return 0;
  return idA < idB ? -1 : 1;
}
