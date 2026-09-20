export type BandPersonCreditsLineInput = {
  name: string
}

// Deterministische Referenzzeile fuer Personenkarten im Abschnitt "Wer
// steht hier auf der Buehne?" (Auftrag "Bandseiten: Musikerprofile auf den
// Personenkarten verlinken"): rein additive Formatierung der bereits
// bestehenden, ueber lib/people/normalizePerson.ts::normalizePersonCredits
// deterministisch sortierten Credits -- keine eigene Auswahl-/Ranking-
// logik, nur Kuerzung auf die ersten `maxDisplayed` Eintraege in
// bestehender Reihenfolge plus "u. v. m."-Suffix bei weiteren Credits. Ein
// bereits woertlich als Credit gepflegtes "u. v. m." wird herausgefiltert,
// um keine doppelte Ausgabe zu erzeugen. Innerhalb von "u. a." und "u. v.
// m." werden geschuetzte Leerzeichen verwendet, damit die Zeile beim
// Umbrechen auf Mobile nur zwischen Namen umbricht, nicht mitten in der
// Abkuerzung (Gestaltungsvorgabe "Referenzzeile darf auf Mobile
// umbrechen").
const NBSP = ' '

export function formatBandPersonCreditsLine(
  credits: BandPersonCreditsLineInput[],
  maxDisplayed = 3,
): string | null {
  const usable = credits.filter((c) => c.name.trim().toLowerCase() !== 'u. v. m.')
  if (usable.length === 0) return null

  const shown = usable.slice(0, maxDisplayed).map((c) => c.name)
  const hasMore = usable.length > maxDisplayed

  const lead = `u.${NBSP}a.${NBSP}mit`
  const suffix = hasMore ? `, u.${NBSP}v.${NBSP}m.` : ''
  return `${lead} ${shown.join(', ')}${suffix}`
}
