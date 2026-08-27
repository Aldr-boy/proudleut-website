// Normalisierung fuer die oeffentliche Personenseite (Musiker-/
// Personenebene V1, Paket 4B). Bewusst eigenstaendig statt Wiederverwendung
// von lib/supabase/normalizeBand.ts::normalizeBandPeople -- unterschiedliche
// Blickrichtung (Person -> ihre Bands, statt Band -> ihre Personen) und
// unterschiedliche Zielstruktur, keine verfruehte gemeinsame Abstraktion
// (siehe Auftrag "Paket 4B", Abschnitt "Types").

type Row = Record<string, unknown>

function asArr<T>(val: T | T[] | null | undefined): T[] {
  if (val === null || val === undefined) return []
  return Array.isArray(val) ? val : [val]
}

function str(val: unknown): string | undefined {
  if (val === null || val === undefined) return undefined
  const s = String(val).trim()
  return s.length > 0 ? s : undefined
}

function bySortOrder(a: Row, b: Row): number {
  return ((a.sort_order as number) ?? 0) - ((b.sort_order as number) ?? 0)
}

export type PublicPersonInstrument = {
  name: string
  slug: string
}

export type PublicBandImage = {
  url: string
  alt: string
}

export type PublicPersonMembership = {
  bandId: string
  bandName: string
  bandSlug: string
  role?: string
  instruments: PublicPersonInstrument[]
  bandImage?: PublicBandImage
}

// Zusaetzliche wichtige Links neben website_url (Paket 4C-B, person_links).
// is_public ist bewusst NICHT Teil dieser Struktur -- RLS hat private
// Zeilen bereits entfernt, bevor diese Funktion sie sieht.
export type PublicPersonLink = {
  id: string
  label: string
  url: string
}

// Kuratierte Referenzenliste "Zusammengearbeitet mit" (Musikerseite-
// Redesign V1, person_credits). Reiner Anzeigename, keine externe
// Verknuepfung -- is_public ist bewusst NICHT Teil dieser Struktur, RLS
// hat private Zeilen bereits entfernt.
export type PublicPersonCredit = {
  id: string
  name: string
}

export type PublicPerson = {
  id: string
  name: string
  slug: string
  bio?: string
  imageUrl?: string
  websiteUrl?: string
  memberships: PublicPersonMembership[]
  links: PublicPersonLink[]
  credits: PublicPersonCredit[]
}

// Bandbild fuer die "Bei Proudleut"-Projektkarte -- identische Fallback-
// Logik wie components/BandCard.tsx (band.thumbnailImage ?? band.heroImage),
// hier nur minimal aus media_assets extrahiert statt ueber den vollen
// Band-Normalizer, da die Personenseite keinen kompletten Band-Datensatz
// braucht. Keine neue Medienarchitektur -- derselbe media_assets.role-
// Wortschatz ('thumbnail'/'hero') wie ueberall sonst im Projekt.
function pickBandImage(rawMediaAssets: unknown): PublicBandImage | undefined {
  const all = asArr(rawMediaAssets as Row[] | null).sort(bySortOrder)
  const byRole = (role: string) => all.find((m) => m.role === role)
  const picked = byRole('thumbnail') ?? byRole('hero')
  const url = str(picked?.url)
  if (!url) return undefined
  return { url, alt: str(picked?.alt_text) ?? '' }
}

