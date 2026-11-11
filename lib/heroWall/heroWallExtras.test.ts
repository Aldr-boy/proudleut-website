import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extendHeroWallPool, HERO_WALL_EXTRA_IMAGES } from './heroWallExtras.ts'

const pool = Array.from({ length: 19 }, (_, i) => ({ id: `p${i}` }))
const extras = HERO_WALL_EXTRA_IMAGES.map((e) => ({ id: e.id }))

test('fuellt alle 40 Bildplaetze, ohne Luecke', () => {
  const out = extendHeroWallPool(pool, extras, 40)
  assert.equal(out.length, 40)
  assert.ok(out.every((x) => x && x.id))
})

test('Praefix (12 Plaetze, genutzt von Handy/Tablet) bleibt unveraendert', () => {
  const out = extendHeroWallPool(pool, extras, 40)
  assert.deepEqual(out.slice(0, 12), pool.slice(0, 12))
})

test('alle fuenf Zusatzfotos und alle Poolbilder kommen vor', () => {
  const ids = new Set(extendHeroWallPool(pool, extras, 40).map((x) => x.id))
  for (const e of extras) assert.ok(ids.has(e.id), e.id)
  for (const p of pool) assert.ok(ids.has(p.id), p.id)
})

test('dasselbe Foto liegt nie direkt neben sich selbst (gleiche Spalte +/-1, Nachbarspalte +/-5, Diagonalen +/-4/6)', () => {
  const out = extendHeroWallPool(pool, extras, 40)
  for (let i = 0; i < out.length; i++) {
    for (const d of [1, 4, 5, 6]) {
      if (i + d < out.length) assert.notEqual(out[i].id, out[i + d].id, `Slot ${i} und ${i + d}`)
    }
  }
})

test('Wiederholung liegt moeglichst weit entfernt (Abstand = Laenge der Basisliste)', () => {
  const out = extendHeroWallPool(pool, extras, 40)
  const first = out.findIndex((x) => x.id === out[0].id)
  const second = out.findIndex((x, i) => i > first && x.id === out[first].id)
  assert.equal(second - first, 24)
})
