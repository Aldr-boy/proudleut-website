import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractUsageCountFromDetail } from './usageCount.ts'

test('extrahiert die Zuordnungsanzahl aus dem RPC-DETAIL-Text', () => {
  assert.equal(
    extractUsageCountFromDetail('mood_id=abc-123 has 5 existing band_moods row(s)'),
    '5',
  )
})

test('funktioniert auch bei genau einer Zuordnung (Singular im Text irrelevant)', () => {
  assert.equal(
    extractUsageCountFromDetail('mood_id=abc-123 has 1 existing band_moods row(s)'),
    '1',
  )
})

test('liefert null bei fehlendem DETAIL (undefined/null)', () => {
  assert.equal(extractUsageCountFromDetail(undefined), null)
  assert.equal(extractUsageCountFromDetail(null), null)
})

test('liefert null bei unerwartetem/fremdem DETAIL-Format statt zu raten', () => {
  assert.equal(extractUsageCountFromDetail('irgendein anderer Fehlertext'), null)
})
