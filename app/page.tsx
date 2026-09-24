import type { Metadata } from 'next';
import { getAllBandsFromSupabase, getBandFromSupabase } from '@/lib/supabase/queries';
import { normalizeBandFromSupabase } from '@/lib/supabase/normalizeBand';
import { EVENT_TYPE_TABS, ALL_BANDS_TAB_KEY, buildAuswahlStateKey, type EventTypeTab } from '@/lib/homepage/eventTypeTabs';
import { pickRotatingItems, getDayIndex } from '@/lib/homepage/bandRotation';
import { bandMatchesMood } from '@/lib/moods/bandMoodFilter';
import { computeMostFrequentMoods } from '@/lib/homepage/moodFrequency';
import type { Band } from '@/lib/types/band';
import { toAuswahlBandSummary, type AuswahlBandSummary } from '@/components/homepage/AuswahlBandCard';
import { HeroWall } from '@/components/hero/HeroWall';
import { HeroContent } from '@/components/homepage/HeroContent';
import { fetchHeroWallPool } from '@/lib/heroWall/fetchHeroWallPool';
import AuswahlSection from '@/components/homepage/AuswahlSection';
import Explainer from '@/components/homepage/Explainer';
import BandEinschaetzen from '@/components/homepage/BandEinschaetzen';
import CuratorBlock from '@/components/homepage/CuratorBlock';
import VeranstalterStatement from '@/components/homepage/VeranstalterStatement';
import FAQ from '@/components/homepage/FAQ';
import CTASection from '@/components/homepage/CTASection';
import { absoluteUrl } from '@/lib/seo/metadata';

export const revalidate = 300;

