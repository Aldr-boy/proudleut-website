// Verbindliche V1-Regel fuer people.approved_at (siehe Auftrag "Paket 3 --
// Minimaler Admin Musiker V1", Abschnitt "approved_at -- verbindliche
// V1-Regel"):
//
//   draft    -> active    => approved_at = now()
//   archived -> active    => approved_at = now()
//   active bearbeiten (Status unveraendert) => approved_at bleibt unveraendert
//   active   -> archived  => approved_at bleibt erhalten
//
// Reine, DB-freie Entscheidungsfunktionen -- die eigentliche Durchsetzung
// liegt serverseitig in app/admin/people/actions.ts (publishPersonAction /
// archivePersonAction), die den aktuellen Status IMMER frisch aus der DB
// liest, nie aus einem Hidden-Formularfeld. approved_at ist im Admin nur
// lesbar dargestellt -- kein Formularfeld schreibt dieses Feld direkt.

export type PersonStatus = 'draft' | 'active' | 'archived'

// Veroeffentlichen ist nur aus draft ODER archived zulaessig -- eine
// bereits aktive Person hat nichts zu "veroeffentlichen".
export function canPublish(currentStatus: PersonStatus): boolean {
  return currentStatus === 'draft' || currentStatus === 'archived'
}

// Archivieren ist nur aus active zulaessig (identisches Prinzip wie
// archive_event_type: ET012 archive_not_active).
export function canArchive(currentStatus: PersonStatus): boolean {
  return currentStatus === 'active'
}
