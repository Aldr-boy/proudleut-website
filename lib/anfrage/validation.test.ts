import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseAnfrageSubmission,
  validateBandSlugs,
  isValidEmail,
  isValidIdempotencyKey,
  isLikelyBotSubmission,
  hasCrlf,
} from './validation.ts'

function validBase(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: 'web-12345678',
    bandSlugs: ['band-eins'],
    anlass: 'Hochzeit',
    datumText: '20.06.2027',
    location: 'Festscheune',
    plzOrt: '80331 München',
    gaestezahl: '120',
    spielzeit: '19-23 Uhr',
    nachricht: 'Freuen uns auf euch!',
    vorname: 'Anna',
    nachname: 'Müller',
    email: 'anna@beispiel.de',
    telefon: '0151 1234567',
    datenschutz: true,
    firmaHidden: '',
    websiteHidden: '',
    openedAt: Date.now() - 5000,
    ...overrides,
  }
}

// ── Bandauswahl (0/1/8/9 Bands, Duplikate) ──────────────────────────────

test('validateBandSlugs: 0 Bands wird abgelehnt', () => {
  const result = validateBandSlugs([])
  assert.equal(result.ok, false)
})

test('validateBandSlugs: 1 Band wird akzeptiert', () => {
  const result = validateBandSlugs(['band-eins'])
  assert.deepEqual(result, { ok: true, slugs: ['band-eins'] })
})

test('validateBandSlugs: genau 8 Bands werden akzeptiert', () => {
  const slugs = Array.from({ length: 8 }, (_, i) => `band-${i}`)
  const result = validateBandSlugs(slugs)
  assert.equal(result.ok, true)
})

test('validateBandSlugs: 9 Bands werden abgelehnt', () => {
  const slugs = Array.from({ length: 9 }, (_, i) => `band-${i}`)
  const result = validateBandSlugs(slugs)
  assert.equal(result.ok, false)
})

test('validateBandSlugs: doppelte Band-ID wird abgelehnt', () => {
  const result = validateBandSlugs(['band-eins', 'band-eins'])
  assert.equal(result.ok, false)
})

test('validateBandSlugs: ungueltiges Slug-Format wird abgelehnt', () => {
  const result = validateBandSlugs(['Band Eins!'])
  assert.equal(result.ok, false)
})

// ── E-Mail / CRLF ────────────────────────────────────────────────────────

test('isValidEmail: gueltige Adresse', () => {
  assert.equal(isValidEmail('anna@beispiel.de'), true)
})

test('isValidEmail: ungueltiges Format wird abgelehnt', () => {
  assert.equal(isValidEmail('nicht-valide'), false)
})

test('isValidEmail: CR/LF-Injection wird abgelehnt', () => {
  assert.equal(isValidEmail('anna@beispiel.de\r\nBcc: boese@example.com'), false)
})

test('hasCrlf erkennt eingebettete Zeilenumbrueche', () => {
  assert.equal(hasCrlf('Zeile1\r\nZeile2'), true)
  assert.equal(hasCrlf('einzeilig'), false)
})

// ── Idempotency-Key-Format ───────────────────────────────────────────────

test('isValidIdempotencyKey: gueltiger Key', () => {
  assert.equal(isValidIdempotencyKey('web-12345678'), true)
})

test('isValidIdempotencyKey: zu kurz wird abgelehnt', () => {
  assert.equal(isValidIdempotencyKey('short'), false)
})

test('isValidIdempotencyKey: ungueltige Zeichen werden abgelehnt', () => {
  assert.equal(isValidIdempotencyKey('web 12345678!'), false)
})

// ── Bot-Erkennung (Honeypot / Timing) ────────────────────────────────────

test('isLikelyBotSubmission: befuellter Honeypot firmaHidden', () => {
  assert.equal(isLikelyBotSubmission({ firmaHidden: 'Spam GmbH', websiteHidden: '', openedAt: Date.now() - 5000 }), true)
})

test('isLikelyBotSubmission: befuellter Honeypot websiteHidden', () => {
  assert.equal(isLikelyBotSubmission({ firmaHidden: '', websiteHidden: 'http://spam.example', openedAt: Date.now() - 5000 }), true)
})

test('isLikelyBotSubmission: zu schneller Submit (< 3s)', () => {
  assert.equal(isLikelyBotSubmission({ firmaHidden: '', websiteHidden: '', openedAt: Date.now() - 500 }), true)
})

test('isLikelyBotSubmission: legitimer, langsamer Submit ohne Honeypot', () => {
  assert.equal(isLikelyBotSubmission({ firmaHidden: '', websiteHidden: '', openedAt: Date.now() - 5000 }), false)
})

// ── parseAnfrageSubmission: End-to-End der reinen Validierung ───────────

test('parseAnfrageSubmission: gueltiger Payload wird akzeptiert', () => {
  const result = parseAnfrageSubmission(validBase())
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.data.vorname, 'Anna')
    assert.equal(result.data.bandSlugs.length, 1)
  }
})

test('parseAnfrageSubmission: Bot-Fall liefert reason=bot (fuer stille 200-Antwort)', () => {
  const result = parseAnfrageSubmission(validBase({ firmaHidden: 'Spam' }))
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.reason, 'bot')
})

test('parseAnfrageSubmission: fehlendes Pflichtfeld (Vorname) wird abgelehnt', () => {
  const result = parseAnfrageSubmission(validBase({ vorname: '' }))
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.reason, 'validation')
})

test('parseAnfrageSubmission: ungueltige E-Mail wird abgelehnt', () => {
  const result = parseAnfrageSubmission(validBase({ email: 'keine-email' }))
  assert.equal(result.ok, false)
})

test('parseAnfrageSubmission: zu lange Eingabe (Nachricht) wird abgelehnt', () => {
  const result = parseAnfrageSubmission(validBase({ nachricht: 'x'.repeat(3001) }))
  assert.equal(result.ok, false)
})

test('parseAnfrageSubmission: CR/LF-Injection im Namen wird abgelehnt', () => {
  const result = parseAnfrageSubmission(validBase({ vorname: 'Anna\r\nBcc: boese@example.com' }))
  assert.equal(result.ok, false)
})

test('parseAnfrageSubmission: fehlender Datenschutz-Consent wird abgelehnt', () => {
  const result = parseAnfrageSubmission(validBase({ datenschutz: false }))
  assert.equal(result.ok, false)
})

test('parseAnfrageSubmission: fehlender/ungueltiger Idempotency-Key wird abgelehnt', () => {
  const result = parseAnfrageSubmission(validBase({ idempotencyKey: '' }))
  assert.equal(result.ok, false)
})

test('parseAnfrageSubmission: mehr als 8 Bands werden abgelehnt', () => {
  const result = parseAnfrageSubmission(validBase({ bandSlugs: Array.from({ length: 9 }, (_, i) => `band-${i}`) }))
  assert.equal(result.ok, false)
})

test('parseAnfrageSubmission: leere optionale Felder werden zu null normalisiert', () => {
  const result = parseAnfrageSubmission(validBase({ nachname: '', telefon: '', anlass: '' }))
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.data.nachname, null)
    assert.equal(result.data.telefon, null)
    assert.equal(result.data.anlass, null)
  }
})
