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

test('buildHeroWallTracks: Round-Robin -- Spur t/Zeile r erhaelt Poolindex (r * Spurenzahl + t)', () => {
  const pool = Array.from({ length: 20 }, (_, i) => `img-${i}`)
  const tracks = buildHeroWallTracks(pool, 'desktop')
  assert.equal(tracks.length, 5)
  tracks.forEach((track, t) => {
    assert.equal(track.length, 4)
    track.forEach((slot, r) => {
      const expectedIndex = r * 5 + t
      assert.equal(slot.index, expectedIndex)
      assert.equal(slot.image, `img-${expectedIndex}`)
    })
  })
  // Konkret: Spur 0 = 0,5,10,15 -- Spur 1 = 1,6,11,16 usw. (nicht mehr
  // 0-3/4-7/... wie bei der abgeloesten Block-Zuordnung).
  assert.deepEqual(tracks[0].map((s) => s.image), ['img-0', 'img-5', 'img-10', 'img-15'])
  assert.deepEqual(tracks[1].map((s) => s.image), ['img-1', 'img-6', 'img-11', 'img-16'])
})

// Ersetzt bewusst die fruehere Invarianz "Bildplatz n zeigt ueberall
// dasselbe Poolbild n" (galt fuer die abgeloeste Block-Zuordnung) durch
// die tatsaechliche Ziel-Eigenschaft von Round-Robin: der VERWENDETE
// Poolindex-Bereich bleibt je Breakpoint ein Prefix (kein Bild taucht auf
// einem schmaleren Breakpoint auf, das nicht auch auf jedem breiteren
// erscheint), aber welcher Spur ein Index zugeordnet wird, darf sich je
// Breakpoint unterscheiden (unterschiedliche Spurenzahl: 5/4/3/3) -- exakt
// das macht die Auf-/Ab-Pfeile im Admin ueberhaupt horizontal wirksam.
test('buildHeroWallTracks: Poolindex-Prefix bleibt je Breakpoint erhalten, Spurzuordnung darf sich unterscheiden (Round-Robin, keine Block-Invarianz mehr)', () => {
  const pool = Array.from({ length: 20 }, (_, i) => `img-${i}`)
  const desktopFlat = buildHeroWallTracks(pool, 'desktop').flat()
  const tabletWideFlat = buildHeroWallTracks(pool, 'tabletWide').flat()
  const tabletFlat = buildHeroWallTracks(pool, 'tablet').flat()
  const mobileFlat = buildHeroWallTracks(pool, 'mobile').flat()

  const usedIndices = (flat: { index: number; image: string | null }[]) =>
    new Set(flat.filter((s) => s.image !== null).map((s) => s.index))

  // Prefix-Eigenschaft: mobile ⊆ tablet ⊆ tabletWide ⊆ desktop, jeweils
  // 0..N-1 ohne Luecke.
  assert.deepEqual([...usedIndices(mobileFlat)].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5])
  assert.deepEqual([...usedIndices(tabletFlat)].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8])
  assert.deepEqual([...usedIndices(tabletWideFlat)].sort((a, b) => a - b), Array.from({ length: 12 }, (_, i) => i))
  assert.deepEqual([...usedIndices(desktopFlat)].sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i))

  // Bewusst dokumentiert: Index 3 liegt bei Desktop (5 Spuren) in Spur 3,
  // bei Tablet/Mobile (3 Spuren) aber in Spur 0 -- keine Spurenkonstanz
  // ueber Breakpoints hinweg, das ist die gewollte Verhaltensaenderung.
  const desktopTracks = buildHeroWallTracks(pool, 'desktop')
  const tabletTracks = buildHeroWallTracks(pool, 'tablet')
  assert.ok(desktopTracks[3].some((s) => s.index === 3))
  assert.ok(tabletTracks[0].some((s) => s.index === 3))
})

