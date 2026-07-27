// Reine, netzwerk-/dateisystemfreie Validierung von Hero-Bild-Uploads.
// Prueft NICHT nur Dateiendung oder den vom Browser gelieferten
// MIME-Type (beides vom Client faelschbar), sondern die tatsaechliche
// Datei-Signatur (Magic Bytes) am Anfang des Dateiinhalts. Nur echte
// JPEG-, PNG- oder WebP-Dateien werden akzeptiert.

// Fachliche Obergrenze der Bilddatei selbst -- exakt 4 MB (Korrektur auf
// das feste Request-Limit der Vercel-Production-Umgebung). Unabhaengig
// vom technischen Request-Limit der Server Action (next.config.ts),
// das aus Multipart-/FormData-Overhead-Gruenden etwas hoeher liegen muss.
export const MAX_HERO_IMAGE_BYTES = 4 * 1024 * 1024

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

export type HeroImageValidationResult =
  | { ok: true; ext: 'jpg' | 'png' | 'webp'; contentType: string }
  | { ok: false; errorCode: 'hero_image_empty' | 'hero_image_too_large' | 'hero_image_invalid_type' }

// Reihenfolge bewusst: leer -> Groesse -> Signatur. Jede Ablehnung liefert
// einen stabilen, fuer die Fehlermeldungs-Map der Admin-Seite geeigneten
// Code -- niemals wird eine Datei allein anhand von Name/MIME akzeptiert.
export function validateHeroImageFile(bytes: Uint8Array): HeroImageValidationResult {
  if (bytes.length === 0) return { ok: false, errorCode: 'hero_image_empty' }
  if (bytes.length > MAX_HERO_IMAGE_BYTES) return { ok: false, errorCode: 'hero_image_too_large' }

  const detected = detectImageType(bytes)
  if (!detected) return { ok: false, errorCode: 'hero_image_invalid_type' }

  return { ok: true, ext: detected.ext, contentType: detected.contentType }
}
