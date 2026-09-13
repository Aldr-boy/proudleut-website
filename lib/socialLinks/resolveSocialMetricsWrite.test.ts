import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveSocialMetricsWrite,
  parseNonNegativeIntOrNull,
  parseNonFutureDateOrNull,
  type ExistingSocialMetrics,
} from './resolveSocialMetricsWrite.ts'

const NOW = new Date('2026-05-17T12:00:00.000Z')
const TODAY_ISO = new Date('2026-05-17T00:00:00.000Z').toISOString()

function existing(overrides: Partial<ExistingSocialMetrics> = {}): ExistingSocialMetrics {
  return { current_followers: null, last_checked_at: null, ...overrides }
}

// ── resolveSocialMetricsWrite: Geschaefts-Entscheidung ─────────────────

test('gueltige neue Zahl + Haken + gueltiges Datum -> set', () => {
  const decision = resolveSocialMetricsWrite(existing(), {
    submittedFollowers: 5173,
    confirmChecked: true,
    checkedAtDate: TODAY_ISO,
  })
  assert.deepEqual(decision, { action: 'set', current_followers: 5173, last_checked_at: TODAY_ISO })
})

test('keine Aenderung, kein Haken -> noop (bloßes Speichern anderer Felder bestaetigt keine Zahl erneut)', () => {
  const decision = resolveSocialMetricsWrite(existing({ current_followers: 100, last_checked_at: '2026-01-01T00:00:00.000Z' }), {
    submittedFollowers: 100,
    confirmChecked: false,
    checkedAtDate: null,
  })
  assert.deepEqual(decision, { action: 'noop' })
})

test('unveraenderte Zahl, aber Haken gesetzt -> set (erneute Pruefbestaetigung moeglich)', () => {
  const decision = resolveSocialMetricsWrite(existing({ current_followers: 100, last_checked_at: '2026-01-01T00:00:00.000Z' }), {
    submittedFollowers: 100,
    confirmChecked: true,
    checkedAtDate: TODAY_ISO,
  })
  assert.deepEqual(decision, { action: 'set', current_followers: 100, last_checked_at: TODAY_ISO })
})

test('geaenderte Zahl ohne Haken -> error (Bestaetigung erforderlich)', () => {
  const decision = resolveSocialMetricsWrite(existing({ current_followers: 100 }), {
    submittedFollowers: 200,
    confirmChecked: false,
    checkedAtDate: null,
  })
  assert.deepEqual(decision, { action: 'error', code: 'check_required' })
})

test('neu erfasste Zahl (vorher keine) ohne Haken -> error', () => {
  const decision = resolveSocialMetricsWrite(existing(), {
    submittedFollowers: 42,
    confirmChecked: false,
    checkedAtDate: null,
  })
  assert.deepEqual(decision, { action: 'error', code: 'check_required' })
})

test('Haken gesetzt, aber kein gueltiges Datum -> error', () => {
  const decision = resolveSocialMetricsWrite(existing(), {
    submittedFollowers: 42,
    confirmChecked: true,
    checkedAtDate: null,
  })
  assert.deepEqual(decision, { action: 'error', code: 'check_required' })
})

test('Zahl geleert (hatte vorher einen Wert) -> clear, unabhaengig vom Haken', () => {
  const withoutCheck = resolveSocialMetricsWrite(existing({ current_followers: 100, last_checked_at: '2026-01-01T00:00:00.000Z' }), {
    submittedFollowers: null,
    confirmChecked: false,
    checkedAtDate: null,
  })
  assert.deepEqual(withoutCheck, { action: 'clear' })

  const withCheck = resolveSocialMetricsWrite(existing({ current_followers: 100, last_checked_at: '2026-01-01T00:00:00.000Z' }), {
    submittedFollowers: null,
    confirmChecked: true,
    checkedAtDate: TODAY_ISO,
  })
  assert.deepEqual(withCheck, { action: 'clear' })
})

test('nie eine Zahl vorhanden, weiterhin leer -> noop', () => {
  const decision = resolveSocialMetricsWrite(existing(), {
    submittedFollowers: null,
    confirmChecked: false,
    checkedAtDate: null,
  })
  assert.deepEqual(decision, { action: 'noop' })
})

test('Haken gesetzt, aber nie eine Zahl vorhanden -> noop (nichts zu bestaetigen)', () => {
  const decision = resolveSocialMetricsWrite(existing(), {
    submittedFollowers: null,
    confirmChecked: true,
    checkedAtDate: TODAY_ISO,
  })
  assert.deepEqual(decision, { action: 'noop' })
})

