import type { BandMoodAssignment } from './sortAssignments'

// Technische Obergrenze fuer band_moods-Zuordnungen einer Band -- identisch
// zur RPC-Grenze in supabase/fn_set_band_moods.sql (PM003) und zur Anzahl
// Rangplaetze im Mood-Editor. An einer Stelle gepflegt, damit Editor-UI und
// Konflikterkennung nicht auseinanderlaufen koennen.
export const MAX_BAND_MOODS = 4

// Mehr als MAX_BAND_MOODS geladene band_moods-Zeilen sind ausserhalb der
// technischen Norm (die DB selbst erzwingt kein Limit auf Tabellenebene --
// nur die RPC beim Schreiben). Ein Editor, der stillschweigend auf die
// ersten 4 kappt, wuerde bestehende Zuordnungen beim naechsten Speichern
// unbemerkt loeschen. Muss stattdessen als Datenkonflikt fail-closed
// behandelt werden (siehe MoodEditorSection.tsx).
export function hasTooManyMoodAssignments(assignments: { mood_id: string }[]): boolean {
  return assignments.length > MAX_BAND_MOODS
}

// Ein Rang gilt nur so lange als "unresolved conflict", wie die aktuell im
// Formular ausgewaehlte ID exakt der urspruenglich geladenen, historisch
// konfliktbehafteten Zuordnung entspricht (original.mood fehlt oder ist
// nicht mehr aktiv). Sobald der Rang geleert oder auf einen anderen Mood
// umgestellt wird, gilt der Konflikt fuer die aktuelle Eingabe als geloest
// -- Speichern wird dann fuer genau diesen Rang wieder zugelassen (die RPC
// validiert den tatsaechlich gesendeten Zielzustand ohnehin serverseitig
// erneut).
export function isUnresolvedMoodConflict(
  original: BandMoodAssignment | null,
  currentValue: string,
): boolean {
  if (!original) return false
  const originalIsConflict = !original.mood || original.mood.status !== 'active'
  if (!originalIsConflict) return false
  return currentValue === original.mood_id
}
