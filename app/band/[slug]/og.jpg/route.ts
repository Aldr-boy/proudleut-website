import sharp from 'sharp';
import { getBandFromSupabase } from '@/lib/supabase/queries';
import { normalizeBandFromSupabase } from '@/lib/supabase/normalizeBand';
import { isAbsoluteHttpsUrl } from '@/lib/seo/metadata';
import {
  SOCIAL_IMAGE_HEIGHT,
  SOCIAL_IMAGE_MAX_BYTES,
  SOCIAL_IMAGE_WIDTH,
  computeSocialCrop,
} from '@/lib/seo/socialImage';

// Link-Vorschau-Bild (og:image) einer Bandseite: Hauptbild, auf 1200x630
// zugeschnitten (Regel und Fokus siehe lib/seo/socialImage.ts), JPEG moeglichst
// unter 300 KB. Oeffentlich, ohne Anmeldung. Ohne Hauptbild: 404 (die Bandseite
// verweist dann gar nicht hierher, sondern auf das allgemeine Bild).
export const dynamic = 'force-dynamic';

const QUALITIES = [78, 70, 62, 54, 46];
const CACHE = 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = await getBandFromSupabase(slug);
  if (!data) return new Response('Not found', { status: 404 });

  const sourceUrl = normalizeBandFromSupabase(data).heroImage?.url;
  if (!isAbsoluteHttpsUrl(sourceUrl)) return new Response('Not found', { status: 404 });

  try {
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return new Response('Bad gateway', { status: 502 });
    const source = Buffer.from(await res.arrayBuffer());

    const meta = await sharp(source, { limitInputPixels: 50_000_000 }).metadata();
    if (!meta.width || !meta.height) return new Response('Bad gateway', { status: 502 });
    // EXIF-Drehung: bei 90-Grad-Lagen sind Breite und Hoehe vertauscht.
    const rotated = (meta.orientation ?? 1) >= 5;
    const crop = computeSocialCrop(rotated ? meta.height : meta.width, rotated ? meta.width : meta.height);

    let out: Buffer | null = null;
    for (const quality of QUALITIES) {
      out = await sharp(source, { limitInputPixels: 50_000_000 })
        .rotate()
        .resize(crop.resizeWidth, crop.resizeHeight)
        .extract({ left: crop.left, top: crop.top, width: SOCIAL_IMAGE_WIDTH, height: SOCIAL_IMAGE_HEIGHT })
        .flatten({ background: '#f4f2ee' })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
      if (out.length <= SOCIAL_IMAGE_MAX_BYTES) break;
    }

    return new Response(new Uint8Array(out!), {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': CACHE },
    });
  } catch {
    return new Response('Bad gateway', { status: 502 });
  }
}
