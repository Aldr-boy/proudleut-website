import type { Band } from '../types/band';
import { normalizeImage, normalizeImageArray } from './normalizeImage';
import type { AirtableAttachment } from './normalizeImage';

type RawBandFields = {
  'Bandname'?: string;
  'Slug'?: string;
  'Webflow Status'?: string;
  // Tippfehler im Airtable-Feldnamen ist hier bewusst gekapselt
  'Short Descripton / Subheadline'?: string;
  'Main Text'?: string;
  'Meta Description'?: string;
  'Hauptkategorie/Bandart'?: string;
  // Linked Record – gibt Record-IDs zurück, nicht lesbare Namen.
  // Phase 1A: event_keys wird stattdessen verwendet (siehe parseEventKeys).
  // TODO Phase 2: PAT um Veranstaltungstypen-Tabelle erweitern, dann ID→Name-Lookup einbauen.
  'Veranstaltungstypen'?: string[];
  'event_keys'?: string;
  'Main IMG - Hero'?: AirtableAttachment[];
  'Main IMG - Thumbnail'?: AirtableAttachment[];
  'Main IMG Alt-Text'?: string;
  'Gallery'?: AirtableAttachment[];
  'Bandlogo'?: AirtableAttachment[];
  'Website Link'?: string;
  'YouTube Video Link'?: string;
  'PLZ'?: unknown;
  // Lookup-Felder kommen als Array aus der Airtable API
  'orte (from Orte-Master)'?: string[];
  'landkreise (from Orte-Master)'?: string[];
  'regierungsbezirk (from Orte-Master)'?: string[];
  'bundesland (from Orte-Master)'?: string[];
  'Info - Bandgröße'?: string;
  'Info - Konstellation'?: string;
  'Info - Brautentführung'?: string;
  'Info - Gagenniveau'?: string;
  'Info - Moderation'?: string;
  'Info - Mögliche Spieldauer'?: string;
  'Info - So feiern wir Hochzeit'?: string;
  'Social - Facebook'?: string;
  'Social - Instagram'?: string;
  'Social - Spotify'?: string;
  'Social - YouTube'?: string;
  'similar_1'?: string;
  'similar_2'?: string;
  'similar_3'?: string;
};

export type RawAirtableBandRecord = {
  id: string;
  createdTime: string;
  fields: RawBandFields;
};

function str(value?: unknown): string | undefined {
  if (value == null) return undefined;
  const s = typeof value === 'string' ? value : String(value);
  return s.trim() || undefined;
}

function normalizeStatus(value?: string): Band['status'] {
  if (value === 'Active') return 'active';
  if (value === 'New') return 'new';
  return 'inactive';
}

function normalizeBoolean(value?: unknown): boolean | null {
  if (value === 'ja' || value === true) return true;
  if (value === 'nein' || value === false) return false;
  return null;
}

function normalizeUrl(value?: unknown): string | undefined {
  const raw = str(value);
  if (!raw) return undefined;
  const withProtocol = raw.startsWith('http') ? raw : `https://${raw}`;
  try {
    new URL(withProtocol);
    return withProtocol;
  } catch {
    return undefined;
  }
}

// Sonderzeichen-Mapping für Airtable event_keys Slugs (Webflow-Konvention)
const EVENT_KEY_OVERRIDES: Record<string, string> = {
  'firmenfeier-business-event': 'Firmenfeier & Business Event',
  'staedtische-veranstaltung': 'Städtische Veranstaltung',
  'buergerfest': 'Bürgerfest',
  'oeffentliche-veranstaltung': 'Öffentliche Veranstaltung',
};

function slugToDisplayName(slug: string): string {
  if (EVENT_KEY_OVERRIDES[slug]) return EVENT_KEY_OVERRIDES[slug];
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Phase 1A: event_keys als Workaround für Veranstaltungstypen (Linked Record).
// event_keys enthält kommagetrennte Slugs aus Webflow-Ära, z.B. "festzelt, hochzeit".
// TODO Phase 2: Durch ID→Name-Lookup gegen Veranstaltungstypen-Tabelle ersetzen.
function parseEventKeys(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(slugToDisplayName);
}

export function normalizeBand(record: RawAirtableBandRecord): Band {
  const f = record.fields;
  const name = str(f['Bandname']) ?? 'Unbekannte Band';
  const altText = str(f['Main IMG Alt-Text']) ?? `Livefoto von ${name}`;

  const heroImage = normalizeImage(f['Main IMG - Hero']?.[0], altText);
  const thumbnailImage = normalizeImage(
    f['Main IMG - Thumbnail']?.[0],
    `Livefoto von ${name}`
  );
  const gallery = normalizeImageArray(f['Gallery'], `Livefoto von ${name}`);

  // Fallback-Kette: Hero → Thumbnail → erstes Gallery-Bild
  const resolvedHeroImage = heroImage ?? thumbnailImage ?? gallery[0];

  let shortDescription = str(f['Short Descripton / Subheadline']);
  if (!shortDescription) {
    const desc = str(f['Main Text']);
    if (desc) {
      shortDescription = desc.length > 200 ? `${desc.slice(0, 197)}…` : desc;
    }
  }

  return {
    id: record.id,
    name,
    slug: str(f['Slug']) ?? '',
    status: normalizeStatus(f['Webflow Status']),
    category: str(f['Hauptkategorie/Bandart']),
    eventTypes: parseEventKeys(f['event_keys']),
    shortDescription,
    description: str(f['Main Text']),
    metaDescription: str(f['Meta Description']),
    websiteUrl: normalizeUrl(f['Website Link']),
    youtubeVideoUrl: normalizeUrl(f['YouTube Video Link']),
    logo: normalizeImage(f['Bandlogo']?.[0], `Logo von ${name}`),
    heroImage: resolvedHeroImage,
    thumbnailImage,
    gallery,
    location: {
      postalCode: str(f['PLZ']),
      city: f['orte (from Orte-Master)']?.[0],
      district: f['landkreise (from Orte-Master)']?.[0],
      administrativeRegion: f['regierungsbezirk (from Orte-Master)']?.[0],
      state: f['bundesland (from Orte-Master)']?.[0],
      country: 'Deutschland',
    },
    weddingInfo: {
      bandSize: str(f['Info - Bandgröße']),
      constellation: str(f['Info - Konstellation']),
      kidnappingBride: normalizeBoolean(f['Info - Brautentführung']),
      feeRange: str(f['Info - Gagenniveau']),
      moderation: normalizeBoolean(f['Info - Moderation']),
      possiblePlaytimes: str(f['Info - Mögliche Spieldauer']),
      weddingDescription: str(f['Info - So feiern wir Hochzeit']),
    },
    socialLinks: {
      facebook: normalizeUrl(f['Social - Facebook']),
      instagram: normalizeUrl(f['Social - Instagram']),
      spotify: normalizeUrl(f['Social - Spotify']),
      youtube: normalizeUrl(f['Social - YouTube']),
    },
    similarBands: {
      manual1: str(f['similar_1']),
      manual2: str(f['similar_2']),
      manual3: str(f['similar_3']),
    },
  };
}
