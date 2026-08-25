'use client'
import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { updateMoodBandAssignmentsAction } from './actions'
import { computeMoodBandDiff } from '@/lib/moods/moodBandAssignmentsDiff.ts'
import { projectBandMoodsAfterToggle } from '@/lib/moods/projectBandMoodsAfterToggle.ts'
import { MAX_BAND_MOODS } from '@/lib/moods/conflicts.ts'

type MoodInfo = {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
}

type BandMood = { id: string; name: string; slug: string }

type BandForEditor = {
  id: string
  name: string
  slug: string
  status: string
  moods: BandMood[]
}

const BAND_STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  draft: 'bg-gray-100 text-gray-700',
  paused: 'bg-amber-100 text-amber-800',
  archived: 'bg-red-100 text-red-700',
  new: 'bg-blue-100 text-blue-800',
}

type ViewMode = 'assigned' | 'all'

// Redaktionelles Audit-/Pflegewerkzeug fuer GENAU EINEN Mood -- kein
// zweiter vollstaendiger Band-Editor (siehe Auftrag "Mood-zentrierte
// Bandverwaltung V1"). Aenderungen werden ausschliesslich lokal staged
// und erst per explizitem Save gemeinsam und atomar uebernommen (RPC
// public.update_mood_band_assignments, siehe
// supabase/fn_update_mood_band_assignments.sql).
export function MoodBandsEditor({
  mood,
  bands,
  initialAssignedBandIds,
}: {
  mood: MoodInfo
  bands: BandForEditor[]
  initialAssignedBandIds: string[]
}) {
  const router = useRouter()
  const readOnly = mood.status !== 'active'

  // originalAssigned = zuletzt bestaetigter Sollzustand (beim Laden ODER
  // nach einem erfolgreichen Save). staged = lokaler Bearbeitungszustand.
  // Nach erfolgreichem Save wird originalAssigned direkt auf den (dann
  // bereits korrekten) staged-Zustand gesetzt -- kein Warten auf einen
  // erneuten Server-Roundtrip noetig, um den Diff wieder leer werden zu
  // lassen. router.refresh() laeuft zusaetzlich als Frische-Garantie im
  // Hintergrund (z. B. falls parallel ein anderer Admin etwas geaendert hat).
  const [originalAssigned, setOriginalAssigned] = useState<Set<string>>(new Set(initialAssignedBandIds))
  const [staged, setStaged] = useState<Set<string>>(new Set(initialAssignedBandIds))
  const [viewMode, setViewMode] = useState<ViewMode>('assigned')
  const [search, setSearch] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedBanner, setSavedBanner] = useState(false)
  const [isPending, startTransition] = useTransition()

  const diff = useMemo(() => computeMoodBandDiff(originalAssigned, staged), [originalAssigned, staged])
  const hasStagedChanges = diff.add.length > 0 || diff.remove.length > 0

  // Schutz vor versehentlichem Verlust bei Reload/Tab schliessen (Auftrag
  // Abschnitt 16) -- beforeunload faengt App-Router-Navigationen nicht
  // zuverlaessig ab, deckt aber genau den Reload-/Schliessen-Pfad ab.
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
      const confirmed = window.confirm('Ungespeicherte Änderungen verwerfen und zurück zum Mood-Katalog?')
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
      const result = await updateMoodBandAssignmentsAction({
        moodId: mood.id,
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
    const filtered = searchLower ? base.filter((b) => b.name.toLowerCase().includes(searchLower)) : base
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
  }, [bands, viewMode, originalAssigned, searchLower])

  // Aggregierte Warnungen fuer den Save-Bereich: ueber ALLE Bands, die
  // sich durch diesen Save tatsaechlich aendern (add + remove).
  const { underCorridorBands, feierClusterBands } = useMemo(() => {
    const underCorridorBands: string[] = []
    const feierClusterBands: string[] = []
    const changedIds = new Set([...diff.add, ...diff.remove])
    for (const band of bands) {
      if (!changedIds.has(band.id)) continue
      const willBeAssigned = staged.has(band.id)
      const projection = projectBandMoodsAfterToggle({
        currentMoodSlugs: band.moods.map((m) => m.slug),
        targetMoodSlug: mood.slug,
        willBeAssigned,
      })
      if (projection.isUnderTargetCorridor) underCorridorBands.push(band.name)
      if (projection.exceedsFeierCluster) feierClusterBands.push(band.name)
    }
    return { underCorridorBands, feierClusterBands }
  }, [bands, diff.add, diff.remove, staged, mood.slug])

  return (
    <div className={hasStagedChanges ? 'pb-32' : ''}>
      <Link
        href="/admin/moods"
        onClick={handleBackClick}
        className="text-sm text-violet-700 hover:text-violet-900 hover:underline transition-colors mb-4 inline-block"
      >
        ← Zurück zum Mood-Katalog
      </Link>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <h1 className="text-2xl font-semibold text-gray-900">{mood.name}</h1>
        {mood.description && <p className="text-sm text-gray-500 mt-1">{mood.description}</p>}
        <div className="flex items-center gap-2 mt-3">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              mood.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'
            }`}
          >
            {mood.status}
          </span>
          <span className="text-xs text-gray-500">
            {originalAssigned.size} {originalAssigned.size === 1 ? 'Zuordnung' : 'Zuordnungen'}
          </span>
        </div>
      </div>

      {readOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-sm text-amber-800">
          Dieser Mood ist nicht aktiv (Status: {mood.status}). Zuordnungen können hier nur
          eingesehen, nicht bearbeitet werden.
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
      </div>

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {visibleBands.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-10">Keine Bands gefunden.</p>
        ) : (
          visibleBands.map((band) => (
            <BandRow
              key={band.id}
              band={band}
              mood={mood}
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

            {underCorridorBands.length > 0 && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠ {underCorridorBands.length} {underCorridorBands.length === 1 ? 'Band hätte' : 'Bands hätten'} danach
                weniger als 2 Moods: {underCorridorBands.join(', ')}
              </p>
            )}
            {feierClusterBands.length > 0 && (
              <p className="mt-2 text-xs text-amber-800 bg-amber-100 border border-amber-300 rounded-lg px-3 py-2">
                ⚠ {feierClusterBands.length} {feierClusterBands.length === 1 ? 'Band hätte' : 'Bands hätten'} danach
                mehr als 2 Moods aus dem Feier-Cluster: {feierClusterBands.join(', ')}
              </p>
            )}
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
  mood,
  isStaged,
  wasOriginallyAssigned,
  readOnly,
  onToggle,
}: {
  band: BandForEditor
  mood: MoodInfo
  isStaged: boolean
  wasOriginallyAssigned: boolean
  readOnly: boolean
  onToggle: (bandId: string, nextChecked: boolean) => void
}) {
  const alreadyHasTarget = band.moods.some((m) => m.id === mood.id)
  const disabledByMax = !alreadyHasTarget && band.moods.length >= MAX_BAND_MOODS

  const projection = projectBandMoodsAfterToggle({
    currentMoodSlugs: band.moods.map((m) => m.slug),
    targetMoodSlug: mood.slug,
    willBeAssigned: isStaged,
  })
  const changed = isStaged !== wasOriginallyAssigned
  const showRowWarning = changed && (projection.isUnderTargetCorridor || projection.exceedsFeierCluster)

  return (
    <div className="px-4 py-3 flex flex-wrap items-start gap-3">
      <div className="flex items-center pt-0.5">
        <input
          type="checkbox"
          checked={isStaged}
          disabled={readOnly || (disabledByMax && !isStaged)}
          onChange={(e) => onToggle(band.id, e.target.checked)}
          title={disabledByMax && !isStaged ? 'Bereits 4/4 Moods. Bitte zuerst in der Bandansicht eine bestehende Zuordnung prüfen.' : undefined}
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
          <span className="text-xs text-gray-400">
            {band.moods.length}/{MAX_BAND_MOODS}
          </span>
          {changed && wasOriginallyAssigned && !isStaged && (
            <span className="text-xs font-medium text-red-700">Wird entfernt</span>
          )}
          {changed && !wasOriginallyAssigned && isStaged && (
            <span className="text-xs font-medium text-green-700">Wird hinzugefügt</span>
          )}
        </div>

        {band.moods.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {band.moods.map((m) => (
              <span
                key={m.id}
                className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-800"
              >
                {m.name}
              </span>
            ))}
          </div>
        )}

        {disabledByMax && !isStaged && (
          <p className="mt-1.5 text-xs text-amber-700">
            Bereits 4/4 Moods. Bitte zuerst in der Bandansicht eine bestehende Zuordnung prüfen.
          </p>
        )}

        {showRowWarning && (
          <p className="mt-1.5 text-xs text-amber-700">
            {projection.isUnderTargetCorridor &&
              `⚠ Danach ${projection.moodCount === 0 ? 'keine' : 'nur ' + projection.moodCount} Mood${projection.moodCount === 1 ? '' : 's'}`}
            {projection.isUnderTargetCorridor && projection.exceedsFeierCluster && ' · '}
            {projection.exceedsFeierCluster && `⚠ Danach ${projection.moodCount} Moods aus dem Feier-Cluster`}
          </p>
        )}
      </div>
    </div>
  )
}
