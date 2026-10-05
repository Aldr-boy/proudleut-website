// Zentrale Weiterleitungen fuer den Domain-Umzug Webflow -> Next.js.
// Quelle der alten Adressen: Sitemap der Webflow-Seite (https://www.proudleut.com/sitemap.xml).
// Adressen, die auf der neuen Seite unveraendert existieren (/, /bands, /kontakt, /impressum,
// /datenschutz, /ueber-mich, /fuer-bands, /veranstaltung/{hochzeit,festzelt,firmenfeier,gala}),
// bekommen bewusst KEINE Weiterleitung. /datenschutzhinweise steht weiterhin in next.config.ts.
// Jeder Eintrag zeigt direkt auf ein Ziel, das selbst 200 liefert (keine Ketten).

export type LegacyRedirect = { source: string; destination: string; statusCode: 301 };

type Target = { path: string; query?: Record<string, string> };

// Next.js dekodiert Query-Werte im Redirect-Ziel einmal und gibt sie unkodiert aus
// (aus "%26" wuerde ein trennendes "&"). Deshalb wird doppelt kodiert.
function dest({ path, query }: Target): string {
  if (!query) return path;
  const qs = Object.entries(query)
    .map(([k, v]) => `${k}=${encodeURIComponent(encodeURIComponent(v))}`)
    .join('&');
  return `${path}?${qs}`;
}

const OVERVIEW: Target = { path: '/bands' };
const bandtyp = (name: string): Target => ({ path: '/bands', query: { bandtyp: name } });
const anlass = (slug: string): Target => ({ path: '/bands', query: { anlass: slug } });
const veranstaltung = (slug: string): Target => ({ path: `/veranstaltung/${slug}` });

// Alte /band-kategorie/<slug> (Bandart oder Anlass) -> Bandfinder / Veranstaltungsseite.
// Eintraege mit "nearest: true" haben kein echtes Gegenstueck (siehe PR-Bericht).
const BAND_KATEGORIE: Record<string, Target> = {
  akustikband: bandtyp('akustikband'),
  backgroundmusic: OVERVIEW, // nearest
  'bayrische-partybands': bandtyp('bayrische partyband'),
  bigband: bandtyp('bigband'),
  'blasmusik-wirtshausmusik': bandtyp('blasmusik / wirtshausmusik'),
  'classic-rock': bandtyp('rock- & coverband'), // nearest
  dj: OVERVIEW, // nearest
  firmenfeier: veranstaltung('firmenfeier'),
  'hochzeitssanger-in': bandtyp('hochzeitssänger*in'),
  'kinder-jugendband': bandtyp('kinder- & jugendband'),
  kirchenband: anlass('trauung'), // nearest
  konzert: anlass('konzert-club-festival'),
  'metal-band': bandtyp('metalband'),
  'original-oktoberfestband': veranstaltung('festzelt'), // nearest
  partyband: bandtyp('partyband'),
  'singer-songwriter': bandtyp('akustikband'), // nearest
  solomusiker: bandtyp('akustikband'), // nearest
  stimmungsband: bandtyp('partyband'), // nearest
  tanzband: bandtyp('partyband'), // nearest
  trauung: anlass('trauung'),
  'vocal-band': bandtyp('a-cappella & vocal'),
};

// Alte /veranstaltung/<slug>, die es neu nicht gibt.
const VERANSTALTUNG: Record<string, Target> = {
  'executive-event': veranstaltung('gala'), // nearest
};

// Alte /band-finder/<bandart>-fuer-<anlass>: Bandart -> bandtyp, Anlass -> Anlass-Seite,
// falls es ein echtes Gegenstueck gibt; sonst nur die Bandart-Uebersicht.
const FINDER_BANDART: Record<string, Target> = {
  'bayrische-partyband': bandtyp('bayrische partyband'),
  'blasmusik-wirtshausmusik': bandtyp('blasmusik / wirtshausmusik'),
  konzert: anlass('konzert-club-festival'),
  partyband: bandtyp('partyband'),
};

