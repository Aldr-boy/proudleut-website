import { getAllBandsFromSupabase, getBandFromSupabase } from '@/lib/supabase/queries';
import { normalizeBandFromSupabase } from '@/lib/supabase/normalizeBand';
import { EVENT_TYPE_TABS, buildAuswahlStateKey } from '@/lib/homepage/eventTypeTabs';
import { pickRotatingItems, getDayIndex } from '@/lib/homepage/bandRotation';
import { bandMatchesMood } from '@/lib/moods/bandMoodFilter';
import type { Band } from '@/lib/types/band';
import { toAuswahlBandSummary, type AuswahlBandSummary } from '@/components/homepage/AuswahlBandCard';
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
  // keine Heuristik, keine feste Liste. Zusaetzlich pro Tab je einer der 4
  // kuratierten "Klingt nach"-Moods (Nachfass-Paket "Kuratierte
  // Klingt-nach-Filter"): derselbe Anlass-Pool, zusaetzlich per bestehendem
  // bandMatchesMood gefiltert. Alle Zustaende (unfiltered + je Mood) werden
  // serverseitig deterministisch fuer den aktuellen Kalendertag berechnet
  // (lib/homepage/bandRotation.ts, poolKey via buildAuswahlStateKey um
  // Anlass+Mood erweitert), damit clientseitig kein Math.random() und keine
  // Hydration-Diskrepanz noetig ist. Payload-Reduktion: erst auf den vollen
  // Band-Objekten filtern/rotieren, dann auf das schlanke
  // AuswahlBandSummary-Format mappen (nur Felder, die AuswahlBandCard
  // tatsaechlich rendert).
  const bandsByState: Record<string, AuswahlBandSummary[]> = {};
  for (const tab of EVENT_TYPE_TABS) {
    const pool = activeBands.filter((band) => bandMatchesTab(band, tab.supabaseEventTypeSlugs));
    const unfilteredKey = buildAuswahlStateKey(tab.key, null);
    bandsByState[unfilteredKey] = pickRotatingItems(pool, (b) => b.id, unfilteredKey, dayIndex, 3).map(
      toAuswahlBandSummary
    );

    for (const mood of tab.moods) {
      const moodPool = pool.filter((band) => bandMatchesMood(band.moods, mood.slug));
      const moodKey = buildAuswahlStateKey(tab.key, mood.slug);
      bandsByState[moodKey] = pickRotatingItems(moodPool, (b) => b.id, moodKey, dayIndex, 3).map(
        toAuswahlBandSummary
      );
    }
  }

  const einschaetzenBand = einschaetzenResult.data
    ? normalizeBandFromSupabase(einschaetzenResult.data)
    : null;

  return (
    <>
      <HeroMosaic />
      <LogoStrip />
      <AuswahlSection tabs={EVENT_TYPE_TABS} bandsByState={bandsByState} />
      <Explainer />
      {einschaetzenBand && <BandEinschaetzen band={einschaetzenBand} />}
      <CuratorBlock />
      <FAQ />
      <CTASection />
    </>
  );
}
