import type { Band, ReferenceEvent } from '../types/band';
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
  'Hauptkategorie/Bandart'?: string | string[];
  'Name (Kurzform)'?: string | string[];
  'Slug (from Hauptkategorie/Bandart)'?: string | string[];
  // Linked Record – liefert Record-IDs aus der Veranstaltungen-Tabelle.
  // Auflösung zu lesbaren Namen erfolgt über den eventTypeMap-Parameter.
  'Veranstaltungstypen'?: string[];
  'Main IMG - Hero'?: AirtableAttachment[];
  'Main IMG - Thumbnail'?: AirtableAttachment[];
  'Main IMG Alt-Text'?: string;
  'Gallery'?: AirtableAttachment[];
  'Bandlogo'?: AirtableAttachment[];
  'Website Link'?: string;
  'YouTube Video Link'?: string;
  'PLZ'?: unknown;
  // Lookup-Felder kommen als Array aus der Airtable API
  'plz (from Orte-Master)'?: unknown;
  'lat (from Orte-Master)'?: unknown;
  'lon (from Orte-Master)'?: unknown;
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
  'similar_1_name'?: unknown;
  'similar_2_name'?: unknown;
  'similar_3_name'?: unknown;
  'Referenz-Events'?: string;
  'Homepage-ready: ja/nein'?: string;
  // Kuratierte Stimmungs- und Stil-Tags (pipe-getrennt: "Tag A | Tag B | Tag C")
  'Klingt_Nach'?: string;
  'AI_Klingt_Nach_Vorschlag'?: string;
  'Musikalisch_Verortet'?: string;
  'AI_Musikalisch_Verortet_Vorschlag'?: string;
  // Social Media Statistiken (Lookup aus Tabelle „Social Media Index")
  // Airtable Lookup-Felder kommen als number[] – number als Fallback für Tests
  'IG_Followers'?: number[] | number;
  'IG_Following'?: number[] | number;
  'FB_Followers'?: number[] | number;
  'FB_Following'?: number[] | number;
  'YT_Subs'?: number[] | number;
};

export type RawAirtableBandRecord = {
  id: string;
  createdTime: string;
  fields: RawBandFields;
};

export type EventTypeEntry = { displayName: string; slug: string };

function str(value?: unknown): string | undefined {
  if (value == null) return undefined;
  // Linked Record Arrays nie als Text rendern
  if (Array.isArray(value)) return undefined;
  const s = typeof value === 'string' ? value : String(value);
  const trimmed = s.trim();
  // Airtable Record-IDs (rec + 10+ alphanumerische Zeichen) filtern
  if (/^rec[A-Za-z0-9]{10,}$/.test(trimmed)) return undefined;
  return trimmed || undefined;
}

function firstStr(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return str(raw);
}

function normalizeStatus(value?: string): Band['status'] {
  if (value === 'Active') return 'active';
  if (value === 'New') return 'new';
  return 'inactive';
}

function normalizeBoolean(value?: unknown): boolean | null {
  if (value == null) return null;
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (s === 'ja') return true;
    if (s === 'nein') return false;
  }
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

function normalizeReferenceEvents(raw?: string): ReferenceEvent[] {
  if (!raw) return [];
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      const yearRaw = parts[3] ? parseInt(parts[3], 10) : NaN;
      return {
        eventName: parts[0] ?? '',
        venue: parts[1] || undefined,
        city: parts[2] || undefined,
        year: isNaN(yearRaw) ? undefined : yearRaw,
      };
    })
    .filter((ev) => ev.eventName.length > 0);
}

function firstNumber(value?: number | number[]): number | undefined {
  if (typeof value === 'number') return value;
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === 'number');
    return typeof first === 'number' ? first : undefined;
  }
  return undefined;
}

function parseCoord(value: unknown): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw == null) return undefined;
  const n = typeof raw === 'number' ? raw
    : parseFloat(String(raw).replace(',', '.'));
  return isFinite(n) ? n : undefined;
}

function splitPipe(value?: string): string[] {
  if (!value) return [];
  return value.split('|').map((s) => s.trim()).filter(Boolean);
}

function normalizeStringArray(value: unknown): string[] {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.map((v) => String(v).trim()).filter(Boolean);
}

function resolveEventTypes(
  rawIds?: string[],
  eventTypeMap?: Map<string, EventTypeEntry>
): { eventTypes: string[]; categorySlugs: string[] } {
  if (!rawIds?.length || !eventTypeMap) return { eventTypes: [], categorySlugs: [] };
  const eventTypes: string[] = [];
  const categorySlugs: string[] = [];
  for (const id of rawIds) {
    const entry = eventTypeMap.get(id);
    if (entry) {
      eventTypes.push(entry.displayName);
      categorySlugs.push(entry.slug);
    }
  }
  return { eventTypes, categorySlugs };
}

export function normalizeBand(
  record: RawAirtableBandRecord,
  eventTypeMap?: Map<string, EventTypeEntry>
): Band {
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

  const { eventTypes, categorySlugs } = resolveEventTypes(
    f['Veranstaltungstypen'],
    eventTypeMap
  );

  const bandartNames = normalizeStringArray(f['Name (Kurzform)']);
  const bandartSlugs = normalizeStringArray(f['Slug (from Hauptkategorie/Bandart)']);

  return {
    id: record.id,
    name,
    slug: str(f['Slug']) ?? '',
    status: normalizeStatus(f['Webflow Status']),
    bandartNames,
    bandartSlugs,
    category: bandartNames[0],
    eventTypes,
    categorySlugs,
    klingtNach: splitPipe(str(f['Klingt_Nach']) ?? str(f['AI_Klingt_Nach_Vorschlag'])),
    musikalischVerortet: splitPipe(str(f['Musikalisch_Verortet']) ?? str(f['AI_Musikalisch_Verortet_Vorschlag'])),
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
      postalCode: firstStr(f['plz (from Orte-Master)']) ?? firstStr(f['PLZ']),
      latitude: parseCoord(f['lat (from Orte-Master)']),
      longitude: parseCoord(f['lon (from Orte-Master)']),
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
    socialMediaStats: {
      igFollowers: firstNumber(f['IG_Followers']),
      igFollowing: firstNumber(f['IG_Following']),
      fbFollowers: firstNumber(f['FB_Followers']),
      fbFollowing: firstNumber(f['FB_Following']),
      ytSubscribers: firstNumber(f['YT_Subs']),
    },
    referenceEvents: normalizeReferenceEvents(f['Referenz-Events']),
    similarBands: {
      manual1: firstStr(f['similar_1_name']),
      manual2: firstStr(f['similar_2_name']),
      manual3: firstStr(f['similar_3_name']),
    },
    homepageReady: normalizeBoolean(f['Homepage-ready: ja/nein']) === true,
  };
}
