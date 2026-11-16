// Lesbarer Dateiname fuer Banddokument-Downloads aus Bandname und
// PDF-Titel, z. B. ("BigBeat", "Infoblatt für Brautpaare") ->
// "BigBeat-Infoblatt-fuer-Brautpaare.pdf". Umlaute werden wie in den
// Slug-Helfern transliteriert; die Gross-/Kleinschreibung bleibt erhalten.
const UMLAUT_MAP: Record<string, string> = {
  ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue', ß: 'ss',
}

function toFilenamePart(input: string): string {
  return input
    .replace(/[äöüÄÖÜß]/g, (c) => UMLAUT_MAP[c])
    .replace(/&/g, ' und ')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildBandDocumentFilename(bandName: string, title: string): string {
  const band = toFilenamePart(bandName)
  const part = toFilenamePart(title)
  // Titel nennen die Band teils schon ("Donnaweda für Volksfest ...") -- kein Doppelpraefix.
  const base = band && part.toLowerCase().startsWith(band.toLowerCase()) ? part : [band, part].filter(Boolean).join('-')
  return `${base || 'Dokument'}.pdf`
}
