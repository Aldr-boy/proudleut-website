'use client'
import { useMemo, useState } from 'react'
import { updateBandRepertoireStylesAction } from './actions'
import {
  sortBandRepertoireStyleAssignments,
  type BandRepertoireStyleAssignment,
  type RepertoireStyleCatalogEntry,
} from '@/lib/repertoireStyles/sortAssignments'
import {
  MAX_BAND_REPERTOIRE_STYLES,
  hasTooManyRepertoireStyleAssignments,
  isUnresolvedRepertoireStyleConflict,
} from '@/lib/repertoireStyles/conflicts'

const RANK_COUNT = MAX_BAND_REPERTOIRE_STYLES
const DATALIST_ID = 'repertoire-style-catalog-options'

export function RepertoireStyleEditorSection({
  bandId,
  catalog,
  assignments,
  loadError,
  successMsg,
  errorMsg,
}: {
  bandId: string
  // aktiver Repertoire-Style-Katalog, bereits sortiert nach sort_order/name
  // -- Grundlage der Suchauswahl in den drei Raengen
  catalog: RepertoireStyleCatalogEntry[]
  // bestehende Zuordnungen dieser Band, UNSORTIERT wie geladen -- die
  // Sortierung passiert hier im Client exakt wie auf der oeffentlichen
  // Bandseite (nur band_repertoire_styles.sort_order, kein Tie-Breaker)
  assignments: BandRepertoireStyleAssignment[]
  // true, wenn Katalog- oder Zuordnungs-Query fehlgeschlagen ist -- dann
  // Editor komplett deaktiviert darstellen (fail closed)
  loadError?: boolean
  successMsg?: string
  errorMsg?: string
}) {
  // Mehr als RANK_COUNT geladene Zeilen sind ein Datenkonflikt (die DB
  // erzwingt kein Limit auf Tabellenebene, nur die -- fuer den
  // Admin-Schreibpfad unveraendert wiederverwendete -- RPC beim
  // Schreiben). Stillschweigendes Kappen wuerde bestehende Zuordnungen
  // beim naechsten Speichern unbemerkt loeschen. Fail-closed, bevor
  // ueberhaupt ein Formular gerendert wird.
  const tooManyAssignments = hasTooManyRepertoireStyleAssignments(assignments)
  const sorted = useMemo(() => sortBandRepertoireStyleAssignments(assignments).slice(0, RANK_COUNT), [assignments])

  // Nachschlagetabelle ueber AKTIVE Katalogeintraege UND ggf. abweichende,
  // nicht mehr aktive Eintraege aus den geladenen Zuordnungen (fuer
  // Konfliktanzeige und Beschreibungsanzeige wird der Eintrag auch fuer
  // nicht mehr aktive Zuordnungen benoetigt).
  const lookupById = useMemo(() => {
    const map = new Map<string, RepertoireStyleCatalogEntry>()
    for (const s of catalog) map.set(s.id, s)
    for (const a of sorted) {
      if (a.repertoire_style && !map.has(a.repertoire_style.id)) map.set(a.repertoire_style.id, a.repertoire_style)
    }
    return map
  }, [catalog, sorted])

  const byName = useMemo(() => {
    const map = new Map<string, RepertoireStyleCatalogEntry>()
    for (const s of catalog) map.set(s.name, s)
    return map
  }, [catalog])

  const [selected, setSelected] = useState<string[]>(
    Array.from({ length: RANK_COUNT }, (_, i) => sorted[i]?.repertoire_style_id ?? ''),
  )
  const [searchText, setSearchText] = useState<string[]>(
    Array.from({ length: RANK_COUNT }, (_, i) => {
      const a = sorted[i]
      if (!a) return ''
      return a.repertoire_style?.name ?? '(unbekannter Eintrag)'
    }),
  )

  function handleSearchChange(index: number, value: string) {
    setSearchText((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
    // Exakter Namenstreffer im aktiven Katalog -> aufgeloest; jede andere
    // Eingabe (Tippen, kein/kein eindeutiger Treffer) gilt als noch nicht
    // ausgewaehlt, kein Rateversuch anhand von Teiltreffern.
    const match = byName.get(value.trim())
    setSelected((prev) => {
      const next = [...prev]
      next[index] = match ? match.id : ''
      return next
    })
  }

  function handleClear(index: number) {
    setSearchText((prev) => { const next = [...prev]; next[index] = ''; return next })
    setSelected((prev) => { const next = [...prev]; next[index] = ''; return next })
  }

  const filledCount = selected.filter((v) => v !== '').length

  // Doppelt ausgewaehlte Eintraege verhindern: clientseitige Warnung plus
  // Sperre, zusaetzlich zur serverseitigen RPC-Pruefung (PR005).
  const duplicateIndexes = new Set<number>()
  selected.forEach((v, i) => {
    if (v && selected.some((other, j) => j !== i && other === v)) duplicateIndexes.add(i)
  })
  const hasDuplicates = duplicateIndexes.size > 0

  // Solange irgendein Rang noch auf seiner urspruenglich geladenen,
  // konfliktbehafteten Zuordnung steht (inaktiver/fehlender Eintrag),
  // bleibt Speichern komplett gesperrt.
  const unresolvedConflictCount = Array.from({ length: RANK_COUNT }, (_, i) =>
    isUnresolvedRepertoireStyleConflict(sorted[i] ?? null, selected[i]),
  ).filter(Boolean).length
  const hasUnresolvedConflicts = unresolvedConflictCount > 0

  const saveDisabled = hasUnresolvedConflicts || hasDuplicates

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Musikalisch verortet</h2>
      <p className="text-xs text-gray-400 mb-4">
        Beschreibt das musikalische Spektrum und Repertoire der Band. Die Reihenfolge entspricht der öffentlichen Anzeige.
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
          Katalog oder Zuordnungen konnten nicht geladen werden — bitte Seite neu laden. Es wird nichts gespeichert.
        </p>
      ) : tooManyAssignments ? (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
          <p>
            Datenkonflikt: Diese Band hat {assignments.length} bestehende Zuordnungen
            geladen — mehr als die technisch vorgesehenen {RANK_COUNT}. Dieser Editor mit
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
          <datalist id={DATALIST_ID}>
            {catalog.map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>

          <form action={updateBandRepertoireStylesAction} className="space-y-4">
            <input type="hidden" name="band_id" value={bandId} />

            {Array.from({ length: RANK_COUNT }, (_, index) => {
              const original = sorted[index] ?? null
              const currentValue = selected[index]
              const isConflict = isUnresolvedRepertoireStyleConflict(original, currentValue)
              const isDuplicate = duplicateIndexes.has(index)
              const currentStyle = currentValue ? lookupById.get(currentValue) : undefined
              const isUnresolvedText = searchText[index].trim() !== '' && !currentValue && !isConflict

              return (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rang {index + 1}
                  </label>
                  <div className="flex items-start gap-2">
                    <input type="hidden" name={`slot_${index + 1}`} value={currentValue} />
                    <input
                      type="text"
                      list={DATALIST_ID}
                      value={searchText[index]}
                      onChange={(e) => handleSearchChange(index, e.target.value)}
                      placeholder="Repertoire-Stil suchen …"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    {(currentValue || searchText[index]) && (
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
                      aktiven oder nicht mehr existierenden Repertoire-Stil zugeordnet
                      {original?.repertoire_style ? ` ("${original.repertoire_style.name}", Status: ${original.repertoire_style.status})` : ' (Eintrag unbekannt)'}.
                      Bitte diesen Rang leeren oder einem aktiven Eintrag neu zuweisen, bevor
                      gespeichert werden kann.
                    </p>
                  )}

                  {isDuplicate && (
                    <p className="mt-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
                      Dieser Eintrag ist bereits einem anderen Rang zugeordnet. Bitte einen anderen Repertoire-Stil wählen.
                    </p>
                  )}

                  {!isConflict && isUnresolvedText && (
                    <p className="mt-1 text-xs text-gray-400">
                      Kein aktiver Katalogeintrag mit diesem Namen gefunden. Bitte aus der Vorschlagsliste auswählen.
                    </p>
                  )}

                  {!isConflict && !isDuplicate && currentValue && currentStyle?.description && (
                    <p className="mt-1 text-xs text-gray-400">{currentStyle.description}</p>
                  )}
                </div>
              )
            })}

            {filledCount === 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Hinweis: Diese Zuordnung ist aktuell leer. Das ist technisch erlaubt (bewusster Empty State) und blockiert das Speichern nicht.
              </p>
            )}

            {hasUnresolvedConflicts && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                Speichern ist gesperrt, solange {unresolvedConflictCount === 1 ? 'ein Rang einen' : `${unresolvedConflictCount} Ränge einen`}{' '}
                nicht mehr aktiven oder fehlenden Eintrag zugeordnet {unresolvedConflictCount === 1 ? 'hat' : 'haben'}. Bitte
                den/die betroffenen Rang/Ränge oben leeren oder neu zuweisen.
              </p>
            )}

            {!hasUnresolvedConflicts && hasDuplicates && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                Speichern ist gesperrt, solange derselbe Eintrag mehreren Rängen zugeordnet ist.
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="submit"
                disabled={saveDisabled}
                title={saveDisabled ? 'Solange ein Datenkonflikt oder eine doppelte Auswahl besteht, kann nicht gespeichert werden.' : undefined}
                className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-violet-700"
              >
                Speichern
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
