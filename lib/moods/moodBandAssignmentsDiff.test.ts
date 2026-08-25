import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeMoodBandDiff } from './moodBandAssignmentsDiff.ts'

test('unveraendert -> add=[], remove=[]', () => {
  const diff = computeMoodBandDiff(['a', 'b', 'c'], ['a', 'b', 'c'])
  assert.deepEqual(diff, { add: [], remove: [] })
})

test('eine Band hinzufuegen', () => {
  const diff = computeMoodBandDiff(['a', 'b'], ['a', 'b', 'c'])
  assert.deepEqual(diff.add, ['c'])
  assert.deepEqual(diff.remove, [])
})

test('eine Band entfernen', () => {
  const diff = computeMoodBandDiff(['a', 'b', 'c'], ['a', 'c'])
  assert.deepEqual(diff.add, [])
  assert.deepEqual(diff.remove, ['b'])
})

test('mehrere add/remove gleichzeitig', () => {
  const diff = computeMoodBandDiff(['a', 'b', 'c'], ['a', 'd', 'e'])
  assert.deepEqual([...diff.add].sort(), ['d', 'e'])
  assert.deepEqual([...diff.remove].sort(), ['b', 'c'])
})

test('keine doppelten IDs im generierten Diff, auch bei doppelten Eingaben', () => {
  const diff = computeMoodBandDiff(['a', 'a', 'b'], ['a', 'c', 'c'])
  assert.deepEqual(diff.add, ['c'])
  assert.deepEqual(diff.remove, ['b'])
})

test('leerer Ausgangs- und Zielzustand -> kein Diff', () => {
  const diff = computeMoodBandDiff([], [])
  assert.deepEqual(diff, { add: [], remove: [] })
})

test('staged Aenderung verwerfen (staged == original) -> Originalzustand, kein Diff', () => {
  const original = ['a', 'b']
  // Simuliert: Nutzer hat 'c' hinzugefuegt und wieder entfernt (Verwerfen setzt staged = original zurueck)
  const stagedAfterDiscard = [...original]
  const diff = computeMoodBandDiff(original, stagedAfterDiscard)
  assert.deepEqual(diff, { add: [], remove: [] })
})
