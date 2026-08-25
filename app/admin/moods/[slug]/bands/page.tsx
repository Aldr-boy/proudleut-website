import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { MoodBandsEditor } from './MoodBandsEditor'

export const dynamic = 'force-dynamic'

type MoodRow = {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
}

type BandMoodRow = {
  mood_id: string
  sort_order: number
  moods: { id: string; name: string; slug: string } | null
}

type BandRow = {
  id: string
  name: string
  slug: string
  status: string
  band_moods: BandMoodRow[]
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  return { title: `Klingt nach: ${slug} – Bandverwaltung` }
}

// Mood-zentrierte Bandverwaltung V1 -- ein redaktionelles Audit-/Pflege-
// werkzeug fuer genau EINEN Mood (siehe Auftrag "Mood-zentrierte
// Bandverwaltung V1"), kein zweiter vollstaendiger Band-Editor. Laedt in
// EINER Query den gesamten Bandbestand samt aller Mood-Zuordnungen --
// dieselbe Grundmenge liefert sowohl die "Zugeordnet"-Ansicht als auch
// "Alle Bands", damit beide garantiert konsistent bleiben (Auftrag
// Abschnitt 27: die Katalog-Badge zaehlt ebenfalls jede band_moods-Zeile
// unabhaengig vom Bandstatus -- kein stilles Herausfiltern hier).
export default async function AdminMoodBandsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const client = createAdminClient()

  const { data: moodRaw, error: moodError } = await client
    .from('moods')
    .select('id, name, slug, description, status')
    .eq('slug', slug)
    .maybeSingle<MoodRow>()

  if (moodError) {
    return (
      <ErrorShell>
        Mood konnte nicht geladen werden — bitte Seite neu laden. Es wird nichts angezeigt oder
        gespeichert.
      </ErrorShell>
    )
  }

  if (!moodRaw) notFound()

  const mood = moodRaw

  const { data: bandsRaw, error: bandsError } = await client
    .from('bands')
    .select('id, name, slug, status, band_moods(mood_id, sort_order, moods(id, name, slug))')
    .order('name', { ascending: true })
    .returns<BandRow[]>()

  const loadError = !!bandsError

  if (loadError) {
    return (
      <ErrorShell>
        Zuordnungen konnten nicht vollständig geladen werden — bitte Seite neu laden. Es wird
        nichts gespeichert.
      </ErrorShell>
    )
  }

  const bands = (bandsRaw ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    status: b.status,
    moods: [...b.band_moods]
      .sort((a, bb) => a.sort_order - bb.sort_order)
      .map((bm) => bm.moods)
      .filter((m): m is { id: string; name: string; slug: string } => m !== null),
  }))

  const assignedBandIds = bands.filter((b) => b.moods.some((m) => m.id === mood.id)).map((b) => b.id)

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">proudleut Admin</span>
      </header>

      <div className="px-6 py-6 max-w-4xl mx-auto">
        <MoodBandsEditor
          mood={mood}
          bands={bands}
          initialAssignedBandIds={assignedBandIds}
        />
      </div>
    </div>
  )
}

function ErrorShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">proudleut Admin</span>
      </header>
      <div className="px-6 py-6 max-w-4xl mx-auto">
        <Link
          href="/admin/moods"
          className="text-sm text-violet-700 hover:text-violet-900 hover:underline transition-colors mb-4 inline-block"
        >
          ← Zurück zum Mood-Katalog
        </Link>
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
          {children}
        </p>
      </div>
    </div>
  )
}
