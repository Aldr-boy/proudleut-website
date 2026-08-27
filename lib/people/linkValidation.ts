// Validierungshelfer fuer person_links (Paket 4C-B). Bewusst eigenstaendig,
// kleiner people-lokaler Helper statt projektweitem URL-Refactoring --
// reusen von isValidUrl (lib/bandIntro/validation.ts) fuer das generelle
// Format, zusaetzlich https-only (strenger als die dort erlaubte http(s)-
// Regel), passend zur DB-CHECK-Constraint in supabase/people_links_v1.sql
// (url ~* '^https://').

import { isValidUrl } from '../bandIntro/validation.ts'

export const MAX_LINK_URL_LENGTH = 2048
export const MAX_LINK_LABEL_LENGTH = 60

export function isValidHttpsUrl(url: string): boolean {
  return /^https:\/\//i.test(url) && isValidUrl(url, MAX_LINK_URL_LENGTH)
}

export function isValidLinkLabel(label: string): boolean {
  const trimmed = label.trim()
  return trimmed.length > 0 && trimmed.length <= MAX_LINK_LABEL_LENGTH
}

// Admin-/Server-Regel (kein Security-Thema, siehe Auftrag "Paket 4C-B" Abschnitt
// "Duplikat Hauptwebsite"): dieselbe URL soll nicht zusaetzlich als
// person_links-Eintrag neben website_url angelegt werden. Einfacher
// String-Vergleich reicht -- keine Normalisierung (Trailing-Slash o. Ae.)
// noetig, da beide Felder ohnehin als vom Admin eingegebene Strings
// vorliegen.
export function isDuplicateOfWebsite(url: string, websiteUrl: string | null): boolean {
  return !!websiteUrl && url === websiteUrl
}
