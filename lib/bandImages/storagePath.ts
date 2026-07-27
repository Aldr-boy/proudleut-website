// Reine Pfad-/URL-Hilfsfunktionen fuer den band-media-Bucket. Keine
// Storage-/Netzwerkzugriffe -- nur String-Verarbeitung.

export const BAND_MEDIA_BUCKET = 'band-media'

// Baut den Storage-Objektpfad fuer ein neu hochgeladenes Band-Bild
// (Hero, Thumbnail, ...). Jeder Upload bekommt einen neuen, eindeutigen
// Suffix, damit sich die resultierende oeffentliche URL von der
// vorherigen unterscheidet -- Browser-, CDN- und next/image-Caches
// uebernehmen sonst ein veraltetes Bild unter identischer URL weiter.
export function buildBandImageStoragePath(slug: string, role: string, ext: string, uniqueSuffix: string): string {
  return `${slug}/${role}-${uniqueSuffix}.${ext}`
}

// Extrahiert den Storage-Objektpfad (relativ zum Bucket) aus einer
// bestehenden oeffentlichen band-media-URL, um das alte Objekt nach
// erfolgreichem DB-Update sicher loeschen zu koennen. Liefert null, wenn
// die URL nicht dem erwarteten Public-URL-Muster fuer diesen Bucket
// entspricht (z. B. eine alte, nicht mehr genutzte Fremd-URL) -- in dem
// Fall wird bewusst kein Loeschversuch unternommen.
export function extractBandMediaStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${BAND_MEDIA_BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  const path = url.slice(idx + marker.length)
  return path.length > 0 ? path : null
}
