import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getBands } from '@/lib/airtable/queries';
import { CATEGORIES, bandMatchesCategory, getCategoryBySlug, getRelatedCategories } from '@/lib/categories';
import BandGrid from '@/components/homepage/BandGrid';
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

  const [allBands, heroData] = await Promise.all([
    getBands(),
    fetchEventCategoryHero(slug),
  ]);

  const bands = allBands.filter((b) => bandMatchesCategory(b, category));
  const related = getRelatedCategories(slug);

  const h1 = category.h1Title ?? category.title;
  const subtitleText = heroData?.subtitle ?? category.description ?? null;
  const bandCount = bands.length;
  const bandLabel = bandCount === 1 ? 'passende Band' : 'passende Bands';

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
          <div className="relative z-10 max-w-6xl mx-auto">
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
          <div className="max-w-6xl mx-auto">
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
        <div className="max-w-6xl mx-auto">
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
            <>
              <p className="text-pl-text-muted text-sm mb-6">
                {bandCount} {bandLabel}
              </p>
              <BandGrid bands={bands} />
              <div className="mt-10 text-center">
                <Link
                  href={`/bands?anlass=${category.slug}`}
                  className="inline-flex items-center gap-1.5 text-sm text-pl-text-muted hover:text-pl-text motion-safe:transition-colors underline underline-offset-2"
                >
                  Alle Bands für {category.title} in der Suche ansehen
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Verwandte Kategorien – immer sichtbar */}
      {related.length > 0 && (
        <section className="py-12 px-4 sm:px-6 border-t border-white/5">
          <div className="max-w-6xl mx-auto">
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
