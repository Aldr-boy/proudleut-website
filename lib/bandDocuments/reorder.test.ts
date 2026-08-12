import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeBandDocumentSwap } from './reorder.ts'

test('computeBandDocumentSwap: 1 Dokument, "up" -> No-op (bereits am Anfang)', () => {
  assert.equal(computeBandDocumentSwap(['a'], 'a', 'up'), null)
})

test('computeBandDocumentSwap: 1 Dokument, "down" -> No-op (bereits am Ende)', () => {
  assert.equal(computeBandDocumentSwap(['a'], 'a', 'down'), null)
})

test('computeBandDocumentSwap: 2 Dokumente tauschen -- "down" auf das erste', () => {
  const result = computeBandDocumentSwap(['a', 'b'], 'a', 'down')
  assert.deepEqual(result, { aId: 'a', aOrder: 1, bId: 'b', bOrder: 0 })
})

test('computeBandDocumentSwap: 2 Dokumente tauschen -- "up" auf das zweite', () => {
  const result = computeBandDocumentSwap(['a', 'b'], 'b', 'up')
  assert.deepEqual(result, { aId: 'b', aOrder: 0, bId: 'a', bOrder: 1 })
})

test('computeBandDocumentSwap: 3 Dokumente, mittleres nach oben bewegen', () => {
  const result = computeBandDocumentSwap(['a', 'b', 'c'], 'b', 'up')
  assert.deepEqual(result, { aId: 'b', aOrder: 0, bId: 'a', bOrder: 1 })
})

test('computeBandDocumentSwap: 3 Dokumente, mittleres nach unten bewegen', () => {
  const result = computeBandDocumentSwap(['a', 'b', 'c'], 'b', 'down')
  assert.deepEqual(result, { aId: 'b', aOrder: 2, bId: 'c', bOrder: 1 })
})

test('computeBandDocumentSwap: erstes Element "up" -> No-op', () => {
  assert.equal(computeBandDocumentSwap(['a', 'b', 'c'], 'a', 'up'), null)
})

test('computeBandDocumentSwap: letztes Element "down" -> No-op', () => {
  assert.equal(computeBandDocumentSwap(['a', 'b', 'c'], 'c', 'down'), null)
})

test('computeBandDocumentSwap: unbekannte ID -> null, kein Crash', () => {
  assert.equal(computeBandDocumentSwap(['a', 'b'], 'does-not-exist', 'up'), null)
})

test('computeBandDocumentSwap: Ergebnis bewegt eine Zeile auch bei angenommenem sort_order-Gleichstand zuverlaessig (Index-basiert statt Werttausch)', () => {
  // Simuliert den Fall, dass 'a' und 'b' im DB-Rohzustand denselben
  // sort_order hatten und nur ueber den Tie-Breaker (created_at/id)
  // in dieser Reihenfolge stehen -- die Funktion kennt die alten
  // sort_order-Werte gar nicht, sie arbeitet ausschliesslich auf der
  // bereits aufgeloesten Anzeige-Reihenfolge.
  const result = computeBandDocumentSwap(['a', 'b'], 'a', 'down')
  assert.notEqual(result!.aOrder, result!.bOrder)
})
