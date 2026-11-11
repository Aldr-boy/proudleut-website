import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extendHeroWallPool, HERO_WALL_EXTRA_IMAGES, HERO_MOTIF_GROUP_BY_ID } from './heroWallExtras.ts'

// Echte Pool-IDs (Stand Auftrag), in Poolreihenfolge.
const POOL_IDS = [
  'd3985920-eff1-4c05-ad88-6c12d0df917a',
  '8452972d-5782-47c4-bb04-6c9b729c4cdc',
  'd953ee02-3459-4952-af37-f8013c35e1a9',
  'e97828b4-8627-425b-a4fb-9d779e5ef5a0',
  '2d336543-2be4-471c-a005-2d8bdd3192cd',
  'fbb4b8ff-b7f5-4038-bafc-314f0e50b0a0',
  '56f65522-ac42-4c6c-987b-b4c2f112636d',
  '8f8d394d-0826-4fd1-8a32-2028aee704a2',
  'ffd7da93-4de4-4d6c-99a8-b961e1eab65a',
  '0290ce93-ed6e-4ffc-b019-e3a70da7fb5e',
  '5a671bde-a840-434e-9a80-759d99b9dbad',
  'f2cb97be-5abd-4877-ad5e-68ae1f706b8c',
  'fc0a5568-bb6b-4ea8-8e25-0c1ea2e451d5',
  'a6057943-fb89-4457-9934-9ec5fa34e72d',
  '2f109928-b4b1-424a-aa8c-c714fc441903',
  '7341f362-ee22-4f27-80a4-1500a10adba5',
  'd9e8c8e8-9b71-43ee-a26c-b2ac112fefdc',
  '000e167e-f6f1-45bb-88c6-82133875cada',
  '4cf18045-592f-4ef7-b59c-6b07969ee177',
]
const pool = POOL_IDS.map((id) => ({ id }))
const extras = HERO_WALL_EXTRA_IMAGES.map((e) => ({ id: e.id }))
const TRACKS = 8
const PER_TRACK = 5
const out = extendHeroWallPool(pool, extras, TRACKS * PER_TRACK)
const pos = (s: number) => ({ t: Math.floor(s / PER_TRACK), p: s % PER_TRACK })
const dist = (a: number, b: number) => Math.hypot(pos(a).t - pos(b).t, pos(a).p - pos(b).p)
const heavy = (id: string) => HERO_MOTIF_GROUP_BY_ID[id] === 'publikum' || HERO_MOTIF_GROUP_BY_ID[id] === 'buehne'

test('jedes Pool- und Zusatzfoto hat eine Motivgruppe', () => {
  for (const x of [...pool, ...extras]) assert.ok(HERO_MOTIF_GROUP_BY_ID[x.id], x.id)
})

test('fuellt alle 40 Bildplaetze, ohne Luecke', () => {
  assert.equal(out.length, 40)
  assert.ok(out.every((x) => x && x.id))
})

test('Platz 0 und Platz 5 behalten Poolbild 0 bzw. 5 (Preload-Links der Startseite)', () => {
  assert.equal(out[0].id, pool[0].id)
  assert.equal(out[5].id, pool[5].id)
})

test('alle fuenf Zusatzfotos und alle Poolbilder kommen vor', () => {
  const ids = new Set(out.map((x) => x.id))
  for (const x of [...pool, ...extras]) assert.ok(ids.has(x.id), x.id)
})

test('dasselbe Foto liegt nie neben sich selbst (auch nicht diagonal)', () => {
  for (let i = 0; i < out.length; i++)
    for (let j = i + 1; j < out.length; j++)
      if (dist(i, j) < 1.5) assert.notEqual(out[i].id, out[j].id, `Platz ${i} und ${j}`)
})

test('Wiederholungen liegen weiter auseinander als zuvor (mindestens 4,1 Plaetze Abstand)', () => {
  let min = Infinity
  for (let i = 0; i < out.length; i++)
    for (let j = i + 1; j < out.length; j++) if (out[i].id === out[j].id) min = Math.min(min, dist(i, j))
  assert.ok(min >= 4.1, `kleinster Abstand gleicher Fotos: ${min}`)
})

test('Publikums-/Buehnenbilder beruehren sich nie, auch nicht diagonal', () => {
  for (let i = 0; i < out.length; i++)
    for (let j = i + 1; j < out.length; j++)
      if (dist(i, j) < 1.5) assert.ok(!(heavy(out[i].id) && heavy(out[j].id)), `Platz ${i} und ${j}`)
})

test('Publikums-/Buehnenbilder stehen jeweils nur einmal (12 Fotos auf 12 Plaetzen)', () => {
  const ids = out.filter((x) => heavy(x.id)).map((x) => x.id)
  assert.equal(ids.length, 12)
  assert.equal(new Set(ids).size, 12)
})

test('leichte Bilder werden gleichmaessig wiederholt (jedes 2- oder 3-mal)', () => {
  const counts = new Map<string, number>()
  for (const x of out) if (!heavy(x.id)) counts.set(x.id, (counts.get(x.id) ?? 0) + 1)
  for (const [id, c] of counts) assert.ok(c >= 2 && c <= 3, `${id}: ${c}`)
})

test('Ergebnis ist deterministisch', () => {
  assert.deepEqual(extendHeroWallPool(pool, extras, 40), out)
})

test('kleiner/leerer Pool: kein Absturz, keine Luecken', () => {
  assert.deepEqual(extendHeroWallPool([], [], 40), [])
  const tiny = extendHeroWallPool([{ id: 'x' }], [], 40)
  assert.equal(tiny.length, 40)
  assert.ok(tiny.every((v) => v && v.id === 'x'))
})

// ---- Handy-Auswahl ----
import { mobileHeroWallImages } from './heroWallExtras.ts'

test('Handy: genau 6 Bilder, keine Duplikate, keine Luecken', () => {
  const m = mobileHeroWallImages(pool)
  assert.equal(m.length, 6)
  assert.equal(new Set(m.map((x) => x.id)).size, 6)
})

test('Handy: Publikums-/Buehnenbilder beruehren sich nie (2 Spuren x 3 Plaetze, auch diagonal)', () => {
  const m = mobileHeroWallImages(pool)
  const at = (s: number) => ({ t: Math.floor(s / 3), p: s % 3 })
  for (let i = 0; i < 6; i++)
    for (let j = i + 1; j < 6; j++) {
      const near = Math.abs(at(i).t - at(j).t) <= 1 && Math.abs(at(i).p - at(j).p) <= 1
      if (near) assert.ok(!(heavy(m[i].id) && heavy(m[j].id)), `Platz ${i}/${j}`)
    }
})

test('Handy: fehlt ein gewaehltes Bild im Pool, wird mit unbenutztem Poolbild aufgefuellt (nie leer, nie doppelt)', () => {
  const reduced = pool.filter((x) => x.id !== '8452972d-5782-47c4-bb04-6c9b729c4cdc')
  const m = mobileHeroWallImages(reduced)
  assert.equal(m.length, 6)
  assert.equal(new Set(m.map((x) => x.id)).size, 6)
  assert.deepEqual(mobileHeroWallImages([]), [])
})
