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
};

export const EVENT_TYPE_TABS: EventTypeTab[] = [
  {
    key: 'hochzeit',
    label: 'Hochzeit',
    supabaseEventTypeSlugs: ['hochzeit'],
    finderAnlassSlug: 'hochzeit',
    finderLinkLabel: 'Hochzeitsbands entdecken',
  },
  {
    key: 'firmenfeier',
    label: 'Firmenfeier & Business Event',
    supabaseEventTypeSlugs: firmenfeier?.supabaseEventTypeSlugs ?? [],
    finderAnlassSlug: 'firmenfeier',
    finderLinkLabel: 'Bands für Firmenfeiern entdecken',
  },
  {
    key: 'festzelt',
    label: 'Festzelt',
    supabaseEventTypeSlugs: festzelt?.supabaseEventTypeSlugs ?? [],
    finderAnlassSlug: 'festzelt',
    finderLinkLabel: 'Festzeltbands entdecken',
  },
  {
    key: 'stadt-buergerfest',
    label: 'Stadt- & Bürgerfest',
    supabaseEventTypeSlugs: stadtBuergerfest?.supabaseEventTypeSlugs ?? [],
    finderAnlassSlug: 'stadt-und-buergerfest',
    finderLinkLabel: 'Bands für Stadt- & Bürgerfeste entdecken',
  },
];
