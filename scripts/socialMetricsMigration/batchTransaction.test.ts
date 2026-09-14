import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyBatchRow, classifyBatch, toEpochMs } from './batchTransaction.mjs'

const PREV = { followers: null, checkedAtMs: null }
const FINAL = { followers: 100, checkedAtMs: 1000 }

// ─── classifyBatchRow ──────────────────────────────────────────────────────────

test('classifyBatchRow: Zielrow nicht gefunden -> MISMATCH_NOT_FOUND', () => {
  assert.equal(classifyBatchRow(PREV, FINAL, null), 'MISMATCH_NOT_FOUND')
})

test('classifyBatchRow: aktueller Zustand entspricht dem Ausgangswert -> TO_APPLY', () => {
  assert.equal(classifyBatchRow(PREV, FINAL, { followers: null, checkedAtMs: null }), 'TO_APPLY')
})

test('classifyBatchRow: aktueller Zustand entspricht bereits dem Endzustand -> ALREADY_APPLIED', () => {
  assert.equal(classifyBatchRow(PREV, FINAL, { followers: 100, checkedAtMs: 1000 }), 'ALREADY_APPLIED')
})

test('classifyBatchRow: weder Ausgangs- noch Endzustand -> MISMATCH_DRIFT', () => {
  assert.equal(classifyBatchRow(PREV, FINAL, { followers: 999, checkedAtMs: 5000 }), 'MISMATCH_DRIFT')
})

test('classifyBatchRow: Endzustand hat Vorrang, falls Ausgangs- und Endwert identisch waeren', () => {
  const prevEqualsFinal = { followers: 100, checkedAtMs: 1000 }
  assert.equal(classifyBatchRow(prevEqualsFinal, FINAL, { followers: 100, checkedAtMs: 1000 }), 'ALREADY_APPLIED')
})

// ─── classifyBatch ─────────────────────────────────────────────────────────────

function rows(classifications: string[]) {
  return classifications.map((c, i) => ({ id: `r${i}`, classification: c as any }))
}

test('classifyBatch: vollstaendige frische Uebernahme -> ALL_FRESH_APPLY', () => {
  const result = classifyBatch(rows(['TO_APPLY', 'TO_APPLY', 'TO_APPLY']))
  assert.equal(result.outcome, 'ALL_FRESH_APPLY')
  assert.equal(result.toApplyIds.length, 3)
})

test('classifyBatch: alle bereits im freigegebenen Endzustand -> ALL_ALREADY_APPLIED, kein Schreiben', () => {
  const result = classifyBatch(rows(['ALREADY_APPLIED', 'ALREADY_APPLIED']))
  assert.equal(result.outcome, 'ALL_ALREADY_APPLIED')
  assert.equal(result.toApplyIds.length, 0)
})

test('classifyBatch: eine einzelne Abweichung stoppt den gesamten Batch -> ABORT_MISMATCH', () => {
  const result = classifyBatch(rows(['TO_APPLY', 'TO_APPLY', 'MISMATCH_DRIFT']))
  assert.equal(result.outcome, 'ABORT_MISMATCH')
  assert.deepEqual(result.mismatchIds, ['r2'])
})

test('classifyBatch: fehlende Zielrow zaehlt als Mismatch, stoppt den gesamten Batch', () => {
  const result = classifyBatch(rows(['TO_APPLY', 'MISMATCH_NOT_FOUND']))
  assert.equal(result.outcome, 'ABORT_MISMATCH')
})

test('classifyBatch: gemischter Zustand ohne echten Widerspruch (ein Teil bereits final, Rest Ausgangszustand) -> ABORT_MIXED, keine Teiluebernahme', () => {
  const result = classifyBatch(rows(['ALREADY_APPLIED', 'TO_APPLY']))
  assert.equal(result.outcome, 'ABORT_MIXED')
})

test('classifyBatch: Mismatch hat Vorrang vor Mixed-Erkennung', () => {
  const result = classifyBatch(rows(['ALREADY_APPLIED', 'TO_APPLY', 'MISMATCH_DRIFT']))
  assert.equal(result.outcome, 'ABORT_MISMATCH')
})

// ─── toEpochMs ──────────────────────────────────────────────────────────────────

test('toEpochMs: null/undefined -> null', () => {
  assert.equal(toEpochMs(null), null)
  assert.equal(toEpochMs(undefined), null)
})

test('toEpochMs: ISO-String und Date liefern denselben Wert', () => {
  const iso = '2026-06-01T00:00:00.000Z'
  assert.equal(toEpochMs(iso), toEpochMs(new Date(iso)))
  assert.equal(toEpochMs(iso), new Date(iso).getTime())
})

test('toEpochMs: ungueltiger Wert -> null (kein NaN-Leck)', () => {
  assert.equal(toEpochMs('not-a-date'), null)
})
