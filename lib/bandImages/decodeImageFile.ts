// Vollstaendiges serverseitiges Dekodieren eines Bild-Uploads -- Magic
// Bytes allein erkennen nur die fuehrende Signatur, nicht ob der Rest der
// Datei tatsaechlich ein gueltiges Bild ergibt. Ein abgeschnittenes JPEG
// (nur Header, Rest fehlt) oder ein PNG/WebP mit beschaedigtem
// komprimiertem Inhalt hat weiterhin eine gueltige Signatur, laesst sich
// aber nicht vollstaendig dekodieren.
//
// sharp({ failOn: 'error' }) + .raw().toBuffer() zwingt libvips, JEDES
// Pixel tatsaechlich zu dekodieren (nicht nur Header/Metadaten zu lesen --
// .metadata() alleine wuerde ein abgeschnittenes Bild oft nicht erkennen).
// failOn:'error' bricht bei 'truncated'- und 'error'-Stufen ab (siehe
// node_modules/sharp/lib/constructor.js: Reihenfolge aufsteigender
// Empfindlichkeit ist none < truncated < error < warning, hoehere Stufen
// implizieren die niedrigeren) -- damit werden abgeschnittene und
// beschaedigte Bilder zuverlaessig abgelehnt, ohne bei der strengsten
// Stufe 'warning' auch unbedenkliche, in echten Fotos haeufige Warnungen
// (z. B. ungewoehnliche, aber gueltige Metadaten) faelschlich abzulehnen.
//
// Dient AUSSCHLIESSLICH der Validierung -- das dekodierte Rohbild wird
// verworfen. Gespeichert wird immer der urspruengliche, unveraenderte
// Upload-Buffer, keine Neukodierung, keine Komprimierung.
//
// Pixelgrenze (Codex-Korrekturblock 4, P2): das 4-MB-Dateilimit
// (validateImageFile.ts) begrenzt nur die KOMPRIMIERTE Eingabedatei,
// nicht den dekodierten Rohpixelpuffer. Ein stark komprimiertes, aber
// gueltiges Bild (z. B. eine grossflaechig einfarbige PNG) kann trotz
// kleiner Dateigroesse extrem viele Pixel enthalten und wuerde
// .raw().toBuffer() zwingen, einen sehr grossen Puffer zu allozieren
// (Breite * Hoehe * Kanaele Bytes) -- das ist der eigentliche Denial-of-
// Service-Vektor, nicht die Dateigroesse.
//
// Deshalb wird VOR dem vollstaendigen Raw-Decode zuerst per .metadata()
// (liest nur den Bild-Header, alloziert keinen Pixelpuffer) Breite und
// Hoehe gelesen und selbst multipliziert -- kontrolliert, ueberlaufsicher
// und mit einem eigenen, stabilen Fehlercode, BEVOR ueberhaupt eine
// grosse Allokation versucht wird. limitInputPixels wird zusaetzlich
// direkt in der Sharp-Konstruktion gesetzt (native Bibliotheksgrenze als
// zweite, unabhaengige Verteidigungslinie) -- der native Fehlertext
// "Input image exceeds pixel limit" (siehe node_modules/sharp/src/common.cc)
// wird als Zusatzsignal erkannt, falls die eigene Metadaten-Pruefung aus
// irgendeinem Grund nicht greift.
import sharp from 'sharp'

// 25 Megapixel -- erlaubt weiterhin z. B. 6000x4000 (24.000.000 Pixel),
// lehnt z. B. 6000x5000 (30.000.000 Pixel) ab. Keine neue Mindestaufloesung.
export const MAX_BAND_IMAGE_PIXELS = 25_000_000

const PIXEL_LIMIT_NATIVE_ERROR_MARKER = 'exceeds pixel limit'

export type DecodeResult =
  | { ok: true }
  | { ok: false; reason: 'decode_failed' | 'too_many_pixels'; error: string }

function isPositiveFiniteInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

export async function decodeImageFile(bytes: Uint8Array): Promise<DecodeResult> {
  const buffer = Buffer.from(bytes)

  // ---- 1. Nur den Header lesen (keine Pixel-Allokation) und die
  // deklarierten Abmessungen kontrolliert, ueberlaufsicher pruefen,
  // BEVOR ueberhaupt versucht wird, Pixel zu dekodieren. ----
  let width: unknown
  let height: unknown
  try {
    const metadata = await sharp(buffer, { failOn: 'error', limitInputPixels: MAX_BAND_IMAGE_PIXELS }).metadata()
    width = metadata.width
    height = metadata.height
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes(PIXEL_LIMIT_NATIVE_ERROR_MARKER)) {
      return { ok: false, reason: 'too_many_pixels', error: message }
    }
    return { ok: false, reason: 'decode_failed', error: message }
  }

  if (!isPositiveFiniteInteger(width) || !isPositiveFiniteInteger(height)) {
    return { ok: false, reason: 'decode_failed', error: `Fehlende oder ungueltige Bildabmessungen (width=${width}, height=${height})` }
  }

  // Jede einzelne Kante bereits groesser als das Gesamtlimit -> das
  // Produkt ist garantiert zu gross. Multiplikation wird in diesem Fall
  // bewusst vermieden (Ueberlaufschutz) -- width/height sind hier beide
  // bereits als <= MAX_BAND_IMAGE_PIXELS bestaetigt, sobald dieser Zweig
  // nicht greift, daher ist width * height (max. 25_000_000 * 25_000_000
  // = 6.25e14) sicher innerhalb Number.MAX_SAFE_INTEGER (~9.007e15).
  if (width > MAX_BAND_IMAGE_PIXELS || height > MAX_BAND_IMAGE_PIXELS) {
    return { ok: false, reason: 'too_many_pixels', error: `Bildkante zu gross (width=${width}, height=${height}, Limit pro Gesamtbild=${MAX_BAND_IMAGE_PIXELS})` }
  }

  const pixelCount = width * height
  if (pixelCount > MAX_BAND_IMAGE_PIXELS) {
    return { ok: false, reason: 'too_many_pixels', error: `Bild hat ${pixelCount} Pixel (width=${width}, height=${height}), erlaubt sind maximal ${MAX_BAND_IMAGE_PIXELS}` }
  }

  // ---- 2. Erst jetzt, nachdem die Pixelzahl kontrolliert bestaetigt
  // wurde, den vollstaendigen Pixel-Decode ausfuehren. limitInputPixels
  // bleibt als zweite, unabhaengige Verteidigungslinie aktiv. ----
  try {
    await sharp(buffer, { failOn: 'error', limitInputPixels: MAX_BAND_IMAGE_PIXELS }).raw().toBuffer()
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes(PIXEL_LIMIT_NATIVE_ERROR_MARKER)) {
      return { ok: false, reason: 'too_many_pixels', error: message }
    }
    return { ok: false, reason: 'decode_failed', error: message }
  }
}
