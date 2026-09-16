// Reine Variantenwahl fuer BandReferenceEvents (components/band/
// BandReferenceEvents.tsx), ausgelagert fuer deterministische Tests.
// 0 -> Section entfaellt. 1 -> kompakt, einzelne Karte. 2+ -> kompakte
// Liste, alle sichtbar (keine Pagination).
//
// Bandprofil-Redesign (Auftrag "Bandseiten-Redesign", Abschnitt 8):
// vorher bildete die 2+-Variante eine eigene dunkle Buehnen-Insel
// (ehemals 'stage-island') -- das Redesign zeigt "Ausgewaehlte Referenzen"
// stattdessen als ruhige, helle Liste innerhalb von "03 Passt sie zu eurem
// Anlass?" (Variante B), da "02 Wie klingt sie live?" bereits die einzige
// erlaubte dunkle Buehnen-Insel neben dem Hero ist (design-reference.md,
// "Max. 2 dunkle Buehnen-Content-Sections pro Seite"). Umbenannt zu
// 'list-light', damit der Name die tatsaechliche Darstellung beschreibt.
export type ReferenceEventsVariant = 'none' | 'compact-light' | 'list-light';

export function referenceEventsVariant(count: number): ReferenceEventsVariant {
  if (count <= 0) return 'none';
  if (count === 1) return 'compact-light';
  return 'list-light';
}
