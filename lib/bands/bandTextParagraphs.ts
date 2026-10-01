// Absatz-Hilfen fuer Bandtexte (components/MarkdownText.tsx, components/band/
// BandDescription.tsx), als reine Funktionen ausgelagert, weil JSX-Dateien in
// diesem Repo nicht per node:test importierbar sind.

// Windows-Zeilenenden (\r\n, vereinzelt \r) -> \n. In den Daten stehen
// Leerzeilen teils als \r\n\r\n, die sonst nicht als Absatzgrenze erkannt
// wuerden.
export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n?/g, '\n')
}

// Echte Absaetze: getrennt durch mindestens eine Leerzeile (\n\n). Daran
// richtet sich auch die Einklapp-Grenze ("Mehr ueber X") in BandDescription.
export function splitParagraphs(text: string): string[] {
  return normalizeLineEndings(text).trim().split(/\n\n+/)
}

export function hasParagraphBreak(text: string): boolean {
  return splitParagraphs(text).length > 1
}

// Zeilen eines Absatzes (einfache Umbrueche) ohne leere Zeilen, fuer den
// Modus "einfache Umbrueche als Zeilenabstand".
export function splitLines(paragraph: string): string[] {
  return paragraph.split('\n').filter((line) => line.trim() !== '')
}
