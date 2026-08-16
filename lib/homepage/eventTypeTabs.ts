import { CATEGORIES } from '@/lib/categories';

// Vier Anlass-Tabs fuer die Startseiten-Section "01 -- Auswahl". Bewusst
// eine eigene, homepage-lokale Konfiguration statt einer Erweiterung von
// lib/categories.ts: die dortige CATEGORIES['festzelt']-Kategorie fasst
// Festzelt und Stadt-/Buergerfest zu einem gemeinsamen Anlass zusammen
// (Landingpage /veranstaltung/festzelt), hier sollen es aber vier
// eigenstaendige, ueberschneidungsfreie Tabs sein -- deshalb wird
// "stadt-und-buergerfest" aus dem wiederverwendeten Festzelt-Slug-Set
// herausgenommen und als eigener Pool gefuehrt.
//
// supabaseEventTypeSlugs = echte event_types.slug-Werte (siehe
// lib/categories.ts), gegen band.categorySlugs abgeglichen. Kein neues
// Taxonomie-Mapping, nur eine bewusste Teilmenge/Neugruppierung der
// bereits bestehenden, geprueften Zuordnung.
const firmenfeier = CATEGORIES.find((c) => c.slug === 'firmenfeier');
const festzelt = CATEGORIES.find((c) => c.slug === 'festzelt');

export type EventTypeTab = {
  key: string;
  label: string;
  supabaseEventTypeSlugs: string[];
  // Linkziel -- immer der bestehende, funktionierende Band-Explorer mit
  // ?anlass=<slug>. Fuer "Stadt- & Buergerfest" existiert kein eigener
  // anlass-Wert im Explorer (siehe components/bands/BandExplorer.tsx,
  // gegen lib/categories.ts CATEGORIES validiert) -- bewusste
  // Wiederverwendung von "festzelt" als naechstliegendem gueltigen Wert
  // statt einer neuen URL-Konvention.
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
    supabaseEventTypeSlugs: (festzelt?.supabaseEventTypeSlugs ?? []).filter(
      (slug) => slug !== 'stadt-und-buergerfest'
    ),
    finderAnlassSlug: 'festzelt',
    finderLinkLabel: 'Festzeltbands entdecken',
  },
  {
    key: 'stadt-buergerfest',
    label: 'Stadt- & Bürgerfest',
    supabaseEventTypeSlugs: ['stadt-und-buergerfest'],
    finderAnlassSlug: 'festzelt',
    finderLinkLabel: 'Bands für Stadt- & Bürgerfeste entdecken',
  },
];
