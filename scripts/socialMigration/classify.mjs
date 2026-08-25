/**
 * classify.mjs
 *
 * Reine Entscheidungslogik fuer die Social-Erstmigration (Airtable -> social_profiles).
 * Keine I/O, kein Airtable-/Supabase-Zugriff -- ausschliesslich Funktionen von
 * Eingabewerten auf Klassifikationen. Getrennt von scripts/migrate-social-profiles.mjs
 * gehalten, damit die Entscheidungslogik isoliert unit-testbar bleibt (gleiches
 * Prinzip wie lib/socialLinks/resolveSocialLinkWrite.ts).
 */

export const SUPPORTED_PLATFORMS = ['facebook', 'instagram', 'spotify', 'youtube']

export const PLATFORM_FIELD = {
  facebook: 'Social - Facebook',
  instagram: 'Social - Instagram',
  spotify: 'Social - Spotify',
  youtube: 'Social - YouTube',
}

const PLATFORM_HOST_HINTS = {
  facebook: ['facebook.com', 'fb.com', 'fb.me'],
  instagram: ['instagram.com', 'instagr.am'],
  spotify: ['spotify.com', 'open.spotify.com'],
  youtube: ['youtube.com', 'youtu.be'],
}

/** Einzige zulaessige automatische Normalisierung: trim(). */
export function normalize(raw) {
  if (raw === undefined || raw === null) return null
  const s = String(raw).trim()
  return s === '' ? null : s
}

/**
 * Klassifiziert einen rohen Airtable-Quellwert (noch ohne Zielabgleich).
 * Erfindet niemals eine URL -- gibt bei Handle/Text/malformed nur die Klasse zurueck.
 */
