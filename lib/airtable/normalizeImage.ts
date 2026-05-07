import type { ImageAsset } from '../types/image';

export type AirtableAttachment = {
  id: string;
  url: string;
  filename: string;
  size?: number;
  type?: string;
  width?: number;
  height?: number;
};

export function normalizeImage(
  attachment: AirtableAttachment | undefined,
  fallbackAlt: string
): ImageAsset | undefined {
  if (!attachment?.url) return undefined;
  return {
    url: attachment.url,
    alt: fallbackAlt,
    width: attachment.width,
    height: attachment.height,
    source: 'airtable',
  };
}

export function normalizeImageArray(
  attachments: AirtableAttachment[] | undefined,
  fallbackAlt: string
): ImageAsset[] {
  if (!attachments?.length) return [];
  return attachments
    .map((att) => normalizeImage(att, fallbackAlt))
    .filter((img): img is ImageAsset => img !== undefined);
}
