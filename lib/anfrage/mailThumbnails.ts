import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { BAND_MEDIA_BUCKET } from '../bandImages/storagePath.ts';

// Quadratische Vorschaubilder (192x192 JPEG, unter 30 KB) fuer die
// Veranstalter-Bestaetigung v3. Die Mail bekommt niemals das Originalbild.
// Das Vorschaubild wird beim ersten Versand erzeugt und im Bucket
// band-media unter mail-thumbs/ abgelegt; der Dateiname enthaelt einen Hash
// der Quell-URL, ein getauschtes Bandfoto erzeugt also automatisch ein neues
// Vorschaubild. Jeder Fehler liefert null -- die Mail zeigt dann die Karte
// ohne Foto (Name und Button bleiben), der Versand wird nie blockiert.
export const MAIL_THUMB_SIZE = 192;
export const MAIL_THUMB_MAX_BYTES = 30 * 1024;
const MAIL_THUMB_PREFIX = 'mail-thumbs';
const QUALITIES = [78, 70, 62, 54, 46, 38];

export async function renderMailThumbnail(source: Uint8Array): Promise<Buffer | null> {
  for (const quality of QUALITIES) {
    const out = await sharp(Buffer.from(source), { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(MAIL_THUMB_SIZE, MAIL_THUMB_SIZE, { fit: 'cover', position: 'attention' })
      .flatten({ background: '#f4f2ee' })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    if (out.length <= MAIL_THUMB_MAX_BYTES) return out;
  }
  return null;
}

export function buildMailThumbPath(slug: string, sourceUrl: string): string {
  const hash = createHash('sha1').update(sourceUrl).digest('hex').slice(0, 10);
  return `${MAIL_THUMB_PREFIX}/${slug}-${hash}.jpg`;
}

export async function ensureMailThumbnail(
  client: SupabaseClient,
  slug: string,
  sourceUrl: string | null
): Promise<string | null> {
  if (!slug || !sourceUrl) return null;
  try {
    const path = buildMailThumbPath(slug, sourceUrl);
    const bucket = client.storage.from(BAND_MEDIA_BUCKET);
    const publicUrl = bucket.getPublicUrl(path).data.publicUrl;

    const existing = await fetch(publicUrl, { method: 'HEAD' });
    if (existing.ok) return publicUrl;

    const res = await fetch(sourceUrl);
    if (!res.ok) return null;
    const jpeg = await renderMailThumbnail(new Uint8Array(await res.arrayBuffer()));
    if (!jpeg) return null;

    const { error } = await bucket.upload(path, jpeg, { contentType: 'image/jpeg', upsert: true });
    if (error) {
      console.error('[anfrage] Vorschaubild konnte nicht gespeichert werden', { slug, error: error.message });
      return null;
    }
    return publicUrl;
  } catch (err) {
    console.error('[anfrage] Vorschaubild konnte nicht erzeugt werden', {
      slug,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
