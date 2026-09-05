import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { HeroImagesEditor } from './HeroImagesEditor'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Hero-Bilder – Admin',
  robots: { index: false, follow: false },
}

type MediaAssetRow = {
  id: string
  band_id: string
  url: string
  role: string
  alt_text: string | null
  hero_wall: boolean
  hero_wall_position: number | null
  hero_focus: string | null
  bands: { name: string; slug: string } | null
}

export type HeroImageAsset = {
  id: string
  bandId: string
  bandName: string
  bandSlug: string
  url: string
  role: string
  altText: string | null
  heroWall: boolean
  heroWallPosition: number | null
  heroFocus: string | null
}

// Globaler Admin-Bereich "Hero-Bilder" (Paket 1, SCHRITT 1C). Laedt in
// EINER Query den gesamten media_assets-Bestand samt Bandname (Relation
// media_assets.band_id -> bands.id, siehe
// docs/spezifikation-hero-bildwand.md Abschnitt 7 -- "Der unter dem Bild
// anzuzeigende Bandname ist bands.name. Fuer die Admin-Datenabfrage diese
// bestehende Relation verwenden. Keine alternative Herleitung des
// Bandnamens einfuehren."). Kein Statusfilter auf bands -- ein Bild bleibt
// im Grid sichtbar, auch wenn die zugehoerige Band nicht mehr aktiv ist
// (Auswahl/Verwaltung, keine Live-Vorschau, siehe Abschnitt 7 "Live-
// Vorschau -- ausdruecklich NICHT in Paket 1").
export default async function AdminHeroImagesPage() {
  const client = createAdminClient()

  const { data: rowsRaw, error } = await client
    .from('media_assets')
    .select('id, band_id, url, role, alt_text, hero_wall, hero_wall_position, hero_focus, bands(name, slug)')
    .returns<MediaAssetRow[]>()

  if (error) {
    return (
      <Shell>
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
          Hero-Bilder konnten nicht geladen werden — bitte Seite neu laden. Es wird nichts
          angezeigt oder gespeichert.
        </p>
      </Shell>
    )
  }

  const images: HeroImageAsset[] = (rowsRaw ?? [])
    .filter((r) => r.bands !== null)
    .map((r) => ({
      id: r.id,
      bandId: r.band_id,
      bandName: r.bands!.name,
      bandSlug: r.bands!.slug,
      url: r.url,
      role: r.role,
      altText: r.alt_text,
      heroWall: r.hero_wall,
      heroWallPosition: r.hero_wall_position,
      heroFocus: r.hero_focus,
    }))
    .sort((a, b) => a.bandName.localeCompare(b.bandName) || a.role.localeCompare(b.role))

  return (
    <Shell>
      <HeroImagesEditor images={images} />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">proudleut Admin</span>
        <Link
          href="/admin/bands"
          className="text-sm text-violet-700 hover:text-violet-900 hover:underline transition-colors"
        >
          ← Zurück zu Bands
        </Link>
      </header>
      <div className="px-6 py-6 max-w-6xl mx-auto pb-32">{children}</div>
    </div>
  )
}