const FINDER_ANLASS: Record<string, string> = {
  hochzeit: '/veranstaltung/hochzeit',
  festzelt: '/veranstaltung/festzelt',
  'firmenfeier-business-event': '/veranstaltung/firmenfeier',
  geburtstagsfeier: '/veranstaltung/geburtstag',
  gala: '/veranstaltung/gala',
  fasching: '/veranstaltung/fasching',
  weihnachtsfeier: '/veranstaltung/weihnachtsfeier',
  festival: '/veranstaltung/festival',
  'executive-event': '/veranstaltung/gala',
  brautentfuehrung: '/bands?anlass=brautentfuehrung',
  buergerfest: '/bands?anlass=stadt-und-buergerfest',
  'staedtische-veranstaltung': '/bands?anlass=stadt-und-buergerfest',
  konzert: '/bands?anlass=konzert-club-festival',
};

// Alle in der Sitemap vorkommenden /band-finder/-Slugs (Stand Sitemap-Export).
const BAND_FINDER_SLUGS = [
  'bayrische-partyband-fuer-abschlussfeier', 'bayrische-partyband-fuer-bierfest', 'bayrische-partyband-fuer-buergerfest',
  'bayrische-partyband-fuer-dult', 'bayrische-partyband-fuer-fasching', 'bayrische-partyband-fuer-festzelt',
  'bayrische-partyband-fuer-firmenfeier-business-event', 'bayrische-partyband-fuer-geburtstagsfeier',
  'bayrische-partyband-fuer-gruendungsfest', 'bayrische-partyband-fuer-hochzeit', 'bayrische-partyband-fuer-jubilaeum',
  'bayrische-partyband-fuer-kirchweih', 'bayrische-partyband-fuer-oktoberfest', 'bayrische-partyband-fuer-open-air',
  'bayrische-partyband-fuer-staedtische-veranstaltung', 'bayrische-partyband-fuer-vereinsfest',
  'bayrische-partyband-fuer-volksfest', 'bayrische-partyband-fuer-weinfest',
  'blasmusik-wirtshausmusik-fuer-bierfest', 'blasmusik-wirtshausmusik-fuer-biergarten',
  'blasmusik-wirtshausmusik-fuer-brauereifest', 'blasmusik-wirtshausmusik-fuer-burschenfest',
  'blasmusik-wirtshausmusik-fuer-dult', 'blasmusik-wirtshausmusik-fuer-festival', 'blasmusik-wirtshausmusik-fuer-festzelt',
  'blasmusik-wirtshausmusik-fuer-firmenfeier-business-event', 'blasmusik-wirtshausmusik-fuer-geburtstagsfeier',
  'blasmusik-wirtshausmusik-fuer-gruendungsfest', 'blasmusik-wirtshausmusik-fuer-hochzeit',
  'blasmusik-wirtshausmusik-fuer-jubilaeum', 'blasmusik-wirtshausmusik-fuer-kirchweih',
  'blasmusik-wirtshausmusik-fuer-oktoberfest', 'blasmusik-wirtshausmusik-fuer-private-feiern',
  'blasmusik-wirtshausmusik-fuer-staedtische-veranstaltung', 'blasmusik-wirtshausmusik-fuer-starkbierfest',
  'blasmusik-wirtshausmusik-fuer-vereinsfest', 'blasmusik-wirtshausmusik-fuer-volksfest',
  'blasmusik-wirtshausmusik-fuer-wirtshausmusi', 'konzert-fuer-konzert',
  'partyband-fuer-abschlussfeier', 'partyband-fuer-ball', 'partyband-fuer-bankett', 'partyband-fuer-brautentfuehrung',
  'partyband-fuer-buergerfest', 'partyband-fuer-empfang', 'partyband-fuer-executive-event',
  'partyband-fuer-exklusive-privatfeiern', 'partyband-fuer-firmenfeier-business-event', 'partyband-fuer-gala',
  'partyband-fuer-geburtstagsfeier', 'partyband-fuer-gruendungsfest', 'partyband-fuer-hochzeit',
  'partyband-fuer-private-feiern', 'partyband-fuer-sektempfang', 'partyband-fuer-staedtische-veranstaltung',
  'partyband-fuer-tanzveranstaltung', 'partyband-fuer-weihnachtsfeier',
];

