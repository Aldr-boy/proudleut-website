import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chunkMobilePairs, desktopGalleryComposition, quadrantSplit } from './bandGalleryLayout.ts'

// ── desktopGalleryComposition ────────────────────────────────────────
// Auftrag 4.2 / Design-Soll 2d: feste Komposition je Bildanzahl.

test('desktopGalleryComposition: 0 Bilder -> null (Section entfaellt)', () => {
  assert.equal(desktopGalleryComposition(0), null)
})

test('desktopGalleryComposition: 1 Bild -> single', () => {
  assert.equal(desktopGalleryComposition(1), 'single')
})

test('desktopGalleryComposition: 2 Bilder -> pair (Leitbild + Begleiter)', () => {
  assert.equal(desktopGalleryComposition(2), 'pair')
})

test('desktopGalleryComposition: 3 Bilder -> leitbild-column (Leitbild + Spalte)', () => {
  assert.equal(desktopGalleryComposition(3), 'leitbild-column')
})

test('desktopGalleryComposition: 4 Bilder -> leitbild-row (Leitbild + Zeile unten)', () => {
  assert.equal(desktopGalleryComposition(4), 'leitbild-row')
})

test('desktopGalleryComposition: 5 Bilder -> quadrant', () => {
  assert.equal(desktopGalleryComposition(5), 'quadrant')
})

test('desktopGalleryComposition: 6+ Bilder bleiben quadrant (mit Fortsetzungsraster, siehe quadrantSplit)', () => {
  assert.equal(desktopGalleryComposition(6), 'quadrant')
  assert.equal(desktopGalleryComposition(12), 'quadrant')
})

// ── quadrantSplit ─────────────────────────────────────────────────────

test('quadrantSplit: bei genau 5 Bildern ist die Fortsetzung leer (kein Bild abgeschnitten, keins doppelt)', () => {
  const images = [1, 2, 3, 4, 5]
  const { leitbild, quadrant, continuation } = quadrantSplit(images)
  assert.equal(leitbild, 1)
  assert.deepEqual(quadrant, [2, 3, 4, 5])
  assert.deepEqual(continuation, [])
})

test('quadrantSplit: bei 6 Bildern landet exakt das 6. Bild in der Fortsetzung', () => {
  const images = [1, 2, 3, 4, 5, 6]
  const { quadrant, continuation } = quadrantSplit(images)
  assert.deepEqual(quadrant, [2, 3, 4, 5])
  assert.deepEqual(continuation, [6])
})

test('quadrantSplit: bei vielen Bildern bleibt jedes Bild genau einmal erhalten (kein Content-Verlust)', () => {
  const images = Array.from({ length: 11 }, (_, i) => i)
  const { leitbild, quadrant, continuation } = quadrantSplit(images)
  const all = [leitbild, ...quadrant, ...continuation]
  assert.deepEqual(all, images)
})

// ── chunkMobilePairs ──────────────────────────────────────────────────

test('chunkMobilePairs: leere Liste (genau 1 Bild insgesamt -- nur Leitbild) ergibt keine Gruppen', () => {
  assert.deepEqual(chunkMobilePairs([]), [])
})

test('chunkMobilePairs: gerade Anzahl ergibt vollstaendige 2er-Gruppen', () => {
  assert.deepEqual(chunkMobilePairs([1, 2, 3, 4]), [[1, 2], [3, 4]])
})

test('chunkMobilePairs: ungerade Anzahl -- letzte Gruppe hat genau 1 Bild (rendert dann voller Breite)', () => {
  assert.deepEqual(chunkMobilePairs([1, 2, 3]), [[1, 2], [3]])
})

test('chunkMobilePairs: einzelnes Restbild (2 Bilder insgesamt) ergibt eine Einzelgruppe', () => {
  assert.deepEqual(chunkMobilePairs([1]), [[1]])
})

test('chunkMobilePairs: kein Bild geht verloren, unabhaengig von der Anzahl', () => {
  const rest = Array.from({ length: 9 }, (_, i) => i)
  const pairs = chunkMobilePairs(rest)
  assert.deepEqual(pairs.flat(), rest)
})
