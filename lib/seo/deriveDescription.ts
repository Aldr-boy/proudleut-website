// Paket 3 (Musiker-Description): deterministische Ableitung einer kurzen
// Meta-/Social-Description aus bereits vorhandenem Fliesstext (aktuell
// PublicPerson.bio -- die einzige oeffentlich vorhandene Personen-
// Fliesstextquelle, siehe lib/people/normalizePerson.ts). Keine neue Copy,
// keine inhaltliche Umformulierung -- nur Whitespace-Normalisierung und,
// falls noetig, ein Kuerzen an einer Satz- oder sonst Wortgrenze.
const DEFAULT_MAX_LENGTH = 155

export function deriveDescriptionFromText(
  text: string | undefined | null,
  maxLength: number = DEFAULT_MAX_LENGTH
): string | undefined {
  if (!text) return undefined
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return undefined
  if (normalized.length <= maxLength) return normalized

  const window = normalized.slice(0, maxLength)

  // Bevorzugt: an der letzten vollstaendigen Satzgrenze innerhalb des
  // Budgets abschneiden -- endet dann natuerlich, keine Ellipse noetig.
  let lastSentenceEnd = -1
  for (const match of window.matchAll(/[.!?]/g)) {
    lastSentenceEnd = match.index! + 1
  }
  if (lastSentenceEnd > 20) {
    return normalized.slice(0, lastSentenceEnd)
  }

  // Sonst: an der letzten Wortgrenze abschneiden, keine Aussage mitten im
  // Wort abtrennen -- Ellipse zeigt nur die Kuerzung an, fuegt keine neue
  // Aussage hinzu.
  const lastSpace = window.lastIndexOf(' ')
  const cut = lastSpace > 0 ? window.slice(0, lastSpace) : window
  return `${cut.trimEnd()}…`
}
