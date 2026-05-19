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

export type Band = {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'new' | 'inactive';

  category?: string;
  eventTypes: string[];
  categorySlugs?: string[];

  klingtNach: string[];
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
