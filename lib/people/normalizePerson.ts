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

export type PublicPersonMembership = {
  bandId: string
  bandName: string
  bandSlug: string
  role?: string
  instruments: PublicPersonInstrument[]
}

export type PublicPerson = {
  id: string
  name: string
  slug: string
  bio?: string
  imageUrl?: string
  websiteUrl?: string
  memberships: PublicPersonMembership[]
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
      }
      return membership
    })
    .filter((m): m is PublicPersonMembership => m !== undefined)
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
  }
}
