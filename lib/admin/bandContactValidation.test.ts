import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isValidContactEmail, mapCreateBandRpcError, mapPrimaryContactPromotionError } from './bandContactValidation.ts'

// ── Anfrage-E-Mail-Pflichtfeld beim Anlegen einer neuen Band ────────────

test('isValidContactEmail: gueltige Adresse wird akzeptiert', () => {
  assert.equal(isValidContactEmail('kontakt@band-beispiel.de'), true)
})

test('isValidContactEmail: leere Adresse wird abgelehnt (Pflichtfeld)', () => {
  assert.equal(isValidContactEmail(''), false)
})

test('isValidContactEmail: ungueltiges Format wird abgelehnt', () => {
  assert.equal(isValidContactEmail('keine-email'), false)
})

test('isValidContactEmail: CR/LF-Injection wird abgelehnt', () => {
  assert.equal(isValidContactEmail('kontakt@band.de\r\nBcc: boese@example.com'), false)
})

test('isValidContactEmail: zu lange Adresse wird abgelehnt', () => {
  const tooLong = `${'a'.repeat(250)}@band.de`
  assert.equal(isValidContactEmail(tooLong), false)
})

// ── Fehlerabbildung aus fn_create_band_with_primary_contact.sql ────────

test('mapCreateBandRpcError: BCC10 -> Anfrage-E-Mail-Pflichtfeld-Meldung', () => {
  const result = mapCreateBandRpcError({ code: 'BCC10' })
  assert.equal(result.field, 'contact_email')
})

test('mapCreateBandRpcError: BCC11 -> ungueltige Anfrage-E-Mail-Meldung', () => {
  const result = mapCreateBandRpcError({ code: 'BCC11' })
  assert.equal(result.field, 'contact_email')
})

test('mapCreateBandRpcError: BCC05 (Slug-Konflikt) -> field slug', () => {
  const result = mapCreateBandRpcError({ code: 'BCC05' })
  assert.equal(result.field, 'slug')
})

test('mapCreateBandRpcError: roher Postgres 23505 (Slug-Race) faellt ebenfalls auf slug zurueck', () => {
  const result = mapCreateBandRpcError({ code: '23505' })
  assert.equal(result.field, 'slug')
})

test('mapCreateBandRpcError: unbekannter Code faellt auf generische form-Fehlermeldung zurueck', () => {
  const result = mapCreateBandRpcError({ code: 'XX999', message: 'irgendein Fehler' })
  assert.equal(result.field, 'form')
  assert.match(result.message, /irgendein Fehler/)
})

// ── Codex-Nachtrag PR #26, Befund 4: Fehlerabbildung aus
//    fn_set_primary_inquiry_contact.sql (atomarer Primaerkontakt-Wechsel) ─

test('mapPrimaryContactPromotionError: PC001 (Band nicht gefunden) -> invalid_contact', () => {
  assert.equal(mapPrimaryContactPromotionError({ code: 'PC001' }), 'invalid_contact')
})

test('mapPrimaryContactPromotionError: PC002 (Kontakt nicht gefunden) -> invalid_contact', () => {
  assert.equal(mapPrimaryContactPromotionError({ code: 'PC002' }), 'invalid_contact')
})

test('mapPrimaryContactPromotionError: PC003 (Kontakt gehoert nicht zur Band) -> invalid_contact', () => {
  assert.equal(mapPrimaryContactPromotionError({ code: 'PC003' }), 'invalid_contact')
})

test('mapPrimaryContactPromotionError: PC004 (ungueltige E-Mail bei aktiver Band) -> primary_email_required_active', () => {
  assert.equal(mapPrimaryContactPromotionError({ code: 'PC004' }), 'primary_email_required_active')
})

test('mapPrimaryContactPromotionError: unbekannter Code faellt auf db_error zurueck', () => {
  assert.equal(mapPrimaryContactPromotionError({ code: 'XX999' }), 'db_error')
})
