import { getAllBandsFromSupabase, getBandFromSupabase } from '@/lib/supabase/queries';
import { normalizeBandFromSupabase } from '@/lib/supabase/normalizeBand';
import { EVENT_TYPE_TABS } from '@/lib/homepage/eventTypeTabs';
import { pickRotatingItems, getDayIndex } from '@/lib/homepage/bandRotation';
import type { Band } from '@/lib/types/band';
import HeroMosaic from '@/components/homepage/HeroMosaic';
import LogoStrip from '@/components/homepage/LogoStrip';
import AuswahlSection from '@/components/homepage/AuswahlSection';
import Explainer from '@/components/homepage/Explainer';
import BandEinschaetzen from '@/components/homepage/BandEinschaetzen';
import CuratorBlock from '@/components/homepage/CuratorBlock';
import FAQ from '@/components/homepage/FAQ';
import CTASection from '@/components/homepage/CTASection';

export const revalidate = 300;

// "Eine Band einschaetzen" (03) zeigt exemplarisch ein echtes, vollstaendig
// eingeordnetes Bandprofil -- San2 and His Soul Patrol, bereits als
// verifiziertes Demo-Profil auf /fuer-bands etabliert (siehe dortige
// PROOF_ACTS/SAN2_*-Konstanten). Keine "Band der Woche", keine
// automatische Auswahl -- bewusst dasselbe, bereits geprueft reale Profil.
const EINSCHAETZEN_BAND_SLUG = 'san2-and-his-soul-patrol';

function bandMatchesTab(band: Band, supabaseEventTypeSlugs: string[]): boolean {
  return band.categorySlugs?.some((slug) => supabaseEventTypeSlugs.includes(slug)) ?? false;
}

export default async function HomePage() {
  const [bandsResult, einschaetzenResult] = await Promise.all([
    getAllBandsFromSupabase(),
    getBandFromSupabase(EINSCHAETZEN_BAND_SLUG),
  ]);

  if (bandsResult.error) {
    throw bandsResult.error;
  }

  const activeBands = (bandsResult.data ?? [])
    .map(normalizeBandFromSupabase)
    .filter((band) => band.status === 'active');

  const dayIndex = getDayIndex(new Date());

  // Pro Tab: Pool = alle aktiven Baender, die diesem Anlass laut echten
  // Event-Type-Zuordnungen (categorySlugs) tatsaechlich zugeordnet sind --
  // keine Heuristik, keine feste Liste. Die drei sichtbaren Baender je Tab
  // werden serverseitig deterministisch fuer den aktuellen Kalendertag
  // berechnet (lib/homepage/bandRotation.ts), damit clientseitig kein
  // Math.random() und keine Hydration-Diskrepanz noetig ist.
  const bandsByTab: Record<string, Band[]> = {};
  for (const tab of EVENT_TYPE_TABS) {
    const pool = activeBands.filter((band) => bandMatchesTab(band, tab.supabaseEventTypeSlugs));
    bandsByTab[tab.key] = pickRotatingItems(pool, (b) => b.id, tab.key, dayIndex, 3);
  }

  const einschaetzenBand = einschaetzenResult.data
    ? normalizeBandFromSupabase(einschaetzenResult.data)
    : null;

  return (
    <>
      <HeroMosaic />
      <LogoStrip />
      <AuswahlSection tabs={EVENT_TYPE_TABS} bandsByTab={bandsByTab} />
      <Explainer />
      {einschaetzenBand && <BandEinschaetzen band={einschaetzenBand} />}
      <CuratorBlock />
      <FAQ />
      <CTASection />
    </>
  );
}