// band_memberships kommt bereits RLS-gefiltert vom anon-Client zurueck
// (is_public=true, Band aktiv+published -- siehe
// supabase/people_data_foundation_v1.sql). Diese Funktion filtert NICHT aus
// Sicherheitsgruenden nach, nur defensiv (fehlende Pflichtfelder) -- RLS
// bleibt die alleinige Security-Grenze.
export function normalizePersonMemberships(rawBandMemberships: unknown): PublicPersonMembership[] {
  return asArr(rawBandMemberships as Row[] | null)
    .filter((bm) => bm.bands != null)
    .sort((a, b) => {
      const sortDiff = bySortOrder(a, b)
      if (sortDiff !== 0) return sortDiff
      const nameA = str((a.bands as Row)?.name) ?? ''
      const nameB = str((b.bands as Row)?.name) ?? ''
      return nameA.localeCompare(nameB, 'de')
    })
    .map((bm) => {
      const band = bm.bands as Row
      const bandId = str(band?.id)
      const bandName = str(band?.name)
      const bandSlug = str(band?.slug)
      if (!bandId || !bandName || !bandSlug) return undefined

      const instruments: PublicPersonInstrument[] = asArr(bm.band_membership_instruments as Row[] | null)
        .sort((a, b) => {
          const joinDiff = bySortOrder(a, b)
          if (joinDiff !== 0) return joinDiff
          return bySortOrder((a.instruments as Row) ?? {}, (b.instruments as Row) ?? {})
        })
        .map((bmi) => {
          const instr = bmi.instruments as Row
          const iName = str(instr?.name)
          const iSlug = str(instr?.slug)
          return iName && iSlug ? { name: iName, slug: iSlug } : undefined
        })
        .filter((i): i is PublicPersonInstrument => i !== undefined)

      const membership: PublicPersonMembership = {
        bandId,
        bandName,
        bandSlug,
        role: str(bm.role),
        instruments,
        bandImage: pickBandImage(band.media_assets),
      }
      return membership
    })
    .filter((m): m is PublicPersonMembership => m !== undefined)
}

// person_links kommt bereits RLS-gefiltert vom anon-Client zurueck
// (is_public=true, Person aktiv -- siehe supabase/people_links_v1.sql).
// Diese Funktion filtert NICHT aus Sicherheitsgruenden nach, nur defensiv
// (fehlende Pflichtfelder) -- RLS bleibt die alleinige Security-Grenze.
// Sortierung: 1. person_links.sort_order, 2. Label (deutsche Locale) als
// stabiler Tie-Breaker.
export function normalizePersonLinks(rawPersonLinks: unknown): PublicPersonLink[] {
  return asArr(rawPersonLinks as Row[] | null)
    .sort((a, b) => {
      const sortDiff = bySortOrder(a, b)
      if (sortDiff !== 0) return sortDiff
      return String(a.label ?? '').localeCompare(String(b.label ?? ''), 'de')
    })
    .map((row) => {
      const id = str(row.id)
      const label = str(row.label)
      const url = str(row.url)
      return id && label && url ? { id, label, url } : undefined
    })
    .filter((l): l is PublicPersonLink => l !== undefined)
}

// person_credits kommt bereits RLS-gefiltert vom anon-Client zurueck
// (is_public=true, Person aktiv -- siehe supabase/people_credits_v1.sql).
// Diese Funktion filtert NICHT aus Sicherheitsgruenden nach, nur defensiv
// (fehlende Pflichtfelder) -- RLS bleibt die alleinige Security-Grenze.
// Sortierung: 1. person_credits.sort_order, 2. Name (deutsche Locale) als
// stabiler Tie-Breaker -- identisches Prinzip wie normalizePersonLinks.
export function normalizePersonCredits(rawPersonCredits: unknown): PublicPersonCredit[] {
  return asArr(rawPersonCredits as Row[] | null)
    .sort((a, b) => {
      const sortDiff = bySortOrder(a, b)
      if (sortDiff !== 0) return sortDiff
      return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'de')
    })
    .map((row) => {
      const id = str(row.id)
      const name = str(row.name)
      return id && name ? { id, name } : undefined
    })
    .filter((c): c is PublicPersonCredit => c !== undefined)
}

export function normalizePersonFromSupabase(row: unknown): PublicPerson {
  const r = row as Row

  return {
    id: str(r.id) ?? '',
    name: str(r.name) ?? '',
    slug: str(r.slug) ?? '',
    bio: str(r.bio),
    imageUrl: str(r.image_url),
    websiteUrl: str(r.website_url),
    memberships: normalizePersonMemberships(r.band_memberships),
    links: normalizePersonLinks(r.person_links),
    credits: normalizePersonCredits(r.person_credits),
  }
}
