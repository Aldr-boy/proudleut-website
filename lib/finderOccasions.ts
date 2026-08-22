import type { Band } from '@/lib/types/band';
import { CATEGORIES } from './categories.ts';

// Eigene, geordnete Anlass-Konfiguration fuer den oeffentlichen Band-Finder
// (components/bands/BandExplorer.tsx, "Wofuer"). Bewusst von CATEGORIES
// entkoppelt: CATEGORIES bleibt die Quelle fuer die redaktionelle SEO-
// Themenwelt (/veranstaltung/[slug]) und ist dort bewusst breiter
// (Oberbegriff + Detailtypen, siehe docs/event-type-redaktionsentscheidungen.md).
// Der Finder braucht dagegen eine praezisere, teils abweichende Auswahl --
// z. B. "Stadt- & Buergerfest" als eigene Option ohne CATEGORIES-Gegenpart
// und ohne eigene SEO-Landingpage, und "Festzelt" mit engeren Match-Slugs
// als die gleichnamige CATEGORIES-Kategorie.
//
// Bestehende Anlaesse werden wo moeglich aus CATEGORIES abgeleitet
// (fromCategory()), damit nicht acht Konfigurationen parallel gepflegt
// werden muessen. fromCategory() erlaubt dafuer einen expliziten
// overrideSlugs-Parameter: Titel/Slug kommen weiterhin aus CATEGORIES,
// nur die tatsaechlichen Match-Slugs koennen bewusst abweichen -- aktuell
// einzig genutzt fuer Festzelt. Kein impliziter Modus, keine Mutation von
// CATEGORIES, keine Sonderbehandlung im BandExplorer.
export type FinderOccasion = {
  title: string;
  slug: string;
  supabaseEventTypeSlugs: string[];
};

function fromCategory(slug: string, overrideSlugs?: string[]): FinderOccasion {
  const category = CATEGORIES.find((c) => c.slug === slug);
  if (!category) {
    throw new Error(`lib/finderOccasions.ts: CATEGORIES-Eintrag "${slug}" nicht gefunden`);
  }
  return {
    title: category.title,
    slug: category.slug,
    supabaseEventTypeSlugs: overrideSlugs ?? category.supabaseEventTypeSlugs ?? [],
  };
}

export const FINDER_OCCASIONS: FinderOccasion[] = [
  fromCategory('hochzeit'),
  // Bewusste Finder-Abweichung: CATEGORIES['festzelt'] bleibt die breite
  // redaktionelle Themenwelt (SEO-Landingpage /veranstaltung/festzelt,
  // 8 Slugs inkl. Stadt-/Buergerfest, Bierfest, Brauereifest, Biergarten,
  // Wirtshausmusi, Fruehschoppen). Der Finder soll hier praeziser sein
  // und ausschliesslich Bands mit echtem Event-Type festzelt zeigen --
  // deshalb expliziter overrideSlugs auf ['festzelt']. "Stadt- &
  // Buergerfest" deckt einen Teil der uebrigen Themenwelt-Slugs als
  // eigene Finder-Option ab (siehe unten).
  fromCategory('festzelt', ['festzelt']),
  {
    title: 'Stadt- & Bürgerfest',
    slug: 'stadt-und-buergerfest',
    supabaseEventTypeSlugs: ['stadt-und-buergerfest', 'buergerfest'],
  },
  fromCategory('firmenfeier'),
  fromCategory('geburtstag'),
  fromCategory('gala'),
  fromCategory('fasching'),
  fromCategory('weihnachtsfeier'),
  fromCategory('festival'),
];

// Finder-Matching -- bewusst eine eigene, klar benannte Funktion statt
// bandMatchesCategorySB() (lib/categories.ts) mitzubenutzen: Letztere
// bleibt ausschliesslich fuer die redaktionelle CATEGORIES-Themenwelt
// zustaendig. Kein impliziter Modus, kein Erraten anhand des Aufrufortes.
export function bandMatchesFinderOccasion(
  band: Pick<Band, 'categorySlugs'>,
  occasion: FinderOccasion
): boolean {
  if (!occasion.supabaseEventTypeSlugs.length) return false;
  return (
    band.categorySlugs?.some((slug) => occasion.supabaseEventTypeSlugs.includes(slug)) ?? false
  );
}

export function getFinderOccasionBySlug(slug: string): FinderOccasion | undefined {
  return FINDER_OCCASIONS.find((o) => o.slug === slug);
}