// Alte Bandprofile (DE bzw. nur EN-Sitemap), zu denen es auf der neuen Seite kein Profil gibt.
const BAND_ONLY_OLD: string[] = ['glory-times', 'brugger-buam', 'soulmaid-music'];

function finderTarget(slug: string): string {
  for (const [bandartSlug, bandart] of Object.entries(FINDER_BANDART)) {
    const prefix = `${bandartSlug}-fuer-`;
    if (!slug.startsWith(prefix)) continue;
    const anlassSlug = slug.slice(prefix.length);
    // konzert-fuer-konzert: Bandart und Anlass sind identisch.
    if (bandartSlug === 'konzert') return dest(bandart);
    return FINDER_ANLASS[anlassSlug] ?? dest(bandart);
  }
  return '/bands';
}

function buildLegacyRedirects(): LegacyRedirect[] {
  const r: LegacyRedirect[] = [];
  const add = (source: string, destination: string) => r.push({ source, destination, statusCode: 301 });

  // Englische Webflow-Variante: es gibt keine englische Seite -> direkt auf das deutsche Ziel.
  const withEn = (source: string, destination: string) => {
    add(source, destination);
    add(`/en${source}`, destination);
  };

  add('/en', '/');

  withEn('/bandsuche', '/bands');
  add('/en/datenschutzhinweise', '/datenschutz');
  add('/en/fuer-bands', '/fuer-bands');
  add('/en/impressum', '/impressum');
  add('/en/kontakt', '/kontakt');
  add('/en/ueber-mich', '/ueber-mich');
  add('/en/veranstaltung/festzelt', '/veranstaltung/festzelt');
  add('/en/veranstaltung/firmenfeier', '/veranstaltung/firmenfeier');
  add('/en/veranstaltung/gala', '/veranstaltung/gala');
  add('/en/veranstaltung/hochzeit', '/veranstaltung/hochzeit');

  for (const [slug, target] of Object.entries(VERANSTALTUNG)) {
    withEn(`/veranstaltung/${slug}`, dest(target));
  }
  for (const [slug, target] of Object.entries(BAND_KATEGORIE)) {
    withEn(`/band-kategorie/${slug}`, dest(target));
  }
  for (const slug of BAND_FINDER_SLUGS) {
    add(`/band-finder/${slug}`, finderTarget(slug));
  }

  // Blog gibt es neu nicht: Interview zur Hochzeit -> Hochzeitsseite, sonst Bandübersicht.
  withEn('/blog', '/bands');
  withEn('/blog/im-interview-mit-regio-traumhochzeit', '/veranstaltung/hochzeit');
  withEn('/blog/von-blaskapellen-bis-partybands-das-bandbuch-feiert-40-bands-aus-bayern', '/bands');

  // Bandprofile: /bands/<slug> -> /band/<slug> (alle Slugs der Sitemap ausser den unten genannten).
  for (const slug of BAND_ONLY_OLD) {
    withEn(`/bands/${slug}`, '/bands');
  }
  add('/bands/:slug', '/band/:slug');
  add('/en/bands/:slug', '/band/:slug');

  // Auffangnetz fuer Adressen dieser alten Bereiche, die nicht in der Sitemap standen.
  add('/band-kategorie/:slug', '/bands');
  add('/band-finder/:slug', '/bands');
  add('/blog/:slug', '/bands');

  return r;
}

export const LEGACY_REDIRECTS: LegacyRedirect[] = buildLegacyRedirects();
