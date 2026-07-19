// Fehlende Definition (description) muss im Admin sichtbar als Datenluecke
// markiert werden, nicht als leerer/unauffaelliger Bereich erscheinen --
// bekannter Bestandsfall: Mood "brass-power" ist aktiv, aber ohne
// description. Trim-Check ist defensiv (whitespace-only waere effektiv
// ebenfalls "keine Definition"), obwohl create_mood/update_mood neue
// Description-Werte bereits serverseitig trim+non-empty erzwingen.
export function hasMissingDescription(description: string | null | undefined): boolean {
  return description == null || description.trim() === ''
}
