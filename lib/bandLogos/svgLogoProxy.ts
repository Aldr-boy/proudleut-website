// Band-Logos als SVG (band-media/<band>/logo.svg) werden ueber proudleut.com
// ausgeliefert statt direkt von supabase.co. Hintergrund: next/image reicht
// SVG-Adressen bewusst unveraendert an den Browser durch (kein Umbau ueber
// /_next/image, solange dangerouslyAllowSVG aus ist) -- der Browser ginge
// sonst direkt zu Supabase. Die Route app/band-logo/[slug]/logo.svg/route.ts
// holt die Datei serverseitig; hier stehen nur die reinen, testbaren
// Adress-Funktionen. Keine Netzwerkzugriffe.
import { deriveSupabaseImageRemotePattern } from '../bandImages/supabaseImageRemotePattern.ts'
import { BAND_MEDIA_BUCKET } from '../bandImages/storagePath.ts'

export const BAND_LOGO_ROUTE_PREFIX = '/band-logo'

// Nur Kleinbuchstaben, Ziffern und einzelne Bindestriche (wie die
// Band-Slugs). Kein Punkt, kein Schraegstrich, kein Prozentzeichen --
// damit kann der Slug weder den Pfad verlassen noch einen anderen Host
// oder eine andere Datei ansprechen.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_SLUG_LENGTH = 100

export function isValidBandLogoSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(slug)
}

// Origin des EIGENEN Supabase-Projekts (aus NEXT_PUBLIC_SUPABASE_URL, mit
// demselben engen Fallback wie next.config.ts), niemals aus einer Anfrage.
function storageOrigin(supabaseUrl: string | undefined): string {
  const p = deriveSupabaseImageRemotePattern(supabaseUrl)
  return `${p.protocol}://${p.hostname}${p.port ? `:${p.port}` : ''}`
}

const STORAGE_PREFIX = `/storage/v1/object/public/${BAND_MEDIA_BUCKET}/`

// Quelle bei Supabase fuer einen Slug. null bei ungueltigem Slug.
export function buildBandLogoUpstreamUrl(slug: string, supabaseUrl: string | undefined): string | null {
  if (!isValidBandLogoSlug(slug)) return null
  return `${storageOrigin(supabaseUrl)}${STORAGE_PREFIX}${slug}/logo.svg`
}

// Schreibt genau die Adresse <eigenes Supabase>/storage/v1/object/public/
// band-media/<slug>/logo.svg auf /band-logo/<slug>/logo.svg um. Alles andere
// (andere Host, anderer Pfad, andere Dateiendung, Query/Hash, JPG/PNG/WebP)
// kommt unveraendert zurueck.
export function toProxiedBandLogoUrl(url: string, supabaseUrl: string | undefined): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }
  if (parsed.origin !== storageOrigin(supabaseUrl) || parsed.search || parsed.hash) return url
  const match = parsed.pathname.match(/^\/storage\/v1\/object\/public\/band-media\/([^/]+)\/logo\.svg$/)
  if (!match || !isValidBandLogoSlug(match[1])) return url
  return `${BAND_LOGO_ROUTE_PREFIX}/${match[1]}/logo.svg`
}

// Schutz-Kopfzeilen fuer die ausgelieferte SVG-Datei. Direkt aufgerufen
// (nicht als <img>) kann sie dadurch keine Skripte auf proudleut.com
// ausfuehren: CSP "sandbox" (eigene Herkunft, keine Skripte, keine Formulare)
// plus default-src 'none'; Inline-Styles und data:-Bilder bleiben erlaubt,
// damit die Datei weiterhin korrekt aussieht. nosniff verhindert eine
// abweichende Typ-Erkennung.
export const BAND_LOGO_SECURITY_HEADERS: Record<string, string> = {
  'Content-Type': 'image/svg+xml',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
  'X-Content-Type-Options': 'nosniff',
}

// Das Logo liegt unter festem Pfad (logo.svg): ein ersetztes Logo behaelt
// seine Adresse. Deshalb kurze Dauer statt "immutable" -- Browser und CDN
// pruefen nach 5 Minuten neu, danach hoechstens 5 Minuten Altstand waehrend
// der Auffrischung.
export const BAND_LOGO_CACHE_CONTROL = 'public, max-age=300, s-maxage=300, stale-while-revalidate=300'

export const BAND_LOGO_MAX_BYTES = 1_000_000

// Grobe Pruefung, dass die Datei tatsaechlich ein SVG ist (erste 2 KB,
// optional BOM/XML-Kopf/Doctype/Kommentare davor).
export function looksLikeSvg(bytes: Uint8Array): boolean {
  const head = new TextDecoder('utf-8').decode(bytes.subarray(0, 2048))
  return /<svg[\s>]/i.test(head)
}
