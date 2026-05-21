import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getBands } from '@/lib/airtable/queries';
import BandExplorer from '@/components/bands/BandExplorer';
import BandsHero from '@/components/bands/BandsHero';
import { getBandRegionBucket, REGION_ORDER } from '@/lib/regions';
import { fetchBandsPageFeaturedSlider } from '@/sanity/lib/fetchBandsPageFeaturedSlider';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Livebands entdecken – proudleut',
  description:
    'Entdecke Livebands und Acts für Hochzeiten, Feste, Firmenfeiern und besondere Events auf proudleut.',
};

export default async function BandsPage() {
  const [bands, featuredSlides] = await Promise.all([
    getBands(),
    fetchBandsPageFeaturedSlider(),
  ]);
  const activeBands = bands.filter((band) => band.status === 'active');

  const regions = REGION_ORDER.filter((r) =>
    activeBands.some((b) => getBandRegionBucket(b) === r)
  );

  return (
    <main>
      <BandsHero slides={featuredSlides} />

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
