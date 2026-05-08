import type { ImageAsset } from './image';

export type BandLocation = {
  postalCode?: string;
  city?: string;
  district?: string;
  administrativeRegion?: string;
  state?: string;
  country?: string;
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

export type SimilarBandReferences = {
  manual1?: string;
  manual2?: string;
  manual3?: string;
};

export type Band = {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'new' | 'inactive';

  category?: string;
  eventTypes: string[];
  categorySlugs?: string[];

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
  similarBands: SimilarBandReferences;
};
