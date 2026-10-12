import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getAllBandsFromSupabase } from '@/lib/supabase/queries';
import { normalizeBandFromSupabase } from '@/lib/supabase/normalizeBand';
import BandExplorer from '@/components/bands/BandExplorer';
import { BandFinderPageHead } from '@/components/bands/BandFinderPageHead';
import { getBandRegionBucket, REGION_ORDER } from '@/lib/regions';
import { getBandFinderThemeImages } from '@/lib/bands/bandFinderThemeImages';
import BandInspirationen, { type InspirationBand, type InspirationGroup } from '@/components/bands/BandInspirationen';
import { BANDTYP_PREFERRED_ORDER } from '@/lib/bands/bandtypOrder';
import { absoluteUrl } from '@/lib/seo/metadata';

export const revalidate = 300;

// Mindestzahl Bands fuer einen eigenen Reiter bzw. eine eigene Regionsgruppe.
const MIN_BANDS_PER_TAB = 4;
const MIN_BANDS_PER_REGION_GROUP = 4;
// Ab mehr als so vielen Bands wird ein Reiter nach Region gruppiert.
const REGION_GROUPING_THRESHOLD = 20;

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
  // primaeren Bandart; Bandarten unter MIN_BANDS_PER_TAB Bands und Bands ohne
  // primaere Bandart stehen unter "Weitere". Reiter mit mehr als
  // REGION_GROUPING_THRESHOLD Bands werden nach administrativeRegion
  // (wie auf den Band-Karten) gruppiert. Alle Links stehen im ausgelieferten
  // HTML (Crawler, siehe BandInspirationen).
  const byType = new Map<string, InspirationBand[]>();
  const weitere: InspirationBand[] = [];
  const regionOf = new Map<string, string>();
  for (const band of [...activeBands].sort((a, b) => a.name.localeCompare(b.name, 'de'))) {
    const entry = {
      slug: band.slug,
      name: band.name,
      place: band.location?.city?.trim() || band.location?.district?.trim() || undefined,
    };
    regionOf.set(band.slug, band.location?.administrativeRegion?.trim() ?? '');
    const type = band.primaryBandart?.trim();
    if (!type) {
      weitere.push(entry);
    } else {
      byType.set(type, [...(byType.get(type) ?? []), entry]);
    }
  }
  const tabTypes = [...byType.keys()].filter((t) => byType.get(t)!.length >= MIN_BANDS_PER_TAB);
  for (const list of byType.values()) {
    if (list.length < MIN_BANDS_PER_TAB) weitere.push(...list);
  }
  weitere.sort((a, b) => a.name.localeCompare(b.name, 'de'));

  const preferred = BANDTYP_PREFERRED_ORDER.filter((t) => tabTypes.includes(t));
  const others = tabTypes
    .filter((t) => !BANDTYP_PREFERRED_ORDER.includes(t))
    .sort((a, b) => byType.get(b)!.length - byType.get(a)!.length || a.localeCompare(b, 'de'));

  function withSections(label: string, list: InspirationBand[]): InspirationGroup {
    if (list.length <= REGION_GROUPING_THRESHOLD) return { label, bands: list };
    const byRegion = new Map<string, InspirationBand[]>();
    for (const e of list) {
      const r = regionOf.get(e.slug) ?? '';
      byRegion.set(r, [...(byRegion.get(r) ?? []), e]);
    }
    const big = [...byRegion.entries()]
      .filter(([r, l]) => r && l.length >= MIN_BANDS_PER_REGION_GROUP)
      .sort((x, y) => y[1].length - x[1].length || x[0].localeCompare(y[0], 'de'));
    const bigNames = new Set(big.map(([r]) => r));
    const rest = list.filter((e) => !bigNames.has(regionOf.get(e.slug) ?? ''));
    const sections = big.map(([r, l]) => ({ label: r, bands: l }));
    if (rest.length > 0) sections.push({ label: 'Weitere Regionen', bands: rest });
    return { label, bands: list, sections };
  }

  const groups: InspirationGroup[] = [...preferred, ...others].map((label) =>
    withSections(label, byType.get(label)!)
  );
  if (weitere.length > 0) groups.push(withSections('Weitere', weitere));

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
