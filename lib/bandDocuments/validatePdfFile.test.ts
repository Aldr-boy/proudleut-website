import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateBandDocumentPdfFile, MAX_BAND_DOCUMENT_PDF_BYTES } from './validatePdfFile.ts'

function pdfBytes(totalLength: number): Uint8Array {
  const header = Buffer.from('%PDF-1.7\n1 0 obj')
  const padding = Buffer.alloc(Math.max(0, totalLength - header.length), 0x20)
  return new Uint8Array(Buffer.concat([header, padding]))
}

test('validateBandDocumentPdfFile: gueltige PDF-Signatur wird akzeptiert', () => {
  const result = validateBandDocumentPdfFile(pdfBytes(16))
  assert.deepEqual(result, { ok: true, contentType: 'application/pdf' })
})

test('validateBandDocumentPdfFile: leere Datei wird abgelehnt', () => {
  assert.deepEqual(validateBandDocumentPdfFile(new Uint8Array(0)), { ok: false, errorCode: 'empty' })
})

test('validateBandDocumentPdfFile: falsche Magic Bytes (z. B. ein Bild) werden abgelehnt', () => {
  const jpegLike = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x00])
  assert.deepEqual(validateBandDocumentPdfFile(jpegLike), { ok: false, errorCode: 'invalid_type' })
})

test('validateBandDocumentPdfFile: zu kurze Datei (kuerzer als die Signatur) wird abgelehnt, kein Crash', () => {
  assert.deepEqual(validateBandDocumentPdfFile(new Uint8Array([0x25, 0x50])), { ok: false, errorCode: 'invalid_type' })
})

test('validateBandDocumentPdfFile: Datei exakt am 4-MB-Limit wird akzeptiert', () => {
  const bytes = pdfBytes(MAX_BAND_DOCUMENT_PDF_BYTES)
  assert.equal(bytes.length, MAX_BAND_DOCUMENT_PDF_BYTES)
  const result = validateBandDocumentPdfFile(bytes)
  assert.equal(result.ok, true)
})

test('validateBandDocumentPdfFile: Datei ueber dem 4-MB-Limit wird abgelehnt', () => {
  const bytes = pdfBytes(MAX_BAND_DOCUMENT_PDF_BYTES + 1)
  assert.equal(bytes.length, MAX_BAND_DOCUMENT_PDF_BYTES + 1)
  assert.deepEqual(validateBandDocumentPdfFile(bytes), { ok: false, errorCode: 'too_large' })
})

test('validateBandDocumentPdfFile: die reale Donnaweda-PDF-Groessenordnung (~2,98 MB) liegt sicher unter dem Limit', () => {
  const bytes = pdfBytes(2_976_155)
  const result = validateBandDocumentPdfFile(bytes)
  assert.equal(result.ok, true)
})
