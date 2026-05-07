import type { Band } from '../types/band';
import { normalizeImage, normalizeImageArray } from './normalizeImage';
import type { AirtableAttachment } from './normalizeImage';

type RawBandFields = {
  'Bandname'?: string;
  'Slug'?: string;
  'Webflow Status'?: string;
  // Tippfehler im Airtable-Feldnamen ist hier bewusst gekapselt
  'Short Descripton /...'?: string;
  'Main Text'?: string;
  'Meta Description'?: string;
  'Hauptkategorie/Bandart'?: string;
  'Veranstaltungstypen'?: string[];
  'Main IMG - Hero'?: AirtableAttachment[];
  'Main IMG - Thumbnail'?: AirtableAttachment[];
  'Main IMG - Alt-Text'?: string;
  'Gallery'?: AirtableAttachment[];
  'Bandlogo'?: AirtableAttachment[];
  'Website Link'?: string;
  'YouTube Video Link'?: string;
  'PLZ'?: string;
  // Lookup-Felder kommen als Array aus der Airtable API
  'Orte (from Orte-Master)'?: string[];
  'landkreise (from Orte-Master)'?: string[];
  'regierungsbezirk (from Orte-Master)'?: string[];
  'bundesland (from AT-PLZ Referenz)'?: string[];
  'Info - Bandgröße'?: string;
  'Info - Konstellation'?: string;
  'Info - Brautentführung'?: string;
  'Info - Gagenniveau'?: string;
  'Info - Moderation'?: string;
  'Info - Mögliche...'?: string;
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

export function normalizeBand(record: RawAirtableBandRecord): Band {
  const f = record.fields;
  const name = str(f['Bandname']) ?? 'Unbekannte Band';
  const altText = str(f['Main IMG - Alt-Text']) ?? `Livefoto von ${name}`;

  const heroImage = normalizeImage(f['Main IMG - Hero']?.[0], altText);
  const thumbnailImage = normalizeImage(
    f['Main IMG - Thumbnail']?.[0],
    `Livefoto von ${name}`
  );
  const gallery = normalizeImageArray(f['Gallery'], `Livefoto von ${name}`);

  // Fallback-Kette: Hero → Thumbnail → erstes Gallery-Bild
  const resolvedHeroImage = heroImage ?? thumbnailImage ?? gallery[0];

  let shortDescription = str(f['Short Descripton /...']);
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
    eventTypes: f['Veranstaltungstypen'] ?? [],
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
      city: f['Orte (from Orte-Master)']?.[0],
      district: f['landkreise (from Orte-Master)']?.[0],
      administrativeRegion: f['regierungsbezirk (from Orte-Master)']?.[0],
      state: f['bundesland (from AT-PLZ Referenz)']?.[0],
      country: 'Deutschland',
    },
    weddingInfo: {
      bandSize: str(f['Info - Bandgröße']),
      constellation: str(f['Info - Konstellation']),
      kidnappingBride: normalizeBoolean(f['Info - Brautentführung']),
      feeRange: str(f['Info - Gagenniveau']),
      moderation: normalizeBoolean(f['Info - Moderation']),
      possiblePlaytimes: str(f['Info - Mögliche...']),
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
