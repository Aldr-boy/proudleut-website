import { CATEGORIES } from '@/lib/categories';
import { getFinderOccasionBySlug } from '@/lib/finderOccasions';

// Vier Anlass-Tabs fuer die Startseiten-Section "01 -- Auswahl". Bewusst
// eine eigene, homepage-lokale Konfiguration statt einer Erweiterung von
// lib/categories.ts.
//
// "Festzelt" bezieht sich hier bewusst auf lib/finderOccasions.ts statt
// direkt auf CATEGORIES: CATEGORIES['festzelt'] bleibt die breite
// redaktionelle SEO-Themenwelt (/veranstaltung/festzelt), waehrend
// FINDER_OCCASIONS['festzelt'] denselben Titel/Slug verwendet, aber
// bewusst nur noch echten Festzelt-Baendern matcht (siehe dortiger
// overrideSlugs-Kommentar). FINDER_OCCASIONS['stadt-und-buergerfest']
// ist die eigene, dedizierte Finder-Option fuer Stadt-/Buergerfest
// (stadt-und-buergerfest + buergerfest) -- kein eigener CATEGORIES-
// Eintrag, keine eigene SEO-Landingpage. Beide Tabs teilen dadurch
// dieselbe Matching-Semantik wie ihr jeweiliges Finder-Ziel
// (?anlass=festzelt bzw. ?anlass=stadt-und-buergerfest).
//
// supabaseEventTypeSlugs = echte event_types.slug-Werte, gegen
// band.categorySlugs abgeglichen. Kein neues Taxonomie-Mapping, nur eine
// bewusste Teilmenge/Neugruppierung der bereits bestehenden, geprueften
// Zuordnung.
const firmenfeier = CATEGORIES.find((c) => c.slug === 'firmenfeier');
const festzelt = getFinderOccasionBySlug('festzelt');
const stadtBuergerfest = getFinderOccasionBySlug('stadt-und-buergerfest');

// Kuratierte "Klingt nach"-Ebene je Anlass (Nachfass-Paket "Kuratierte
// Klingt-nach-Filter"). Bewusst eine feste, redaktionelle 4er-Auswahl statt
// eines vollstaendigen/datengetriebenen Mood-Katalogs -- Leitidee: nicht die
// vier repraesentativsten Moods, sondern die vier mit dem groessten
// Klick-Versprechen innerhalb des jeweiligen Anlasses. Slugs sind echte
// moods.slug-Werte (read-only gegen Production verifiziert, Schritt 0
// dieses Auftrags) -- bewusst NICHT aus diesem Auftragstext geraten.
// "Festzeltenergie" und "Party pur" werden hier absichtlich nicht verwendet
// (siehe Auftrag Abschnitt 2) -- beide bleiben im Katalog/Finder/auf
// Bandprofilen unveraendert, sind fuer diese kleine Homepage-Auswahl aber
// bewusst zu breit bzw. nicht vorgesehen.
export type HomepageMood = {
  slug: string;
  name: string;
};

export type EventTypeTab = {
  key: string;
  label: string;
  supabaseEventTypeSlugs: string[];
  // Linkziel -- immer der bestehende, funktionierende Band-Explorer mit
  // ?anlass=<slug>. Der Slug muss ein gueltiger Finder-Anlass sein (siehe
  // lib/finderOccasions.ts FINDER_OCCASIONS).
  finderAnlassSlug: string;
  // Sichtbares Link-Wording. Bewusst ohne "Finder" -- fuer Besucher nicht
  // selbsterklaerend, deshalb "... entdecken" statt "... im Finder".
  finderLinkLabel: string;
  // Genau 4 fest kuratierte "Klingt nach"-Chips fuer diesen Anlass.
  moods: HomepageMood[];
};

export const EVENT_TYPE_TABS: EventTypeTab[] = [
  {
    key: 'hochzeit',
    label: 'Hochzeit',
    supabaseEventTypeSlugs: ['hochzeit'],
    finderAnlassSlug: 'hochzeit',
    finderLinkLabel: 'Hochzeitsbands entdecken',
    moods: [
      { slug: 'emotional-beruehrend', name: 'Emotional & berührend' },
      { slug: 'tanzflaechen-garantie', name: 'Tanzflächen-Garantie' },
      { slug: 'herzlich-nahbar', name: 'Herzlich & nahbar' },
      { slug: 'mitsing-faktor', name: 'Mitsing-Faktor' },
    ],
  },
  {
    key: 'firmenfeier',
    label: 'Firmenfeier & Business Event',
    supabaseEventTypeSlugs: firmenfeier?.supabaseEventTypeSlugs ?? [],
    finderAnlassSlug: 'firmenfeier',
    finderLinkLabel: 'Bands für Firmenfeiern entdecken',
    moods: [
      { slug: 'konzertant-hochwertig', name: 'Konzertant & hochwertig' },
      { slug: 'tanzflaechen-garantie', name: 'Tanzflächen-Garantie' },
      { slug: 'rockig-mitreissend', name: 'Rockig & mitreißend' },
      { slug: 'authentisch-handgemacht', name: 'Authentisch und handgemacht' },
    ],
  },
  {
    key: 'festzelt',
    label: 'Festzelt',
    supabaseEventTypeSlugs: festzelt?.supabaseEventTypeSlugs ?? [],
    finderAnlassSlug: 'festzelt',
    finderLinkLabel: 'Festzeltbands entdecken',
    moods: [
      { slug: 'bayerisch-frech', name: 'Bayerisch & frech' },
      { slug: 'mitsing-faktor', name: 'Mitsing-Faktor' },
      { slug: 'tanzflaechen-garantie', name: 'Tanzflächen-Garantie' },
      { slug: 'rockig-mitreissend', name: 'Rockig & mitreißend' },
    ],
  },
  {
    key: 'stadt-buergerfest',
    label: 'Stadt- & Bürgerfest',
    supabaseEventTypeSlugs: stadtBuergerfest?.supabaseEventTypeSlugs ?? [],
    finderAnlassSlug: 'stadt-und-buergerfest',
    finderLinkLabel: 'Bands für Stadt- & Bürgerfeste entdecken',
    moods: [
      { slug: 'generationenverbindend', name: 'Generationenverbindend' },
      { slug: 'bayerisch-frech', name: 'Bayerisch & frech' },
      { slug: 'rockig-mitreissend', name: 'Rockig & mitreißend' },
      { slug: 'authentisch-handgemacht', name: 'Authentisch und handgemacht' },
    ],
  },
];

// Ein Zustand der AuswahlSection ist (Anlass) oder (Anlass, Mood). Eine
// einzige, gemeinsam genutzte Schluesselfunktion fuer sowohl den
// Props-Lookup (app/page.tsx -> AuswahlSection.tsx) als auch den
// Rotations-Seed (lib/homepage/bandRotation.ts::pickRotatingItems) --
// verhindert, dass beide Stellen unabhaengig voneinander ein eigenes
// Schluesselformat pflegen. "::" als Trenner, da Mood-/Anlass-Slugs
// ausschliesslich einzelne Bindestriche enthalten, keine Kollision moeglich.
export function buildAuswahlStateKey(tabKey: string, moodSlug: string | null): string {
  return moodSlug ? `${tabKey}::${moodSlug}` : tabKey;
}
