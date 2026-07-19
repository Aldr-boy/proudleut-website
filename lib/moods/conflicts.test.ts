import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasTooManyMoodAssignments, isUnresolvedMoodConflict, MAX_BAND_MOODS } from './conflicts.ts'

test('MAX_BAND_MOODS ist 4 (Editor-Rangplaetze und RPC-Obergrenze)', () => {
  assert.equal(MAX_BAND_MOODS, 4)
})

test('hasTooManyMoodAssignments: 4 oder weniger ist kein Konflikt', () => {
  assert.equal(hasTooManyMoodAssignments([]), false)
  assert.equal(hasTooManyMoodAssignments([{ mood_id: 'a' }, { mood_id: 'b' }]), false)
  assert.equal(
    hasTooManyMoodAssignments([{ mood_id: 'a' }, { mood_id: 'b' }, { mood_id: 'c' }, { mood_id: 'd' }]),
    false,
  )
})

test('hasTooManyMoodAssignments: mehr als 4 geladene Zeilen sind ein Datenkonflikt', () => {
  assert.equal(
    hasTooManyMoodAssignments([
      { mood_id: 'a' }, { mood_id: 'b' }, { mood_id: 'c' }, { mood_id: 'd' }, { mood_id: 'e' },
    ]),
    true,
  )
})

test('isUnresolvedMoodConflict: kein original -> kein Konflikt', () => {
  assert.equal(isUnresolvedMoodConflict(null, ''), false)
})

test('isUnresolvedMoodConflict: original-Mood aktiv -> kein Konflikt, unabhaengig vom aktuellen Wert', () => {
  const original = {
    mood_id: 'm1',
    sort_order: 1,
    mood: { id: 'm1', name: 'Warm', slug: 'warm', description: 'x', status: 'active', sort_order: 1 },
  }
  assert.equal(isUnresolvedMoodConflict(original, 'm1'), false)
})

test('isUnresolvedMoodConflict: inaktiver original-Mood, aktueller Wert unveraendert -> ungeloester Konflikt', () => {
  const original = {
    mood_id: 'm1',
    sort_order: 1,
    mood: { id: 'm1', name: 'Alt', slug: 'alt', description: 'x', status: 'archived', sort_order: 1 },
  }
  assert.equal(isUnresolvedMoodConflict(original, 'm1'), true)
})

test('isUnresolvedMoodConflict: inaktiver original-Mood, aber Rang wurde geleert -> geloest', () => {
  const original = {
    mood_id: 'm1',
    sort_order: 1,
    mood: { id: 'm1', name: 'Alt', slug: 'alt', description: 'x', status: 'archived', sort_order: 1 },
  }
  assert.equal(isUnresolvedMoodConflict(original, ''), false)
})

test('isUnresolvedMoodConflict: inaktiver original-Mood, aber Rang wurde neu zugewiesen -> geloest', () => {
  const original = {
    mood_id: 'm1',
    sort_order: 1,
    mood: { id: 'm1', name: 'Alt', slug: 'alt', description: 'x', status: 'archived', sort_order: 1 },
  }
  assert.equal(isUnresolvedMoodConflict(original, 'm2'), false)
})

test('isUnresolvedMoodConflict: original.mood fehlt komplett (mood: null), Wert unveraendert -> ungeloester Konflikt', () => {
  const original = { mood_id: 'm1', sort_order: 1, mood: null }
  assert.equal(isUnresolvedMoodConflict(original, 'm1'), true)
})
