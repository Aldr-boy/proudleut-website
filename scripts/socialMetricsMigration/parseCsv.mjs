/**
 * parseCsv.mjs
 *
 * Minimaler, quote-fähiger CSV-Parser (RFC-4180-artig: "..."-Felder mit
 * eingebetteten Kommas/Anführungszeichen/Zeilenumbruechen, "" als Escape
 * fuer ein woertliches Anfuehrungszeichen). Kein npm-Paket dafuer --
 * bewusst klein und dependency-frei, analog zum Rest von scripts/*.mjs.
 * Keine I/O -- reine Funktion von Text auf Zeilen/Spalten.
 */

/** @returns {string[][]} Zeilen aus Spalten, inkl. Header als erste Zeile. */
export function parseCsvText(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  // Normalisiert CRLF/CR vor dem Parsen, damit die Zustandsmaschine nur \n kennt.
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else {
        field += c
      }
      continue
    }
    if (c === '"') { inQuotes = true; continue }
    if (c === ',') { row.push(field); field = ''; continue }
    if (c === '\n') { row.push(field); field = ''; rows.push(row); row = []; continue }
    field += c
  }
  // letztes Feld/letzte Zeile ohne abschliessenden Zeilenumbruch
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }

  // vollstaendig leere Zeilen (z.B. trailing newline) verwerfen
  return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}

/**
 * Parst CSV-Text mit Header-Zeile zu Objekten { [headerName]: value }.
 * Wirft bei Spaltenzahl-Abweichung pro Zeile nicht -- gibt stattdessen
 * `_columnCountMismatch: true` mit, damit der Aufrufer entscheidet
 * (sichtbar im Bericht statt stillschweigend falsch zugeordnet).
 */
export function parseCsvRecords(text) {
  const rows = parseCsvText(text)
  if (rows.length === 0) return { header: [], records: [] }
  const [header, ...dataRows] = rows
  const records = dataRows.map((cols, idx) => {
    /** @type {Record<string, string> & { _rowNumber: number, _columnCountMismatch: boolean }} */
    const rec = { _rowNumber: idx + 2, _columnCountMismatch: cols.length !== header.length }
    header.forEach((h, i) => { rec[h] = cols[i] ?? '' })
    return rec
  })
  return { header, records }
}
