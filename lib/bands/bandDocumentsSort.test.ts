import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compareBandDocuments } from './bandDocumentsSort.ts'

test('compareBandDocuments: niedrigerer sort_order zuerst', () => {
  const a = { id: 'a', sort_order: 1, created_at: '2026-01-01T00:00:00Z' }
  const b = { id: 'b', sort_order: 0, created_at: '2026-01-01T00:00:00Z' }
  assert.ok(compareBandDocuments(a, b) > 0)
  assert.ok(compareBandDocuments(b, a) < 0)
})

test('compareBandDocuments: bei gleichem sort_order entscheidet created_at (aelter zuerst)', () => {
  const a = { id: 'a', sort_order: 0, created_at: '2026-02-01T00:00:00Z' }
  const b = { id: 'b', sort_order: 0, created_at: '2026-01-01T00:00:00Z' }
  assert.ok(compareBandDocuments(a, b) > 0)
  assert.ok(compareBandDocuments(b, a) < 0)
})

test('compareBandDocuments: bei gleichem sort_order UND created_at entscheidet id als letzter Tie-Breaker', () => {
  const a = { id: 'b-id', sort_order: 0, created_at: '2026-01-01T00:00:00Z' }
  const b = { id: 'a-id', sort_order: 0, created_at: '2026-01-01T00:00:00Z' }
  assert.ok(compareBandDocuments(a, b) > 0)
  assert.ok(compareBandDocuments(b, a) < 0)
  assert.equal(compareBandDocuments(a, a), 0)
})

test('compareBandDocuments: Ergebnis ist deterministisch stabil ueber mehrere sort()-Laeufe', () => {
  const rows = [
    { id: 'z', sort_order: 0, created_at: '2026-01-01T00:00:00Z' },
    { id: 'y', sort_order: 0, created_at: '2026-01-01T00:00:00Z' },
    { id: 'a', sort_order: 1, created_at: '2026-01-01T00:00:00Z' },
    { id: 'b', sort_order: -5, created_at: '2026-01-01T00:00:00Z' },
  ]
  const expected = ['b', 'y', 'z', 'a']
  for (let i = 0; i < 5; i++) {
    const sorted = [...rows].sort(compareBandDocuments).map(r => r.id)
    assert.deepEqual(sorted, expected)
  }
})

test('compareBandDocuments: fehlende/ungueltige Felder fallen defensiv auf 0/"" zurueck statt zu crashen', () => {
  const a = { id: undefined, sort_order: undefined, created_at: undefined }
  const b = { id: undefined, sort_order: undefined, created_at: undefined }
  assert.equal(compareBandDocuments(a, b), 0)
})
