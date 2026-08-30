import { getCategoryBySlug } from '../categories.ts';

// Reine URL-Entscheidungslogik fuer die Wiederverwendung von
// BandExplorer auf /veranstaltung/[slug] (Paket "Finder auf
// Veranstaltungsseiten wiederverwenden"). Bewusst als kleine, eigene
// Helper-Funktionen extrahiert statt in BandExplorer.tsx verschachtelt --
// direkt unit-testbar, keine Extraktion des restlichen Finders.
export type FinderFilterParams = {
  region: string | null;
  suche: string;
  bandtyp: string | null;
  mood: string | null;
};

function buildFilterSearchParams(params: FinderFilterParams): URLSearchParams {
  const p = new URLSearchParams();
  if (params.region) p.set('region', params.region.toLowerCase());
  if (params.suche) p.set('suche', params.suche);
  if (params.bandtyp) p.set('bandtyp', params.bandtyp.toLowerCase());
  if (params.mood) p.set('mood', params.mood);
  return p;
}

// Baut eine URL fuer eine gegebene Basisroute (z. B. /bands oder
// /veranstaltung/hochzeit) mit den uebrigen Filtern als Query-Params --
// bewusst OHNE anlass-Param (R4: keine redundanten anlass-Params auf
// Veranstaltungsseiten-URLs).
export function buildFinderFilterUrl(baseRoute: string, params: FinderFilterParams): string {
  const qs = buildFilterSearchParams(params).toString();
  return qs ? `${baseRoute}?${qs}` : baseRoute;
}

// R1: "Wofuer" ist im Veranstaltungsseiten-Kontext Navigation, kein
// In-Place-Filter. Anlass MIT bestehender Landingpage (getCategoryBySlug
// -- derselbe bestehende Getter wie auf /veranstaltung/[slug], keine neue
// hartcodierte Mapping-Liste) -> /veranstaltung/<slug>. Anlass OHNE
// Landingpage -> /bands?anlass=<slug>. Die uebrigen Filter-Query-Params
// bleiben in beiden Faellen erhalten.
export function buildOccasionNavUrl(targetSlug: string, params: FinderFilterParams): string {
  if (getCategoryBySlug(targetSlug)) {
    return buildFinderFilterUrl(`/veranstaltung/${targetSlug}`, params);
  }
  const p = new URLSearchParams();
  p.set('anlass', targetSlug);
  if (params.region) p.set('region', params.region.toLowerCase());
  if (params.suche) p.set('suche', params.suche);
  if (params.bandtyp) p.set('bandtyp', params.bandtyp.toLowerCase());
  if (params.mood) p.set('mood', params.mood);
  return `/bands?${p.toString()}`;
}
