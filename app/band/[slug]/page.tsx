import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getBandFromSupabase, getAllBandsFromSupabase } from '@/lib/supabase/queries';
import { normalizeBandFromSupabase } from '@/lib/supabase/normalizeBand';
import { generateBandJsonLd } from '@/lib/seo/jsonLd';
import { absoluteUrl, isAbsoluteHttpsUrl, DEFAULT_SOCIAL_IMAGE } from '@/lib/seo/metadata';
import { getSimilarBands } from '@/lib/bands/similarBands';
import { getThemePagesForBand } from '@/lib/content/themePages';
import { buildBandTitle } from '@/lib/seo/bandTitle';
import { SOCIAL_IMAGE_HEIGHT, SOCIAL_IMAGE_WIDTH } from '@/lib/seo/socialImage';
import { formatLocation } from '@/lib/utils/formatLocation';
import { getSoloFirstName } from '@/lib/bands/solo';
import { SimilarBandCard } from '@/components/band/SimilarBandCard';
import { BandHero } from '@/components/band/BandHero';
import { BandTagsSection } from '@/components/band/BandTagsSection';
import { BandDescription } from '@/components/band/BandDescription';
import { BandPeopleSection } from '@/components/band/BandPeopleSection';
import { BandContactSection } from '@/components/band/BandContactSection';
import { BandCtaSection } from '@/components/band/BandCtaSection';
import { BandFloatingCta } from '@/components/band/BandFloatingCta';
import { HidePrivacyFloatButton } from '@/components/band/HidePrivacyFloatButton';
import { BandGallerySection } from '@/components/band/BandGallerySection';
import { getYouTubeEmbedUrl } from '@/lib/youtube';
import { getBandFacts } from '@/lib/bands/bandFacts';
import { VideoModalProvider } from '@/components/band/VideoModalProvider';
import { HERO_ANFRAGE_BUTTON_ID } from '@/components/band/HeroCTA';

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
  // Link-Vorschau (WhatsApp u. a.): Titel "<Bandname> · proudleut", Beschreibung =
  // Spruch, ohne Spruch die Genre-Zeile wie im Header; Bild = Hauptbild auf
  // 1200x630 zugeschnitten (og.jpg/route.ts), ohne Hauptbild das allgemeine Bild.
  const socialTitle = `${band.name} · proudleut`;
  const genreLine = [band.bandartLabel ?? band.category, band.hideLocation ? '' : formatLocation(band.location)]
    .filter(Boolean)
    .join(' · ');
  const socialDescription = band.shortDescriptionExplicit || genreLine || description;
  const socialImage = isAbsoluteHttpsUrl(band.heroImage?.url)
    ? {
        url: absoluteUrl(`/band/${band.slug}/og.jpg`),
        width: SOCIAL_IMAGE_WIDTH,
        height: SOCIAL_IMAGE_HEIGHT,
        alt: `${band.name} – Bandfoto`,
      }
    : DEFAULT_SOCIAL_IMAGE;

  return {
    title: buildBandTitle(
      band.name,
      band.bandartLabel ?? band.primaryBandart,
      band.hideLocation ? undefined : band.location?.city,
    ),
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: socialTitle,
      description: socialDescription,
      url: canonicalUrl,
      type: 'website',
      siteName: 'proudleut',
      locale: 'de_DE',
      images: [socialImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description: socialDescription,
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
  // Collections, in denen die Band steht: nur wenn sie dort aufgefuehrt und die Seite veroeffentlicht ist.
  const themePageLinks = getThemePagesForBand(
    band.slug,
    new Set(allBands.filter((b) => b.status === 'active').map((b) => b.slug)),
  );
  const hasVideo = embedUrl !== null;
  const facts = getBandFacts(band);
  // Ohne Bandbild zeigt BandHero einen kurzen Kopf ohne Anfrage-Button.
  const hasHeroButton = Boolean(band.heroImage);

  return (
    <article className="bg-pl-canvas pb-24 max-md:pb-[calc(6.25rem+env(safe-area-inset-bottom))] lg:pb-0">
      {/* JSON-LD – produktiv, kein Debug */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Video-Modal fuer die Hero-Pille (einziger Video-Einstieg, siehe
          VideoModalProvider.tsx) -- der Provider umschliesst nur BandHero. */}
      <VideoModalProvider embedUrl={embedUrl} bandName={band.name}>
        {/* Hero: vollflaechiges Bandbild, Name, Logo, Aktionen bereits im
            Einstieg (Auftrag "Bandseiten-Redesign", Abschnitt 5) */}
        <BandHero band={band} hasVideo={hasVideo} facts={facts} />
      </VideoModalProvider>

      {/* Wer steht hier auf der Bühne? (Text, Klingt nach) */}
      <BandDescription band={band} />
      <BandPeopleSection band={band} />

      {/* Zeilenraster: Stil, Spielt bei, Hochzeit, Referenz-Events,
          Unterlagen -- siehe BandTagsSection.tsx */}
      <BandTagsSection band={band} />

      {/* Mehr von [Band]: Social-Pills als Zeile im Raster */}
      <BandContactSection band={band} websiteUrl={websiteUrl} />

      {/* Ein Eindruck von der Bühne: eigene helle Section, entfaellt ohne Galerie */}
      <BandGallerySection band={band} />

      {/* Abschluss-CTA; Faktenleiste und Bottom-Bar weichen am Anfrage-Button
          dieser Karte (BandFloatingCta, ctaButtonId). Über "Mehr von" bleiben sie sichtbar. */}
      <BandCtaSection band={band} />

      <HidePrivacyFloatButton />

      <BandFloatingCta
        name={band.name}
        slug={band.slug}
        anfrageEventTypes={band.anfrageEventTypes ?? []}
        facts={facts}
        heroButtonId={HERO_ANFRAGE_BUTTON_ID}
        hasHeroButton={hasHeroButton}
        ctaButtonId="cta-anfrage-btn"
      />

      {/* Auswahlen (Collections), in denen die Band steht; entfaellt ohne Treffer */}
      {themePageLinks.length > 0 && (
        <section
          aria-labelledby="band-auswahlen-h2"
          className="bg-pl-canvas border-t border-pl-soft py-12 md:py-16 px-4 sm:px-6"
        >
          <div className="pl-container-shell">
            <h2
              id="band-auswahlen-h2"
              className="text-2xl md:text-[30px] font-extrabold tracking-[-0.025em] leading-tight text-pl-text"
            >
              {band.name} ist hier mit dabei
            </h2>
            <p className="mt-2 text-pl-text-muted">Mehr Bands für euren Anlass und eure Region.</p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {themePageLinks.map((t) => (
                <Link
                  key={t.path}
                  href={t.path}
                  className="group flex items-center justify-between gap-4 rounded-[20px] bg-pl-elevated border border-pl-soft
                             px-6 py-5 hover:border-pl-medium motion-safe:transition-colors
                             focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent"
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-pl-accent-deep">
                      {t.occasionLabel}
                    </span>
                    <span className="text-xl font-extrabold tracking-[-0.01em] text-pl-text leading-snug">
                      {t.title}
                    </span>
                    <span className="text-sm text-pl-text-muted">Auswahl und Tipps</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 w-11 h-11 rounded-full bg-pl-accent-subtle text-pl-accent-deep flex items-center justify-center
                               motion-safe:transition-transform group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Ähnliche Bands */}
      {similarBands.length > 0 ? (
        <section className="bg-pl-canvas border-t border-pl-soft py-16 md:py-20 px-4 sm:px-6">
          <div className="pl-container-shell">
            <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-2">
              Ähnliche Bands
            </p>
            <h2 className="text-2xl md:text-[30px] font-extrabold tracking-[-0.025em] leading-tight text-pl-text mb-6 md:mb-8">
              Wenn dir {getSoloFirstName(band) ?? 'diese Band'} gefällt
            </h2>
            {/* Feste 3-Spalten-Raster: bei 1 oder 2 Empfehlungen bleibt die
                Kartenbreite wie bei 3, die Karten stehen linksbuendig. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {similarBands.map((b) => (
                <SimilarBandCard key={b.slug} band={b} />
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
