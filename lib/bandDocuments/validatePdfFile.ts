// Netzwerk-/dateisystemfreie Validierung von Banddokument-PDF-Uploads
// (Paket 2C, Admin-Dokumentverwaltung). Prueft nicht nur den vom Browser
// gelieferten MIME-Type (vom Client faelschbar), sondern die tatsaechliche
// Datei-Signatur (Magic Bytes "%PDF-"). Anders als bei Bild-Uploads
// (validateImageFile.ts) wird der PDF-Inhalt selbst nicht geparst/dekodiert
// -- die Datei wird opak gespeichert, nicht gerendert oder inhaltlich
// ausgewertet.

// Fachliche Obergrenze -- identisch zum bestehenden Bild-Limit
// (next.config.ts serverActions.bodySizeLimit: 4.2mb), aber als eigene,
// domaenenspezifische Konstante gefuehrt statt MAX_BAND_IMAGE_BYTES zu
// importieren. PDF und Cover werden bewusst in getrennten Requests
// hochgeladen (siehe replaceBandDocumentPdfAction/replaceBandDocumentCoverAction),
// daher reicht fuer jede einzelne Datei derselbe 4-MB-Spielraum wie bei
// Hero/Thumbnail/Galerie.
export const MAX_BAND_DOCUMENT_PDF_BYTES = 4 * 1024 * 1024

const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2d] // "%PDF-"

export type BandDocumentPdfValidationResult =
  | { ok: true; contentType: 'application/pdf' }
  | { ok: false; errorCode: 'empty' | 'too_large' | 'invalid_type' }

function hasPdfSignature(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_MAGIC_BYTES.length) return false
  return PDF_MAGIC_BYTES.every((byte, i) => bytes[i] === byte)
}

// Reihenfolge bewusst: leer -> Groesse -> Signatur -- identisches Muster
// wie validateBandImageFile. Kein Decode-Schritt, da PDF-Inhalte hier
// nicht geparst/gerendert werden (kein PDF-Rendering-Werkzeug in dieser
// Umgebung verfuegbar, siehe Paket-2B-Preflight -- und fuer eine reine
// Speicherung auch nicht erforderlich).
export function validateBandDocumentPdfFile(bytes: Uint8Array): BandDocumentPdfValidationResult {
  if (bytes.length === 0) return { ok: false, errorCode: 'empty' }
  if (bytes.length > MAX_BAND_DOCUMENT_PDF_BYTES) return { ok: false, errorCode: 'too_large' }
  if (!hasPdfSignature(bytes)) return { ok: false, errorCode: 'invalid_type' }
  return { ok: true, contentType: 'application/pdf' }
}