test('buildHeroWallTracks: kein Wrap, keine Wiederholung -- fehlende Poolbilder ergeben null (Platzhalter), Round-Robin-Reihenfolge im flat()-Ergebnis', () => {
  const pool = ['a', 'b', 'c']
  const tracks = buildHeroWallTracks(pool, 'mobile')
  const flat = tracks.flat()
  assert.equal(flat.length, 6, 'mobile hat 6 Bildplaetze (3 Tracks x 2)')
  // Round-Robin: Spur0=[a,null], Spur1=[b,null], Spur2=[c,null] -- flat()
  // ist Spur-fuer-Spur, deshalb a,null,b,null,c,null (nicht mehr
  // a,b,c,null,null,null wie bei der abgeloesten Block-Zuordnung).
  assert.deepEqual(
    flat.map((s) => s.image),
    ['a', null, 'b', null, 'c', null]
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

test('buildHeroWallTracks: ueberzaehlige Poolbilder ueber die kanonische Obergrenze hinaus werden nicht verwendet (Ueberlauf)', () => {
  const pool = Array.from({ length: 30 }, (_, i) => `img-${i}`)
  const tracks = buildHeroWallTracks(pool, 'desktop')
  const flat = tracks.flat()
  assert.equal(flat.length, 20)
  const usedNumbers = flat.map((s) => Number(s.image?.replace('img-', ''))).sort((a, b) => a - b)
  assert.deepEqual(usedNumbers, Array.from({ length: 20 }, (_, i) => i), 'exakt img-0..img-19 verwendet, nichts darueber, keine Luecke')
})

test('buildHeroWallTracks: keine Duplikate ueber alle Breakpoints hinweg, jeder verwendete Poolindex erscheint genau einmal', () => {
  const pool = Array.from({ length: 22 }, (_, i) => `img-${i}`)
  for (const bp of ['mobile', 'tablet', 'tabletWide', 'desktop'] as const) {
    const flat = buildHeroWallTracks(pool, bp).flat()
    const nonNull = flat.map((s) => s.image).filter((img): img is string => img !== null)
    assert.equal(new Set(nonNull).size, nonNull.length, `${bp}: keine Duplikate erwartet`)
    const nonNullIndices = flat.filter((s) => s.image !== null).map((s) => s.index)
    assert.equal(new Set(nonNullIndices).size, nonNullIndices.length, `${bp}: kein Poolindex mehrfach vergeben`)
  }
})

test('buildHeroWallTracks: Reihenfolge innerhalb jeder Spur bleibt stabil aufsteigend nach Poolindex', () => {
  const pool = Array.from({ length: 22 }, (_, i) => `img-${i}`)
  for (const bp of ['mobile', 'tablet', 'tabletWide', 'desktop'] as const) {
    for (const track of buildHeroWallTracks(pool, bp)) {
      const indices = track.map((s) => s.index)
      const sorted = [...indices].sort((a, b) => a - b)
      assert.deepEqual(indices, sorted, `${bp}: Spur muss aufsteigend nach Poolindex sortiert sein`)
    }
  }
})

// Unterfuellung: Pool kleiner als der Bedarf des Breakpoints. Round-Robin
// verteilt den Mangel GLEICHMAESSIG ueber die Spuren (anders als die
// abgeloeste Block-Zuordnung, bei der ganze Spuren leer geblieben waeren).
test('buildHeroWallTracks: Unterfuellung verteilt sich gleichmaessig ueber die Spuren statt einzelne Spuren komplett leer zu lassen', () => {
  // 3 Bilder auf Desktop (5 Spuren): jede der ersten 3 Spuren bekommt
  // genau 1 Bild in Zeile 0, Spuren 3-4 bleiben leer (weniger Bilder als
  // Spuren -- unvermeidbar), aber KEINE Spur bekommt mehr als 1 Bild,
  // waehrend eine andere schon 0 haette.
  const pool3 = Array.from({ length: 3 }, (_, i) => `img-${i}`)
  const tracks3 = buildHeroWallTracks(pool3, 'desktop')
  assert.deepEqual(tracks3.map((t) => t.filter((s) => s.image !== null).length), [1, 1, 1, 0, 0])

  // 6 Bilder auf Desktop (5 Spuren): Index 5 wraps zurueck auf Spur 0
  // (5 mod 5 = 0) -- Spur 0 bekommt 2 Bilder (Index 0 und 5), Spuren 1-4
  // je 1 Bild. Differenz zwischen voll gefuellter und am wenigsten
  // gefuellter Spur betraegt maximal 1.
  const pool6 = Array.from({ length: 6 }, (_, i) => `img-${i}`)
  const tracks6 = buildHeroWallTracks(pool6, 'desktop')
  const filled6 = tracks6.map((t) => t.filter((s) => s.image !== null).length)
  assert.deepEqual(filled6, [2, 1, 1, 1, 1])
  assert.ok(Math.max(...filled6) - Math.min(...filled6) <= 1)

  // 7 Bilder auf Desktop: Index 5→Spur0, Index 6→Spur1 -- Spuren 0/1 je
  // 2 Bilder, Spuren 2-4 je 1 Bild -> [2,2,1,1,1].
  const pool7 = Array.from({ length: 7 }, (_, i) => `img-${i}`)
  const tracks7 = buildHeroWallTracks(pool7, 'desktop')
  const filled7 = tracks7.map((t) => t.filter((s) => s.image !== null).length)
  assert.deepEqual(filled7, [2, 2, 1, 1, 1])
  assert.ok(Math.max(...filled7) - Math.min(...filled7) <= 1)

  // Keine Wiederholung in jedem Fall.
  for (const tracks of [tracks3, tracks6, tracks7]) {
    const nonNull = tracks.flat().map((s) => s.image).filter((img): img is string => img !== null)
    assert.equal(new Set(nonNull).size, nonNull.length)
  }
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
