import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildBandMailIdempotencyKey, buildConfirmationIdempotencyKey } from './idempotencyKeys.ts'

const ANFRAGE_ID = '11111111-1111-1111-1111-111111111111'
const BAND_ID = '22222222-2222-2222-2222-222222222222'

test('buildBandMailIdempotencyKey: deterministisch bei identischen Eingaben (Retry-Faehigkeit)', () => {
  const first = buildBandMailIdempotencyKey(ANFRAGE_ID, BAND_ID)
  const second = buildBandMailIdempotencyKey(ANFRAGE_ID, BAND_ID)
  assert.equal(first, second)
})

test('buildBandMailIdempotencyKey: unterschiedliche Bands liefern unterschiedliche Keys', () => {
  const a = buildBandMailIdempotencyKey(ANFRAGE_ID, BAND_ID)
  const b = buildBandMailIdempotencyKey(ANFRAGE_ID, '33333333-3333-3333-3333-333333333333')
  assert.notEqual(a, b)
})

test('buildBandMailIdempotencyKey: enthaelt keine personenbezogenen Daten (nur UUIDs + Template-Version)', () => {
  const key = buildBandMailIdempotencyKey(ANFRAGE_ID, BAND_ID)
  assert.match(key, /^inquiry\/[0-9a-f-]+\/band\/[0-9a-f-]+\/[A-Za-z0-9.]+$/)
})

test('buildBandMailIdempotencyKey: bleibt unter 256 Zeichen', () => {
  const key = buildBandMailIdempotencyKey(ANFRAGE_ID, BAND_ID)
  assert.ok(key.length <= 256, `Key zu lang: ${key.length}`)
})

test('buildConfirmationIdempotencyKey: deterministisch', () => {
  assert.equal(buildConfirmationIdempotencyKey(ANFRAGE_ID), buildConfirmationIdempotencyKey(ANFRAGE_ID))
})

test('buildConfirmationIdempotencyKey: unterscheidet sich vom Band-Mail-Key derselben Anfrage', () => {
  const confirmationKey = buildConfirmationIdempotencyKey(ANFRAGE_ID)
  const bandKey = buildBandMailIdempotencyKey(ANFRAGE_ID, BAND_ID)
  assert.notEqual(confirmationKey, bandKey)
})

test('buildConfirmationIdempotencyKey: bleibt unter 256 Zeichen und enthaelt keine PII', () => {
  const key = buildConfirmationIdempotencyKey(ANFRAGE_ID)
  assert.ok(key.length <= 256)
  assert.match(key, /^inquiry\/[0-9a-f-]+\/confirmation\/[A-Za-z0-9.]+$/)
})
