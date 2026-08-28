// Reine Diff-Berechnung fuer die event-type-zentrierte Bandverwaltung
// (/admin/event-types/[slug]/bands), identisches Prinzip wie
// lib/moods/moodBandAssignmentsDiff.ts::computeMoodBandDiff -- aus dem
// beim Laden der Seite geltenden Sollzustand und dem lokalen staged
// Zustand wird ausschliesslich die tatsaechliche AENDERUNG berechnet, nie
// der komplette Sollzustand. Bewusst eine eigene, kleine Kopie statt
// eines Imports aus lib/moods/ -- die event-type-zentrierte Verwaltung
// bleibt vollstaendig unabhaengig von der Mood-Domain.
export type EventTypeBandAssignmentsDiff = {
  add: string[]
  remove: string[]
}

export function computeEventTypeBandAssignmentsDiff(
  originalAssignedBandIds: Iterable<string>,
  stagedAssignedBandIds: Iterable<string>,
): EventTypeBandAssignmentsDiff {
  const original = new Set(originalAssignedBandIds)
  const staged = new Set(stagedAssignedBandIds)

  const add: string[] = []
  for (const id of staged) {
    if (!original.has(id)) add.push(id)
  }

  const remove: string[] = []
  for (const id of original) {
    if (!staged.has(id)) remove.push(id)
  }

  return { add, remove }
}
