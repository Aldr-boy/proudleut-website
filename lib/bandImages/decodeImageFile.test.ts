import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { decodeImageFile } from './decodeImageFile.ts'

// Kleine, deterministisch zur Laufzeit erzeugte Testbilder (4x4 Pixel) --
// keine Binaerdateien im Repository. sharp erzeugt hier gleichzeitig die
// gueltigen Fixtures UND ist die Implementierung selbst; das ist bewusst
// so, weil das eigentliche Verhalten, das getestet wird (vollstaendiger
// Decode vs. Truncation-Fehler), von libvips' tatsaechlichem Parser
// abhaengt -- ein Roundtrip mit derselben Bibliothek ist hier der
// korrekte, realistische Testaufbau, kein Zirkelschluss.
const validJpeg = await sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 200, g: 50, b: 50 } } }).jpeg().toBuffer()
const validPng = await sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 50, g: 200, b: 50 } } }).png().toBuffer()
const validWebp = await sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 50, g: 50, b: 200 } } }).webp().toBuffer()

test('decodeImageFile: vollstaendiges gueltiges JPEG dekodiert erfolgreich', async () => {
  const result = await decodeImageFile(validJpeg)
  assert.equal(result.ok, true)
})

test('decodeImageFile: vollstaendiges gueltiges PNG dekodiert erfolgreich', async () => {
  const result = await decodeImageFile(validPng)
  assert.equal(result.ok, true)
})

test('decodeImageFile: vollstaendiges gueltiges WebP dekodiert erfolgreich', async () => {
  const result = await decodeImageFile(validWebp)
  assert.equal(result.ok, true)
})

test('decodeImageFile: auf ~70% abgeschnittenes JPEG (gueltiger Header, Bilddaten fehlen) schlaegt fehl', async () => {
  const truncated = validJpeg.subarray(0, Math.floor(validJpeg.length * 0.7))
  const result = await decodeImageFile(truncated)
  assert.equal(result.ok, false)
})

test('decodeImageFile: auf ~70% abgeschnittenes PNG (Chunk-Inhalt unvollstaendig) schlaegt fehl', async () => {
  const truncated = validPng.subarray(0, Math.floor(validPng.length * 0.7))
  const result = await decodeImageFile(truncated)
  assert.equal(result.ok, false)
})

test('decodeImageFile: auf ~70% abgeschnittenes WebP schlaegt fehl', async () => {
  const truncated = validWebp.subarray(0, Math.floor(validWebp.length * 0.7))
  const result = await decodeImageFile(truncated)
  assert.equal(result.ok, false)
})

test('decodeImageFile: nur JPEG-Header (erste 20 Bytes, keine Bilddaten) schlaegt fehl', async () => {
  const result = await decodeImageFile(validJpeg.subarray(0, 20))
  assert.equal(result.ok, false)
})

test('decodeImageFile: nur PNG-Signatur + IHDR (33 Bytes, kein IDAT-Inhalt) schlaegt fehl', async () => {
  const result = await decodeImageFile(validPng.subarray(0, 33))
  assert.equal(result.ok, false)
})

test('decodeImageFile: nur RIFF-/WEBP-Header (12 Bytes) schlaegt fehl', async () => {
  const result = await decodeImageFile(validWebp.subarray(0, 12))
  assert.equal(result.ok, false)
})

test('decodeImageFile: leerer Buffer schlaegt fehl, statt eine Ausnahme zu werfen', async () => {
  const result = await decodeImageFile(new Uint8Array(0))
  assert.equal(result.ok, false)
})

test('decodeImageFile: liefert bei Fehlschlag eine Fehlermeldung fuer server-seitiges Logging', async () => {
  const result = await decodeImageFile(validJpeg.subarray(0, 20))
  assert.equal(result.ok, false)
  assert.ok(!result.ok && typeof result.error === 'string' && result.error.length > 0)
})
