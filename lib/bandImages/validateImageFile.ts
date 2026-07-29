// Netzwerk-/dateisystemfreie Validierung von Band-Bild-Uploads (Hero,
// Thumbnail, Galerie-Add -- rollenneutral, von allen media_assets-
// Editoren gemeinsam genutzt). Prueft NICHT nur Dateiendung oder den vom
// Browser gelieferten MIME-Type (beides vom Client faelschbar), sondern
// die tatsaechliche Datei-Signatur (Magic Bytes) UND anschliessend, ob
// die Datei tatsaechlich vollstaendig dekodierbar ist (siehe
// decodeImageFile.ts) -- eine abgeschnittene oder beschaedigte Datei mit
// gueltiger Signatur wird dadurch ebenfalls abgelehnt, bevor sie ein
// bisher gueltiges Hero-/Thumbnail-Bild ersetzen oder in die Galerie
// gelangen kann. Nur echte, vollstaendig lesbare JPEG-, PNG- oder
// WebP-Dateien werden akzeptiert.
import { decodeImageFile } from './decodeImageFile.ts'

// Fachliche Obergrenze der Bilddatei selbst -- exakt 4 MB (Korrektur auf
// das feste Request-Limit der Vercel-Production-Umgebung). Unabhaengig
// vom technischen Request-Limit der Server Action (next.config.ts),
// das aus Multipart-/FormData-Overhead-Gruenden etwas hoeher liegen muss.
export const MAX_BAND_IMAGE_BYTES = 4 * 1024 * 1024

export type DetectedImageType = {
  ext: 'jpg' | 'png' | 'webp'
  contentType: 'image/jpeg' | 'image/png' | 'image/webp'
}

// Erkennt den tatsaechlichen Bildtyp anhand der fuehrenden Bytes (Magic
// Bytes), unabhaengig von Dateiname oder deklariertem MIME-Type. Liefert
// null, wenn keine der drei unterstuetzten Signaturen passt.
export function detectImageType(bytes: Uint8Array): DetectedImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: 'jpg', contentType: 'image/jpeg' }
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { ext: 'png', contentType: 'image/png' }
  }

  // WebP: RIFF-Container ("RIFF" + 4 Bytes Groesse + "WEBP")
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { ext: 'webp', contentType: 'image/webp' }
  }

  return null
}

export type BandImageValidationResult =
  | { ok: true; ext: 'jpg' | 'png' | 'webp'; contentType: string }
  | { ok: false; errorCode: 'empty' | 'too_large' | 'invalid_type' | 'invalid_image' }

// Reihenfolge bewusst: leer -> Groesse -> Signatur -> vollstaendiger
// Decode. Jede Ablehnung liefert einen stabilen, rollenneutralen Code --
// niemals wird eine Datei allein anhand von Name/MIME akzeptiert, und
// niemals allein anhand der fuehrenden Bytes, ohne den Rest der Datei
// tatsaechlich gelesen zu haben. Aufrufer (Hero-/Thumbnail-/Galerie-
// Action) versehen diesen Code jeweils mit ihrem eigenen Praefix fuer die
// Fehlermeldungs-Map der Admin-Seite (z. B. "hero_image_" + errorCode).
// Async, weil der vollstaendige Decode-Schritt (sharp) asynchron ist --
// alle drei Aufrufstellen awaiten dieses Ergebnis, bevor der Storage-
// Upload beginnt.
export async function validateBandImageFile(bytes: Uint8Array): Promise<BandImageValidationResult> {
  if (bytes.length === 0) return { ok: false, errorCode: 'empty' }
  if (bytes.length > MAX_BAND_IMAGE_BYTES) return { ok: false, errorCode: 'too_large' }

  const detected = detectImageType(bytes)
  if (!detected) return { ok: false, errorCode: 'invalid_type' }

  const decoded = await decodeImageFile(bytes)
  if (!decoded.ok) {
    // Interner Decoder-Fehler wird geloggt, aber NIE an den Browser
    // weitergegeben -- der Aufrufer erhaelt nur den stabilen Code.
    console.error(`[validateBandImageFile] Datei mit gueltiger ${detected.ext}-Signatur liess sich nicht vollstaendig dekodieren: ${decoded.error}`)
    return { ok: false, errorCode: 'invalid_image' }
  }

  return { ok: true, ext: detected.ext, contentType: detected.contentType }
}
