// Reine Helfer fuer die Instrumentenzuordnung pro Membership
// (band_membership_instruments). Kein DB-Zugriff -- der aktive
// Instrument-Katalog wird vom Aufrufer (app/admin/people/actions.ts)
// frisch aus der DB gelesen und hier nur noch validiert/sortiert/verglichen.

export type CatalogInstrument = { id: string; sort_order: number }

export type ResolveInstrumentSelectionResult =
  | { ok: true; instrumentIds: string[] }
  | { ok: false; reason: 'duplicate' | 'unknown_or_inactive' }

// Validiert eine eingereichte Instrument-ID-Auswahl gegen den aktuell
// aktiven Instrument-Katalog und bringt sie in eine deterministische
// Reihenfolge: primaer nach der im Katalog gepflegten sort_order, bei
// Gleichstand nach id als stabiler Tie-Breaker (siehe Auftrag Abschnitt
// "Instrument-Sortierung").
export function resolveInstrumentSelection(
  submittedIds: string[],
  activeInstruments: CatalogInstrument[],
): ResolveInstrumentSelectionResult {
  if (new Set(submittedIds).size !== submittedIds.length) {
    return { ok: false, reason: 'duplicate' }
  }

  const activeById = new Map(activeInstruments.map((i) => [i.id, i.sort_order]))
  if (submittedIds.some((id) => !activeById.has(id))) {
    return { ok: false, reason: 'unknown_or_inactive' }
  }

  const sorted = [...submittedIds].sort((a, b) => {
    const diff = (activeById.get(a) ?? 0) - (activeById.get(b) ?? 0)
    if (diff !== 0) return diff
    return a.localeCompare(b)
  })

  return { ok: true, instrumentIds: sorted }
}

// Weist der (bereits sortierten) Auswahl fortlaufende sort_order-Werte
// 0..n-1 fuer band_membership_instruments zu.
export function assignInstrumentSortOrders(
  sortedInstrumentIds: string[],
): { instrument_id: string; sort_order: number }[] {
  return sortedInstrumentIds.map((instrument_id, index) => ({ instrument_id, sort_order: index }))
}

// Diff zwischen aktuell zugeordneten und gewuenschten Instrument-IDs --
// identisches Prinzip wie der band_event_types-Zuordnungsdiff in
// app/admin/bands/[id]/actions.ts::updateBandEventTypesAction.
export function diffInstrumentAssignments(
  currentIds: string[],
  targetIds: string[],
): { toAdd: string[]; toRemove: string[] } {
  const current = new Set(currentIds)
  const target = new Set(targetIds)
  return {
    toAdd: targetIds.filter((id) => !current.has(id)),
    toRemove: currentIds.filter((id) => !target.has(id)),
  }
}
