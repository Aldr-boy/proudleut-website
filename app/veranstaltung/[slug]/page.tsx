import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { getAllBandsFromSupabase } from '@/lib/supabase/queries';
import { normalizeBandFromSupabase } from '@/lib/supabase/normalizeBand';
import { CATEGORIES, bandMatchesCategorySB, getCategoryBySlug, getRelatedCategories } from '@/lib/categories';
import BandExplorer from '@/components/bands/BandExplorer';
import { BandFinderPageHead } from '@/components/bands/BandFinderPageHead';
import { getBandRegionBucket, REGION_ORDER } from '@/lib/regions';
import { fetchEventCategoryHero } from '@/sanity/lib/fetchEventCategoryHero';
import { urlFor } from '@/sanity/lib/image';
import { absoluteUrl, isAbsoluteHttpsUrl, DEFAULT_SOCIAL_IMAGE } from '@/lib/seo/metadata';
import { getBandFinderThemeImages } from '@/lib/bands/bandFinderThemeImages';

export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return {};

  const canonicalUrl = absoluteUrl(`/veranstaltung/${category.slug}`);
  const h1 = category.h1Title ?? category.title;

  // Titelregel Paket 1: seoTitle wird fuer openGraph.title/twitter.title
  // unveraendert uebernommen (auch mit dem bekannten "– proudleut.com"-
  // Anteil einzelner Kategorien) -- die Korrektur des doppelten normalen
  // <title>-Suffix ist ausdruecklich Paket 3, kein Teil dieses Auftrags.
  const socialTitle = category.seoTitle;
  const socialDescription = category.seoDescription;

  const heroData = await fetchEventCategoryHero(slug);
  const heroImageUrl = heroData
    ? urlFor(heroData.heroImage).width(1200).height(630).url()
    : undefined;
  const socialImage = isAbsoluteHttpsUrl(heroImageUrl)
    ? {
        url: heroImageUrl,
        alt: heroData?.heroImageAlt ?? h1,
        width: 1200,
        height: 630,
      }
    : DEFAULT_SOCIAL_IMAGE;

  return {
    title: category.seoTitle,
    description: category.seoDescription,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: socialTitle,
      description: socialDescription,
      url: canonicalUrl,
      type: 'website',
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

export default async function VeranstaltungPage({ params }: Props) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  const [bandsResult, heroData, themeImages] = await Promise.all([
    getAllBandsFromSupabase(),
    fetchEventCategoryHero(slug),
    getBandFinderThemeImages(),
  ]);
  if (bandsResult.error) throw bandsResult.error;
  const allBands = (bandsResult.data ?? []).map(normalizeBandFromSupabase);

  const bands = allBands.filter((b) => bandMatchesCategorySB(b, category));
  const related = getRelatedCategories(slug);
  // Regionsoptionen fuer den eingebetteten BandExplorer, identisches
  // Prinzip wie app/bands/page.tsx: nur Regionen mit tatsaechlichem
  // Treffer innerhalb der bereits anlassgefilterten Grundmenge.
  const regions = REGION_ORDER.filter((r) => bands.some((b) => getBandRegionBucket(b) === r));

  const h1 = category.h1Title ?? category.title;
  const subtitleText = heroData?.subtitle ?? category.description ?? null;

  return (
    <>
      {/* Kompakter Suchkopf (Auftrag "Bandfinder-Redesign") ersetzt den
          bisherigen grossen Bild-Hero mit Sanity-eventCategoryHero-
          Hintergrundbild. heroData wird weiterhin fuer den Untertiteltext
          (subtitleText) genutzt -- nur die Hintergrundbild-Darstellung
          selbst entfaellt, keine Inhalte gehen verloren. */}
      <section className="bg-pl-canvas pb-16 px-0">
        <BandFinderPageHead
          h1={h1}
          intro={subtitleText}
          backHref="/bands"
          backLabel="← Zurück zur Bandübersicht"
        />
        {bands.length === 0 ? (
          <div className="pl-container-shell px-4 sm:px-6 py-12">
            <p className="text-pl-text-muted text-lg mb-2">
              Aktuell sind keine Bands für diesen Anlass eingetragen.
            </p>
            <p className="text-pl-text-muted text-sm mb-6">
              Neue Bands werden regelmäßig ergänzt. Schau gerne in den verwandten Kategorien nach.
            </p>
            <Link
              href="/bands"
              className="text-pl-primary text-sm hover:opacity-80 motion-safe:transition-opacity"
            >
              Alle Bands entdecken →
            </Link>
          </div>
        ) : (
          <Suspense fallback={null}>
            <BandExplorer
              key={category.slug}
              bands={bands}
              regions={regions}
              lockedOccasion={category.slug}
              themeImages={themeImages}
            />
          </Suspense>
        )}
      </section>

      {/* Verwandte Kategorien – immer sichtbar */}
      {related.length > 0 && (
        <section className="py-12 px-4 sm:px-6 border-t border-white/5">
          <div className="pl-container-shell">
            <h2 className="text-base font-semibold text-pl-text mb-4">
              Weitere Anlässe entdecken
            </h2>
            <div className="flex flex-wrap gap-2">
              {related.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/veranstaltung/${cat.slug}`}
                  className="px-4 py-2 rounded-full text-sm border border-white/10
                             text-pl-text-muted hover:border-pl-primary hover:text-pl-text
                             motion-safe:transition-colors"
                >
                  {cat.title}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
