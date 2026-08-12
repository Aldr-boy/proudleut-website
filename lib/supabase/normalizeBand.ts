import type { ImageAsset } from '../types/image'
import type {
  Band,
  BandDocument,
  BandLocation,
  BandMood,
  ReferenceEvent,
  SimilarBandReferences,
  SocialLinks,
  WeddingInfo,
} from '../types/band'
import { compareBandDocuments } from '../bands/bandDocumentsSort.ts'

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

// Sortierung/Ableitung fuer band_moods -- identische Reihenfolge wie
// klingtNach unten (1. band_moods.sort_order, 2. moods.sort_order,
// 3. moods.name als deterministischer Tie-Breaker), aber als eigene,
// exportierte Funktion, damit sie unabhaengig von der restlichen
// Normalisierung unit-testbar ist. Ein Eintrag ohne Name ODER ohne
// Slug wird verworfen (defensiv, moods.name/slug sind in der DB NOT
// NULL, sollte in der Praxis nicht vorkommen).
export function normalizeMoodAssignments(rawBandMoods: unknown): BandMood[] {
  return asArr(rawBandMoods as Row[] | null)
    .sort((a, b) => {
      const bandPriorityDiff = bySortOrder(a, b)
      if (bandPriorityDiff !== 0) return bandPriorityDiff
      const catalogSortDiff = bySortOrder((a.moods as Row) ?? {}, (b.moods as Row) ?? {})
      if (catalogSortDiff !== 0) return catalogSortDiff
      return String((a.moods as Row)?.name ?? '').localeCompare(String((b.moods as Row)?.name ?? ''))
    })
    .map((bm) => {
      const name = str((bm.moods as Row)?.name)
      const slug = str((bm.moods as Row)?.slug)
      return name && slug ? { name, slug } : undefined
    })
    .filter((m): m is BandMood => m !== undefined)
}

function normalizeImg(raw: Row | null | undefined, fallbackAlt: string): ImageAsset | undefined {
  if (!raw?.url) return undefined
  return {
    url: String(raw.url),
    alt: str(raw.alt_text) ?? fallbackAlt,
    width: typeof raw.width === 'number' ? raw.width : undefined,
    height: typeof raw.height === 'number' ? raw.height : undefined,
    source: 'external',
  }
}