export function classifyValue(raw) {
  if (raw === undefined || raw === null) return { valueClass: 'EMPTY' }
  if (Array.isArray(raw)) return { valueClass: 'MULTIPLE_VALUES' }

  const s = String(raw)
  if (s.trim() === '') return { valueClass: s.length > 0 ? 'WHITESPACE_ONLY' : 'EMPTY' }
  const trimmed = s.trim()

  const httpOccurrences = (trimmed.match(/https?:\/\//g) || []).length
  const looksLikeMultiple = httpOccurrences > 1 || /[,;\n]/.test(trimmed)

  let urlObj = null
  try { urlObj = new URL(trimmed) } catch { urlObj = null }

  if (urlObj) {
    if (looksLikeMultiple) return { valueClass: 'MULTIPLE_VALUES', url: urlObj }
    if (urlObj.protocol === 'http:') return { valueClass: 'VALID_HTTP_URL', url: urlObj }
    if (urlObj.protocol === 'https:') return { valueClass: 'VALID_HTTPS_URL', url: urlObj }
    return { valueClass: 'NON_HTTP_SCHEME', url: urlObj }
  }

  if (looksLikeMultiple) return { valueClass: 'MULTIPLE_VALUES' }
  if (/^@[\w.\-]+$/.test(trimmed)) return { valueClass: 'HANDLE_ONLY' }
  if (/^[\w.\-]+\.[a-z]{2,}(\/\S*)?$/i.test(trimmed) && !trimmed.includes(' ')) {
    return { valueClass: 'MALFORMED_URL' }
  }
  if (!trimmed.includes(' ') && !trimmed.includes('.')) return { valueClass: 'HANDLE_ONLY' }
  if (trimmed.includes(' ')) return { valueClass: 'PLAIN_TEXT' }
  return { valueClass: 'UNKNOWN' }
}

/** PLATFORM_OK / PLATFORM_MISMATCH / UNKNOWN_PLATFORM_MATCH -- nur fuer valide http(s)-URLs sinnvoll. */
export function classifyPlatform(platform, valueInfo) {
  if (!valueInfo.url) return 'UNKNOWN_PLATFORM_MATCH'
  const host = valueInfo.url.hostname.replace(/^www\./, '')
  const hints = PLATFORM_HOST_HINTS[platform]
  if (!hints) return 'UNKNOWN_PLATFORM_MATCH'
  if (hints.some(h => host === h || host.endsWith('.' + h))) return 'PLATFORM_OK'
  return 'PLATFORM_MISMATCH'
}

/**
 * Band-Mapping: ausschliesslich exakter Slug-Match. Kein Fuzzy-/Name-/Prefix-Match.
 * bandsBySlug: Map<slug, {id, slug, status}[]> -- Werte als Array, damit AMBIGUOUS_BAND
 * defensiv erkennbar bleibt, auch wenn die DB aktuell UNIQUE(slug) erzwingt.
 */
export function mapBandBySlug(airtableSlug, bandsBySlug) {
  const slug = typeof airtableSlug === 'string' ? airtableSlug.trim() : ''
  if (!slug) return { classification: 'MISSING_TARGET_BAND', band: null, reason: 'Airtable-Record ohne Slug' }
  const matches = bandsBySlug.get(slug)
  if (!matches || matches.length === 0) {
    return { classification: 'MISSING_TARGET_BAND', band: null, reason: `Slug "${slug}" nicht in Supabase gefunden` }
  }
  if (matches.length > 1) {
    return { classification: 'AMBIGUOUS_BAND', band: null, reason: `Slug "${slug}" matches ${matches.length} Supabase-Bands` }
  }
  return { classification: 'EXACT', band: matches[0], reason: 'exakter Slug-Match' }
}

/**
 * Klassifiziert eine einzelne Band+Plattform-Kombination vollstaendig.
 *
 * @param {object} params
 * @param {string} params.platform
 * @param {*} params.sourceValue - roher Airtable-Feldwert (kann undefined/null/string/array sein)
 * @param {{classification: string, band: object|null, reason: string}} params.bandMapping
 * @param {{url: string}|null} params.targetRow - bestehende social_profiles-Row fuer band_id+platform, falls vorhanden
 * @returns {{dryRunClass: string, valueClass: string, platformClass: string, normalizedCandidate: string|null, reason: string}}
 */
export function classifySocialRow({ platform, sourceValue, bandMapping, targetRow }) {
  if (bandMapping.classification !== 'EXACT') {
    return {
      dryRunClass: bandMapping.classification, // MISSING_TARGET_BAND | AMBIGUOUS_BAND
      valueClass: classifyValue(sourceValue).valueClass,
      platformClass: 'N/A',
      normalizedCandidate: normalize(sourceValue),
      reason: bandMapping.reason,
    }
  }

  const info = classifyValue(sourceValue)
  const normalized = normalize(sourceValue)
  const isEmpty = info.valueClass === 'EMPTY' || info.valueClass === 'WHITESPACE_ONLY'
  const platformClass = isEmpty ? 'N/A' : classifyPlatform(platform, info)

  if (isEmpty) {
    return { dryRunClass: 'SKIP_EMPTY', valueClass: info.valueClass, platformClass, normalizedCandidate: normalized, reason: 'Airtable-Quellwert leer' }
  }

  if (targetRow) {
    if (targetRow.url === normalized) {
      return { dryRunClass: 'ALREADY_EQUAL', valueClass: info.valueClass, platformClass, normalizedCandidate: normalized, reason: 'Source und Ziel-URL identisch' }
    }
    return { dryRunClass: 'TARGET_CONFLICT', valueClass: info.valueClass, platformClass, normalizedCandidate: normalized, reason: `Ziel besitzt abweichenden Wert: "${targetRow.url}"` }
  }

  if (info.valueClass === 'VALID_HTTP_URL' || info.valueClass === 'VALID_HTTPS_URL') {
    if (platformClass === 'PLATFORM_MISMATCH') {
      return { dryRunClass: 'PLATFORM_MISMATCH', valueClass: info.valueClass, platformClass, normalizedCandidate: normalized, reason: `URL-Host passt nicht zu Plattform ${platform}` }
    }
    return { dryRunClass: 'INSERT', valueClass: info.valueClass, platformClass, normalizedCandidate: normalized, reason: 'valide URL, kein Zielkonflikt, Plattform plausibel, Band-Mapping EXACT' }
  }

  if (info.valueClass === 'MULTIPLE_VALUES') {
    return { dryRunClass: 'UNSUPPORTED_FORMAT', valueClass: info.valueClass, platformClass, normalizedCandidate: normalized, reason: 'mehrere Werte in einem Feld erkannt' }
  }

  // NON_HTTP_SCHEME, HANDLE_ONLY, PLAIN_TEXT, MALFORMED_URL, UNKNOWN
  return { dryRunClass: 'INVALID_SOURCE', valueClass: info.valueClass, platformClass, normalizedCandidate: normalized, reason: `Quellwert-Format: ${info.valueClass}` }
}

/**
 * Klassifiziert das Ergebnis eines per ON CONFLICT DO NOTHING ignorierten Inserts,
 * nachdem die Zielrow direkt danach erneut gelesen wurde. Niemals ein Update-Pfad --
 * ausschliesslich Beobachtung des tatsaechlichen Nachzustands.
 */
export function classifyAfterRace(normalizedCandidate, targetRowAfterRead) {
  if (!targetRowAfterRead) {
    throw new Error('classifyAfterRace: Conflict gemeldet, aber keine Zielrow beim erneuten Lesen gefunden')
  }
  if (targetRowAfterRead.url === normalizedCandidate) return 'ALREADY_EQUAL_AFTER_RACE'
  return 'TARGET_CONFLICT_AFTER_RACE'
}
