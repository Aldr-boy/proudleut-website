// Fehlende Beschreibung muss im Admin sichtbar als Datenluecke markiert
// werden, nicht als leerer/unauffaelliger Bereich erscheinen -- bekannter
// Bestandsfall: die 322 per Production-Import angelegten Katalogeintraege
// haben durchgehend description=NULL (der Import setzte nur
// name/slug/status/sort_order, siehe supabase/musikalisch_verortet_import_v2.sql).
// Trim-Check ist defensiv (whitespace-only waere effektiv ebenfalls
// "keine Beschreibung"), obwohl create_repertoire_style/
// update_repertoire_style neue Beschreibungswerte bereits serverseitig
// trim+non-empty erzwingen. Bewusst eigenstaendig statt geteilter
// Abstraktion mit lib/moods/description.ts (siehe lib/repertoireStyles/slug.ts
// fuer die Begruendung dieses Projektmusters).
export function hasMissingDescription(description: string | null | undefined): boolean {
  return description == null || description.trim() === ''
}