export function normalizeBandFromSupabase(row: unknown): Band {
  const r = row as Row

  const name = str(r.name) ?? 'Unbekannte Band'
  const altText = `Livefoto von ${name}`

  // Status: Supabase uses 'active'|'draft'|'paused'|'archived', Band type uses 'active'|'new'|'inactive'
  const rawStatus = str(r.status) ?? ''
  const status: Band['status'] =
    rawStatus === 'active' ? 'active' :
    rawStatus === 'new' ? 'new' :
    'inactive'

  // Profile (1:1 — UNIQUE constraint on band_id)
  const profile = asArr(r.band_profiles as Row | Row[] | null)[0] ?? ({} as Row)

  // Band types: is_primary first, then sort_order
  const rawBandTypes = asArr(r.band_band_types as Row[] | null).sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    return bySortOrder(a, b)
  })

  const bandartNames = rawBandTypes
    .map(bt => str((bt.band_types as Row)?.name))
    .filter((n): n is string => n !== undefined)

  const bandartSlugs = rawBandTypes
    .map(bt => str((bt.band_types as Row)?.slug))
    .filter((s): s is string => s !== undefined)

  // Event types
  const rawEventTypes = asArr(r.band_event_types as Row[] | null).sort(bySortOrder)

  const eventTypes = rawEventTypes
    .map(et => str((et.event_types as Row)?.name))
    .filter((n): n is string => n !== undefined)

  const categorySlugs = rawEventTypes
    .map(et => str((et.event_types as Row)?.slug))
    .filter((s): s is string => s !== undefined)

  // Block "Event-Type-Anfrage-Label V1": zusaetzliche, klar typisierte
  // Struktur ausschliesslich fuer den nativen Anfragekontext -- eventTypes/
  // categorySlugs oben bleiben fuer bestehende Anzeige-Verbraucher
  // unveraendert. Ein Eintrag ohne Name ODER ohne Slug wird verworfen
  // (defensiv, event_types.name/slug sind in der DB NOT NULL). anfrage_label
  // ist bewusst optional (Spalte kann null sein) -- Fallback auf name
  // erfolgt NICHT hier, sondern erst am Verwendungsort (Anfrageformular).
  const anfrageEventTypes = rawEventTypes
    .map(et => {
      const eventTypeRow = et.event_types as Row
      const name = str(eventTypeRow?.name)
      const slug = str(eventTypeRow?.slug)
      const anfrageLabel = str(eventTypeRow?.anfrage_label) ?? null
      return name && slug ? { name, slug, anfrageLabel } : undefined
    })
    .filter((t): t is { name: string; slug: string; anfrageLabel: string | null } => t !== undefined)

  // klingtNach = Mood-Namen (bestehendes Verhalten unveraendert erhalten);
  // moods = dieselben Zuordnungen als klar typisierte {name, slug}-Struktur
  // fuer den stabilen Slug-Abgleich (z. B. /bands?mood=<slug>).
  const moods = normalizeMoodAssignments(r.band_moods)
  const klingtNach = moods.map(m => m.name)

  // musikalischVerortet = repertoire_styles
  const musikalischVerortet = asArr(r.band_repertoire_styles as Row[] | null)
    .sort(bySortOrder)
    .map(rs => str((rs.repertoire_styles as Row)?.name))
    .filter((n): n is string => n !== undefined)

  // Media assets (schema column: role)
  const allMedia = asArr(r.media_assets as Row[] | null).sort(bySortOrder)

  const heroRaw = allMedia.find(m => m.role === 'hero') ?? null
  const thumbRaw = allMedia.find(m => m.role === 'thumbnail') ?? null
  const logoRaw = allMedia.find(m => m.role === 'logo') ?? null
  const galleryRaw = allMedia.filter(m => m.role === 'gallery')

  const heroImg = normalizeImg(heroRaw, altText)
  const thumbImg = normalizeImg(thumbRaw, altText)
  const gallery: ImageAsset[] = galleryRaw
    .map(m => normalizeImg(m, altText))
    .filter((img): img is ImageAsset => img !== undefined)

  // heroImage fallback: hero → thumbnail → first gallery image
  const heroImage = heroImg ?? thumbImg ?? gallery[0]

  // YouTube video
  const youtubeVideo = asArr(r.videos as Row[] | null)
    .sort(bySortOrder)
    .find(v => v.platform === 'youtube')

  // Location (1:1 via bands.home_location_id)
  const loc = (r.locations ?? null) as Row | null
  const location: BandLocation = {
    postalCode: str(loc?.plz),
    city: str(loc?.city_name),
    district: str(loc?.landkreis),
    administrativeRegion: str(loc?.regierungsbezirk),
    state: str(loc?.bundesland),
    country: str(loc?.country) ?? 'Deutschland',
    latitude: typeof loc?.latitude === 'number' ? loc.latitude : undefined,
    longitude: typeof loc?.longitude === 'number' ? loc.longitude : undefined,
  }

  // Social profiles
  const socialList = asArr(r.social_profiles as Row[] | null)
  const byPlatform = (p: string) => socialList.find(sp => sp.platform === p)

  const socialLinks: SocialLinks = {
    facebook:  str(byPlatform('facebook')?.url),
    instagram: str(byPlatform('instagram')?.url),
    spotify:   str(byPlatform('spotify')?.url),
    youtube:   str(byPlatform('youtube')?.url),
  }

  const igP = byPlatform('instagram')
  const fbP = byPlatform('facebook')
  const ytP = byPlatform('youtube')

  // Schema columns: current_followers, current_following
  const igFollowers   = typeof igP?.current_followers === 'number' ? igP.current_followers   : undefined
  const igFollowing   = typeof igP?.current_following === 'number' ? igP.current_following   : undefined
  const fbFollowers   = typeof fbP?.current_followers === 'number' ? fbP.current_followers   : undefined
  const fbFollowing   = typeof fbP?.current_following === 'number' ? fbP.current_following   : undefined
  const ytSubscribers = typeof ytP?.current_followers === 'number' ? ytP.current_followers   : undefined

  const hasSocialStats = igFollowers !== undefined || fbFollowers !== undefined || ytSubscribers !== undefined
  const socialMediaStats: Band['socialMediaStats'] = hasSocialStats
    ? { igFollowers, igFollowing, fbFollowers, fbFollowing, ytSubscribers }
    : undefined

  // Reference events (schema: event_name, location_name, city, year)
  const referenceEvents: ReferenceEvent[] = asArr(r.reference_events as Row[] | null)
    .sort(bySortOrder)
    .map(re => ({
      eventName: str(re.event_name) ?? '',
      venue:     str(re.location_name),
      city:      str(re.city),
      year:      typeof re.year === 'number' ? re.year : undefined,
    }))
    .filter(re => re.eventName.length > 0)

  // Banddokumente (Paket 2A) -- deterministische Sortierung mit stabilem
  // Tie-Breaker (sort_order -> created_at -> id), siehe
  // lib/bands/bandDocumentsSort.ts. Zeilen ohne id/title/audience_label/
  // file_url werden verworfen (defensiv, diese Spalten sind in der DB NOT
  // NULL, sollte in der Praxis nicht vorkommen).
  const documents: BandDocument[] = asArr(r.band_documents as Row[] | null)
    .sort(compareBandDocuments)
    .map(doc => ({
      id:            str(doc.id) ?? '',
      title:         str(doc.title) ?? '',
      audienceLabel: str(doc.audience_label) ?? '',
      description:   str(doc.description),
      fileUrl:       str(doc.file_url) ?? '',
      thumbnailUrl:  str(doc.thumbnail_url),
    }))
    .filter(d => d.id.length > 0 && d.title.length > 0 && d.audienceLabel.length > 0 && d.fileUrl.length > 0)

  // Similar bands (band_relations, max 3, sorted by rank)
  // Nur kuratierte relation_type='similar' -- 'alternative'/'often_together'/
  // 'same_sound_world' sind keine "gefaellt mir"-Empfehlungen.
  const relations = asArr(r.band_relations as Row[] | null)
    .filter(rel => rel.relation_type === 'similar')
    .sort((a, b) => {
      const aR = typeof a.rank === 'number' ? a.rank : Infinity
      const bR = typeof b.rank === 'number' ? b.rank : Infinity
      return aR - bR
    })
    .slice(0, 3)

  const similarBands: SimilarBandReferences = {
    manual1: str((relations[0]?.target_band as Row)?.name),
    manual2: str((relations[1]?.target_band as Row)?.name),
    manual3: str((relations[2]?.target_band as Row)?.name),
  }

  // shortDescription: short_description → slogan → truncated main_text (markdown stripped)
  const shortDescription = str(profile.short_description) ?? str(profile.slogan) ?? (() => {
    const main = str(profile.main_text)
    if (!main) return undefined
    const stripped = main
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .trim()
    return stripped.length > 200 ? `${stripped.slice(0, 197)}…` : stripped
  })()

  const weddingInfo: WeddingInfo = {
    bandSize: typeof r.default_member_count === 'number'
      ? `${r.default_member_count} ${r.default_member_count === 1 ? 'Person' : 'Personen'}`
      : undefined,
    constellation:      str(profile.wedding_constellation),
    kidnappingBride:    profile.wedding_kidnapping_bride === true  ? true
                      : profile.wedding_kidnapping_bride === false ? false
                      : null,
    moderation:         profile.wedding_moderation === true  ? true
                      : profile.wedding_moderation === false ? false
                      : null,
    possiblePlaytimes:  str(profile.wedding_possible_playtimes),
    weddingDescription: str(profile.wedding_description),
  }
  // wedding_fee_range ist ein interner Admin-Richtwert und wird in der
  // öffentlichen Query bewusst nicht mehr geladen — RLS-Sicherheitsgrenze,
  // siehe lib/supabase/queries.ts. feeRange bleibt im WeddingInfo-Typ,
  // da der separate Airtable-Pfad (app/page.tsx, app/ueber-mich/page.tsx)
  // ihn weiterhin setzt.

  return {
    id:   String(r.id ?? ''),
    name,
    slug: str(r.slug) ?? '',
    status,

    category:     bandartNames[0],
    bandartNames,
    bandartSlugs,
    eventTypes,
    categorySlugs,
    anfrageEventTypes,

    klingtNach,
    moods,
    musikalischVerortet,

    shortDescription,
    description:     str(profile.main_text),
    metaDescription: str(profile.meta_description),

    // website_url lives on bands table (not band_profiles) per schema
    websiteUrl:      str(r.website_url),
    youtubeVideoUrl: str(youtubeVideo?.url),

    logo:           normalizeImg(logoRaw, `Logo von ${name}`),
    heroImage,
    thumbnailImage: thumbImg,
    gallery,

    location,
    weddingInfo,
    socialLinks,
    socialMediaStats,
    referenceEvents,
    similarBands,
    documents,
    homepageReady: false,
  }
}
