import type { ImageAsset } from '../types/image'
import type {
  Band,
  BandLocation,
  ReferenceEvent,
  SimilarBandReferences,
  SocialLinks,
  WeddingInfo,
} from '../types/band'

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

  // klingtNach = sound_worlds + moods (sound_worlds first, each by sort_order)
  const soundWorldNames = asArr(r.band_sound_worlds as Row[] | null)
    .sort(bySortOrder)
    .map(sw => str((sw.sound_worlds as Row)?.name))
    .filter((n): n is string => n !== undefined)

  const moodNames = asArr(r.band_moods as Row[] | null)
    .sort(bySortOrder)
    .map(bm => str((bm.moods as Row)?.name))
    .filter((n): n is string => n !== undefined)

  const klingtNach = [...soundWorldNames, ...moodNames]

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

  // Similar bands (band_relations, max 3, sorted by rank)
  const relations = asArr(r.band_relations as Row[] | null)
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
    feeRange:           str(profile.wedding_fee_range),
    moderation:         profile.wedding_moderation === true  ? true
                      : profile.wedding_moderation === false ? false
                      : null,
    possiblePlaytimes:  str(profile.wedding_possible_playtimes),
    weddingDescription: str(profile.wedding_description),
  }

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

    klingtNach,
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
    homepageReady: false,
  }
}
