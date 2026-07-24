import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  hasTooManyRepertoireStyleAssignments,
  isUnresolvedRepertoireStyleConflict,
  isUnresolvedSearchText,
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

// isUnresolvedSearchText: A2-Fix -- nicht exakt aufgeloester Suchtext darf
// niemals wie ein bewusst geleerter Rang behandelt werden (sonst wuerde
// ein Tippfehler beim Speichern einen bestehenden Eintrag still loeschen).

test('isUnresolvedSearchText: nicht aufgeloester Text blockiert (Tippfehler/kein Treffer)', () => {
  assert.equal(isUnresolvedSearchText('Vollkomen falscher Text', '', false), true)
})

test('isUnresolvedSearchText: Teiltext (noch nicht zu Ende getippt) blockiert ebenfalls', () => {
  assert.equal(isUnresolvedSearchText('Böhmische Bl', '', false), true)
})

test('isUnresolvedSearchText: bewusst geleerter Rang (leerer Text, keine ID) ist gueltig', () => {
  assert.equal(isUnresolvedSearchText('', '', false), false)
})

test('isUnresolvedSearchText: nur Leerzeichen gilt wie leerer Text -- gueltig', () => {
  assert.equal(isUnresolvedSearchText('   ', '', false), false)
})

test('isUnresolvedSearchText: exakt gewaehlter Katalogeintrag (Text + aufgeloeste ID) ist gueltig', () => {
  assert.equal(isUnresolvedSearchText('Böhmische Blasmusik', 's1', false), false)
})

test('isUnresolvedSearchText: bereits als Bestandskonflikt erkannter Rang wird hier nicht doppelt gemeldet', () => {
  assert.equal(isUnresolvedSearchText('Alter, nicht mehr aktiver Eintrag', '', true), false)
})
