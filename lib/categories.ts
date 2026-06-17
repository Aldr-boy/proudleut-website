import type { Band } from '@/lib/types/band';

export type CategoryConfig = {
  title: string;
  slug: string;
  h1Title?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  airtableEventTypes: string[];
  supabaseEventTypeSlugs?: string[];
};

export const CATEGORIES: CategoryConfig[] = [
  {
    title: 'Hochzeit',
    slug: 'hochzeit',
    h1Title: 'Hochzeitsbands',
    description: 'Livebands für Hochzeit, freie Trauung, Sektempfang und Feier.',
    seoTitle: 'Hochzeitsbands – proudleut.com',
    seoDescription:
      'Finde die passende Liveband für deine Hochzeit – persönlich, direkt und mit starken Bands.',
    airtableEventTypes: ['Hochzeit'],
    supabaseEventTypeSlugs: ['hochzeit'],
  },
  {
    title: 'Festzelt & Volksfest',
    slug: 'festzelt',
    h1Title: 'Festzeltbands & Volksfestbands',
    description: 'Bands für Festzelt, Volksfest, Zeltfest und bayerische Feiern.',
    seoTitle: 'Festzeltbands & Volksfestbands – proudleut.com',
    seoDescription:
      'Livebands für Festzelt, Volksfest und Zeltfest – bayerisch, fetzig und zuverlässig.',
    airtableEventTypes: [
      'Festzelt',
      'Stadt- und Bürgerfest',
      'Bierfest',
      'Brauereifest',
      'Bürgerfest',
      'Biergarten',
      'Wirtshausmusi',
      'Frühschoppen',
      'Zoigl',
      'Grottenfest',
    ],
    supabaseEventTypeSlugs: [
      'festzelt',
      'stadt-und-buergerfest',
      'bierfest',
      'brauereifest',
      'buergerfest',
      'biergarten',
      'wirtshausmusi',
      'fruehschoppen',
    ],
  },
  {
    title: 'Firmenfeier & Business Event',
    slug: 'firmenfeier',
    h1Title: 'Bands für Firmenfeiern & Business Events',
    description:
      'Professionelle Livebands für Firmenfeiern, Business Events und besondere Unternehmensabende.',
    seoTitle: 'Bands für Firmenfeier & Business Events – proudleut.com',
    seoDescription:
      'Livebands für Firmenfeiern, Galas und Business Events – professionell, hochwertig und passgenau.',
    airtableEventTypes: [
      'Firmenfeier & Business Event',
      'Sommerfest',
      'Award-Show',
      'Abschlussfeier',
    ],
    // Sommerfest bewusst nicht gemappt – redaktionelle Entscheidung, späterer Prüfblock
    supabaseEventTypeSlugs: [
      'firmenfeier-business-event',
      'award-show',
      'abschlussfeier',
    ],
  },
  {
    title: 'Geburtstag & Privatfeier',
    slug: 'geburtstag',
    h1Title: 'Bands für Geburtstag & Privatfeier',
    description: 'Livebands für Geburtstage, private Feiern und besondere Anlässe.',
    seoTitle: 'Bands für Geburtstag & Privatfeier – proudleut.com',
    seoDescription:
      'Livebands für Geburtstage und Privatfeiern – persönlich, unterhaltsam und direkt kontaktierbar.',
    airtableEventTypes: [
      'Geburtstagsfeier',
      'private Feiern',
      'exklusive Privatfeiern',
      'Jubiläum',
      'Taufe',
      'Familiennachmittage',
    ],
    // Familiennachmittage kein Supabase-Slug – bewusste Auslassung
    supabaseEventTypeSlugs: [
      'geburtstagsfeier',
      'private-feiern',
      'exklusive-privatfeiern',
      'jubilaeum',
      'taufe',
    ],
  },
  {
    title: 'Gala & Empfang',
    slug: 'gala',
    h1Title: 'Bands für Gala & Empfang',
    description: 'Stilvolle Livebands für Galas, Empfänge und hochwertige Events.',
    seoTitle: 'Bands für Gala & Empfang – proudleut.com',
    seoDescription:
      'Livebands für Galas und Empfänge – stilvoll, professionell und auf den Punkt.',
    airtableEventTypes: ['Empfang', 'Ball', 'Bankett', 'Ehrenabende', 'Vernissage'],
    supabaseEventTypeSlugs: ['empfang', 'ball', 'bankett', 'ehrenabende', 'vernissage'],
  },
  {
    title: 'Fasching',
    slug: 'fasching',
    h1Title: 'Bands für Fasching & Faschingsbälle',
    description:
      'Livebands für Faschingsbälle, Inthronisationen und die fünfte Jahreszeit – Stimmung für Saal, Bühne und Tanzfläche.',
    seoTitle: 'Faschingsbands & Bands für Faschingsbälle – proudleut.com',
    seoDescription:
      'Livebands für Fasching, Faschingsbälle, Karneval und Inthronisationen in Bayern finden – passende Bands für die fünfte Jahreszeit entdecken.',
    airtableEventTypes: ['Fasching'],
    supabaseEventTypeSlugs: ['fasching'],
  },
  {
    title: 'Weihnachtsfeier',
    slug: 'weihnachtsfeier',
    h1Title: 'Bands für Weihnachtsfeiern & Jahresabschluss',
    description:
      'Livemusik für Weihnachtsfeiern und Jahresabschlüsse – von festlich-leise bis ausgelassen.',
    seoTitle: 'Bands für Weihnachtsfeiern – proudleut.com',
    seoDescription:
      'Livebands für Weihnachtsfeiern, Jahresabschlussfeiern und festliche Winterabende in Bayern – stimmungsvoll und passgenau für euren Anlass.',
    airtableEventTypes: ['Weihnachtsfeier'],
    supabaseEventTypeSlugs: ['weihnachtsfeier'],
  },
  {
    title: 'Festival',
    slug: 'festival',
    h1Title: 'Bands für Festivals & Open Airs',
    description:
      'Livebands für Festivals, Open Airs und besondere Bühnenmomente – Energie, die bis in die letzte Reihe trägt.',
    seoTitle: 'Festivalbands & Bands für Open Airs – proudleut.com',
    seoDescription:
      'Livebands für Festivals und Open-Air-Bühnen in Bayern finden – vom kleinen Kulturfestival bis zum großen Line-up.',
    airtableEventTypes: ['Festival'],
    supabaseEventTypeSlugs: ['festival'],
  },
];

export function bandMatchesCategory(band: Band, category: CategoryConfig): boolean {
  return band.eventTypes.some((et) =>
    category.airtableEventTypes.includes(et.trim())
  );
}

export function bandMatchesCategorySB(
  band: Pick<Band, 'categorySlugs'>,
  category: CategoryConfig
): boolean {
  if (!category.supabaseEventTypeSlugs?.length) return false;
  return (
    band.categorySlugs?.some((slug) =>
      category.supabaseEventTypeSlugs?.includes(slug)
    ) ?? false
  );
}

export function getCategoryBySlug(slug: string): CategoryConfig | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getRelatedCategories(currentSlug: string): CategoryConfig[] {
  return CATEGORIES.filter((c) => c.slug !== currentSlug);
}
