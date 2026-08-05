import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isValidContactEmail, mapCreateBandRpcError, mapContactWriteError } from './bandContactValidation.ts'

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

// ── Codex-Nachtrag PR #26, zweiter Review, Befund 1+2: Fehlerabbildung aus
//    fn_set_primary_inquiry_contact.sql (create_band_contact()/
//    update_band_contact(), atomare Kontaktanlage/-bearbeitung inkl.
//    optionalem Primaerwechsel) ────────────────────────────────────────

test('mapContactWriteError: CC001 (Band nicht gefunden) -> invalid_contact', () => {
  assert.equal(mapContactWriteError({ code: 'CC001' }), 'invalid_contact')
})

test('mapContactWriteError: CC010 (Kontakt nicht gefunden) -> invalid_contact', () => {
  assert.equal(mapContactWriteError({ code: 'CC010' }), 'invalid_contact')
})

test('mapContactWriteError: CC011 (Kontakt gehoert nicht zur Band) -> invalid_contact', () => {
  assert.equal(mapContactWriteError({ code: 'CC011' }), 'invalid_contact')
})

test('mapContactWriteError: CC002 (Pflichtfelder fehlen) -> missing_fields', () => {
  assert.equal(mapContactWriteError({ code: 'CC002' }), 'missing_fields')
})

test('mapContactWriteError: CC003 (Feld zu lang) -> too_long', () => {
  assert.equal(mapContactWriteError({ code: 'CC003' }), 'too_long')
})

test('mapContactWriteError: CC004 (ungueltige E-Mail) -> invalid_email', () => {
  assert.equal(mapContactWriteError({ code: 'CC004' }), 'invalid_email')
})

test('mapContactWriteError: CC005 (ungueltige Rolle) -> invalid_role', () => {
  assert.equal(mapContactWriteError({ code: 'CC005' }), 'invalid_role')
})

test('mapContactWriteError: CC006 (Rollenkonflikt) -> duplicate_role', () => {
  assert.equal(mapContactWriteError({ code: 'CC006' }), 'duplicate_role')
})

test('mapContactWriteError: CC007 (ungueltige E-Mail bei aktiver Band als Primaerkontakt) -> primary_email_required_active', () => {
  assert.equal(mapContactWriteError({ code: 'CC007' }), 'primary_email_required_active')
})

test('mapContactWriteError: roher Postgres 23505 auf Rollen-Index -> duplicate_role', () => {
  assert.equal(
    mapContactWriteError({ code: '23505', message: 'duplicate key value violates unique constraint "idx_band_contacts_unique_role"' }),
    'duplicate_role'
  )
})

test('mapContactWriteError: roher Postgres 23505 auf Primaerkontakt-Index -> primary_conflict', () => {
  assert.equal(
    mapContactWriteError({ code: '23505', message: 'duplicate key value violates unique constraint "idx_band_contacts_one_primary_per_band"' }),
    'primary_conflict'
  )
})

test('mapContactWriteError: 23514 (CHECK-Constraint) -> check_failed', () => {
  assert.equal(mapContactWriteError({ code: '23514' }), 'check_failed')
})

test('mapContactWriteError: unbekannter Code faellt auf db_error zurueck', () => {
  assert.equal(mapContactWriteError({ code: 'XX999' }), 'db_error')
})
