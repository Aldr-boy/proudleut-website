import type { Band } from '@/lib/types/band';

export type CategoryConfig = {
  title: string;
  slug: string;
  h1Title?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  airtableEventTypes: string[];
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
      'Weihnachtsfeier',
      'Sommerfest',
      'Award-Show',
      'Abschlussfeier',
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
  },
];

export function bandMatchesCategory(band: Band, category: CategoryConfig): boolean {
  return band.eventTypes.some((et) =>
    category.airtableEventTypes.includes(et.trim())
  );
}

export function getCategoryBySlug(slug: string): CategoryConfig | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getRelatedCategories(currentSlug: string): CategoryConfig[] {
  return CATEGORIES.filter((c) => c.slug !== currentSlug);
}
