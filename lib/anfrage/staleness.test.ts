import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isStalePending, evaluateRetryEligibility, STALE_PENDING_AFTER_MINUTES } from './staleness.ts'

test('STALE_PENDING_AFTER_MINUTES ist 5', () => {
  assert.equal(STALE_PENDING_AFTER_MINUTES, 5)
})

// ── isStalePending ───────────────────────────────────────────────────────

test('isStalePending: frisch (unter 5 Minuten) ist nicht veraltet', () => {
  const lastAttemptAt = new Date('2026-01-01T10:00:00Z').toISOString()
  const now = new Date('2026-01-01T10:04:59Z')
  assert.equal(isStalePending(lastAttemptAt, '2026-01-01T09:00:00Z', now), false)
})

test('isStalePending: genau 5 Minuten gilt bereits als veraltet', () => {
  const lastAttemptAt = new Date('2026-01-01T10:00:00Z').toISOString()
  const now = new Date('2026-01-01T10:05:00Z')
  assert.equal(isStalePending(lastAttemptAt, '2026-01-01T09:00:00Z', now), true)
})

test('isStalePending: deutlich ueber 5 Minuten ist veraltet', () => {
  const lastAttemptAt = new Date('2026-01-01T10:00:00Z').toISOString()
  const now = new Date('2026-01-01T10:30:00Z')
  assert.equal(isStalePending(lastAttemptAt, '2026-01-01T09:00:00Z', now), true)
})

test('isStalePending: fehlendes last_attempt_at faellt auf created_at zurueck (deckt Abbruch vor erster Markierung ab)', () => {
  const createdAt = new Date('2026-01-01T10:00:00Z').toISOString()
  const now = new Date('2026-01-01T10:10:00Z')
  assert.equal(isStalePending(null, createdAt, now), true)
})

test('isStalePending: fehlendes last_attempt_at, created_at noch frisch -> nicht veraltet', () => {
  const createdAt = new Date('2026-01-01T10:00:00Z').toISOString()
  const now = new Date('2026-01-01T10:01:00Z')
  assert.equal(isStalePending(null, createdAt, now), false)
})

// ── evaluateRetryEligibility ─────────────────────────────────────────────

const CREATED_AT = new Date('2026-01-01T00:00:00Z').toISOString()

test('evaluateRetryEligibility: gesendet ist immer unantastbar', () => {
  const result = evaluateRetryEligibility({
    status: 'gesendet',
    lastAttemptAt: new Date('2026-01-01T00:01:00Z').toISOString(),
    createdAt: CREATED_AT,
    now: new Date('2026-06-01T00:00:00Z'),
  })
  assert.deepEqual(result, { eligible: false, reason: 'already_sent' })
})

test('evaluateRetryEligibility: fehlgeschlagen ist immer sofort retrybar', () => {
  const result = evaluateRetryEligibility({
    status: 'fehlgeschlagen',
    lastAttemptAt: new Date('2026-01-01T00:01:00Z').toISOString(),
    createdAt: CREATED_AT,
    now: new Date('2026-01-01T00:01:01Z'),
  })
  assert.deepEqual(result, { eligible: true })
})

test('evaluateRetryEligibility: frisches ausstehend (< 5 Minuten) ist NICHT retrybar', () => {
  const lastAttemptAt = new Date('2026-01-01T00:01:00Z').toISOString()
  const now = new Date('2026-01-01T00:02:00Z')
  const result = evaluateRetryEligibility({ status: 'ausstehend', lastAttemptAt, createdAt: CREATED_AT, now })
  assert.deepEqual(result, { eligible: false, reason: 'not_stale_yet' })
})

test('evaluateRetryEligibility: veraltetes ausstehend (>= 5 Minuten, < 24h) ist retrybar', () => {
  const lastAttemptAt = new Date('2026-01-01T00:01:00Z').toISOString()
  const now = new Date('2026-01-01T00:10:00Z')
  const result = evaluateRetryEligibility({ status: 'ausstehend', lastAttemptAt, createdAt: CREATED_AT, now })
  assert.deepEqual(result, { eligible: true })
})

test('evaluateRetryEligibility: ausstehend mit vorhandenem altem last_attempt_at ist retrybar', () => {
  const lastAttemptAt = new Date('2026-01-01T00:00:30Z').toISOString()
  const now = new Date('2026-01-01T00:20:00Z')
  const result = evaluateRetryEligibility({ status: 'ausstehend', lastAttemptAt, createdAt: CREATED_AT, now })
  assert.deepEqual(result, { eligible: true })
})

test('evaluateRetryEligibility: ausstehend ohne last_attempt_at (Abbruch vor erster Markierung), created_at alt genug -> retrybar', () => {
  const now = new Date('2026-01-01T00:10:00Z')
  const result = evaluateRetryEligibility({ status: 'ausstehend', lastAttemptAt: null, createdAt: CREATED_AT, now })
  assert.deepEqual(result, { eligible: true })
})

test('evaluateRetryEligibility: ausstehend aelter als 24 Stunden erhaelt keinen normalen Retry', () => {
  const lastAttemptAt = new Date('2026-01-01T00:01:00Z').toISOString()
  const now = new Date('2026-01-02T01:00:00Z') // > 24h nach lastAttemptAt
  const result = evaluateRetryEligibility({ status: 'ausstehend', lastAttemptAt, createdAt: CREATED_AT, now })
  assert.deepEqual(result, { eligible: false, reason: 'protection_window_expired' })
})

test('evaluateRetryEligibility: ungeklaert innerhalb 24h ist retrybar', () => {
  const lastAttemptAt = new Date('2026-01-01T00:00:00Z').toISOString()
  const now = new Date('2026-01-01T12:00:00Z')
  const result = evaluateRetryEligibility({ status: 'ungeklaert', lastAttemptAt, createdAt: CREATED_AT, now })
  assert.deepEqual(result, { eligible: true })
})

test('evaluateRetryEligibility: ungeklaert nach 24h ist nicht mehr normal retrybar', () => {
  const lastAttemptAt = new Date('2026-01-01T00:00:00Z').toISOString()
  const now = new Date('2026-01-02T01:00:00Z')
  const result = evaluateRetryEligibility({ status: 'ungeklaert', lastAttemptAt, createdAt: CREATED_AT, now })
  assert.deepEqual(result, { eligible: false, reason: 'protection_window_expired' })
})
