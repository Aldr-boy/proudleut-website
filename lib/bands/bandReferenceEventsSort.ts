// Reine Sortier-Logik fuer reference_events (Referenzverwaltung im
// Band-Admin, V1), bewusst ausgelagert fuer deterministische Tests.
// Analog zu compareBandDocuments (bandDocumentsSort.ts): die bestehende
// bySortOrder()-Hilfsfunktion in lib/supabase/normalizeBand.ts hat keinen
// Tie-Breaker -- bei gleichem sort_order (DB-Default 0, historisch
// haeufig) waere die Reihenfolge instabil. compareReferenceEvents()
// ergaenzt created_at und zuletzt id als stabile Tie-Breaker -- identisch
// zum Tie-Breaker, den public.fn_reference_event_move (siehe
// supabase/fn_reference_events_admin.sql) beim Normalisieren verwendet,
// damit Admin- und Public-Reihenfolge bei Gleichstaenden uebereinstimmen.

// Record<string, unknown> statt benannter Felder, damit die Funktion direkt
// als Comparator fuer die rohen Supabase-Zeilen (lib/supabase/normalizeBand.ts,
// dort als `Row = Record<string, unknown>` typisiert) verwendet werden kann.
type SortableReferenceEventRow = Record<string, unknown>;

export function compareReferenceEvents(a: SortableReferenceEventRow, b: SortableReferenceEventRow): number {
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
