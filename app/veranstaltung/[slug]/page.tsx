import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { getAllBandsFromSupabase } from '@/lib/supabase/queries';
import { normalizeBandFromSupabase } from '@/lib/supabase/normalizeBand';
import { CATEGORIES, bandMatchesCategorySB, getCategoryBySlug, getRelatedCategories } from '@/lib/categories';
import BandExplorer from '@/components/bands/BandExplorer';
import { getBandRegionBucket, REGION_ORDER } from '@/lib/regions';
import { fetchEventCategoryHero } from '@/sanity/lib/fetchEventCategoryHero';
import { urlFor } from '@/sanity/lib/image';

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
  return {
    title: category.seoTitle,
    description: category.seoDescription,
  };
}

export default async function VeranstaltungPage({ params }: Props) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  const [bandsResult, heroData] = await Promise.all([
    getAllBandsFromSupabase(),
    fetchEventCategoryHero(slug),
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
      {/* Hero */}
      {heroData ? (
        <section className="relative bg-pl-stage overflow-hidden py-20 sm:py-24 md:py-28 px-4 sm:px-6">
          <Image
            src={urlFor(heroData.heroImage).width(1400).height(600).url()}
            alt={heroData.heroImageAlt ?? h1}
            fill
            className="object-cover opacity-[0.28]"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
          <div className="relative z-10 pl-container-shell">
            <Link
              href="/bands"
              className="text-white/50 text-sm hover:text-white/80 motion-safe:transition-colors mb-6 inline-block"
            >
              ← Zurück zur Bandübersicht
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{h1}</h1>
            {subtitleText && (
              <p className="text-white/70 text-lg max-w-xl">{subtitleText}</p>
            )}
          </div>
        </section>
      ) : (
        <section className="bg-pl-bg py-16 px-4 sm:px-6">
          <div className="pl-container-shell">
            <Link
              href="/bands"
              className="text-pl-text-muted text-sm hover:text-pl-text motion-safe:transition-colors mb-6 inline-block"
            >
              ← Zurück zur Bandübersicht
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-pl-text mb-3">{h1}</h1>
            {subtitleText && (
              <p className="text-pl-text-muted text-lg max-w-xl">{subtitleText}</p>
            )}
          </div>
        </section>
      )}

      {/* Grid oder Empty State */}
      <section className="bg-pl-canvas py-16 px-4 sm:px-6">
        <div className="pl-container-shell">
          {bands.length === 0 ? (
            <div className="py-12">
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
              <BandExplorer key={category.slug} bands={bands} regions={regions} lockedOccasion={category.slug} />
            </Suspense>
          )}
        </div>
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
