// Reine Hilfsfunktionen fuer die "Klingt nach"-Facette im Band-Explorer
// (/bands?mood=<slug>). Bewusst eigenstaendig statt in BandExplorer.tsx
// inline gehalten, damit die sicherheitsrelevante Logik (unbekannter
// Slug darf weder crashen noch eine irrefuehrende Auswahl anzeigen)
// unabhaengig von React unit-testbar ist -- identisches Architekturmuster
// wie bandMatchesCategorySB in lib/categories.ts, dort ebenfalls als reine
// Funktion ausgelagert und im Explorer importiert.

// Validiert einen rohen mood-URL-Parameter gegen die Menge der Mood-Slugs,
// die tatsaechlich in den aktuell geladenen Banddaten vorkommen (analog zur
// bestehenden bandtyp-Validierung in BandExplorer.tsx, die ebenfalls gegen
// die geladenen Baender statt gegen einen statischen Katalog prueft -- im
// Gegensatz zu "anlass", das gegen die statische CATEGORIES-Liste prueft).
// Ein unbekannter oder leerer Parameter ergibt null -- dadurch zeigt die
// Facette in diesem Fall korrekt "keine Auswahl" statt eines irrefuehrenden
// Zustands, und der Filter laesst (wie bei "keine Auswahl") alle Baender
// durch, statt faelschlich alle auszuschliessen.
export function resolveMoodSlugParam(
  rawParam: string | null,
  availableMoodSlugs: string[],
): string | null {
  if (!rawParam) return null
  return availableMoodSlugs.includes(rawParam) ? rawParam : null
}

// Reines Filterpraedikat: ohne Auswahl (null) lassen alle Baender den
// Filter passieren; mit Auswahl nur Baender, die diesen Mood-Slug unter
// ihren band.moods fuehren.
export function bandMatchesMood(
  bandMoods: { slug: string }[],
  selectedMoodSlug: string | null,
): boolean {
  if (!selectedMoodSlug) return true
  return bandMoods.some((m) => m.slug === selectedMoodSlug)
}
