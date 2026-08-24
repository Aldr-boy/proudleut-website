import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseBandIntroSubmission,
  normalizeAdditionalLinks,
  isValidEmail,
  isValidUrl,
  isLikelyBotSubmission,
} from './validation.ts'

function validPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    idempotencyKey: 'web-1234567890',
    bandName: 'Testband',
    region: 'München und Umgebung',
    websiteUrl: '',
    additionalLinks: [],
    description: 'Wir spielen seit zehn Jahren Rock und Pop auf Hochzeiten und Firmenfeiern.',
    firstName: 'Anna',
    lastName: '',
    nickname: '',
    email: 'anna@beispiel.de',
    phone: '',
    datenschutz: true,
    firmaHidden: '',
    websiteHidden: '',
    openedAt: Date.now() - 5000,
    ...overrides,
  }
}

test('parseBandIntroSubmission: gueltiger Minimal-Payload wird akzeptiert', () => {
  const result = parseBandIntroSubmission(validPayload())
  assert.equal(result.ok, true)
})

test('parseBandIntroSubmission: Bandname fehlt -> Fehler', () => {
  const result = parseBandIntroSubmission(validPayload({ bandName: '' }))
  assert.equal(result.ok, false)
})

test('parseBandIntroSubmission: Region fehlt -> Fehler', () => {
  const result = parseBandIntroSubmission(validPayload({ region: '' }))
  assert.equal(result.ok, false)
})

test('parseBandIntroSubmission: Vorname fehlt -> Fehler', () => {
  const result = parseBandIntroSubmission(validPayload({ firstName: '' }))
  assert.equal(result.ok, false)
})

test('parseBandIntroSubmission: E-Mail fehlt -> Fehler', () => {
  const result = parseBandIntroSubmission(validPayload({ email: '' }))
  assert.equal(result.ok, false)
})

test('parseBandIntroSubmission: ungueltige E-Mail -> Fehler', () => {
  const result = parseBandIntroSubmission(validPayload({ email: 'keine-email' }))
  assert.equal(result.ok, false)
})

test('parseBandIntroSubmission: Beschreibung fehlt -> Fehler', () => {
  const result = parseBandIntroSubmission(validPayload({ description: '' }))
  assert.equal(result.ok, false)
})

test('parseBandIntroSubmission: Beschreibung unter 30 Zeichen -> Fehler', () => {
  const result = parseBandIntroSubmission(validPayload({ description: 'Zu kurz.' }))
  assert.equal(result.ok, false)
})

test('parseBandIntroSubmission: Beschreibung ueber 1500 Zeichen -> Fehler', () => {
  const result = parseBandIntroSubmission(validPayload({ description: 'x'.repeat(1501) }))
  assert.equal(result.ok, false)
})

test('parseBandIntroSubmission: Beschreibung mit genau 30 Zeichen wird akzeptiert', () => {
  const result = parseBandIntroSubmission(validPayload({ description: 'x'.repeat(30) }))
  assert.equal(result.ok, true)
})

test('parseBandIntroSubmission: Beschreibung mit genau 1500 Zeichen wird akzeptiert', () => {
  const result = parseBandIntroSubmission(validPayload({ description: 'x'.repeat(1500) }))
  assert.equal(result.ok, true)
})

test('parseBandIntroSubmission: ungueltige Website-URL -> Fehler', () => {
  const result = parseBandIntroSubmission(validPayload({ websiteUrl: 'nicht-http' }))
  assert.equal(result.ok, false)
})

test('parseBandIntroSubmission: gueltige Website-URL wird akzeptiert', () => {
  const result = parseBandIntroSubmission(validPayload({ websiteUrl: 'https://eure-band.de' }))
  assert.equal(result.ok, true)
})

test('parseBandIntroSubmission: ungueltiger zusaetzlicher Link -> Fehler', () => {
  const result = parseBandIntroSubmission(validPayload({ additionalLinks: ['ftp://nope', 'kein-link'] }))
  assert.equal(result.ok, false)
})

test('parseBandIntroSubmission: mehr als 6 zusaetzliche Links -> Fehler', () => {
  const links = Array.from({ length: 7 }, (_, i) => `https://example.com/${i}`)
  const result = parseBandIntroSubmission(validPayload({ additionalLinks: links }))
  assert.equal(result.ok, false)
})

test('parseBandIntroSubmission: Website und zusaetzliche Links duerfen gemeinsam leer sein', () => {
  const result = parseBandIntroSubmission(validPayload({ websiteUrl: '', additionalLinks: [] }))
  assert.equal(result.ok, true)
})