// Auftrag "Fehlende Canonicals vor dem Domain-Cutover beheben": bisher
// hatte die Startseite ueberhaupt kein eigenes metadata-Objekt (nur der
// generische Titel/Description-Default aus app/layout.tsx). Hier wird
// bewusst NUR alternates.canonical ergaenzt -- Title/Description bleiben
// unangetastet und erben weiterhin vom Root-Layout, keine inhaltliche
// SEO-Aenderung. Identisches Prinzip wie das bestehende canonicalUrl in
// app/band|musiker|veranstaltung/[slug]/page.tsx: absoluteUrl() statt
// hartkodierter Domain.
//
// Bekannte, von Next.js selbst verursachte Abweichung: absoluteUrl('/')
// liefert "https://proudleut.com/" (mit Schraegstrich, identisch zum
// Sitemap-Eintrag), aber Next.js' eigener Metadata-Resolver
// (node_modules/next/dist/lib/metadata/resolvers/resolve-url.js,
// resolveAbsoluteUrlWithPathname) gibt fuer eine aufgeloeste URL mit
// pathname === '/' bewusst .origin statt .href zurueck -- das gerenderte
// <link rel="canonical"> zeigt deshalb "https://proudleut.com" OHNE
// Schraegstrich. Das betrifft ausschliesslich die Root-Route und laesst
// sich ueber die oeffentliche metadata-API nicht umgehen (auch der
// relative-Pfad-Stil von app/impressum/page.tsx haette denselben Effekt).
export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl('/') },
};

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
  const [bandsResult, einschaetzenResult, heroPool] = await Promise.all([
    getAllBandsFromSupabase(),
    getBandFromSupabase(EINSCHAETZEN_BAND_SLUG),
    fetchHeroWallPool(),
  ]);

  if (bandsResult.error) {
    throw bandsResult.error;
  }

  const activeBands = (bandsResult.data ?? [])
    .map(normalizeBandFromSupabase)
    .filter((band) => band.status === 'active');

  const dayIndex = getDayIndex(new Date());

  // "Alle Bands"-Tab (Auftrag "Alle-Bands-Pill"): erste, vorausgewaehlte
  // Pill vor den 4 kuratierten Anlass-Tabs. supabaseEventTypeSlugs bleibt
  // leer -- der Pool fuer diesen Tab ist unten bewusst NICHT ueber
  // bandMatchesTab gefiltert (siehe Schleife), sondern immer "alle aktiven
  // Baender". finderAnlassSlug: null -> AuswahlSection verlinkt ungefiltert
  // auf /bands (siehe dortiges buildFinderHref). moods: datengetrieben
  // statt fest kuratiert, exakt dieselbe Anzahl (4) wie bei den Anlass-Tabs.
  const ALL_BANDS_MOOD_COUNT = 4;
  const allBandsTab: EventTypeTab = {
    key: ALL_BANDS_TAB_KEY,
    label: 'Alle Bands',
    supabaseEventTypeSlugs: [],
    finderAnlassSlug: null,
    finderLinkLabel: 'Alle Bands entdecken',
    moods: computeMostFrequentMoods(activeBands, ALL_BANDS_MOOD_COUNT),
  };
  const tabsWithAllBands = [allBandsTab, ...EVENT_TYPE_TABS];

  // Pro Tab: Pool = alle aktiven Baender, die diesem Anlass laut echten
  // Event-Type-Zuordnungen (categorySlugs) tatsaechlich zugeordnet sind --
  // keine Heuristik, keine feste Liste. Fuer den "Alle Bands"-Tab ist der
  // Pool bewusst IMMER "alle aktiven Baender", ohne bandMatchesTab-Filter
  // (Auftrag: "ohne Anlassfilter und ohne feste Bevorzugung"). Zusaetzlich
  // pro Tab je einer der kuratierten bzw. (fuer "Alle Bands") daten-
  // getriebenen "Klingt nach"-Moods (Nachfass-Paket "Kuratierte
  // Klingt-nach-Filter"): derselbe Pool, zusaetzlich per bestehendem
  // bandMatchesMood gefiltert. Alle Zustaende (unfiltered + je Mood) werden
  // serverseitig deterministisch fuer den aktuellen Kalendertag berechnet
  // (lib/homepage/bandRotation.ts, poolKey via buildAuswahlStateKey um
  // Anlass+Mood erweitert) -- das gilt AUCH fuer "Alle Bands": dieser
  // Tageswert dient dort nur als hydrationssicherer Startzustand vor dem
  // Mount, danach mischt AuswahlSection.tsx clientseitig echt zufaellig aus
  // allBandsPool neu (siehe dort, lib/homepage/allBandsSelection.ts) --
  // ohne diesen Tagesfallback wuerde die allererste, noch nicht hydrierte
  // Bildschirmausgabe entweder leer bleiben oder dieselben ersten Baender
  // aus der Datenreihenfolge dauerhaft bevorzugen. Payload-Reduktion: erst
  // auf den vollen Band-Objekten filtern/rotieren, dann auf das schlanke
  // AuswahlBandSummary-Format mappen (nur Felder, die AuswahlBandCard
  // tatsaechlich rendert).
  const bandsByState: Record<string, AuswahlBandSummary[]> = {};
  for (const tab of tabsWithAllBands) {
    const pool =
      tab.key === ALL_BANDS_TAB_KEY
        ? activeBands
        : activeBands.filter((band) => bandMatchesTab(band, tab.supabaseEventTypeSlugs));
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

  // Voller, schlanker Bandbestand fuer die echte (post-Mount) Zufallsauswahl
  // von "Alle Bands" (siehe AuswahlSection.tsx) -- dieselbe AuswahlBandSummary-
  // Form wie bandsByState, keine zusaetzlichen Felder. BandGrid.tsx erhaelt
  // auf der Startseite aktuell keinen Bandbestand (dort ungenutzt), es gibt
  // also keine doppelte Uebertragung desselben Bestands zu vermeiden.
  const allBandsPool = activeBands.map(toAuswahlBandSummary);

  const einschaetzenBand = einschaetzenResult.data
    ? normalizeBandFromSupabase(einschaetzenResult.data)
    : null;

  return (
    <>
      <HeroWall images={heroPool}>
        <HeroContent />
      </HeroWall>
      <AuswahlSection tabs={tabsWithAllBands} bandsByState={bandsByState} allBandsPool={allBandsPool} />
      <Explainer />
      {einschaetzenBand && <BandEinschaetzen band={einschaetzenBand} />}
      <CuratorBlock />
      <VeranstalterStatement />
      <FAQ />
      <CTASection />
    </>
  );
}
