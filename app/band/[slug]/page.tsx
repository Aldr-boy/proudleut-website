import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getBandFromSupabase, getAllBandsFromSupabase } from '@/lib/supabase/queries';
import { normalizeBandFromSupabase } from '@/lib/supabase/normalizeBand';
import { generateBandJsonLd } from '@/lib/seo/jsonLd';
import { getSimilarBands } from '@/lib/bands/similarBands';
import BandCard from '@/components/BandCard';
import { BandHero } from '@/components/band/BandHero';
import { BandTagsSection } from '@/components/band/BandTagsSection';
import { BandDescription } from '@/components/band/BandDescription';
import { BandReferenceEvents } from '@/components/band/BandReferenceEvents';
import { BandGallery } from '@/components/band/BandGallery';
import { BandWeddingModule } from '@/components/band/BandWeddingModule';
import { BandSocialIndex } from '@/components/band/BandSocialIndex';
import { BandContactSection } from '@/components/band/BandContactSection';
import { HeroCTA } from '@/components/band/HeroCTA';
import { BandVideoSection } from '@/components/band/BandVideoSection';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ slug: string }> };

// --- Inline helpers ---

function safeUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol === 'javascript:') return null;
    return u.href;
  } catch {
    return null;
  }
}

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname === 'youtu.be') {
      id = u.pathname.slice(1).split('?')[0];
    } else if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') {
        id = u.searchParams.get('v');
      } else if (u.pathname.startsWith('/embed/')) {
        id = u.pathname.replace('/embed/', '').split('?')[0];
      } else if (u.pathname.startsWith('/shorts/')) {
        id = u.pathname.replace('/shorts/', '').split('?')[0];
      }
    }
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return `https://www.youtube-nocookie.com/embed/${id}`;
  } catch {
    return null;
  }
}

// --- Metadata ---

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await getBandFromSupabase(slug);
  if (!data) return {};
  const band = normalizeBandFromSupabase(data);
  return {
    title: band.name,
    description:
      band.metaDescription ||
      band.shortDescription ||
      `${band.name} – Liveband bei proudleut`,
  };
}

// --- Page ---

export default async function BandPage({ params }: PageProps) {
  const { slug } = await params;

  const [{ data, error }, { data: allBandsData }] = await Promise.all([
    getBandFromSupabase(slug),
    getAllBandsFromSupabase(),
  ]);
  if (error || !data) notFound();
  const band = normalizeBandFromSupabase(data);
  const allBands = (allBandsData ?? []).map(normalizeBandFromSupabase);

  const jsonLd = generateBandJsonLd(band);
  const websiteUrl = safeUrl(band.websiteUrl);
  const embedUrl = getYouTubeEmbedUrl(band.youtubeVideoUrl);
  const similarBands = getSimilarBands(band, allBands);


  return (
    <article className="bg-pl-canvas">
      {/* JSON-LD – produktiv, kein Debug */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <BandHero band={band} />
      <HeroCTA name={band.name} slug={band.slug} eventTypes={band.eventTypes ?? []} />
      <BandTagsSection band={band} />
      <BandVideoSection embedUrl={embedUrl} bandName={band.name} />
      <BandDescription band={band} />
      {(() => {
        const hasReferenceEvents = band.referenceEvents.length > 0;
        const s = band.socialMediaStats;
        const hasSocialStats = !!(s?.igFollowers || s?.fbFollowers || s?.ytSubscribers);
        const both = hasReferenceEvents && hasSocialStats;
        if (!hasReferenceEvents && !hasSocialStats) return null;
        return (
          <section className="bg-pl-stage">
            <BandReferenceEvents band={band} compactBottom={both} />
            {both && <div className="border-t border-white/10" />}
            <BandSocialIndex band={band} compactTop={both} />
          </section>
        );
      })()}
      <BandGallery band={band} />
      <BandWeddingModule band={band} />
      <BandContactSection band={band} websiteUrl={websiteUrl} />

      {/* Ähnliche Bands */}
      {similarBands.length > 0 ? (
        <section className="bg-pl-canvas border-t border-pl-soft py-12 md:py-16 px-4 sm:px-6">
          <div className="pl-container-shell">
            <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-2">
              Ähnliche Bands
            </p>
            <h2 className="text-xl font-bold text-pl-text mb-2">Wenn dir diese Band gefällt</h2>
            <p className="text-sm text-pl-text-muted mb-8">
              Weitere Livebands mit ähnlichem Gefühl, Sound oder Anlass.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarBands.map((b) => (
                <BandCard key={b.slug} band={b} />
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/bands"
                className="inline-flex items-center px-6 py-3 rounded-full text-sm font-semibold
                           border border-pl-soft text-pl-text-muted
                           hover:border-pl-medium hover:text-pl-text motion-safe:transition-colors"
              >
                Mehr Livebands entdecken →
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-pl-canvas border-t border-pl-soft py-10 md:py-12 px-4 sm:px-6 text-center">
          <div className="max-w-xl mx-auto">
            <p className="text-pl-text-muted leading-relaxed mb-6">
              Noch nicht die richtige Band? Entdecke weitere Livebands auf proudleut.
            </p>
            <Link
              href="/bands"
              className="inline-flex items-center px-6 py-3 rounded-full text-sm font-semibold
                         border border-pl-soft text-pl-text-muted
                         hover:border-pl-medium hover:text-pl-text motion-safe:transition-colors"
            >
              Alle Bands entdecken
            </Link>
          </div>
        </section>
      )}
    </article>
  );
}
