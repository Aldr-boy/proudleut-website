import Link from 'next/link';
import { getBands } from '@/lib/airtable/queries';
import BandCard from '@/components/BandCard';
import HeroMosaic from '@/components/homepage/HeroMosaic';
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
      <HeroMosaic />

      {/* Band grid – max. 12 Bands auf der Homepage */}
      <section id="bands" className="bg-pl-paper py-16 px-4 sm:px-6">
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
