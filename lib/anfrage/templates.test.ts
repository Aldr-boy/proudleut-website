import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderBandMail, renderConfirmationMail, renderHtmlFromTextSnapshot } from './templates.ts'
import type { NormalizedAnfrageInput, ResolvedBand } from './types.ts'

const INPUT: NormalizedAnfrageInput = {
  idempotencyKey: 'web-12345678',
  bandSlugs: ['band-a', 'band-b'],
  anlass: 'Hochzeit',
  datumText: 'September/Oktober 2026',
  location: 'Festscheune Müller',
  plzOrt: '80331 München',
  gaestezahl: '120',
  spielzeit: '19-23 Uhr',
  nachricht: 'Freuen uns sehr auf euch!',
  vorname: 'Anna',
  nachname: 'Müller',
  email: 'anna@beispiel.de',
  telefon: '0151 1234567',
}

const BAND_A: ResolvedBand = { bandId: 'a-id', name: 'Band A', recipientEmail: 'kontakt@band-a.de' }
const BAND_B: ResolvedBand = { bandId: 'b-id', name: 'Band B', recipientEmail: 'kontakt@band-b.de' }

test('renderBandMail: nennt die angefragte Band im Betreff', () => {
  const { subject } = renderBandMail(INPUT, BAND_A)
  assert.match(subject, /Band A/)
})

test('renderBandMail: erwaehnt KEINE andere angefragte Band', () => {
  const { subject, bodyText } = renderBandMail(INPUT, BAND_A)
  assert.doesNotMatch(subject, /Band B/)
  assert.doesNotMatch(bodyText, /Band B/)
})

test('renderBandMail: verwendet datum_text woertlich', () => {
  const { bodyText } = renderBandMail(INPUT, BAND_A)
  assert.match(bodyText, /September\/Oktober 2026/)
})

test('renderBandMail: enthaelt Veranstalterdaten und persoenliche Nachricht', () => {
  const { bodyText } = renderBandMail(INPUT, BAND_A)
  assert.match(bodyText, /Anna Müller/)
  assert.match(bodyText, /anna@beispiel\.de/)
  assert.match(bodyText, /Freuen uns sehr auf euch!/)
})

test('renderBandMail: enthaelt Impressum- und Datenschutz-Verweis', () => {
  const { bodyText } = renderBandMail(INPUT, BAND_A)
  assert.match(bodyText, /Impressum:/)
  assert.match(bodyText, /Datenschutz:/)
})

test('renderConfirmationMail: listet alle ausgewaehlten Bands', () => {
  const { bodyText } = renderConfirmationMail(INPUT, [BAND_A, BAND_B])
  assert.match(bodyText, /Band A/)
  assert.match(bodyText, /Band B/)
})

test('renderConfirmationMail: suggeriert keine Zusage/Verfuegbarkeit', () => {
  const { bodyText } = renderConfirmationMail(INPUT, [BAND_A, BAND_B])
  assert.match(bodyText, /keine Zusage/)
})

test('renderConfirmationMail: enthaelt keine internen Versanddetails (Resend/Message-ID/Status)', () => {
  const { bodyText, subject } = renderConfirmationMail(INPUT, [BAND_A, BAND_B])
  const combined = `${subject}\n${bodyText}`.toLowerCase()
  assert.doesNotMatch(combined, /resend/)
  assert.doesNotMatch(combined, /message-id/)
  assert.doesNotMatch(combined, /fehlgeschlagen/)
})

test('renderConfirmationMail: verwendet datum_text woertlich', () => {
  const { bodyText } = renderConfirmationMail(INPUT, [BAND_A])
  assert.match(bodyText, /September\/Oktober 2026/)
})

test('renderHtmlFromTextSnapshot: escaped HTML-Sonderzeichen sicher', () => {
  const html = renderHtmlFromTextSnapshot('<script>alert(1)</script>', 'Text mit <b>Tag</b> & "Anführung"')
  assert.doesNotMatch(html.slice(html.indexOf('<body>')), /<script>/)
  assert.match(html, /&lt;script&gt;/)
  assert.match(html, /&amp;/)
})

test('renderHtmlFromTextSnapshot: erhaelt Zeilenumbrueche als <br />', () => {
  const html = renderHtmlFromTextSnapshot('Betreff', 'Zeile1\nZeile2')
  assert.match(html, /Zeile1<br \/>Zeile2/)
})
