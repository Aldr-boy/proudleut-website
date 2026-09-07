import type { MetadataRoute } from 'next'
import { absoluteUrl } from './metadata.ts'

// Tatsaechlich vorhandene, indexierbare oeffentliche statische Next.js-
// Routen (Paket 2, per Repo-Erhebung aus app/*/page.tsx bestaetigt --
// siehe Abschlussbericht). Bewusst NICHT enthalten: /admin/*, /studio/*,
// app/api/* (keine Seiten), sowie /fuer-bands/band-vorstellen (hat ein
// explizites `robots: { index: false, follow: false }`, siehe
// app/fuer-bands/band-vorstellen/page.tsx).
export const STATIC_PUBLIC_PATHS = [
  '/',
  '/bands',
  '/kontakt',
  '/ueber-mich',
  '/fuer-bands',
  '/impressum',
  '/datenschutz',
]

function dedupeSortedSlugs(slugs: Array<string | null | undefined>): string[] {
  const clean = slugs.filter((s): s is string => typeof s === 'string' && s.length > 0)
  return [...new Set(clean)].sort((a, b) => a.localeCompare(b))
}

export type SitemapSourceData = {
  categorySlugs: Array<string | null | undefined>
  bandSlugs: Array<string | null | undefined>
  peopleSlugs: Array<string | null | undefined>
}

// Reine, ohne Netzwerk testbare Sitemap-Aufbaulogik (Paket 2). app/sitemap.ts
// beschafft die Rohdaten ueber die bereits bestehenden oeffentlichen Read-
// Pfade (getAllBandsFromSupabase, getAllPublicPeopleSlugsFromSupabase,
// CATEGORIES) und uebergibt hier nur noch die Slugs -- Determinismus,
// Dedupe und die stabile Gruppenreihenfolge (statische Seiten ->
// Veranstaltungen -> Bands -> Musiker, je Gruppe nach Slug sortiert) leben
// an genau dieser einen Stelle, testbar per Fixtures ohne DB-Zugriff.
//
// Bewusst ohne lastModified: weder fuer die statischen Seiten noch fuer
// Bands/Musiker/Veranstaltungen existiert aktuell eine einzelne,
// zuverlaessige Quelle, die den tatsaechlich angezeigten Inhaltsstand
// vollstaendig abbildet (Bandseite/Musikerseite setzen sich aus mehreren
// Tabellen zusammen, Veranstaltungskategorien sind ein statisches
// TS-Array ohne Zeitstempel) -- laut Auftrag lieber weglassen als
// fachlich falsche Daten ausgeben.
export function buildSitemapEntries(data: SitemapSourceData): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PUBLIC_PATHS.map((path) => ({
    url: absoluteUrl(path),
  }))

  const categoryEntries: MetadataRoute.Sitemap = dedupeSortedSlugs(data.categorySlugs).map((slug) => ({
    url: absoluteUrl(`/veranstaltung/${slug}`),
  }))

  const bandEntries: MetadataRoute.Sitemap = dedupeSortedSlugs(data.bandSlugs).map((slug) => ({
    url: absoluteUrl(`/band/${slug}`),
  }))

  const peopleEntries: MetadataRoute.Sitemap = dedupeSortedSlugs(data.peopleSlugs).map((slug) => ({
    url: absoluteUrl(`/musiker/${slug}`),
  }))

  return [...staticEntries, ...categoryEntries, ...bandEntries, ...peopleEntries]
}
