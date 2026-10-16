import type { MetadataRoute } from 'next'
import { getAllBandsFromSupabase } from '@/lib/supabase/queries'
import { getAllPublicPeopleSlugsFromSupabase } from '@/lib/people/publicQueries'
import { CATEGORIES } from '@/lib/categories'
import { buildSitemapEntries } from '@/lib/seo/buildSitemap'
import {
  FESTZELT_BAYERN_MIN_BANDS,
  FESTZELT_BAYERN_PATH,
  countFestzeltBayernBands,
  resolveFestzeltBayernGroups,
} from '@/lib/content/festzeltBayern'

// Gleicher Revalidierungstakt wie der bestehende ISR-Rhythmus fuer
// Airtable-/Kategoriedaten im Projekt (siehe CLAUDE.md, "alle 5-10
// Minuten"), hier fuer Supabase-Bands/-Personen uebernommen -- keine neue
// Cache-Strategie.
export const revalidate = 300

type SlugRow = { slug?: string | null }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ data: bandsData }, { data: peopleData }] = await Promise.all([
    getAllBandsFromSupabase(),
    getAllPublicPeopleSlugsFromSupabase(),
  ])

  const bandSlugs = ((bandsData ?? []) as SlugRow[]).map((b) => b.slug)
  const activeSlugs = new Set(bandSlugs.filter((s): s is string => !!s))
  const festzeltBayernBands = countFestzeltBayernBands(resolveFestzeltBayernGroups(activeSlugs))

  return buildSitemapEntries({
    categorySlugs: CATEGORIES.map((c) => c.slug),
    bandSlugs,
    peopleSlugs: ((peopleData ?? []) as SlugRow[]).map((p) => p.slug),
    themePaths: festzeltBayernBands >= FESTZELT_BAYERN_MIN_BANDS ? [FESTZELT_BAYERN_PATH] : [],
  })
}
