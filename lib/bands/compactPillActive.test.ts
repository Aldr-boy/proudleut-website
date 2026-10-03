import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bottomBarActive, compactPillActive } from './compactPillActive.ts'

// Wertetabelle: barVisible x wide x hasHeroButton x headPassed
type Row = { barVisible: boolean; wide: boolean; hasHeroButton: boolean; headPassed: boolean; compact: boolean; bottom: boolean }
const rows: Row[] = []
for (const barVisible of [false, true]) for (const wide of [false, true]) for (const hasHeroButton of [false, true]) for (const headPassed of [false, true]) {
  rows.push({
    barVisible, wide, hasHeroButton, headPassed,
    compact: barVisible && wide && (hasHeroButton || headPassed),
    bottom: barVisible && !wide,
  })
}

for (const r of rows) {
  test(`barVisible=${r.barVisible} wide=${r.wide} heroButton=${r.hasHeroButton} kopfDrueben=${r.headPassed} -> kompakt ${r.compact}, Bottom-Bar ${r.bottom}`, () => {
    assert.equal(compactPillActive(r), r.compact)
    assert.equal(bottomBarActive(r), r.bottom)
  })
}

test('nie sind kompakte Pille und Bottom-Bar gleichzeitig aktiv', () => {
  for (const r of rows) assert.ok(!(compactPillActive(r) && bottomBarActive(r)))
})

test('Band mit Hero-Button: breit und Leiste an -> kompakte Pille, unabhaengig vom Kopf', () => {
  assert.equal(compactPillActive({ barVisible: true, wide: true, hasHeroButton: true, headPassed: false }), true)
})

test('Band ohne Hero-Button, breit: normale Pille, bis der kurze Kopf aus dem Bild ist; die Bottom-Bar ist dort nicht aktiv', () => {
  const vorher = { barVisible: true, wide: true, hasHeroButton: false, headPassed: false }
  assert.equal(compactPillActive(vorher), false)
  assert.equal(bottomBarActive(vorher), false)
  assert.equal(compactPillActive({ ...vorher, headPassed: true }), true)
})

test('schmal: nur die Bottom-Bar, nie die kompakte Pille', () => {
  assert.equal(compactPillActive({ barVisible: true, wide: false, hasHeroButton: true, headPassed: true }), false)
  assert.equal(bottomBarActive({ barVisible: true, wide: false }), true)
})
