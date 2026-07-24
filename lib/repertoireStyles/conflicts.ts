import type { BandRepertoireStyleAssignment } from './sortAssignments'

// Technische Obergrenze fuer band_repertoire_styles-Zuordnungen einer
// Band im Admin-Editor -- identisch zur bereits live ausgerollten
// RPC-Grenze in supabase/fn_set_band_repertoire_styles.sql (PR003
// repertoire_too_many, redaktioneller Zielkorridor der Rollout-CSV).
// Diese RPC wird fuer den Admin-Schreibpfad unveraendert wiederverwendet
// -- der Editor uebernimmt exakt denselben Korridor, kein neuer,
// abweichender Wert.
export const MAX_BAND_REPERTOIRE_STYLES = 3

// Mehr als MAX_BAND_REPERTOIRE_STYLES geladene band_repertoire_styles-
// Zeilen sind ausserhalb der technischen Norm (die DB selbst erzwingt
// kein Limit auf Tabellenebene -- nur die RPC beim Schreiben). Ein
// Editor, der stillschweigend auf die ersten drei kappt, wuerde
// bestehende Zuordnungen beim naechsten Speichern unbemerkt loeschen.
// Muss stattdessen als Datenkonflikt fail-closed behandelt werden
// (siehe RepertoireStyleEditorSection.tsx).
export function hasTooManyRepertoireStyleAssignments(
  assignments: { repertoire_style_id: string }[],
): boolean {
  return assignments.length > MAX_BAND_REPERTOIRE_STYLES
}

// Ein Rang gilt nur so lange als "unresolved conflict", wie die aktuell
// im Formular ausgewaehlte ID exakt der urspruenglich geladenen,
// historisch konfliktbehafteten Zuordnung entspricht (original.
// repertoire_style fehlt oder ist nicht mehr aktiv). Sobald der Rang
// geleert oder auf einen anderen, aktiven Stil umgestellt wird, gilt
// der Konflikt fuer die aktuelle Eingabe als geloest -- Speichern wird
// dann fuer genau diesen Rang wieder zugelassen (die RPC validiert den
// tatsaechlich gesendeten Zielzustand ohnehin serverseitig erneut).
export function isUnresolvedRepertoireStyleConflict(
  original: BandRepertoireStyleAssignment | null,
  currentValue: string,
): boolean {
  if (!original) return false
  const originalIsConflict = !original.repertoire_style || original.repertoire_style.status !== 'active'
  if (!originalIsConflict) return false
  return currentValue === original.repertoire_style_id
}
