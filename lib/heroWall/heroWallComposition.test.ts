import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  HERO_WALL_TRACK_COUNT,
  HERO_WALL_IMAGES_PER_TRACK,
  HERO_WALL_SLOT_COUNT,
  HERO_WALL_CANONICAL_SLOT_COUNT,
  buildHeroWallTracks,
  countUsedHeroWallSlots,
} from './heroWallComposition.ts'

test('Konstanten: Desktop 5 Tracks x 4 = 20 Bildplaetze, definiert die kanonische Obergrenze', () => {
  assert.equal(HERO_WALL_TRACK_COUNT.desktop, 5)
  assert.equal(HERO_WALL_IMAGES_PER_TRACK.desktop, 4)
  assert.equal(HERO_WALL_SLOT_COUNT.desktop, 20)
  assert.equal(HERO_WALL_CANONICAL_SLOT_COUNT, 20)
})

test('kleinere Breakpoints sind ein Prefix der Desktop-Slotzahl (Ausblenden statt Neu-Zuordnung)', () => {
  assert.ok(HERO_WALL_SLOT_COUNT.mobile < HERO_WALL_SLOT_COUNT.tablet)
  assert.ok(HERO_WALL_SLOT_COUNT.tablet <= HERO_WALL_SLOT_COUNT.tabletWide)
  assert.ok(HERO_WALL_SLOT_COUNT.tabletWide < HERO_WALL_SLOT_COUNT.desktop)
})

test('buildHeroWallTracks: Bildplatz n erhaelt Poolbild n (direkte 1:1-Zuordnung, kontinuierlich pro Track)', () => {
  const pool = Array.from({ length: 20 }, (_, i) => `img-${i}`)
  const tracks = buildHeroWallTracks(pool, 'desktop')
  assert.equal(tracks.length, 5)
  tracks.forEach((track, t) => {
    assert.equal(track.length, 4)
    track.forEach((slot, p) => {
      const expectedIndex = t * 4 + p
      assert.equal(slot.index, expectedIndex)
      assert.equal(slot.image, `img-${expectedIndex}`)
    })
  })
})

test('buildHeroWallTracks: dieselbe Zuordnung auf jedem Breakpoint -- Bildplatz n zeigt ueberall dasselbe Poolbild n, nur weniger Plaetze auf kleineren Screens', () => {
  const pool = Array.from({ length: 20 }, (_, i) => `img-${i}`)
  const desktop = buildHeroWallTracks(pool, 'desktop').flat()
  const tabletWide = buildHeroWallTracks(pool, 'tabletWide').flat()
  const tablet = buildHeroWallTracks(pool, 'tablet').flat()
  const mobile = buildHeroWallTracks(pool, 'mobile').flat()

  for (const slot of mobile) {
    const match = desktop.find((s) => s.index === slot.index)
    assert.equal(slot.image, match?.image, `Bildplatz ${slot.index} muss auf mobile und desktop dasselbe Bild zeigen`)
  }
  for (const slot of tablet) {
    const match = desktop.find((s) => s.index === slot.index)
    assert.equal(slot.image, match?.image)
  }
  for (const slot of tabletWide) {
    const match = desktop.find((s) => s.index === slot.index)
    assert.equal(slot.image, match?.image)
  }
})

test('buildHeroWallTracks: kein Modulo-Wrap, keine Wiederholung -- fehlende Poolbilder ergeben null (Platzhalter)', () => {
  const pool = ['a', 'b', 'c']
  const tracks = buildHeroWallTracks(pool, 'mobile')
  const flat = tracks.flat()
  assert.equal(flat.length, 6, 'mobile hat 6 Bildplaetze (3 Tracks x 2)')
  assert.deepEqual(
    flat.map((s) => s.image),
    ['a', 'b', 'c', null, null, null]
  )
  // Keine Wiederholung: jedes vorhandene Bild kommt hoechstens einmal vor.
  const nonNull = flat.map((s) => s.image).filter((img): img is string => img !== null)
  assert.equal(new Set(nonNull).size, nonNull.length)
})

test('buildHeroWallTracks: leerer Pool ergibt ausschliesslich Platzhalter, kein Fehler', () => {
  const tracks = buildHeroWallTracks([], 'desktop')
  assert.equal(tracks.flat().length, 20)
  assert.ok(tracks.flat().every((s) => s.image === null))
})

test('buildHeroWallTracks: ueberzaehlige Poolbilder ueber die kanonische Obergrenze hinaus werden nicht verwendet', () => {
  const pool = Array.from({ length: 30 }, (_, i) => `img-${i}`)
  const tracks = buildHeroWallTracks(pool, 'desktop')
  assert.equal(tracks.flat().length, 20)
  assert.equal(tracks.flat().at(-1)?.image, 'img-19')
})

test('countUsedHeroWallSlots: meldet transparent genutzte/ungenutzte Bildplaetze fuer den Admin-Editor (Default: Desktop)', () => {
  assert.deepEqual(countUsedHeroWallSlots(0), { used: 0, total: 20, unused: 0 })
  assert.deepEqual(countUsedHeroWallSlots(14), { used: 14, total: 20, unused: 0 })
  assert.deepEqual(countUsedHeroWallSlots(20), { used: 20, total: 20, unused: 0 })
  assert.deepEqual(countUsedHeroWallSlots(30), { used: 20, total: 20, unused: 10 })
})

test('countUsedHeroWallSlots: mit explizitem Breakpoint fuer den Admin-Vorschau-Umschalter -- Beispiel aus dem Auftrag ("29 ausgewaehlt - 20 im Desktop-Hero verwendet - 9 weitere ausgewaehlt")', () => {
  assert.deepEqual(countUsedHeroWallSlots(29, 'mobile'), { used: 6, total: 6, unused: 23 })
  assert.deepEqual(countUsedHeroWallSlots(29, 'tablet'), { used: 9, total: 9, unused: 20 })
  assert.deepEqual(countUsedHeroWallSlots(29, 'desktop'), { used: 20, total: 20, unused: 9 })
})