test('Zahl 0 ist ein gueltiger, aenderbarer Wert (unterscheidet sich von "leer")', () => {
  const decision = resolveSocialMetricsWrite(existing(), {
    submittedFollowers: 0,
    confirmChecked: true,
    checkedAtDate: TODAY_ISO,
  })
  assert.deepEqual(decision, { action: 'set', current_followers: 0, last_checked_at: TODAY_ISO })
})

test('Aenderung einer Plattform aktualisiert nicht automatisch eine andere -- unabhaengige Aufrufe', () => {
  // Instagram geaendert + bestaetigt:
  const instagram = resolveSocialMetricsWrite(existing({ current_followers: 1000, last_checked_at: '2026-01-01T00:00:00.000Z' }), {
    submittedFollowers: 1200,
    confirmChecked: true,
    checkedAtDate: TODAY_ISO,
  })
  assert.deepEqual(instagram, { action: 'set', current_followers: 1200, last_checked_at: TODAY_ISO })

  // Facebook unveraendert, kein eigener Haken -- unabhaengiger Aufruf mit eigenem confirmChecked=false:
  const facebook = resolveSocialMetricsWrite(existing({ current_followers: 500, last_checked_at: '2026-01-01T00:00:00.000Z' }), {
    submittedFollowers: 500,
    confirmChecked: false,
    checkedAtDate: null,
  })
  assert.deepEqual(facebook, { action: 'noop' })
})

// ── parseNonNegativeIntOrNull ───────────────────────────────────────────

test('parseNonNegativeIntOrNull: leer -> ok, null', () => {
  assert.deepEqual(parseNonNegativeIntOrNull(''), { ok: true, value: null })
  assert.deepEqual(parseNonNegativeIntOrNull('   '), { ok: true, value: null })
})

test('parseNonNegativeIntOrNull: gueltige nichtnegative ganze Zahl', () => {
  assert.deepEqual(parseNonNegativeIntOrNull('5173'), { ok: true, value: 5173 })
  assert.deepEqual(parseNonNegativeIntOrNull('0'), { ok: true, value: 0 })
})

test('parseNonNegativeIntOrNull: negative Zahl abgelehnt', () => {
  assert.deepEqual(parseNonNegativeIntOrNull('-5'), { ok: false })
})

test('parseNonNegativeIntOrNull: Dezimalwert abgelehnt', () => {
  assert.deepEqual(parseNonNegativeIntOrNull('5.5'), { ok: false })
  assert.deepEqual(parseNonNegativeIntOrNull('5,5'), { ok: false })
})

test('parseNonNegativeIntOrNull: nicht-numerischer Text abgelehnt', () => {
  assert.deepEqual(parseNonNegativeIntOrNull('abc'), { ok: false })
  assert.deepEqual(parseNonNegativeIntOrNull('5k'), { ok: false })
})

// ── parseNonFutureDateOrNull ────────────────────────────────────────────

test('parseNonFutureDateOrNull: leer -> ok, null', () => {
  assert.deepEqual(parseNonFutureDateOrNull('', NOW), { ok: true, value: null })
})

test('parseNonFutureDateOrNull: gueltiges heutiges Datum', () => {
  const result = parseNonFutureDateOrNull('2026-05-17', NOW)
  assert.equal(result.ok, true)
  assert.equal(result.ok && result.value, TODAY_ISO)
})

test('parseNonFutureDateOrNull: gueltiges vergangenes Datum', () => {
  const result = parseNonFutureDateOrNull('2026-01-01', NOW)
  assert.equal(result.ok, true)
})

test('parseNonFutureDateOrNull: zukuenftiges Datum abgelehnt', () => {
  assert.deepEqual(parseNonFutureDateOrNull('2026-05-18', NOW), { ok: false })
})

test('parseNonFutureDateOrNull: ungueltiger Kalendertag abgelehnt (kein stilles Ueberrollen in den naechsten Monat)', () => {
  assert.deepEqual(parseNonFutureDateOrNull('2026-02-30', NOW), { ok: false })
})

test('parseNonFutureDateOrNull: falsches Format abgelehnt', () => {
  assert.deepEqual(parseNonFutureDateOrNull('17.05.2026', NOW), { ok: false })
  assert.deepEqual(parseNonFutureDateOrNull('nicht-ein-datum', NOW), { ok: false })
})
