import Link from 'next/link';
import { getBands } from '@/lib/airtable/queries';
import { CATEGORIES } from '@/lib/categories';
import BandCard from '@/components/BandCard';
import Explainer from '@/components/homepage/Explainer';
import CuratorBlock from '@/components/homepage/CuratorBlock';
import Testimonials from '@/components/homepage/Testimonials';
import FAQ from '@/components/homepage/FAQ';
import CTASection from '@/components/homepage/CTASection';

export const revalidate = 300;

export default async function HomePage() {
  const bands = await getBands();

  return (
    <>
      {/* Hero */}
      <section className="bg-pl-bg py-20 md:py-32 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-bold text-pl-text leading-tight mb-4">
            Livebands entdecken –
            <br className="hidden sm:block" /> für dein Event
          </h1>
          <p className="text-pl-text-muted text-lg md:text-xl mb-8 max-w-xl">
            Finde passende Livebands nach Anlass &amp; Stil – und kontaktiere sie direkt.
          </p>
          <div className="flex flex-wrap gap-2 mb-10">
            {CATEGORIES.slice(0, 5).map((cat) => (
              <Link
                key={cat.slug}
                href={`/veranstaltung/${cat.slug}`}
                className="px-4 py-2 rounded-full text-sm border border-white/10 text-pl-text-muted hover:border-pl-primary hover:text-pl-text motion-safe:transition-colors"
              >
                {cat.title}
              </Link>
            ))}
          </div>
          <Link
            href="/#bands"
            className="inline-flex items-center px-6 py-3 rounded-full bg-pl-primary text-white font-semibold hover:opacity-90 motion-safe:transition-opacity"
          >
            Bands entdecken
          </Link>
        </div>
      </section>

      {/* Band grid – max. 12 Bands auf der Homepage */}
      <section id="bands" className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-pl-text mb-8">Livebands entdecken</h2>
          {bands.length === 0 ? (
            <p className="text-pl-text-muted">Keine Bands gefunden.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {bands.slice(0, 12).map((band) => (
                <BandCard key={band.slug} band={band} />
              ))}
            </div>
          )}
          <div className="mt-10 text-center">
            <Link
              href="/bands"
              className="text-pl-text-muted hover:text-pl-text motion-safe:transition-colors text-sm inline-flex items-center gap-1.5"
            >
              Alle Bands entdecken
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <Explainer />
      <CuratorBlock />
      <Testimonials />
      <FAQ />
      <CTASection />
    </>
  );
}
