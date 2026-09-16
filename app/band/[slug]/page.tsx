import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getBandFromSupabase, getAllBandsFromSupabase } from '@/lib/supabase/queries';
import { normalizeBandFromSupabase } from '@/lib/supabase/normalizeBand';
import { generateBandJsonLd } from '@/lib/seo/jsonLd';
import { absoluteUrl, isAbsoluteHttpsUrl, DEFAULT_SOCIAL_IMAGE } from '@/lib/seo/metadata';
import { getSimilarBands } from '@/lib/bands/similarBands';
import BandCard from '@/components/BandCard';
import { BandHero } from '@/components/band/BandHero';
import { BandTagsSection } from '@/components/band/BandTagsSection';
import { BandDescription } from '@/components/band/BandDescription';
import { BandPeopleSection } from '@/components/band/BandPeopleSection';
import { BandReferenceEvents } from '@/components/band/BandReferenceEvents';
import { BandGallery } from '@/components/band/BandGallery';
import { BandDocumentsSection } from '@/components/band/BandDocumentsSection';
import { BandWeddingModule } from '@/components/band/BandWeddingModule';
import { BandContactSection } from '@/components/band/BandContactSection';
import { BandFloatingCta } from '@/components/band/BandFloatingCta';
import { BandVideoSection } from '@/components/band/BandVideoSection';
import { getYouTubeEmbedUrl } from '@/lib/youtube';

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

// --- Metadata ---

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await getBandFromSupabase(slug);
  if (!data) return {};
  const band = normalizeBandFromSupabase(data);
  const description =
    band.metaDescription ||
    band.shortDescription ||
    `${band.name} – Liveband bei proudleut`;
  const canonicalUrl = absoluteUrl(`/band/${band.slug}`);
  const socialImage = isAbsoluteHttpsUrl(band.heroImage?.url)
    ? {
        url: band.heroImage!.url,
        alt: band.heroImage!.alt,
        ...(band.heroImage!.width && band.heroImage!.height
          ? { width: band.heroImage!.width, height: band.heroImage!.height }
          : {}),
      }
    : DEFAULT_SOCIAL_IMAGE;

  return {
    title: band.name,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: band.name,
      description,
      url: canonicalUrl,
      type: 'website',
      images: [socialImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: band.name,
      description,
      images: [socialImage.url],
    },
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
  const hasVideo = embedUrl !== null;

  return (
    <article className="bg-pl-canvas pb-24 md:pb-0">
      {/* JSON-LD – produktiv, kein Debug */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero: vollflaechiges Bandbild, Name, Logo, Aktionen bereits im
          Einstieg (Auftrag "Bandseiten-Redesign", Abschnitt 5) */}
      <BandHero band={band} hasVideo={hasVideo} />

      {/* 01 – Wer steht hier auf der Bühne? */}
      <BandDescription band={band} />
      <BandPeopleSection band={band} />

      {/* 02 – Wie klingt sie live? (Video, Klingt nach, Buehnenbilder auf
          einer dunklen Flaeche zusammengefuehrt -- die einzige "emotionale
          Insel" neben dem Hero, siehe BandVideoSection.tsx) */}
      <BandVideoSection band={band} embedUrl={embedUrl} />

      <BandGallery band={band} />

      {/* 03 – Passt sie zu eurem Anlass? */}
      <BandTagsSection band={band} />
      <BandReferenceEvents band={band} />
      <BandDocumentsSection band={band} />
      <BandWeddingModule band={band} />

      {/* Sentinel für BandFloatingCta: markiert den Beginn des finalen Anfragebereichs,
          damit der Sticky-CTA weiss, wann er wieder ausblenden muss. */}
      <div id="final-cta-sentinel" aria-hidden="true" className="h-px" />
      <BandContactSection band={band} websiteUrl={websiteUrl} />

      <BandFloatingCta
        name={band.name}
        slug={band.slug}
        anfrageEventTypes={band.anfrageEventTypes ?? []}
        heroSentinelId="hero-cta-sentinel"
        finalSentinelId="final-cta-sentinel"
        hasVideo={hasVideo}
      />

      {/* Ähnliche Bands */}
      {similarBands.length > 0 ? (
        <section className="bg-pl-canvas border-t border-pl-soft py-16 md:py-20 px-4 sm:px-6">
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
