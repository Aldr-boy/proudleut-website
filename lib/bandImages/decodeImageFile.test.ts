import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { decodeImageFile, MAX_BAND_IMAGE_PIXELS } from './decodeImageFile.ts'

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

test('decodeImageFile: Truncation-Fehler werden als reason=decode_failed klassifiziert (nicht too_many_pixels)', async () => {
  const result = await decodeImageFile(validJpeg.subarray(0, 20))
  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.reason, 'decode_failed')
})

// ============================================================
// Pixelgrenze (Codex-Korrekturblock 4, P2): das 4-MB-Dateilimit begrenzt
// nur die komprimierte Eingabedatei, nicht den dekodierten Rohpixel-
// puffer. Ein stark komprimiertes, aber gueltiges, grossflaechig
// einfarbiges PNG bleibt winzig (~90 KB), enthaelt aber sehr viele
// Pixel -- genau der Fall, den MAX_BAND_IMAGE_PIXELS verhindern soll.
// Alle Fixtures werden zur Laufzeit von sharp selbst erzeugt (keine
// Binaerdatei im Repository).
// ============================================================

test('MAX_BAND_IMAGE_PIXELS ist exakt 25 Megapixel', () => {
  assert.equal(MAX_BAND_IMAGE_PIXELS, 25_000_000)
})

test('decodeImageFile: 4000x4000 (16.000.000 Pixel, deutlich unter der Grenze) wird vollstaendig dekodiert', async () => {
  const underLimit = await sharp({ create: { width: 4000, height: 4000, channels: 3, background: { r: 30, g: 30, b: 30 } } })
    .png({ compressionLevel: 9 })
    .toBuffer()
  assert.ok(underLimit.length < 4 * 1024 * 1024, 'Fixture muss unter 4 MB bleiben')

  const result = await decodeImageFile(underLimit)
  assert.equal(result.ok, true)
})

test('decodeImageFile: 5000x5000 (exakt 25.000.000 Pixel, Grenzwert inklusive) wird noch akzeptiert', async () => {
  const exactLimit = await sharp({ create: { width: 5000, height: 5000, channels: 3, background: { r: 40, g: 40, b: 40 } } })
    .png({ compressionLevel: 9 })
    .toBuffer()
  assert.ok(exactLimit.length < 4 * 1024 * 1024, 'Fixture muss unter 4 MB bleiben')

  const result = await decodeImageFile(exactLimit)
  assert.equal(result.ok, true)
})

test('decodeImageFile: 5000x5001 (25.005.000 Pixel, knapp ueber der Grenze) wird abgelehnt', async () => {
  const justOver = await sharp({ create: { width: 5000, height: 5001, channels: 3, background: { r: 45, g: 45, b: 45 } } })
    .png({ compressionLevel: 9 })
    .toBuffer()
  assert.ok(justOver.length < 4 * 1024 * 1024, 'Fixture muss unter 4 MB bleiben')

  const result = await decodeImageFile(justOver)
  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.reason, 'too_many_pixels')
})

test('decodeImageFile: 6000x5000 (30.000.000 Pixel, gueltiges, stark komprimiertes PNG unter 4 MB) wird kontrolliert abgelehnt, bevor ein grosser Raw-Puffer entsteht', async () => {
  const hugePixelPng = await sharp({ create: { width: 6000, height: 5000, channels: 3, background: { r: 10, g: 10, b: 10 } } })
    .png({ compressionLevel: 9 })
    .toBuffer()

  // Verbindlich nachzuweisen: komprimierte Groesse < 4 MB, deklarierte
  // Pixelzahl > MAX_BAND_IMAGE_PIXELS -- die Ablehnung erfolgt also wegen
  // der Pixelgrenze, nicht wegen Dateigroesse, Signatur oder Truncation.
  assert.ok(hugePixelPng.length < 4 * 1024 * 1024, `Testdatei muss unter 4 MB bleiben, ist aber ${hugePixelPng.length} Bytes`)
  const declaredPixels = 6000 * 5000
  assert.ok(declaredPixels > MAX_BAND_IMAGE_PIXELS, 'Testbild muss ueber der Pixelgrenze liegen')

  const t0 = Date.now()
  const result = await decodeImageFile(hugePixelPng)
  const elapsedMs = Date.now() - t0

  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.reason, 'too_many_pixels')
  assert.ok(!result.ok && result.error.includes('exceeds pixel limit'), 'Fehlermeldung muss den nativen Pixel-Limit-Marker enthalten')
  // Eine tatsaechliche volle Rohpixel-Allokation fuer 30 Millionen Pixel
  // (x3 Kanaele = ~90 MB) waere spuerbar langsamer als dieser Grenzwert --
  // die schnelle Ablehnung ist ein zusaetzliches Indiz, dass die
  // Ablehnung VOR der grossen Allokation erfolgt, nicht danach.
  assert.ok(elapsedMs < 2000, `Ablehnung muss schnell erfolgen (kein grosser Raw-Decode-Versuch), war aber ${elapsedMs}ms`)
})

test('decodeImageFile: fehlende/ungueltige Dimensionsmetadaten werden fail-closed als decode_failed behandelt', async () => {
  // Kein echtes Bild -- keine Metadaten lesbar, daher weder ok noch
  // too_many_pixels, sondern der generische Decode-Fehler.
  const result = await decodeImageFile(new TextEncoder().encode('kein-bild'))
  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.reason, 'decode_failed')
})
