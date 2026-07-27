import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolvePubliclyUsedMediaRow } from './resolveMediaRow.ts'

test('resolvePubliclyUsedMediaRow: keine Zeilen -> none', () => {
  assert.deepEqual(resolvePubliclyUsedMediaRow([]), { kind: 'none' })
})

test('resolvePubliclyUsedMediaRow: genau eine Zeile -> resolved', () => {
  const row = { id: 'a', sort_order: 0 }
  assert.deepEqual(resolvePubliclyUsedMediaRow([row]), { kind: 'resolved', row })
})

test('resolvePubliclyUsedMediaRow: mehrere Zeilen mit unterschiedlichem sort_order -> kleinste gewinnt (oeffentliche Frontend-Logik)', () => {
  const a = { id: 'a', sort_order: 5 }
  const b = { id: 'b', sort_order: 0 }
  const c = { id: 'c', sort_order: 2 }
  assert.deepEqual(resolvePubliclyUsedMediaRow([a, b, c]), { kind: 'resolved', row: b })
})

test('resolvePubliclyUsedMediaRow: zwei Zeilen mit identischem sort_order -> ambiguous (fail-closed, keine Annahme)', () => {
  const a = { id: 'a', sort_order: 0 }
  const b = { id: 'b', sort_order: 0 }
  assert.deepEqual(resolvePubliclyUsedMediaRow([a, b]), { kind: 'ambiguous' })
})

test('resolvePubliclyUsedMediaRow: drei Zeilen, zwei davon im Gleichstand an der Spitze -> ambiguous', () => {
  const a = { id: 'a', sort_order: 0 }
  const b = { id: 'b', sort_order: 0 }
  const c = { id: 'c', sort_order: 3 }
  assert.deepEqual(resolvePubliclyUsedMediaRow([a, b, c]), { kind: 'ambiguous' })
})

test('resolvePubliclyUsedMediaRow: veraendert das Eingabe-Array nicht (reine Funktion)', () => {
  const a = { id: 'a', sort_order: 5 }
  const b = { id: 'b', sort_order: 0 }
  const input = [a, b]
  const inputCopy = [...input]
  resolvePubliclyUsedMediaRow(input)
  assert.deepEqual(input, inputCopy)
})

test('resolvePubliclyUsedMediaRow: funktioniert rollenneutral auch fuer thumbnail-Zeilen (kein hero-spezifisches Verhalten)', () => {
  const thumbRowA = { id: 't-a', sort_order: 1 }
  const thumbRowB = { id: 't-b', sort_order: 0 }
  assert.deepEqual(resolvePubliclyUsedMediaRow([thumbRowA, thumbRowB]), { kind: 'resolved', row: thumbRowB })
})
