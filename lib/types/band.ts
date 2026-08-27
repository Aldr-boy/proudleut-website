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

// description (ab V1.1): freie, optionale oeffentliche Unterzeile
// zusaetzlich zum strukturierten year -- year bleibt bewusst integer und
// wird nicht zu Freitext umgebaut. Siehe components/band/BandReferenceEvents.tsx
// fuer die Kombinationslogik der Unterzeile.
export type ReferenceEvent = {
  eventName: string;
  venue?: string;
  city?: string;
  year?: number;
  description?: string;
};

// Admin-spezifisches Pendant zu ReferenceEvent (Referenzverwaltung im
// Band-Admin, V1/V1.1): eigenes DB-nahes Modell mit id/sortOrder fuer CRUD,
// bewusst getrennt vom oeffentlichen View-Model oben (keine Vermischung).
// event_type_id, url, is_featured sind weiterhin nicht Teil des
// Admin-Formulars und daher hier nicht abgebildet -- Admin-Updates lassen
// sie ueber public.fn_reference_event_update unveraendert. description ist
// ab V1.1 editierbar (siehe fn_reference_event_update-Ueberladung mit
// p_description).
export type AdminReferenceEvent = {
  id: string;
  eventName: string;
  locationName?: string;
  city?: string;
  year?: number;
  description?: string;
  sortOrder: number;
};

export type SimilarBandReferences = {
  manual1?: string;
  manual2?: string;
  manual3?: string;
};

// Optionales Banddokument fuer Veranstalter (z. B. PDF-Praesentation),
// siehe supabase/band_documents_migration.sql. fileUrl/thumbnailUrl sind
// volle oeffentliche URLs, analog ImageAsset.url. Bewusst minimal (Paket
// 2A) -- kein Dokumenttyp, kein konfigurierbarer CTA-Text.
export type BandDocument = {
  id: string;
  title: string;
  audienceLabel: string;
  description?: string;
  fileUrl: string;
  thumbnailUrl?: string;
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

// "Menschen hinter der Band" (Musiker-/Personenebene V1) -- ausschliesslich
// oeffentlich sichtbare Personen (RLS-gefiltert, siehe
// supabase/people_data_foundation_v1.sql: people.status='active',
// band_memberships.is_public=true). Analog anfrageEventTypes nur fuer
// Supabase-normalisierte Baender befuellt -- der Airtable-Pfad kennt keine
// Personenebene.
export type BandPersonInstrument = {
  name: string;
  slug: string;
};

export type BandPersonSummary = {
  id: string;
  name: string;
  slug: string;
  role?: string;
  instruments: BandPersonInstrument[];
  imageUrl?: string;
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

  // Nur fuer Supabase-normalisierte Baender befuellt (siehe
  // BandPersonSummary oben). Undefined statt leerem Array, wenn ueber
  // diesen Pfad gar nicht abgefragt wurde -- [] bedeutet "abgefragt, aber
  // aktuell niemand oeffentlich sichtbar".
  menschenHinterDerBand?: BandPersonSummary[];

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
  documents: BandDocument[];
  homepageReady: boolean;
};
