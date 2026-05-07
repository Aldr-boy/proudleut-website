export type ImageAsset = {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  source: 'airtable' | 'sanity' | 'static' | 'external';
};
