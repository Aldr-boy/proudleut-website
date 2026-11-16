import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBandDocumentFilename } from './downloadFilename.ts'

test('Bandname und Titel ergeben lesbaren Dateinamen mit Umlaut-Transliteration', () => {
  assert.equal(buildBandDocumentFilename('BigBeat', 'Infoblatt für Brautpaare'), 'BigBeat-Infoblatt-fuer-Brautpaare.pdf')
})

test('Sonderzeichen werden bereinigt, leere Eingabe faellt auf Dokument zurueck', () => {
  assert.equal(buildBandDocumentFilename('San2 & His Soul Patrol', 'Presse- & Booking-Info'), 'San2-und-His-Soul-Patrol-Presse-und-Booking-Info.pdf')
  assert.equal(buildBandDocumentFilename('', ''), 'Dokument.pdf')
})

test('Titel mit Bandnamen am Anfang wird nicht doppelt praefixiert', () => {
  assert.equal(buildBandDocumentFilename('Donnaweda', 'Donnaweda für Volksfest & Festzelt'), 'Donnaweda-fuer-Volksfest-und-Festzelt.pdf')
})
