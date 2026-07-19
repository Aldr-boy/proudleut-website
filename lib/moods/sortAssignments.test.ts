import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  sortBandMoodAssignments,
  compactRankSlots,
  type BandMoodAssignment,
  type MoodCatalogEntry,
} from './sortAssignments.ts'

function mood(overrides: Partial<MoodCatalogEntry> & { id: string; name: string }): MoodCatalogEntry {
  return {
    slug: overrides.id,
    description: null,
    status: 'active',
    sort_order: 0,
    ...overrides,
  }
}

test('sortiert primaer nach band_moods.sort_order', () => {
  const a: BandMoodAssignment = { mood_id: 'm1', sort_order: 2, mood: mood({ id: 'm1', name: 'B' }) }
  const b: BandMoodAssignment = { mood_id: 'm2', sort_order: 1, mood: mood({ id: 'm2', name: 'A' }) }
  const result = sortBandMoodAssignments([a, b])
  assert.deepEqual(result.map((r) => r.mood_id), ['m2', 'm1'])
})

test('bei Gleichstand band_moods.sort_order: sortiert nach moods.sort_order', () => {
  const a: BandMoodAssignment = { mood_id: 'm1', sort_order: 0, mood: mood({ id: 'm1', name: 'Z', sort_order: 5 }) }
  const b: BandMoodAssignment = { mood_id: 'm2', sort_order: 0, mood: mood({ id: 'm2', name: 'A', sort_order: 1 }) }
  const result = sortBandMoodAssignments([a, b])
  assert.deepEqual(result.map((r) => r.mood_id), ['m2', 'm1'])
})

test('bei doppeltem Gleichstand: stabiler Tie-Breaker ueber moods.name', () => {
  // Simuliert exakt den STEINBACH-Bestandsfall: drei Zuordnungen mit
  // band_moods.sort_order = 0 und (im Test bewusst) auch identischem
  // moods.sort_order -- die Reihenfolge muss ausschliesslich durch den
  // Namen bestimmt sein, nicht durch Einfuegereihenfolge oder Zufall.
  const brassPower: BandMoodAssignment = { mood_id: 'brass', sort_order: 0, mood: mood({ id: 'brass', name: 'Brass-Power', sort_order: 9 }) }
  const konzertant: BandMoodAssignment = { mood_id: 'konz', sort_order: 0, mood: mood({ id: 'konz', name: 'Konzertant & hochwertig', sort_order: 9 }) }
  const tanzflaechen: BandMoodAssignment = { mood_id: 'tanz', sort_order: 0, mood: mood({ id: 'tanz', name: 'Tanzflächen-Garantie', sort_order: 9 }) }

  const result = sortBandMoodAssignments([tanzflaechen, brassPower, konzertant])
  assert.deepEqual(
    result.map((r) => r.mood?.name),
    ['Brass-Power', 'Konzertant & hochwertig', 'Tanzflächen-Garantie'],
  )
})

test('sortBandMoodAssignments veraendert das Eingabe-Array nicht (reine Funktion)', () => {
  const a: BandMoodAssignment = { mood_id: 'm1', sort_order: 2, mood: mood({ id: 'm1', name: 'B' }) }
  const b: BandMoodAssignment = { mood_id: 'm2', sort_order: 1, mood: mood({ id: 'm2', name: 'A' }) }
  const input = [a, b]
  const inputCopy = [...input]
  sortBandMoodAssignments(input)
  assert.deepEqual(input, inputCopy)
})

test('fehlender Katalogeintrag (mood: null) faellt in der Sortierung nicht durch, sondern verhaelt sich wie sort_order 0 / Name ""', () => {
  const known: BandMoodAssignment = { mood_id: 'm1', sort_order: 0, mood: mood({ id: 'm1', name: 'A' }) }
  const orphan: BandMoodAssignment = { mood_id: 'm2', sort_order: 0, mood: null }
  const result = sortBandMoodAssignments([known, orphan])
  // "" < "A" durch localeCompare -> orphan zuerst. Wichtig ist nicht die
  // konkrete Position, sondern dass die Sortierung nicht wirft und
  // deterministisch bleibt.
  assert.deepEqual(result.map((r) => r.mood_id), ['m2', 'm1'])
})

test('compactRankSlots entfernt leere Zwischenplaetze, behaelt Reihenfolge', () => {
  assert.deepEqual(compactRankSlots(['a', null, 'b', null]), ['a', 'b'])
  assert.deepEqual(compactRankSlots([null, null, 'x', 'y']), ['x', 'y'])
  assert.deepEqual(compactRankSlots(['a', 'b', 'c', 'd']), ['a', 'b', 'c', 'd'])
  assert.deepEqual(compactRankSlots([null, null, null, null]), [])
})

test('compactRankSlots behandelt leeren String wie leeren Slot', () => {
  assert.deepEqual(compactRankSlots(['a', '', 'b']), ['a', 'b'])
})
