import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { detectImageType, validateBandImageFile, MAX_BAND_IMAGE_BYTES } from './validateImageFile.ts'

const JPEG_HEADER = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const PNG_HEADER = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
const WEBP_HEADER = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, // RIFF
  0x00, 0x00, 0x00, 0x00, // size (irrelevant fuer die Erkennung)
  0x57, 0x45, 0x42, 0x50, // WEBP
])

function padded(header: Uint8Array, totalLength: number): Uint8Array {
  const buf = new Uint8Array(totalLength)
  buf.set(header, 0)
  return buf
}

// Kleine, deterministisch zur Laufzeit erzeugte, ECHTE Bilder (4x4 Pixel)
// -- keine Binaerdateien im Repository. Notwendig seit dem vollstaendigen
// Decode-Schritt: die alten nur-Header-plus-Nullen-Fixtures (padded(...))
// sind keine echten Bilder mehr und wuerden am neuen Decode-Schritt
// scheitern -- fuer "wird akzeptiert"-Faelle braucht es jetzt echte,
// vollstaendig dekodierbare Dateien.
const validJpeg = await sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 200, g: 50, b: 50 } } }).jpeg().toBuffer()
const validPng = await sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 50, g: 200, b: 50 } } }).png().toBuffer()
const validWebp = await sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 50, g: 50, b: 200 } } }).webp().toBuffer()

test('detectImageType: erkennt JPEG anhand der Magic Bytes', () => {
  assert.deepEqual(detectImageType(JPEG_HEADER), { ext: 'jpg', contentType: 'image/jpeg' })
})

test('detectImageType: erkennt PNG anhand der Magic Bytes', () => {
  assert.deepEqual(detectImageType(PNG_HEADER), { ext: 'png', contentType: 'image/png' })
})

test('detectImageType: erkennt WebP anhand der RIFF/WEBP-Signatur', () => {
  assert.deepEqual(detectImageType(WEBP_HEADER), { ext: 'webp', contentType: 'image/webp' })
})

test('detectImageType: unbekannte Signatur liefert null', () => {
  assert.equal(detectImageType(Uint8Array.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07])), null)
})

test('detectImageType: zu kurze Datei liefert null statt Ausnahme', () => {
  assert.equal(detectImageType(Uint8Array.from([0xff])), null)
  assert.equal(detectImageType(new Uint8Array(0)), null)
})

test('detectImageType: falsche Dateiendung mit ungueltigem Inhalt (Text als "bild.jpg") wird nicht als Bild erkannt', () => {
  const fakeText = new TextEncoder().encode('das ist keine Bilddatei, nur Text')
  assert.equal(detectImageType(fakeText), null)
})

test('MAX_BAND_IMAGE_BYTES ist exakt 4 MB', () => {
  assert.equal(MAX_BAND_IMAGE_BYTES, 4 * 1024 * 1024)
})

// ============================================================
// Gueltige, vollstaendig dekodierbare Dateien
// ============================================================

test('validateBandImageFile: vollstaendiges gueltiges JPEG wird akzeptiert, Typ/Content-Type korrekt erkannt', async () => {
  const result = await validateBandImageFile(validJpeg)
  assert.equal(result.ok, true)
  assert.equal(result.ok && result.ext, 'jpg')
  assert.equal(result.ok && result.contentType, 'image/jpeg')
})

test('validateBandImageFile: vollstaendiges gueltiges PNG wird akzeptiert, Typ/Content-Type korrekt erkannt', async () => {
  const result = await validateBandImageFile(validPng)
  assert.equal(result.ok, true)
  assert.equal(result.ok && result.ext, 'png')
  assert.equal(result.ok && result.contentType, 'image/png')
})

test('validateBandImageFile: vollstaendiges gueltiges WebP wird akzeptiert, Typ/Content-Type korrekt erkannt', async () => {
  const result = await validateBandImageFile(validWebp)
  assert.equal(result.ok, true)
  assert.equal(result.ok && result.ext, 'webp')
  assert.equal(result.ok && result.contentType, 'image/webp')
})

// Hinweis zu Dimensions-/Seitenverhaeltnispruefung: lib/bandImages
// enthaelt aktuell KEINE Dimensions- oder Seitenverhaeltnisregel (Grep
// bestaetigt) -- es gibt daher nichts Bestehendes, das hier zu erhalten
// oder zu testen waere. Dieser Kommentar dokumentiert die Abwesenheit
// bewusst, statt stillschweigend daran vorbeizugehen.

// ============================================================
// Groessen-Grenzwert -- Verhalten unveraendert, jetzt bewusst vom neuen
// Decode-Schritt unterschieden: die alten Fixtures sind keine echten
// Bilder mehr, daher wird hier gezielt gegen 'too_large' (nicht mehr
// gegen 'ok') geprueft, um zu zeigen, dass die Groessenpruefung selbst
// unveraendert ist und weiterhin VOR dem Decode-Schritt entscheidet.
// ============================================================

test('validateBandImageFile: Datei knapp unter 4 MB wird NICHT wegen ihrer Groesse abgelehnt (Groessen-Check besteht weiterhin; Ablehnung kommt hier vom neuen Decode-Schritt, nicht von der Groesse)', async () => {
  const justUnder = padded(JPEG_HEADER, MAX_BAND_IMAGE_BYTES - 1)
  const result = await validateBandImageFile(justUnder)
  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.errorCode, 'invalid_image')
})

