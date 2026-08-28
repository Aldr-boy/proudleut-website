'use client'
import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { updateEventTypeBandAssignmentsAction } from './actions'
import { computeEventTypeBandAssignmentsDiff } from '@/lib/eventTypes/eventTypeBandAssignmentsDiff.ts'

type EventTypeInfo = {
  id: string
  name: string
  slug: string
  status: string
}

type BandEventType = { id: string; name: string; slug: string }

type BandForEditor = {
  id: string
  name: string
  slug: string
  status: string
  eventTypes: BandEventType[]
}

type FilterEventType = { id: string; name: string; slug: string }

const BAND_STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  draft: 'bg-gray-100 text-gray-700',
  paused: 'bg-amber-100 text-amber-800',
  archived: 'bg-red-100 text-red-700',
  new: 'bg-blue-100 text-blue-800',
}

type ViewMode = 'assigned' | 'all'

// Redaktionelles Pflegewerkzeug fuer GENAU EINEN Veranstaltungstyp --
// bewusst nach dem Vorbild von
// app/admin/moods/[slug]/bands/MoodBandsEditor.tsx aufgebaut, aber ohne
// dessen fachliche Mood-Regeln: kein Ranking, kein Cap (kein "X/Y" an der
// Checkbox), keine Warnungen, keine Vererbung zwischen Veranstaltungstypen
// (siehe Auftrag "Event-Type-zentrierte Bandzuordnung"). Aenderungen
// werden ausschliesslich lokal staged und erst per explizitem Save
// gemeinsam und atomar uebernommen (RPC
// public.update_event_type_band_assignments, siehe
// supabase/fn_update_event_type_band_assignments.sql).
export function EventTypeBandsEditor({
  eventType,
  bands,
  initialAssignedBandIds,
  filterEventTypes,
}: {
  eventType: EventTypeInfo
  bands: BandForEditor[]
  initialAssignedBandIds: string[]
  filterEventTypes: FilterEventType[]
}) {
  const router = useRouter()
  const readOnly = eventType.status !== 'active'

  // originalAssigned = zuletzt bestaetigter Sollzustand (beim Laden ODER
  // nach einem erfolgreichen Save). staged = lokaler Bearbeitungszustand.
  // Identisches Prinzip wie MoodBandsEditor: nach erfolgreichem Save wird
  // originalAssigned direkt auf den (dann bereits korrekten) staged-
  // Zustand gesetzt, router.refresh() laeuft zusaetzlich als
  // Frische-Garantie im Hintergrund.
  const [originalAssigned, setOriginalAssigned] = useState<Set<string>>(new Set(initialAssignedBandIds))
  const [staged, setStaged] = useState<Set<string>>(new Set(initialAssignedBandIds))
  const [viewMode, setViewMode] = useState<ViewMode>('assigned')
  const [search, setSearch] = useState('')
  // 'reine Admin-/UI-Funktion' (Auftrag): filtert nur die sichtbare
  // Liste, veraendert nie Daten und ist unabhaengig von staged/diff.
  const [filterEventTypeId, setFilterEventTypeId] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedBanner, setSavedBanner] = useState(false)
  const [isPending, startTransition] = useTransition()

  const diff = useMemo(() => computeEventTypeBandAssignmentsDiff(originalAssigned, staged), [originalAssigned, staged])
  const hasStagedChanges = diff.add.length > 0 || diff.remove.length > 0

  // Schutz vor versehentlichem Verlust bei Reload/Tab schliessen --
  // identisches Prinzip wie MoodBandsEditor.
  useEffect(() => {
    if (!hasStagedChanges) return
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasStagedChanges])

  function handleBackClick(e: React.MouseEvent) {
    if (hasStagedChanges) {
      const confirmed = window.confirm('Ungespeicherte Änderungen verwerfen und zurück zum Veranstaltungstyp-Katalog?')
      if (!confirmed) {
        e.preventDefault()
      }
    }
  }

  function toggleBand(bandId: string, nextChecked: boolean) {
    setSavedBanner(false)
    setStaged((prev) => {
      const next = new Set(prev)
      if (nextChecked) next.add(bandId)
      else next.delete(bandId)
      return next
    })
  }

  function handleDiscard() {
    setStaged(new Set(originalAssigned))
    setSaveError(null)
    setSavedBanner(false)
  }

  function handleSave() {
    setSaveError(null)
    startTransition(async () => {
      const result = await updateEventTypeBandAssignmentsAction({
        eventTypeId: eventType.id,
        addBandIds: diff.add,
        removeBandIds: diff.remove,
      })
      if (result.success) {
        setOriginalAssigned(new Set(staged))
        setSavedBanner(true)
        router.refresh()
      } else {
        setSaveError(result.message)
      }
    })
  }

  const searchLower = search.trim().toLowerCase()

  const visibleBands = useMemo(() => {
    const base = viewMode === 'assigned' ? bands.filter((b) => originalAssigned.has(b.id)) : bands
    const bySearch = searchLower ? base.filter((b) => b.name.toLowerCase().includes(searchLower)) : base
    const byFilter = filterEventTypeId
      ? bySearch.filter((b) => b.eventTypes.some((et) => et.id === filterEventTypeId))
      : bySearch
    return [...byFilter].sort((a, b) => a.name.localeCompare(b.name))
  }, [bands, viewMode, originalAssigned, searchLower, filterEventTypeId])

  return (
    <div className={hasStagedChanges ? 'pb-32' : ''}>
      <Link
        href="/admin/event-types"
        onClick={handleBackClick}
        className="text-sm text-violet-700 hover:text-violet-900 hover:underline transition-colors mb-4 inline-block"
      >
        ← Zurück zum Veranstaltungstyp-Katalog
      </Link>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <h1 className="text-2xl font-semibold text-gray-900">{eventType.name}</h1>
        <div className="flex items-center gap-2 mt-3">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              eventType.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
            }`}
          >
            {eventType.status}
          </span>
          <span className="text-xs text-gray-500">
            {originalAssigned.size} {originalAssigned.size === 1 ? 'Zuordnung' : 'Zuordnungen'}
          </span>
        </div>
      </div>

      {readOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-sm text-amber-800">
          Dieser Veranstaltungstyp ist nicht aktiv (Status: {eventType.status}). Zuordnungen können
          hier nur eingesehen, nicht bearbeitet werden.
        </div>
      )}

      {savedBanner && !hasStagedChanges && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
          Zuordnungen gespeichert.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setViewMode('assigned')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              viewMode === 'assigned'
                ? 'bg-violet-700 text-white border-violet-700'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Zugeordnet · {originalAssigned.size}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              viewMode === 'all'
                ? 'bg-violet-700 text-white border-violet-700'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Alle Bands · {bands.length}
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Band suchen …"
          className="flex-1 min-w-[200px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />

        {filterEventTypes.length > 0 && (
          <select
            value={filterEventTypeId}
            onChange={(e) => setFilterEventTypeId(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Bereits zugeordnet zu: …</option>
            {filterEventTypes.map((et) => (
              <option key={et.id} value={et.id}>
                Bereits zugeordnet zu: {et.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {visibleBands.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-10">Keine Bands gefunden.</p>
        ) : (
          visibleBands.map((band) => (
            <BandRow
              key={band.id}
              band={band}
              isStaged={staged.has(band.id)}
              wasOriginallyAssigned={originalAssigned.has(band.id)}
              readOnly={readOnly}
              onToggle={toggleBand}
            />
          ))
        )}
      </div>

      {hasStagedChanges && !readOnly && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] px-6 py-4 z-10">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {diff.add.length + diff.remove.length} Änderung{diff.add.length + diff.remove.length === 1 ? '' : 'en'}
                </p>
                <p className="text-xs text-gray-500">
                  {diff.add.length} hinzufügen · {diff.remove.length} entfernen
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={isPending}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Änderungen verwerfen
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                  className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Speichert …' : 'Änderungen speichern'}
                </button>
              </div>
            </div>

            {saveError && (
              <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {saveError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function BandRow({
  band,
  isStaged,
  wasOriginallyAssigned,
  readOnly,
  onToggle,
}: {
  band: BandForEditor
  isStaged: boolean
  wasOriginallyAssigned: boolean
  readOnly: boolean
  onToggle: (bandId: string, nextChecked: boolean) => void
}) {
  const changed = isStaged !== wasOriginallyAssigned

  return (
    <div className="px-4 py-3 flex flex-wrap items-start gap-3">
      <div className="flex items-center pt-0.5">
        <input
          type="checkbox"
          checked={isStaged}
          disabled={readOnly}
          onChange={(e) => onToggle(band.id, e.target.checked)}
          className="w-4 h-4 accent-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
        />
      </div>

      <div className="flex-1 min-w-[220px]">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/bands/${band.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-gray-900 hover:text-violet-700 hover:underline transition-colors"
          >
            {band.name}
          </Link>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              BAND_STATUS_STYLES[band.status] ?? 'bg-gray-100 text-gray-700'
            }`}
          >
            {band.status}
          </span>
          {changed && wasOriginallyAssigned && !isStaged && (
            <span className="text-xs font-medium text-red-700">Wird entfernt</span>
          )}
          {changed && !wasOriginallyAssigned && isStaged && (
            <span className="text-xs font-medium text-green-700">Wird hinzugefügt</span>
          )}
        </div>

        {band.eventTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {band.eventTypes.map((et) => (
              <span
                key={et.id}
                className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-800"
              >
                {et.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
