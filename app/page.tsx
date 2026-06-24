import Link from 'next/link';
import { getBands } from '@/lib/airtable/queries';
import HeroMosaic from '@/components/homepage/HeroMosaic';
import Explainer from '@/components/homepage/Explainer';
import CuratorBlock from '@/components/homepage/CuratorBlock';
import Testimonials from '@/components/homepage/Testimonials';
import FAQ from '@/components/homepage/FAQ';
import CTASection from '@/components/homepage/CTASection';
import LogoStrip from '@/components/homepage/LogoStrip';
import ReferenzEvents from '@/components/homepage/ReferenzEvents';
import BandGrid from '@/components/homepage/BandGrid';

export const revalidate = 300;

export default async function HomePage() {
  const bands = await getBands();
  const homepagePool = bands.filter((b) => b.homepageReady);

  return (
    <>
      <HeroMosaic />
      <LogoStrip />

      {/* Band grid – 9 zufällige Homepage-ready Bands */}
      <section id="bands" className="bg-pl-paper py-16 px-4 sm:px-6">
        <div className="pl-container-shell">
          <h2 className="text-2xl font-bold text-pl-text mb-8">Livebands entdecken</h2>
          {homepagePool.length === 0 ? (
            <p className="text-pl-text-muted">Keine Bands gefunden.</p>
          ) : (
            <BandGrid bands={homepagePool} limit={9} />
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
      <ReferenzEvents />
      <CuratorBlock />
      <Testimonials />
      <FAQ />
      <CTASection />
    </>
  );
}
