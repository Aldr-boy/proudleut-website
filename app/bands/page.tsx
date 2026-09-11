import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getAllBandsFromSupabase } from '@/lib/supabase/queries';
import { normalizeBandFromSupabase } from '@/lib/supabase/normalizeBand';
import BandExplorer from '@/components/bands/BandExplorer';
import { BandFinderPageHead } from '@/components/bands/BandFinderPageHead';
import { getBandRegionBucket, REGION_ORDER } from '@/lib/regions';
import { getBandFinderThemeImages } from '@/lib/bands/bandFinderThemeImages';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Livebands entdecken – proudleut',
  description:
    'Entdecke Livebands und Acts für Hochzeiten, Feste, Firmenfeiern und besondere Events auf proudleut.',
};

export default async function BandsPage() {
  const [bandsResult, themeImages] = await Promise.all([
    getAllBandsFromSupabase(),
    getBandFinderThemeImages(),
  ]);
  if (bandsResult.error) {
    throw bandsResult.error;
  }
  const bands = (bandsResult.data ?? []).map(normalizeBandFromSupabase);
  const activeBands = bands.filter((band) => band.status === 'active');

  const regions = REGION_ORDER.filter((r) =>
    activeBands.some((b) => getBandRegionBucket(b) === r)
  );

  return (
    <main>
      {/* Kompakter Suchkopf (Auftrag "Bandfinder-Redesign") ersetzt den
          bisherigen grossen Bild-Hero (components/bands/BandsHero.tsx,
          weiterhin im Repo vorhanden, hier aber nicht mehr eingebunden --
          siehe Abschlussbericht). */}
      <section className="bg-pl-canvas pb-16 px-0">
        <BandFinderPageHead
          h1="Livebands entdecken"
          intro="Stöbere durch Bands und Live-Acts für Hochzeiten, Feste, Firmenfeiern und besondere Events."
        />
        {activeBands.length === 0 ? (
          <p className="pl-container-shell px-4 sm:px-6 text-pl-text-muted">Keine Bands gefunden.</p>
        ) : (
          <Suspense fallback={null}>
            <BandExplorer bands={activeBands} regions={regions} themeImages={themeImages} />
          </Suspense>
        )}
      </section>
    </main>
  );
}
