import type { Band } from '@/lib/types/band';
import { CATEGORIES } from './categories.ts';

// Eigene, geordnete Anlass-Konfiguration fuer den oeffentlichen Band-Finder
// (components/bands/BandExplorer.tsx, "Wofuer"). Bewusst von CATEGORIES
// entkoppelt: CATEGORIES bleibt die Quelle fuer die redaktionelle SEO-
// Themenwelt (/veranstaltung/[slug]) und ist dort bewusst breiter
// (Oberbegriff + Detailtypen, siehe docs/event-type-redaktionsentscheidungen.md).
// Der Finder braucht dagegen eine praezisere, teils abweichende Auswahl --
// z. B. "Stadt- & Buergerfest" als eigene Option ohne CATEGORIES-Gegenpart
// und ohne eigene SEO-Landingpage.
//
// Bestehende Anlaesse werden wo moeglich aus CATEGORIES abgeleitet
// (fromCategory()), damit nicht acht Konfigurationen parallel gepflegt
// werden muessen. fromCategory() erlaubt dafuer einen expliziten
// overrideSlugs-Parameter, falls Finder- und CATEGORIES-Scope fuer einen
// Anlass bewusst auseinanderlaufen sollen (Titel/Slug kommen dann
// weiterhin aus CATEGORIES, nur die Match-Slugs weichen ab) -- aktuell
// von keinem Eintrag genutzt, da Finder und CATEGORIES fuer alle
// bestehenden Anlaesse denselben fachlichen Scope teilen. Kein impliziter
// Modus, keine Mutation von CATEGORIES, keine Sonderbehandlung im
// BandExplorer.
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
  // Eigener Finder-Anlass ohne CATEGORIES-Gegenpart (bewusst kein
  // fromCategory()): Brautentfuehrung ist ein eigenstaendiger Anlass, kein
  // Hochzeits-Untertyp. CATEGORIES['hochzeit'].supabaseEventTypeSlugs
  // bleibt exakt ['hochzeit'] -- ein Match hier darf sich deshalb
  // ausschliesslich auf den echten Event-Type-Slug "brautentfuehrung"
  // stuetzen, nicht auf den Hochzeit-Oberbegriff oder weitere
  // Hochzeitstypen.
  {
    title: 'Brautentführung',
    slug: 'brautentfuehrung',
    supabaseEventTypeSlugs: ['brautentfuehrung'],
  },
  fromCategory('festzelt'),
  // "Stadt- & Buergerfest" ist eine eigene Finder-Option ohne
  // CATEGORIES-Gegenpart und ohne eigene SEO-Landingpage (siehe
  // Datei-Kommentar oben).
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
