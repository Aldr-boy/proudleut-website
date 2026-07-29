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
import sharp from 'sharp'

export type DecodeResult =
  | { ok: true }
  | { ok: false; error: string }

export async function decodeImageFile(bytes: Uint8Array): Promise<DecodeResult> {
  try {
    await sharp(Buffer.from(bytes), { failOn: 'error' }).raw().toBuffer()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
