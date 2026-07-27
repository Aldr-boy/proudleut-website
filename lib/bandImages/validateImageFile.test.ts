import { test } from 'node:test'
import assert from 'node:assert/strict'
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

test('validateBandImageFile: gueltiges JPEG wird akzeptiert', () => {
  const result = validateBandImageFile(padded(JPEG_HEADER, 100))
  assert.equal(result.ok, true)
  assert.equal(result.ok && result.ext, 'jpg')
})

test('validateBandImageFile: gueltiges PNG wird akzeptiert', () => {
  const result = validateBandImageFile(padded(PNG_HEADER, 100))
  assert.equal(result.ok, true)
  assert.equal(result.ok && result.ext, 'png')
})

test('validateBandImageFile: gueltiges WebP wird akzeptiert', () => {
  const result = validateBandImageFile(padded(WEBP_HEADER, 100))
  assert.equal(result.ok, true)
  assert.equal(result.ok && result.ext, 'webp')
})

test('validateBandImageFile: leere Datei wird abgelehnt', () => {
  const result = validateBandImageFile(new Uint8Array(0))
  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.errorCode, 'empty')
})

test('validateBandImageFile: Datei knapp unter 4 MB wird akzeptiert', () => {
  const justUnder = padded(JPEG_HEADER, MAX_BAND_IMAGE_BYTES - 1)
  const result = validateBandImageFile(justUnder)
  assert.equal(result.ok, true)
})

test('validateBandImageFile: Datei mit exakt 4 MB wird noch akzeptiert (Grenzwert inklusive)', () => {
  const exact = padded(JPEG_HEADER, MAX_BAND_IMAGE_BYTES)
  const result = validateBandImageFile(exact)
  assert.equal(result.ok, true)
})

test('validateBandImageFile: Datei knapp ueber 4 MB wird abgelehnt', () => {
  const justOver = padded(JPEG_HEADER, MAX_BAND_IMAGE_BYTES + 1)
  const result = validateBandImageFile(justOver)
  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.errorCode, 'too_large')
})

test('validateBandImageFile: nicht erlaubter Dateityp (z. B. GIF-Signatur) wird abgelehnt', () => {
  const gifHeader = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  const result = validateBandImageFile(padded(gifHeader, 100))
  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.errorCode, 'invalid_type')
})

test('validateBandImageFile: Textdatei mit vorgetaeuschter .jpg-Endung (nur ueber Dateinamen, nicht hier gepueft) wird ueber Inhalt abgelehnt', () => {
  const fakeText = new TextEncoder().encode('kein-echtes-bild-nur-text-mit-jpg-endung-vorgetaeuscht')
  const result = validateBandImageFile(fakeText)
  assert.equal(result.ok, false)
  assert.equal(!result.ok && result.errorCode, 'invalid_type')
})
