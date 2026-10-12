import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getAllBandsFromSupabase } from '@/lib/supabase/queries';
import { normalizeBandFromSupabase } from '@/lib/supabase/normalizeBand';
import BandExplorer from '@/components/bands/BandExplorer';
import { BandFinderPageHead } from '@/components/bands/BandFinderPageHead';
import { getBandRegionBucket, REGION_ORDER } from '@/lib/regions';
import { getBandFinderThemeImages } from '@/lib/bands/bandFinderThemeImages';
import BandInspirationen, { type InspirationGroup } from '@/components/bands/BandInspirationen';
import { BANDTYP_PREFERRED_ORDER } from '@/lib/bands/bandtypOrder';
import { absoluteUrl } from '@/lib/seo/metadata';

export const revalidate = 300;

// Auftrag "Fehlende Canonicals vor dem Domain-Cutover beheben": bisher
// fehlte hier alternates.canonical komplett. Title/Description unveraendert.
export const metadata: Metadata = {
  title: 'Livebands entdecken – proudleut',
  description:
    'Entdecke Livebands und Acts für Hochzeiten, Feste, Firmenfeiern und besondere Events auf proudleut.',
  alternates: { canonical: absoluteUrl('/bands') },
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

  // "Inspirationen fuer dein Event": jede aktive Band genau einmal, bei ihrer
  // primaeren Bandart; ohne primaere Bandart unter "Weitere". Alle Links
  // stehen im ausgelieferten HTML (Crawler, siehe BandInspirationen).
  const byType = new Map<string, InspirationGroup['bands']>();
  const weitere: InspirationGroup['bands'] = [];
  for (const band of [...activeBands].sort((a, b) => a.name.localeCompare(b.name, 'de'))) {
    const entry = {
      slug: band.slug,
      name: band.name,
      place: band.location?.city?.trim() || band.location?.district?.trim() || undefined,
    };
    const type = band.primaryBandart?.trim();
    if (!type) {
      weitere.push(entry);
    } else {
      byType.set(type, [...(byType.get(type) ?? []), entry]);
    }
  }
  const preferred = BANDTYP_PREFERRED_ORDER.filter((t) => byType.has(t));
  const others = [...byType.keys()]
    .filter((t) => !BANDTYP_PREFERRED_ORDER.includes(t))
    .sort((a, b) => byType.get(b)!.length - byType.get(a)!.length || a.localeCompare(b, 'de'));
  const groups: InspirationGroup[] = [...preferred, ...others].map((label) => ({
    label,
    bands: byType.get(label)!,
  }));
  if (weitere.length > 0) groups.push({ label: 'Weitere', bands: weitere });

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
        {groups.length > 0 && <BandInspirationen groups={groups} />}
      </section>
    </main>
  );
}
