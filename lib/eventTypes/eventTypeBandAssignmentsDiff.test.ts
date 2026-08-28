import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeEventTypeBandAssignmentsDiff } from './eventTypeBandAssignmentsDiff.ts'

test('unveraendert -> add=[], remove=[]', () => {
  const diff = computeEventTypeBandAssignmentsDiff(['a', 'b', 'c'], ['a', 'b', 'c'])
  assert.deepEqual(diff, { add: [], remove: [] })
})

test('eine Band hinzufuegen', () => {
  const diff = computeEventTypeBandAssignmentsDiff(['a', 'b'], ['a', 'b', 'c'])
  assert.deepEqual(diff.add, ['c'])
  assert.deepEqual(diff.remove, [])
})

test('eine Band entfernen', () => {
  const diff = computeEventTypeBandAssignmentsDiff(['a', 'b', 'c'], ['a', 'c'])
  assert.deepEqual(diff.add, [])
  assert.deepEqual(diff.remove, ['b'])
})

test('mehrere add/remove gleichzeitig', () => {
  const diff = computeEventTypeBandAssignmentsDiff(['a', 'b', 'c'], ['a', 'd', 'e'])
  assert.deepEqual([...diff.add].sort(), ['d', 'e'])
  assert.deepEqual([...diff.remove].sort(), ['b', 'c'])
})

test('keine doppelten IDs im generierten Diff, auch bei doppelten Eingaben', () => {
  const diff = computeEventTypeBandAssignmentsDiff(['a', 'a', 'b'], ['a', 'c', 'c'])
  assert.deepEqual(diff.add, ['c'])
  assert.deepEqual(diff.remove, ['b'])
})

test('leerer Ausgangs- und Zielzustand -> kein Diff', () => {
  const diff = computeEventTypeBandAssignmentsDiff([], [])
  assert.deepEqual(diff, { add: [], remove: [] })
})

test('staged Aenderung verwerfen (staged == original) -> Originalzustand, kein Diff', () => {
  const original = ['a', 'b']
  const stagedAfterDiscard = [...original]
  const diff = computeEventTypeBandAssignmentsDiff(original, stagedAfterDiscard)
  assert.deepEqual(diff, { add: [], remove: [] })
})