test('validateBandImageFile: Datei mit exakt 4 MB wird NICHT wegen ihrer Groesse abgelehnt (Grenzwert bleibt inklusive)', async () => {
  const exact = padded(JPEG_HEADER, MAX_BAND_IMAGE_BYTES)
  const result = await validateBandImageFile(exact)
  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.errorCode, 'invalid_image')
})

test('validateBandImageFile: Datei knapp ueber 4 MB wird mit too_large abgelehnt, bevor ueberhaupt dekodiert wird', async () => {
  const justOver = padded(JPEG_HEADER, MAX_BAND_IMAGE_BYTES + 1)
  const result = await validateBandImageFile(justOver)
  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.errorCode, 'too_large')
})

// ============================================================
// Leere Datei, falscher Dateityp -- unveraendert
// ============================================================

test('validateBandImageFile: leere Datei wird abgelehnt', async () => {
  const result = await validateBandImageFile(new Uint8Array(0))
  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.errorCode, 'empty')
})

test('validateBandImageFile: nicht erlaubter Dateityp (z. B. GIF-Signatur) wird abgelehnt', async () => {
  const gifHeader = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  const result = await validateBandImageFile(padded(gifHeader, 100))
  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.errorCode, 'invalid_type')
})

test('validateBandImageFile: Textdatei mit vorgetaeuschter .jpg-Endung (nur ueber Dateinamen, nicht hier geprueft) wird ueber Inhalt abgelehnt', async () => {
  const fakeText = new TextEncoder().encode('kein-echtes-bild-nur-text-mit-jpg-endung-vorgetaeuscht')
  const result = await validateBandImageFile(fakeText)
  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.errorCode, 'invalid_type')
})

// ============================================================
// Beschaedigte/abgeschnittene Dateien mit gueltiger Signatur -- der
// eigentliche Zweck des neuen Decode-Schritts. Alle muessen mit dem
// neuen Fehlercode 'invalid_image' abgelehnt werden (gueltige Magic
// Bytes, aber nicht vollstaendig dekodierbar).
// ============================================================

test('validateBandImageFile: nur drei JPEG-Magic-Bytes (FF D8 FF, keine Bilddaten) wird abgelehnt', async () => {
  const result = await validateBandImageFile(Uint8Array.from([0xff, 0xd8, 0xff]))
  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.errorCode, 'invalid_image')
})

test('validateBandImageFile: gueltig beginnendes, auf ~70% abgeschnittenes JPEG wird abgelehnt', async () => {
  const truncated = validJpeg.subarray(0, Math.floor(validJpeg.length * 0.7))
  const result = await validateBandImageFile(truncated)
  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.errorCode, 'invalid_image')
})

test('validateBandImageFile: nur PNG-Signatur (8 Bytes, keine Chunks) wird abgelehnt', async () => {
  const result = await validateBandImageFile(validPng.subarray(0, 8))
  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.errorCode, 'invalid_image')
})

test('validateBandImageFile: PNG mit abgeschnittenem/beschaedigtem Chunk-Inhalt (auf ~70% gekuerzt) wird abgelehnt', async () => {
  const truncated = validPng.subarray(0, Math.floor(validPng.length * 0.7))
  const result = await validateBandImageFile(truncated)
  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.errorCode, 'invalid_image')
})

test('validateBandImageFile: nur RIFF-/WEBP-Header (12 Bytes, keine Bilddaten) wird abgelehnt', async () => {
  const result = await validateBandImageFile(validWebp.subarray(0, 12))
  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.errorCode, 'invalid_image')
})

test('validateBandImageFile: auf ~70% abgeschnittenes WebP wird abgelehnt', async () => {
  const truncated = validWebp.subarray(0, Math.floor(validWebp.length * 0.7))
  const result = await validateBandImageFile(truncated)
  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.errorCode, 'invalid_image')
})

// ============================================================
// Pixelgrenze (Codex-Korrekturblock 4, P2): Ende-zu-Ende-Nachweis, dass
// ein gueltiges, aber zu hoch aufgeloestes Bild ueber den vollen
// validateBandImageFile-Pfad (nicht nur die decodeImageFile-Einheit) mit
// dem eigenen, stabilen Fehlercode too_many_pixels abgelehnt wird.
// ============================================================

test('validateBandImageFile: gueltiges, stark komprimiertes PNG ueber 25 Megapixeln und unter 4 MB wird mit too_many_pixels abgelehnt', async () => {
  const hugePixelPng = await sharp({ create: { width: 6000, height: 5000, channels: 3, background: { r: 15, g: 15, b: 15 } } })
    .png({ compressionLevel: 9 })
    .toBuffer()
  assert.ok(hugePixelPng.length < MAX_BAND_IMAGE_BYTES, `Testdatei muss unter 4 MB bleiben, ist aber ${hugePixelPng.length} Bytes`)
  assert.ok(6000 * 5000 > 25_000_000, 'Testbild muss ueber der Pixelgrenze liegen')

  const result = await validateBandImageFile(hugePixelPng)
  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.errorCode, 'too_many_pixels')
})
