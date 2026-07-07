'use client'
import { useState } from 'react'
import { searchLocationsAction, reassignLocationAction, type LocationSearchResult } from './actions'
import type { LocationData } from './LocationEditSection'

const SEARCH_ERROR_MESSAGES: Record<string, string> = {
  empty_query: 'Bitte PLZ oder Ort eingeben.',
  db_error: 'Datenbankfehler bei der Suche – bitte erneut versuchen.',
}

export function LocationReassignSection({
  bandId,
  currentLocation,
  currentLocationUsageCount,
  successMsg,
  errorMsg,
}: {
  bandId: string
  currentLocation: LocationData | null
  currentLocationUsageCount: number
  successMsg?: string
  errorMsg?: string
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LocationSearchResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [selected, setSelected] = useState<LocationSearchResult | null>(null)
  const [successDismissed, setSuccessDismissed] = useState(false)

  async function runSearch() {
    setSuccessDismissed(true)
    setSearching(true)
    setSearchError('')
    setSelected(null)
    const outcome = await searchLocationsAction(query)
    setSearching(false)
    if (!outcome.ok) {
      setSearchError(SEARCH_ERROR_MESSAGES[outcome.error] ?? 'Suche fehlgeschlagen.')
      setResults(null)
      return
    }
    setResults(outcome.results)
  }

  function selectResult(r: LocationSearchResult) {
    setSuccessDismissed(true)
    setSelected(r)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Home-Location wechseln</h2>
      <p className="text-xs text-gray-400 mb-4">
        Um nur Bezeichnung oder Koordinaten der aktuellen Location zu ändern, siehe „Standort" oben.
        Um diese Band einer anderen, bereits bestehenden Location zuzuordnen, diese Sektion nutzen.
      </p>

      {successMsg && !successDismissed && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
          {errorMsg}
        </div>
      )}

      {!selected && (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="PLZ oder Ort suchen…"
              className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={runSearch}
              disabled={searching || !query.trim()}
              className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searching ? 'Suche…' : 'Suchen'}
            </button>
          </div>

          {searchError && <p className="text-sm text-red-600 mb-4">{searchError}</p>}

          {results !== null && results.length === 0 && !searchError && (
            <p className="text-sm text-gray-400 mb-4">Keine Locations gefunden.</p>
          )}

          {results !== null && results.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-3 py-2 font-medium text-gray-600">PLZ</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Ort</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Region</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Land</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Geo</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Bands</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.map((r) => {
                    const isCurrent = currentLocation?.id === r.id
                    return (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-700">{r.plz ?? '–'}</td>
                        <td className="px-3 py-2 text-gray-900">{r.city_name}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">
                          {[r.landkreis, r.regierungsbezirk, r.bundesland].filter(Boolean).join(' · ') || '–'}
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">
                          {r.country ?? '–'}{r.country_code ? ` (${r.country_code})` : ''}
                        </td>
                        <td className="px-3 py-2">
                          {r.geo_complete ? (
                            <span className="text-green-600 text-xs" title="Koordinaten vollständig">✓</span>
                          ) : (
                            <span className="text-amber-600 text-xs" title="Koordinaten unvollständig">⚠</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{r.band_count}</td>
                        <td className="px-3 py-2">
                          {isCurrent ? (
                            <span className="text-xs text-gray-400">aktuell</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => selectResult(r)}
                              className="px-2 py-1 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              Auswählen
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {selected && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Bestätigen</p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-sm space-y-2">
            <p>
              <span className="text-gray-400">Aktuell: </span>
              <span className="text-gray-800">
                {currentLocation ? (
                  <>
                    {currentLocation.plz ? `${currentLocation.plz} ` : ''}
                    {currentLocation.city_name} · {currentLocationUsageCount}{' '}
                    {currentLocationUsageCount === 1 ? 'Band' : 'Bands'}
                  </>
                ) : (
                  <span className="text-amber-700">keine Home-Location verknüpft</span>
                )}
              </span>
            </p>
            <p>
              <span className="text-gray-400">Neu: </span>
              <span className="text-gray-800">
                {selected.plz ? `${selected.plz} ` : ''}
                {selected.city_name} · {selected.band_count} {selected.band_count === 1 ? 'Band' : 'Bands'}
              </span>
              {!selected.geo_complete && (
                <span className="ml-2 text-amber-700 text-xs">⚠ Geo-Daten unvollständig</span>
              )}
            </p>
          </div>

          <form action={reassignLocationAction} className="flex gap-3">
            <input type="hidden" name="band_id" value={bandId} />
            <input type="hidden" name="new_location_id" value={selected.id} />
            <button
              type="submit"
              className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
            >
              Bestätigen und speichern
            </button>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
