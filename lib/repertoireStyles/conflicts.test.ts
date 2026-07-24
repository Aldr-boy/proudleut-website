import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  hasTooManyRepertoireStyleAssignments,
  isUnresolvedRepertoireStyleConflict,
  MAX_BAND_REPERTOIRE_STYLES,
} from './conflicts.ts'

test('MAX_BAND_REPERTOIRE_STYLES ist 3 (identisch zur bestehenden Live-RPC-Grenze PR003)', () => {
  assert.equal(MAX_BAND_REPERTOIRE_STYLES, 3)
})

test('hasTooManyRepertoireStyleAssignments: 3 oder weniger ist kein Konflikt', () => {
  assert.equal(hasTooManyRepertoireStyleAssignments([]), false)
  assert.equal(hasTooManyRepertoireStyleAssignments([{ repertoire_style_id: 'a' }]), false)
  assert.equal(
    hasTooManyRepertoireStyleAssignments([
      { repertoire_style_id: 'a' }, { repertoire_style_id: 'b' }, { repertoire_style_id: 'c' },
    ]),
    false,
  )
})

test('hasTooManyRepertoireStyleAssignments: mehr als 3 geladene Zeilen sind ein Datenkonflikt', () => {
  assert.equal(
    hasTooManyRepertoireStyleAssignments([
      { repertoire_style_id: 'a' }, { repertoire_style_id: 'b' },
      { repertoire_style_id: 'c' }, { repertoire_style_id: 'd' },
    ]),
    true,
  )
})

test('isUnresolvedRepertoireStyleConflict: kein original -> kein Konflikt', () => {
  assert.equal(isUnresolvedRepertoireStyleConflict(null, ''), false)
})

test('isUnresolvedRepertoireStyleConflict: original-Stil aktiv -> kein Konflikt, unabhaengig vom aktuellen Wert', () => {
  const original = {
    repertoire_style_id: 's1',
    sort_order: 1,
    repertoire_style: { id: 's1', name: 'Warm', slug: 'warm', description: null, status: 'active', sort_order: 1 },
  }
  assert.equal(isUnresolvedRepertoireStyleConflict(original, 's1'), false)
})

test('isUnresolvedRepertoireStyleConflict: inaktiver original-Stil, aktueller Wert unveraendert -> ungeloester Konflikt', () => {
  const original = {
    repertoire_style_id: 's1',
    sort_order: 1,
    repertoire_style: { id: 's1', name: 'Alt', slug: 'alt', description: null, status: 'draft', sort_order: 1 },
  }
  assert.equal(isUnresolvedRepertoireStyleConflict(original, 's1'), true)
})

test('isUnresolvedRepertoireStyleConflict: inaktiver original-Stil, aber Rang wurde geleert -> geloest', () => {
  const original = {
    repertoire_style_id: 's1',
    sort_order: 1,
    repertoire_style: { id: 's1', name: 'Alt', slug: 'alt', description: null, status: 'draft', sort_order: 1 },
  }
  assert.equal(isUnresolvedRepertoireStyleConflict(original, ''), false)
})

test('isUnresolvedRepertoireStyleConflict: inaktiver original-Stil, aber Rang wurde neu zugewiesen -> geloest', () => {
  const original = {
    repertoire_style_id: 's1',
    sort_order: 1,
    repertoire_style: { id: 's1', name: 'Alt', slug: 'alt', description: null, status: 'draft', sort_order: 1 },
  }
  assert.equal(isUnresolvedRepertoireStyleConflict(original, 's2'), false)
})

test('isUnresolvedRepertoireStyleConflict: original.repertoire_style fehlt komplett (null), Wert unveraendert -> ungeloester Konflikt', () => {
  const original = { repertoire_style_id: 's1', sort_order: 1, repertoire_style: null }
  assert.equal(isUnresolvedRepertoireStyleConflict(original, 's1'), true)
})

test('isUnresolvedRepertoireStyleConflict: keine Konfliktmeldung bei aktiven Eintraegen (mehrere Faelle)', () => {
  for (const status of ['active']) {
    const original = {
      repertoire_style_id: 's1',
      sort_order: 1,
      repertoire_style: { id: 's1', name: 'X', slug: 'x', description: null, status, sort_order: 1 },
    }
    assert.equal(isUnresolvedRepertoireStyleConflict(original, 's1'), false)
  }
})
