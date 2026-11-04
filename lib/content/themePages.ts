// Gemeinsame Sicht auf die beiden Themenseiten (Festzelt Bayern, Hochzeit
// Oberpfalz) fuer interne Links: Footer und Bandseiten. "Veroeffentlicht"
// heisst exakt dasselbe wie in app/sitemap.ts: Mindestzahl aktiver Bands
// der Auswahl erreicht. Darunter ist die Seite noindex und steht nicht in
// der Sitemap -- dann wird sie auch nirgends verlinkt.

import {
  FESTZELT_BAYERN_MIN_BANDS,
  FESTZELT_BAYERN_PATH,
  countFestzeltBayernBands,
  festzeltBayernGroups,
  resolveFestzeltBayernGroups,
} from './festzeltBayern.ts'
import {
  HOCHZEIT_OBERPFALZ_MIN_BANDS,
  HOCHZEIT_OBERPFALZ_PATH,
  countHochzeitOberpfalzBands,
  hochzeitOberpfalzBlasmusik,
  hochzeitOberpfalzGroups,
  resolveHochzeitOberpfalzGroups,
} from './hochzeitOberpfalz.ts'

export type ThemePageLink = {
  path: string
  // Zugehoerige Anlass-Slug (Footer-Unterpunkt steht unter diesem Anlass).
  occasionSlug: 'hochzeit' | 'festzelt'
  footerLabel: string
  // Linktext auf Bandseiten, nur fuer Bands, die auf der Themenseite stehen.
  bandPageLabel: string
}

type ThemePageDef = ThemePageLink & {
  published: (activeSlugs: ReadonlySet<string>) => boolean
  // Alle Bands, die die Themenseite (bei genug aktiven Bands) tatsaechlich zeigt.
  listedSlugs: ReadonlySet<string>
}

const THEME_PAGES: ThemePageDef[] = [
  {
    path: HOCHZEIT_OBERPFALZ_PATH,
    occasionSlug: 'hochzeit',
    footerLabel: 'Hochzeitsbands Oberpfalz',
    bandPageLabel: 'Mehr Hochzeitsbands aus der Oberpfalz',
    published: (active) =>
      countHochzeitOberpfalzBands(resolveHochzeitOberpfalzGroups(active)) >= HOCHZEIT_OBERPFALZ_MIN_BANDS,
    // Die Seite zeigt auch die Gruppe Blasmusik, sie zaehlt aber nicht fuer die Mindestzahl.
    listedSlugs: new Set(
      [...hochzeitOberpfalzGroups, hochzeitOberpfalzBlasmusik].flatMap((g) => g.bands.map((b) => b.slug)),
    ),
  },
  {
    path: FESTZELT_BAYERN_PATH,
    occasionSlug: 'festzelt',
    footerLabel: 'Festzeltbands Bayern',
    bandPageLabel: 'Mehr Festzeltbands aus Bayern',
    published: (active) =>
      countFestzeltBayernBands(resolveFestzeltBayernGroups(active)) >= FESTZELT_BAYERN_MIN_BANDS,
    listedSlugs: new Set(festzeltBayernGroups.flatMap((g) => g.bands.map((b) => b.slug))),
  },
]

function toLink({ path, occasionSlug, footerLabel, bandPageLabel }: ThemePageDef): ThemePageLink {
  return { path, occasionSlug, footerLabel, bandPageLabel }
}

// Veroeffentlichte Themenseiten (Bedingung wie in der Sitemap).
export function getPublishedThemePages(activeSlugs: ReadonlySet<string>): ThemePageLink[] {
  return THEME_PAGES.filter((t) => t.published(activeSlugs)).map(toLink)
}

// Veroeffentlichte Themenseiten, auf denen diese Band tatsaechlich aufgefuehrt
// ist (aktiv und in der Auswahl der Seite).
export function getThemePagesForBand(bandSlug: string, activeSlugs: ReadonlySet<string>): ThemePageLink[] {
  if (!activeSlugs.has(bandSlug)) return []
  return THEME_PAGES.filter((t) => t.listedSlugs.has(bandSlug) && t.published(activeSlugs)).map(toLink)
}