test('parseBandIntroSubmission: Nachname darf leer sein', () => {
  const result = parseBandIntroSubmission(validPayload({ lastName: '' }))
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.data.lastName, null)
})

test('parseBandIntroSubmission: Spitzname darf leer sein', () => {
  const result = parseBandIntroSubmission(validPayload({ nickname: '' }))
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.data.nickname, null)
})

test('parseBandIntroSubmission: Telefon darf leer sein', () => {
  const result = parseBandIntroSubmission(validPayload({ phone: '' }))
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.data.phone, null)
})

test('parseBandIntroSubmission: Honeypot befuellt -> bot, still abgelehnt', () => {
  const result = parseBandIntroSubmission(validPayload({ firmaHidden: 'Firma GmbH' }))
  assert.deepEqual(result, { ok: false, reason: 'bot' })
})

test('parseBandIntroSubmission: Submit innerhalb der Mindestzeit -> bot, still abgelehnt', () => {
  const result = parseBandIntroSubmission(validPayload({ openedAt: Date.now() }))
  assert.deepEqual(result, { ok: false, reason: 'bot' })
})

test('parseBandIntroSubmission: Datenschutz-Zustimmung fehlt -> Fehler', () => {
  const result = parseBandIntroSubmission(validPayload({ datenschutz: false }))
  assert.equal(result.ok, false)
})

test('isLikelyBotSubmission: unauffaelliger Payload ist kein Bot', () => {
  assert.equal(
    isLikelyBotSubmission({ firmaHidden: '', websiteHidden: '', openedAt: Date.now() - 5000 }),
    false
  )
})

// ── Zusaetzliche Links: Reihenfolge, Duplikate, Trimmen ──────────────────

test('normalizeAdditionalLinks: mehrere gueltige Links werden vollstaendig uebernommen, Reihenfolge bleibt erhalten', () => {
  const result = normalizeAdditionalLinks([
    'https://instagram.com/band',
    'https://youtube.com/band',
    'https://spotify.com/band',
  ])
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.deepEqual(result.links, [
      'https://instagram.com/band',
      'https://youtube.com/band',
      'https://spotify.com/band',
    ])
  }
})

test('normalizeAdditionalLinks: identische Duplikate werden entfernt', () => {
  const result = normalizeAdditionalLinks([
    'https://instagram.com/band',
    'https://instagram.com/band',
    'https://youtube.com/band',
  ])
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.deepEqual(result.links, ['https://instagram.com/band', 'https://youtube.com/band'])
  }
})

test('normalizeAdditionalLinks: fuehrende/nachfolgende Leerzeichen werden getrimmt', () => {
  const result = normalizeAdditionalLinks(['  https://instagram.com/band  '])
  assert.equal(result.ok, true)
  if (result.ok) assert.deepEqual(result.links, ['https://instagram.com/band'])
})

test('normalizeAdditionalLinks: leere Eintraege werden uebersprungen, kein Fehler', () => {
  const result = normalizeAdditionalLinks(['', '   ', 'https://instagram.com/band'])
  assert.equal(result.ok, true)
  if (result.ok) assert.deepEqual(result.links, ['https://instagram.com/band'])
})

test('normalizeAdditionalLinks: genau 6 gueltige Links sind erlaubt', () => {
  const links = Array.from({ length: 6 }, (_, i) => `https://example.com/${i}`)
  const result = normalizeAdditionalLinks(links)
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.links.length, 6)
})

test('normalizeAdditionalLinks: keine Plattform-Metadaten -- reine string[] Rueckgabe', () => {
  const result = normalizeAdditionalLinks(['https://instagram.com/band'])
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(typeof result.links[0], 'string')
    assert.deepEqual(Object.keys(result), ['ok', 'links'])
  }
})

test('isValidUrl: http/https werden akzeptiert, andere Schemata nicht', () => {
  assert.equal(isValidUrl('https://example.com', 2048), true)
  assert.equal(isValidUrl('http://example.com', 2048), true)
  assert.equal(isValidUrl('ftp://example.com', 2048), false)
  assert.equal(isValidUrl('javascript:alert(1)', 2048), false)
})

test('isValidEmail: einfache Plausibilitaetspruefung', () => {
  assert.equal(isValidEmail('anna@beispiel.de'), true)
  assert.equal(isValidEmail('keine-email'), false)
  assert.equal(isValidEmail('anna@beispiel.de\r\nBcc: evil@example.com'), false)
})
