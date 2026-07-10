'use client'
import { useState } from 'react'
import { updateSimilarBandsAction } from './actions'

export type SimilarBandCandidate = {
  id: string
  name: string
}

export type SimilarBandSlotData = {
  targetBandId: string
  targetName: string
  reason: string | null
}

const SLOT_COUNT = 3

export function SimilarBandsSection({
  bandId,
  slots,
  candidates,
  loadError,
  successMsg,
  errorMsg,
}: {
  bandId: string
  // Laenge 3, Index = rank - 1, null = Slot leer
  slots: (SimilarBandSlotData | null)[]
  candidates: SimilarBandCandidate[]
  // true, wenn das Laden der Relations- oder Kandidaten-Query fehlgeschlagen
  // ist -- dann NICHT als leere Slots werten, sondern Formular komplett
  // ausblenden (fail closed, kein Speichern moeglich auf Basis unvollstaendiger Daten).
  loadError?: boolean
  successMsg?: string
  errorMsg?: string
}) {
  const [selected, setSelected] = useState<string[]>(
    Array.from({ length: SLOT_COUNT }, (_, i) => slots[i]?.targetBandId ?? ''),
  )

  const isEmpty = slots.every((s) => s === null)

  function handleChange(index: number, value: string) {
    setSelected((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Ähnliche Bands pflegen</h2>
      <p className="text-xs text-gray-400 mb-4">
        Ähnliche Bands steuern die öffentliche Empfehlung auf der Bandseite. Maximal 3, Reihenfolge entspricht der öffentlichen Anzeige.
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
          Ähnliche Bands konnten nicht geladen werden — bitte Seite neu laden.
        </p>
      ) : (
        <>
          {isEmpty && (
            <p className="text-sm text-gray-400 mb-4">Noch keine ähnlichen Bands gepflegt.</p>
          )}

          <form action={updateSimilarBandsAction} className="space-y-4">
            <input type="hidden" name="band_id" value={bandId} />

            {[0, 1, 2].map((index) => {
              const slot = slots[index]
              const currentValue = selected[index]
              // Der kuratorische Hinweis gehoert zum urspruenglich gespeicherten
              // Paar -- verschwindet, sobald der Slot clientseitig auf ein
              // anderes Target (oder leer) geaendert wird.
              const showReason = !!slot?.reason && currentValue === slot.targetBandId
              const otherSelected = selected.filter((_, i) => i !== index)

              return (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rang {index + 1}
                  </label>
                  <select
                    name={`slot_${index + 1}`}
                    value={currentValue}
                    onChange={(e) => handleChange(index, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">— kein Eintrag —</option>
                    {candidates.map((c) => {
                      const takenElsewhere = c.id !== currentValue && otherSelected.includes(c.id)
                      return (
                        <option key={c.id} value={c.id} disabled={takenElsewhere}>
                          {c.name}{takenElsewhere ? ' (bereits gewählt)' : ''}
                        </option>
                      )
                    })}
                  </select>
                  {showReason && (
                    <p className="mt-1 text-xs text-gray-400">
                      Kuratorischer Hinweis vorhanden: {slot!.reason}
                    </p>
                  )}
                </div>
              )
            })}

            <div>
              <button
                type="submit"
                className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
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
