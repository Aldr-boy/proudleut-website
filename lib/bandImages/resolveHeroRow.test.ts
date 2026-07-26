import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolvePubliclyUsedHeroRow } from './resolveHeroRow.ts'

test('resolvePubliclyUsedHeroRow: keine Zeilen -> none', () => {
  assert.deepEqual(resolvePubliclyUsedHeroRow([]), { kind: 'none' })
})

test('resolvePubliclyUsedHeroRow: genau eine Zeile -> resolved', () => {
  const row = { id: 'a', sort_order: 0 }
  assert.deepEqual(resolvePubliclyUsedHeroRow([row]), { kind: 'resolved', row })
})

test('resolvePubliclyUsedHeroRow: mehrere Zeilen mit unterschiedlichem sort_order -> kleinste gewinnt (oeffentliche Frontend-Logik)', () => {
  const a = { id: 'a', sort_order: 5 }
  const b = { id: 'b', sort_order: 0 }
  const c = { id: 'c', sort_order: 2 }
  assert.deepEqual(resolvePubliclyUsedHeroRow([a, b, c]), { kind: 'resolved', row: b })
})

test('resolvePubliclyUsedHeroRow: zwei Zeilen mit identischem sort_order -> ambiguous (fail-closed, keine Annahme)', () => {
  const a = { id: 'a', sort_order: 0 }
  const b = { id: 'b', sort_order: 0 }
  assert.deepEqual(resolvePubliclyUsedHeroRow([a, b]), { kind: 'ambiguous' })
})

test('resolvePubliclyUsedHeroRow: drei Zeilen, zwei davon im Gleichstand an der Spitze -> ambiguous', () => {
  const a = { id: 'a', sort_order: 0 }
  const b = { id: 'b', sort_order: 0 }
  const c = { id: 'c', sort_order: 3 }
  assert.deepEqual(resolvePubliclyUsedHeroRow([a, b, c]), { kind: 'ambiguous' })
})

test('resolvePubliclyUsedHeroRow: veraendert das Eingabe-Array nicht (reine Funktion)', () => {
  const a = { id: 'a', sort_order: 5 }
  const b = { id: 'b', sort_order: 0 }
  const input = [a, b]
  const inputCopy = [...input]
  resolvePubliclyUsedHeroRow(input)
  assert.deepEqual(input, inputCopy)
})
