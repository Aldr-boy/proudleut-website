import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compareReferenceEvents } from './bandReferenceEventsSort.ts'

test('compareReferenceEvents: niedrigerer sort_order zuerst', () => {
  const a = { id: 'a', sort_order: 1, created_at: '2026-01-01T00:00:00Z' }
  const b = { id: 'b', sort_order: 0, created_at: '2026-01-01T00:00:00Z' }
  assert.ok(compareReferenceEvents(a, b) > 0)
  assert.ok(compareReferenceEvents(b, a) < 0)
})

test('compareReferenceEvents: bei gleichem sort_order entscheidet created_at (aelter zuerst)', () => {
  const a = { id: 'a', sort_order: 0, created_at: '2026-02-01T00:00:00Z' }
  const b = { id: 'b', sort_order: 0, created_at: '2026-01-01T00:00:00Z' }
  assert.ok(compareReferenceEvents(a, b) > 0)
  assert.ok(compareReferenceEvents(b, a) < 0)
})

test('compareReferenceEvents: bei gleichem sort_order UND created_at entscheidet id als letzter Tie-Breaker', () => {
  const a = { id: 'b-id', sort_order: 0, created_at: '2026-01-01T00:00:00Z' }
  const b = { id: 'a-id', sort_order: 0, created_at: '2026-01-01T00:00:00Z' }
  assert.ok(compareReferenceEvents(a, b) > 0)
  assert.ok(compareReferenceEvents(b, a) < 0)
  assert.equal(compareReferenceEvents(a, a), 0)
})

test('compareReferenceEvents: Ergebnis ist deterministisch stabil ueber mehrere sort()-Laeufe', () => {
  const rows = [
    { id: 'z', sort_order: 0, created_at: '2026-01-01T00:00:00Z' },
    { id: 'y', sort_order: 0, created_at: '2026-01-01T00:00:00Z' },
    { id: 'a', sort_order: 1, created_at: '2026-01-01T00:00:00Z' },
    { id: 'b', sort_order: -5, created_at: '2026-01-01T00:00:00Z' },
  ]
  const expected = ['b', 'y', 'z', 'a']
  for (let i = 0; i < 5; i++) {
    const sorted = [...rows].sort(compareReferenceEvents).map(r => r.id)
    assert.deepEqual(sorted, expected)
  }
})

test('compareReferenceEvents: fehlende/ungueltige Felder fallen defensiv auf 0/"" zurueck statt zu crashen', () => {
  const a = { id: undefined, sort_order: undefined, created_at: undefined }
  const b = { id: undefined, sort_order: undefined, created_at: undefined }
  assert.equal(compareReferenceEvents(a, b), 0)
})
