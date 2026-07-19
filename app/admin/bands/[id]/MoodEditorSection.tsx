'use client'
import { useMemo, useState } from 'react'
import { updateBandMoodsAction } from './actions'
import {
  sortBandMoodAssignments,
  type BandMoodAssignment,
  type MoodCatalogEntry,
} from '@/lib/moods/sortAssignments'
import { exceedsFeierClusterThreshold } from '@/lib/moods/feierCluster'
import { MAX_BAND_MOODS, hasTooManyMoodAssignments, isUnresolvedMoodConflict } from '@/lib/moods/conflicts'
import { hasMissingDescription } from '@/lib/moods/description'

const RANK_COUNT = MAX_BAND_MOODS

export function MoodEditorSection({
  bandId,
  moodCatalog,
  assignments,
  loadError,
  successMsg,
  errorMsg,
}: {
  bandId: string
  // aktiver Mood-Katalog, bereits sortiert nach sort_order/name -- fuer
  // die Auswahloptionen in den vier Raengen
  moodCatalog: MoodCatalogEntry[]
  // bestehende Zuordnungen dieser Band, UNSORTIERT wie geladen -- die
  // Sortierung passiert hier im Client exakt wie auf der oeffentlichen
  // Bandseite (band_moods.sort_order -> moods.sort_order -> moods.name)
  assignments: BandMoodAssignment[]
  // true, wenn Katalog- oder Zuordnungs-Query fehlgeschlagen ist --
  // dann Editor komplett deaktiviert darstellen (fail closed)
  loadError?: boolean
  successMsg?: string
  errorMsg?: string
}) {
  // Mehr als RANK_COUNT geladene Zeilen sind ein Datenkonflikt (die DB
  // erzwingt kein Limit auf Tabellenebene, nur die RPC beim Schreiben) --
  // stillschweigendes Kappen wuerde bestehende Zuordnungen beim naechsten
  // Speichern unbemerkt loeschen. Wird unten fail-closed behandelt, bevor
  // ueberhaupt ein Formular gerendert wird.
  const tooManyAssignments = hasTooManyMoodAssignments(assignments)
  const sorted = useMemo(() => sortBandMoodAssignments(assignments).slice(0, RANK_COUNT), [assignments])

  // Nachschlagetabelle ueber AKTIVE Katalog-Moods UND ggf. abweichende,
  // nicht mehr aktive Moods aus den geladenen Zuordnungen (fuer die
  // Konfliktanzeige und die Feier-Cluster-Zaehlung wird der Slug auch
  // fuer nicht mehr aktive Zuordnungen benoetigt).
  const lookupById = useMemo(() => {
    const map = new Map<string, MoodCatalogEntry>()
    for (const m of moodCatalog) map.set(m.id, m)
    for (const a of sorted) {
      if (a.mood && !map.has(a.mood.id)) map.set(a.mood.id, a.mood)
    }
    return map
  }, [moodCatalog, sorted])

  const [selected, setSelected] = useState<string[]>(
    Array.from({ length: RANK_COUNT }, (_, i) => sorted[i]?.mood_id ?? ''),
  )

  function handleChange(index: number, value: string) {
    setSelected((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function handleClear(index: number) {
    handleChange(index, '')
  }

  const filledCount = selected.filter((v) => v !== '').length
  const selectedSlugs = selected.map((id) => (id ? lookupById.get(id)?.slug : undefined))
  const feierClusterWarning = exceedsFeierClusterThreshold(selectedSlugs)

  // Solange irgendein Rang noch auf seiner urspruenglich geladenen,
  // konfliktbehafteten Zuordnung steht (inaktiver/fehlender Mood), bleibt
  // Speichern komplett gesperrt -- nicht erst der RPC-Fehler soll das
  // verhindern, die Oberflaeche muss den bekannten nicht speicherbaren
  // Zustand selbst abbilden.
  const unresolvedConflictCount = Array.from({ length: RANK_COUNT }, (_, i) =>
    isUnresolvedMoodConflict(sorted[i] ?? null, selected[i]),
  ).filter(Boolean).length
  const hasUnresolvedConflicts = unresolvedConflictCount > 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Klingt nach</h2>
      <p className="text-xs text-gray-400 mb-4">
        Beschreibt Wirkung, Atmosphäre und Haltung der Band. Ziel sind 2–4 einzeln begründbare Moods. Die Reihenfolge entspricht der öffentlichen Anzeige.
      </p>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
          {errorMsg}
        </div>
      )}

      {loadError ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          Moods konnten nicht geladen werden — bitte Seite neu laden. Es wird nichts gespeichert.
        </p>
      ) : tooManyAssignments ? (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
          <p>
            Datenkonflikt: Diese Band hat {assignments.length} bestehende Mood-Zuordnungen
            geladen — mehr als die technisch vorgesehenen {RANK_COUNT}. Dieser einfache Editor mit
            {' '}{RANK_COUNT} Rangplätzen kann diesen Zustand nicht sicher darstellen oder speichern,
            ohne Zuordnungen zu verlieren.
          </p>
          <p>
            Es wird nichts angezeigt oder gespeichert. Bitte diesen Fall außerhalb des Editors
            klären (z. B. direkt in der Datenbank prüfen), bevor hier weitergearbeitet wird.
          </p>
        </div>
      ) : (
        <>
          <form action={updateBandMoodsAction} className="space-y-4">
            <input type="hidden" name="band_id" value={bandId} />

            {Array.from({ length: RANK_COUNT }, (_, index) => {
              const original = sorted[index] ?? null
              const currentValue = selected[index]
              const isConflict = isUnresolvedMoodConflict(original, currentValue)
              const otherSelected = selected.filter((_, i) => i !== index)
              const currentMood = currentValue ? lookupById.get(currentValue) : undefined

              return (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rang {index + 1}
                  </label>
                  <div className="flex items-start gap-2">
                    <select
                      name={`slot_${index + 1}`}
                      value={currentValue}
                      onChange={(e) => handleChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="">— kein Eintrag —</option>
                      {isConflict && (
                        <option value={currentValue} disabled>
                          ⚠ Nicht mehr aktiv{original?.mood ? `: ${original.mood.name}` : ''}
                        </option>
                      )}
                      {moodCatalog.map((m) => {
                        const takenElsewhere = m.id !== currentValue && otherSelected.includes(m.id)
                        return (
                          <option key={m.id} value={m.id} disabled={takenElsewhere}>
                            {m.name}{takenElsewhere ? ' (bereits gewählt)' : ''}
                          </option>
                        )
                      })}
                    </select>
                    {currentValue && (
                      <button
                        type="button"
                        onClick={() => handleClear(index)}
                        className="shrink-0 px-3 py-2 border border-gray-300 text-gray-500 rounded-lg text-xs hover:bg-gray-50 transition-colors"
                      >
                        Leeren
                      </button>
                    )}
                  </div>

                  {isConflict && (
                    <p className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                      Datenkonflikt: Diese Band hat Rang {index + 1} einem inzwischen nicht mehr
                      aktiven Mood zugeordnet
                      {original?.mood ? ` ("${original.mood.name}", Status: ${original.mood.status})` : ' (Mood-ID unbekannt)'}.
                      Bitte diesen Rang leeren oder einem aktiven Mood neu zuweisen, bevor
                      gespeichert werden kann.
                    </p>
                  )}

                  {!isConflict && currentValue && currentMood && !hasMissingDescription(currentMood.description) && (
                    <p className="mt-1 text-xs text-gray-400">{currentMood.description}</p>
                  )}
                  {!isConflict && currentValue && currentMood && hasMissingDescription(currentMood.description) && (
                    <p className="mt-1 text-xs text-amber-700 italic">
                      Für diesen Mood ist noch keine Definition hinterlegt.{' '}
                      <a
                        href="/admin/moods"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="not-italic underline hover:text-amber-900"
                      >
                        Im Mood-Katalog ergänzen ↗
                      </a>
                    </p>
                  )}
                </div>
              )
            })}

            {filledCount <= 1 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Hinweis: Zielkorridor sind normalerweise 2–4 Moods. Diese Zuordnung hat aktuell {filledCount === 0 ? 'keine' : 'nur eine'}. Das ist technisch erlaubt (z. B. bewusster Empty State) und blockiert das Speichern nicht.
              </p>
            )}

            {feierClusterWarning && (
              <p className="text-xs text-amber-800 bg-amber-100 border border-amber-300 rounded-lg px-3 py-2">
                ⚠ Mehr als zwei Moods aus dem Feier-Cluster ausgewählt (Festzeltenergie, Party
                pur, Tanzflächen-Garantie, Festlich und ausgelassen, Rockig &amp; mitreißend).
                Normalerweise maximal zwei — in begründeten Fällen übersteuerbar. Speichern bleibt
                möglich.
              </p>
            )}

            {hasUnresolvedConflicts && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                Speichern ist gesperrt, solange {unresolvedConflictCount === 1 ? 'ein Rang einen' : `${unresolvedConflictCount} Ränge einen`}{' '}
                nicht mehr aktiven Mood zugeordnet {unresolvedConflictCount === 1 ? 'hat' : 'haben'}. Bitte
                den/die betroffenen Rang/Ränge oben leeren oder neu zuweisen.
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="submit"
                disabled={hasUnresolvedConflicts}
                title={hasUnresolvedConflicts ? 'Solange ein Datenkonflikt besteht, kann nicht gespeichert werden.' : undefined}
                className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-violet-700"
              >
                Speichern
              </button>
              <a
                href="/admin/moods"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-violet-700 hover:text-violet-900 hover:underline transition-colors"
              >
                Mood-Katalog verwalten ↗
              </a>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
