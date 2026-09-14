import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCsvText, parseCsvRecords } from './parseCsv.mjs'

test('parseCsvText: einfache Zeilen ohne Anfuehrungszeichen', () => {
  const rows = parseCsvText('a,b,c\n1,2,3\n')
  assert.deepEqual(rows, [['a', 'b', 'c'], ['1', '2', '3']])
})

test('parseCsvText: quote-Feld mit eingebettetem Komma', () => {
  const rows = parseCsvText('a,b\n"x,y",z\n')
  assert.deepEqual(rows, [['a', 'b'], ['x,y', 'z']])
})

test('parseCsvText: escaped Anfuehrungszeichen ("") innerhalb eines quote-Felds', () => {
  const rows = parseCsvText('a\n"say ""hi"""\n')
  assert.deepEqual(rows, [['a'], ['say "hi"']])
})

test('parseCsvText: eingebetteter Zeilenumbruch innerhalb eines quote-Felds', () => {
  const rows = parseCsvText('a,b\n"line1\nline2",z\n')
  assert.deepEqual(rows, [['a', 'b'], ['line1\nline2', 'z']])
})

test('parseCsvText: letzte Zeile ohne abschliessenden Zeilenumbruch wird nicht verworfen', () => {
  const rows = parseCsvText('a,b\n1,2')
  assert.deepEqual(rows, [['a', 'b'], ['1', '2']])
})

test('parseCsvText: CRLF wird wie LF behandelt', () => {
  const rows = parseCsvText('a,b\r\n1,2\r\n')
  assert.deepEqual(rows, [['a', 'b'], ['1', '2']])
})

test('parseCsvRecords: Header-Zeile wird zu benannten Feldern, _rowNumber startet bei 2', () => {
  const { header, records } = parseCsvRecords('Bands,IG_Followers\n2 unplugged,1322\n')
  assert.deepEqual(header, ['Bands', 'IG_Followers'])
  assert.equal(records.length, 1)
  assert.equal(records[0].Bands, '2 unplugged')
  assert.equal(records[0].IG_Followers, '1322')
  assert.equal(records[0]._rowNumber, 2)
  assert.equal(records[0]._columnCountMismatch, false)
})

test('parseCsvRecords: abweichende Spaltenzahl wird markiert, nicht stillschweigend falsch zugeordnet', () => {
  const { records } = parseCsvRecords('a,b,c\n1,2\n')
  assert.equal(records[0]._columnCountMismatch, true)
})
