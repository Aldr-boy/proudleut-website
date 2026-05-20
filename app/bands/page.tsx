import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getBands } from '@/lib/airtable/queries';
import BandExplorer from '@/components/bands/BandExplorer';
import { getBandRegionBucket, REGION_ORDER } from '@/lib/regions';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Livebands entdecken – proudleut',
  description:
    'Entdecke Livebands und Acts für Hochzeiten, Feste, Firmenfeiern und besondere Events auf proudleut.',
};

export default async function BandsPage() {
  const bands = await getBands();
  const activeBands = bands.filter((band) => band.status === 'active');

  const regions = REGION_ORDER.filter((r) =>
    activeBands.some((b) => getBandRegionBucket(b) === r)
  );

  return (
    <main>
      {/* Hero */}
      <section className="bg-pl-stage py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-[1140px] mx-auto">
          <p className="text-pl-accent-light text-sm font-medium tracking-wider uppercase mb-4">
            Bands auf proudleut
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-pl-on-stage mb-4 leading-tight">
            Livebands entdecken
          </h1>
          <p className="text-base md:text-lg text-pl-on-stage-muted leading-relaxed max-w-[640px]">
            Stöbere durch Bands und Live-Acts für Hochzeiten, Feste, Firmenfeiern
            und besondere Events.
          </p>
        </div>
      </section>

      {/* Explorer */}
      <section className="bg-pl-canvas py-16 px-4 sm:px-6">
        <div className="max-w-[1140px] mx-auto">
          {activeBands.length === 0 ? (
            <p className="text-pl-text-muted">Keine Bands gefunden.</p>
          ) : (
            <Suspense fallback={null}>
            <BandExplorer bands={activeBands} regions={regions} />
          </Suspense>
          )}
        </div>
      </section>
    </main>
  );
}
