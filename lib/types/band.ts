import type { ImageAsset } from './image';

export type BandLocation = {
  postalCode?: string;
  city?: string;
  district?: string;
  administrativeRegion?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
};

export type WeddingInfo = {
  bandSize?: string;
  constellation?: string;
  kidnappingBride?: boolean | null;
  feeRange?: string;
  moderation?: boolean | null;
  possiblePlaytimes?: string;
  weddingDescription?: string;
};

export type SocialLinks = {
  facebook?: string;
  instagram?: string;
  spotify?: string;
  youtube?: string;
};

export type SocialMediaStats = {
  igFollowers?: number;
  igFollowing?: number;
  fbFollowers?: number;
  fbFollowing?: number;
  ytSubscribers?: number;
};

export type ReferenceEvent = {
  eventName: string;
  venue?: string;
  city?: string;
  year?: number;
};

export type SimilarBandReferences = {
  manual1?: string;
  manual2?: string;
  manual3?: string;
};

// "Klingt nach"-Mood mit stabilem Slug fuer URL-/Filterabgleich (z. B.
// /bands?mood=<slug>) -- klingtNach (Namen) bleibt fuer bestehende
// Anzeige-Verbraucher unveraendert erhalten, moods ist die zusaetzliche,
// klar typisierte Struktur fuer den Slug-Abgleich.
export type BandMood = {
  name: string;
  slug: string;
};

// Block "Event-Type-Anfrage-Label V1": eventTypes (Namen) bleibt fuer
// bestehende Anzeige-Verbraucher (Chips, Cards, Admin, JSON-LD)
// unveraendert erhalten. anfrageEventTypes ist die zusaetzliche, klar
// typisierte Struktur ausschliesslich fuer den nativen Anfragekontext:
// Schnittmengenbildung ueber slug (kanonische Identitaet), Anzeige/Submit
// ueber anfrageLabel ?? name. anfrageLabel ist null, wenn der Event Type
// kein eigenes Anfrage-Label hat (Fallback auf name).
export type BandAnfrageEventType = {
  name: string;
  slug: string;
  anfrageLabel: string | null;
};

export type Band = {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'new' | 'inactive';

  category?: string;
  bandartNames: string[];
  bandartSlugs: string[];
  eventTypes: string[];
  categorySlugs?: string[];
  // Optional wie categorySlugs: ausschliesslich fuer Supabase-normalisierte
  // Baender befuellt (siehe lib/supabase/normalizeBand.ts). Der Airtable-
  // Pfad (lib/airtable/normalizeBand.ts) liefert dieses Feld bewusst nicht
  // -- die Legacy-Anfrage-/Kontakt-Flows, die Airtable-Baender verwenden,
  // sind nicht Teil des nativen Anfragesystems.
  anfrageEventTypes?: BandAnfrageEventType[];

  klingtNach: string[];
  moods: BandMood[];
  musikalischVerortet: string[];

  shortDescription?: string;
  description?: string;
  metaDescription?: string;

  websiteUrl?: string;
  youtubeVideoUrl?: string;

  logo?: ImageAsset;
  heroImage?: ImageAsset;
  thumbnailImage?: ImageAsset;
  gallery: ImageAsset[];

  location: BandLocation;
  weddingInfo?: WeddingInfo;
  socialLinks: SocialLinks;
  socialMediaStats?: SocialMediaStats;
  referenceEvents: ReferenceEvent[];
  similarBands: SimilarBandReferences;
  homepageReady: boolean;
};
