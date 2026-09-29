import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseKontaktSubmission } from './validation.ts'

function validSubmission(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    anlass: 'Allgemeine Nachricht',
    vorname: 'Anna',
    nachname: 'Müller',
    email: 'anna@beispiel.de',
    telefon: '',
    nachricht: 'Hallo, ich hätte eine Frage.',
    datenschutz: true,
    firmaHidden: '',
    websiteHidden: '',
    openedAt: Date.now() - 5000,
    ...overrides,
  }
}

test('parseKontaktSubmission: gültige Eingabe wird normalisiert', () => {
  const result = parseKontaktSubmission(validSubmission())
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.data.anlass, 'Allgemeine Nachricht')
    assert.equal(result.data.email, 'anna@beispiel.de')
    assert.equal(result.data.telefon, null)
  }
})

test('parseKontaktSubmission: firma_hidden befüllt -> bot', () => {
  const result = parseKontaktSubmission(validSubmission({ firmaHidden: 'Spam GmbH' }))
  assert.deepEqual(result, { ok: false, reason: 'bot' })
})

test('parseKontaktSubmission: website_hidden befüllt -> bot', () => {
  const result = parseKontaktSubmission(validSubmission({ websiteHidden: 'https://spam.example' }))
  assert.deepEqual(result, { ok: false, reason: 'bot' })
})

test('parseKontaktSubmission: zu früh abgesendet -> too_fast (kein bot)', () => {
  const result = parseKontaktSubmission(validSubmission({ openedAt: Date.now() - 500 }))
  assert.deepEqual(result, { ok: false, reason: 'too_fast' })
})

test('parseKontaktSubmission: Honeypot hat Vorrang vor too_fast', () => {
  const result = parseKontaktSubmission(
    validSubmission({ firmaHidden: 'Spam GmbH', openedAt: Date.now() - 500 })
  )
  assert.deepEqual(result, { ok: false, reason: 'bot' })
})

test('parseKontaktSubmission: fehlender Anlass -> validation', () => {
  const result = parseKontaktSubmission(validSubmission({ anlass: '' }))
  assert.equal(result.ok, false)
  if (!result.ok && result.reason === 'validation') {
    assert.match(result.message, /Anliegen/)
  } else {
    assert.fail('erwartete reason=validation')
  }
})

test('parseKontaktSubmission: fehlender Vorname -> validation', () => {
  const result = parseKontaktSubmission(validSubmission({ vorname: '' }))
  assert.equal(result.ok, false)
  if (!result.ok && result.reason === 'validation') {
    assert.match(result.message, /Pflichtfelder/)
  } else {
    assert.fail('erwartete reason=validation')
  }
})

test('parseKontaktSubmission: ungültige E-Mail -> validation', () => {
  const result = parseKontaktSubmission(validSubmission({ email: 'keine-email' }))
  assert.equal(result.ok, false)
  if (!result.ok && result.reason === 'validation') {
    assert.match(result.message, /E-Mail/)
  } else {
    assert.fail('erwartete reason=validation')
  }
})

test('parseKontaktSubmission: fehlende Nachricht -> validation', () => {
  const result = parseKontaktSubmission(validSubmission({ nachricht: '' }))
  assert.equal(result.ok, false)
  if (!result.ok && result.reason === 'validation') {
    assert.match(result.message, /Nachricht/)
  } else {
    assert.fail('erwartete reason=validation')
  }
})

test('parseKontaktSubmission: fehlende Datenschutz-Zustimmung -> validation', () => {
  const result = parseKontaktSubmission(validSubmission({ datenschutz: false }))
  assert.deepEqual(result, { ok: false, reason: 'validation', message: 'Datenschutz-Zustimmung fehlt' })
})

test('parseKontaktSubmission: CRLF in Nachname wird abgelehnt', () => {
  const result = parseKontaktSubmission(validSubmission({ nachname: 'Müller\r\nBcc: spam@example.com' }))
  assert.equal(result.ok, false)
})
