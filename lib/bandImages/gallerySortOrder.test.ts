import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_GALLERY_IMAGES,
  nextGallerySortOrder,
  swapGalleryOrder,
} from './gallerySortOrder.ts'

const BAND_ID = 'band-1'
const ROLE = 'gallery'

function row(id: string, sort_order: number) {
  return { id, band_id: BAND_ID, role: ROLE, url: `https://example.test/${id}.webp`, sort_order }
}

test('MAX_GALLERY_IMAGES ist 10', () => {
  assert.equal(MAX_GALLERY_IMAGES, 10)
})

test('nextGallerySortOrder: leere Galerie -> 1', () => {
  assert.equal(nextGallerySortOrder([]), 1)
})

test('nextGallerySortOrder: bestehende luecken-/duplikatfreie Galerie -> max + 1', () => {
  assert.equal(nextGallerySortOrder([{ sort_order: 1 }, { sort_order: 2 }, { sort_order: 3 }]), 4)
})

test('nextGallerySortOrder: robust gegen Luecken oder unsortierte Eingabe (max, nicht count)', () => {
  assert.equal(nextGallerySortOrder([{ sort_order: 5 }, { sort_order: 1 }]), 6)
})

test('swapGalleryOrder: Element in der Mitte nach oben verschieben', () => {
  const rows = [row('a', 1), row('b', 2), row('c', 3)]
  assert.deepEqual(swapGalleryOrder(rows, 'b', 'up'), [row('b', 1), row('a', 2)])
})

test('swapGalleryOrder: Element in der Mitte nach unten verschieben', () => {
  const rows = [row('a', 1), row('b', 2), row('c', 3)]
  assert.deepEqual(swapGalleryOrder(rows, 'b', 'down'), [row('b', 3), row('c', 2)])
})

test('swapGalleryOrder: fuehrt band_id, role und url unveraendert mit (fuer den Bulk-upsert() noetig)', () => {
  const rows = [row('a', 1), row('b', 2)]
  const result = swapGalleryOrder(rows, 'a', 'down')
  assert.ok(result)
  const [a, b] = result
  assert.equal(a.band_id, BAND_ID)
  assert.equal(a.role, ROLE)
  assert.equal(a.url, rows[0].url)
  assert.equal(b.band_id, BAND_ID)
  assert.equal(b.role, ROLE)
  assert.equal(b.url, rows[1].url)
})

test('swapGalleryOrder: erstes Element nach oben -> null (bereits am Rand)', () => {
  const rows = [row('a', 1), row('b', 2)]
  assert.equal(swapGalleryOrder(rows, 'a', 'up'), null)
})

test('swapGalleryOrder: letztes Element nach unten -> null (bereits am Rand)', () => {
  const rows = [row('a', 1), row('b', 2)]
  assert.equal(swapGalleryOrder(rows, 'b', 'down'), null)
})

test('swapGalleryOrder: unbekannte id -> null', () => {
  const rows = [row('a', 1), row('b', 2)]
  assert.equal(swapGalleryOrder(rows, 'does-not-exist', 'up'), null)
})

test('swapGalleryOrder: einzelnes Element -> null in beide Richtungen', () => {
  const rows = [row('a', 1)]
  assert.equal(swapGalleryOrder(rows, 'a', 'up'), null)
  assert.equal(swapGalleryOrder(rows, 'a', 'down'), null)
})

test('swapGalleryOrder: veraendert das Eingabe-Array nicht (reine Funktion)', () => {
  const rows = [row('a', 1), row('b', 2)]
  const copy = [...rows]
  swapGalleryOrder(rows, 'b', 'up')
  assert.deepEqual(rows, copy)
})
