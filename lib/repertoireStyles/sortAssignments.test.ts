import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  sortBandRepertoireStyleAssignments,
  compactRankSlots,
  type BandRepertoireStyleAssignment,
  type RepertoireStyleCatalogEntry,
} from './sortAssignments.ts'

function style(overrides: Partial<RepertoireStyleCatalogEntry> & { id: string; name: string }): RepertoireStyleCatalogEntry {
  return {
    slug: overrides.id,
    description: null,
    status: 'active',
    sort_order: 0,
    ...overrides,
  }
}

test('sortiert nach band_repertoire_styles.sort_order', () => {
  const a: BandRepertoireStyleAssignment = { repertoire_style_id: 's1', sort_order: 2, repertoire_style: style({ id: 's1', name: 'B' }) }
  const b: BandRepertoireStyleAssignment = { repertoire_style_id: 's2', sort_order: 1, repertoire_style: style({ id: 's2', name: 'A' }) }
  const result = sortBandRepertoireStyleAssignments([a, b])
  assert.deepEqual(result.map((r) => r.repertoire_style_id), ['s2', 's1'])
})

test('kein zusaetzlicher Tie-Breaker: bei Gleichstand bleibt die Eingabereihenfolge stabil (Array.sort ist stabil)', () => {
  const a: BandRepertoireStyleAssignment = { repertoire_style_id: 's1', sort_order: 1, repertoire_style: style({ id: 's1', name: 'Z' }) }
  const b: BandRepertoireStyleAssignment = { repertoire_style_id: 's2', sort_order: 1, repertoire_style: style({ id: 's2', name: 'A' }) }
  const result = sortBandRepertoireStyleAssignments([a, b])
  assert.deepEqual(result.map((r) => r.repertoire_style_id), ['s1', 's2'])
})

test('sortBandRepertoireStyleAssignments veraendert das Eingabe-Array nicht (reine Funktion)', () => {
  const a: BandRepertoireStyleAssignment = { repertoire_style_id: 's1', sort_order: 2, repertoire_style: style({ id: 's1', name: 'B' }) }
  const b: BandRepertoireStyleAssignment = { repertoire_style_id: 's2', sort_order: 1, repertoire_style: style({ id: 's2', name: 'A' }) }
  const input = [a, b]
  const inputCopy = [...input]
  sortBandRepertoireStyleAssignments(input)
  assert.deepEqual(input, inputCopy)
})

test('fehlender Katalogeintrag (repertoire_style: null) faellt in der Sortierung nicht durch', () => {
  const known: BandRepertoireStyleAssignment = { repertoire_style_id: 's1', sort_order: 1, repertoire_style: style({ id: 's1', name: 'A' }) }
  const orphan: BandRepertoireStyleAssignment = { repertoire_style_id: 's2', sort_order: 0, repertoire_style: null }
  const result = sortBandRepertoireStyleAssignments([known, orphan])
  assert.deepEqual(result.map((r) => r.repertoire_style_id), ['s2', 's1'])
})

test('vollstaendige Darstellung beliebig vieler Zuordnungen (Sortierung kappt nichts)', () => {
  const many: BandRepertoireStyleAssignment[] = Array.from({ length: 10 }, (_, i) => ({
    repertoire_style_id: `s${i}`,
    sort_order: 10 - i,
    repertoire_style: style({ id: `s${i}`, name: `Style ${i}` }),
  }))
  const result = sortBandRepertoireStyleAssignments(many)
  assert.equal(result.length, 10)
  assert.deepEqual(result.map((r) => r.repertoire_style_id), many.map((r) => r.repertoire_style_id).reverse())
})

test('compactRankSlots entfernt leere Zwischenplaetze, behaelt Reihenfolge (kein stilles Abschneiden)', () => {
  assert.deepEqual(compactRankSlots(['a', null, 'b']), ['a', 'b'])
  assert.deepEqual(compactRankSlots([null, null, 'x']), ['x'])
  assert.deepEqual(compactRankSlots(['a', 'b', 'c']), ['a', 'b', 'c'])
  assert.deepEqual(compactRankSlots([null, null, null]), [])
})

test('compactRankSlots behandelt leeren String wie leeren Slot', () => {
  assert.deepEqual(compactRankSlots(['a', '', 'b']), ['a', 'b'])
})

test('compactRankSlots: explizit leeres Array bleibt leeres Array (bewusster Empty State)', () => {
  assert.deepEqual(compactRankSlots([]), [])
})
