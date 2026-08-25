// Reine Diff-Berechnung fuer die Mood-zentrierte Bandverwaltung
// (/admin/moods/[slug]/bands): aus dem beim Laden der Seite geltenden
// Sollzustand (welche Bands haben diesen Mood) und dem lokalen staged
// Zustand wird ausschliesslich die tatsaechliche AENDERUNG berechnet --
// nie der komplette Sollzustand. Verhindert, dass beim Speichern z. B.
// alle 62 bestehenden Festzeltenergie-Zuordnungen als "add" mitgeschickt
// werden, nur weil sie im staged Set weiterhin vorhanden sind.
export type MoodBandAssignmentsDiff = {
  add: string[]
  remove: string[]
}

export function computeMoodBandDiff(
  originalAssignedBandIds: Iterable<string>,
  stagedAssignedBandIds: Iterable<string>,
): MoodBandAssignmentsDiff {
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
