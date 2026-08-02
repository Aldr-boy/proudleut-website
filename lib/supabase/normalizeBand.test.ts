import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeMoodAssignments } from './normalizeBand.ts'

test('normalizeMoodAssignments: liefert Name UND stabilen Slug pro Zuordnung', () => {
  const raw = [
    { sort_order: 1, moods: { name: 'Party pur', slug: 'party-pur', sort_order: 3 } },
  ]
  assert.deepEqual(normalizeMoodAssignments(raw), [{ name: 'Party pur', slug: 'party-pur' }])
})

test('normalizeMoodAssignments: sortiert nach band_moods.sort_order (kuratierte Prioritaet)', () => {
  const raw = [
    { sort_order: 2, moods: { name: 'B', slug: 'b', sort_order: 0 } },
    { sort_order: 1, moods: { name: 'A', slug: 'a', sort_order: 0 } },
  ]
  assert.deepEqual(
    normalizeMoodAssignments(raw).map((m) => m.slug),
    ['a', 'b']
  )
})

test('normalizeMoodAssignments: bei gleichem band_moods.sort_order entscheidet moods.sort_order', () => {
  const raw = [
    { sort_order: 0, moods: { name: 'B', slug: 'b', sort_order: 2 } },
    { sort_order: 0, moods: { name: 'A', slug: 'a', sort_order: 1 } },
  ]
  assert.deepEqual(
    normalizeMoodAssignments(raw).map((m) => m.slug),
    ['a', 'b']
  )
})

test('normalizeMoodAssignments: bei doppeltem Gleichstand entscheidet moods.name als Tie-Breaker', () => {
  const raw = [
    { sort_order: 0, moods: { name: 'Zeta', slug: 'zeta', sort_order: 0 } },
    { sort_order: 0, moods: { name: 'Alpha', slug: 'alpha', sort_order: 0 } },
  ]
  assert.deepEqual(
    normalizeMoodAssignments(raw).map((m) => m.name),
    ['Alpha', 'Zeta']
  )
})

test('normalizeMoodAssignments: leere/fehlende band_moods ergibt leeres Array, kein Crash', () => {
  assert.deepEqual(normalizeMoodAssignments(null), [])
  assert.deepEqual(normalizeMoodAssignments(undefined), [])
  assert.deepEqual(normalizeMoodAssignments([]), [])
})

test('normalizeMoodAssignments: Eintrag ohne Name oder ohne Slug wird verworfen, nicht als leere Zeichenkette gefuehrt', () => {
  const raw = [
    { sort_order: 0, moods: { name: 'Vollstaendig', slug: 'vollstaendig' } },
    { sort_order: 1, moods: { name: '', slug: 'ohne-namen' } },
    { sort_order: 2, moods: { name: 'Ohne Slug', slug: '' } },
  ]
  assert.deepEqual(normalizeMoodAssignments(raw), [{ name: 'Vollstaendig', slug: 'vollstaendig' }])
})
