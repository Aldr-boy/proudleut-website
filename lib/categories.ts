import type { Band } from '@/lib/types/band';

export type CategoryConfig = {
  title: string;
  slug: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  airtableEventTypes: string[];
};

export const CATEGORIES: CategoryConfig[] = [
  {
    title: 'Hochzeit',
    slug: 'hochzeit',
    description: 'Livebands für Hochzeit, freie Trauung, Sektempfang und Feier.',
    seoTitle: 'Hochzeitsbands – proudleut.com',
    seoDescription:
      'Finde die passende Liveband für deine Hochzeit – persönlich, direkt und mit starken Bands.',
    airtableEventTypes: ['Hochzeit'],
  },
  {
    title: 'Festzelt & Volksfest',
    slug: 'festzelt',
    description: 'Bands für Festzelt, Volksfest, Zeltfest und bayerische Feiern.',
    seoTitle: 'Festzeltbands & Volksfestbands – proudleut.com',
    seoDescription:
      'Livebands für Festzelt, Volksfest und Zeltfest – bayerisch, fetzig und zuverlässig.',
    airtableEventTypes: ['Festzelt', 'Festzelt / Volksfest'],
  },
  {
    title: 'Firmenfeier & Business Event',
    slug: 'firmenfeier',
    description:
      'Professionelle Livebands für Firmenfeiern, Business Events und besondere Unternehmensabende.',
    seoTitle: 'Bands für Firmenfeier & Business Events – proudleut.com',
    seoDescription:
      'Livebands für Firmenfeiern, Galas und Business Events – professionell, hochwertig und passgenau.',
    airtableEventTypes: ['Firmenfeier & Business Event', 'Firmenevent', 'Business Event'],
  },
  {
    title: 'Geburtstag & Privatfeier',
    slug: 'geburtstag',
    description: 'Livebands für Geburtstage, private Feiern und besondere Anlässe.',
    seoTitle: 'Bands für Geburtstag & Privatfeier – proudleut.com',
    seoDescription:
      'Livebands für Geburtstage und Privatfeiern – persönlich, unterhaltsam und direkt kontaktierbar.',
    airtableEventTypes: ['Geburtstag', 'Privatfeier'],
  },
  {
    title: 'Gala & Empfang',
    slug: 'gala',
    description: 'Stilvolle Livebands für Galas, Empfänge und hochwertige Events.',
    seoTitle: 'Bands für Gala & Empfang – proudleut.com',
    seoDescription:
      'Livebands für Galas und Empfänge – stilvoll, professionell und auf den Punkt.',
    airtableEventTypes: ['Gala', 'Empfang'],
  },
];

export function bandMatchesCategory(band: Band, category: CategoryConfig): boolean {
  return band.eventTypes.some((et) => category.airtableEventTypes.includes(et));
}
