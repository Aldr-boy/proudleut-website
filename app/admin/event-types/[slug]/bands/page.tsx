import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { EventTypeBandsEditor } from './EventTypeBandsEditor'

export const dynamic = 'force-dynamic'

type EventTypeRow = {
  id: string
  name: string
  slug: string
  status: string
}

type BandEventTypeRow = {
  event_type_id: string
  sort_order: number
  event_types: { id: string; name: string; slug: string } | null
}

type BandRow = {
  id: string
  name: string
  slug: string
  status: string
  band_event_types: BandEventTypeRow[]
}

type FilterEventTypeRow = {
  id: string
  name: string
  slug: string
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  return { title: `Veranstaltungstyp: ${slug} – Bandverwaltung` }
}

// Event-Type-zentrierte Bandverwaltung -- bewusst nach dem Vorbild von
// /admin/moods/[slug]/bands aufgebaut (siehe
// app/admin/moods/[slug]/bands/page.tsx), aber ohne dessen fachliche
// Mood-Regeln (kein Ranking, kein Cap, keine Vererbung -- siehe Auftrag
// "Event-Type-zentrierte Bandzuordnung"). Laedt in EINER Query den
// gesamten Bandbestand samt aller Event-Type-Zuordnungen -- dieselbe
// Grundmenge liefert sowohl die "Zugeordnet"-Ansicht als auch
// "Alle Bands", damit beide garantiert konsistent bleiben (identisches
// Prinzip wie beim Mood-Editor). Dieselbe geladene Band->Event-Type-
// Datenbasis speist sowohl die kleinen Event-Type-Chips je Band als auch
// den "Bereits zugeordnet zu"-Filter.
export default async function AdminEventTypeBandsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const client = createAdminClient()

  const { data: eventTypeRaw, error: eventTypeError } = await client
    .from('event_types')
    .select('id, name, slug, status')
    .eq('slug', slug)
    .maybeSingle<EventTypeRow>()

  if (eventTypeError) {
    return (
      <ErrorShell>
        Veranstaltungstyp konnte nicht geladen werden — bitte Seite neu laden. Es wird nichts
        angezeigt oder gespeichert.
      </ErrorShell>
    )
  }

  if (!eventTypeRaw) notFound()

  const eventType = eventTypeRaw

  const [{ data: bandsRaw, error: bandsError }, { data: filterTypesRaw, error: filterTypesError }] = await Promise.all([
    // Grundmenge und Sortierung EXAKT wie im Mood-Editor: kein Statusfilter
    // auf bands, alphabetisch nach Name.
    client
      .from('bands')
      .select('id, name, slug, status, band_event_types(event_type_id, sort_order, event_types(id, name, slug))')
      .order('name', { ascending: true })
      .returns<BandRow[]>(),
    // Filterliste "Bereits zugeordnet zu": nur aktive Veranstaltungstypen,
    // der aktuell bearbeitete Typ wird ausgeblendet.
    client
      .from('event_types')
      .select('id, name, slug')
      .eq('status', 'active')
      .neq('id', eventType.id)
      .order('name', { ascending: true })
      .returns<FilterEventTypeRow[]>(),
  ])

  const loadError = !!bandsError || !!filterTypesError

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
    eventTypes: [...b.band_event_types]
      .sort((a, bb) => a.sort_order - bb.sort_order)
      .map((bet) => bet.event_types)
      .filter((et): et is { id: string; name: string; slug: string } => et !== null),
  }))

  const assignedBandIds = bands.filter((b) => b.eventTypes.some((et) => et.id === eventType.id)).map((b) => b.id)

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">proudleut Admin</span>
      </header>

      <div className="px-6 py-6 max-w-4xl mx-auto">
        <EventTypeBandsEditor
          eventType={eventType}
          bands={bands}
          initialAssignedBandIds={assignedBandIds}
          filterEventTypes={filterTypesRaw ?? []}
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
          href="/admin/event-types"
          className="text-sm text-violet-700 hover:text-violet-900 hover:underline transition-colors mb-4 inline-block"
        >
          ← Zurück zum Veranstaltungstyp-Katalog
        </Link>
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
          {children}
        </p>
      </div>
    </div>
  )
}
