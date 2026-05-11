import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getBands } from '@/lib/airtable/queries';
import { CATEGORIES, bandMatchesCategory } from '@/lib/categories';
import BandCard from '@/components/BandCard';

export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = CATEGORIES.find((c) => c.slug === slug);
  if (!category) return {};
  return {
    title: category.seoTitle,
    description: category.seoDescription,
  };
}

export default async function VeranstaltungPage({ params }: Props) {
  const { slug } = await params;
  const category = CATEGORIES.find((c) => c.slug === slug);
  if (!category) notFound();

  const allBands = await getBands();
  const bands = allBands.filter((b) => bandMatchesCategory(b, category));

  return (
    <>
      {/* Category hero */}
      <section className="bg-pl-bg py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/"
            className="text-pl-text-muted text-sm hover:text-pl-text motion-safe:transition-colors mb-6 inline-block"
          >
            ← Alle Bands
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-pl-text mb-3">
            {category.title}
          </h1>
          {category.description && (
            <p className="text-pl-text-muted text-lg max-w-xl">{category.description}</p>
          )}
        </div>
      </section>

      {/* Band grid */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {bands.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-pl-text-muted text-lg mb-4">
                Keine Bands für diese Kategorie gefunden.
              </p>
              <Link
                href="/"
                className="text-pl-primary hover:opacity-80 motion-safe:transition-opacity"
              >
                Alle Bands entdecken
              </Link>
            </div>
          ) : (
            <>
              <p className="text-pl-text-muted text-sm mb-6">
                {bands.length} {bands.length === 1 ? 'Band' : 'Bands'} gefunden
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {bands.map((band) => (
                  <BandCard key={band.slug} band={band} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
