'use client'
import { useState } from 'react'
import { updateLocationAction } from './actions'

export type LocationData = {
  id: string
  plz: string | null
  city_name: string
  landkreis: string | null
  regierungsbezirk: string | null
  bundesland: string | null
  country: string | null
  country_code: string | null
  latitude: number | null
  longitude: number | null
  geo_point: string | null
}

export function LocationEditSection({
  bandId,
  location,
  locationUsageCount,
  successMsg,
  errorMsg,
}: {
  bandId: string
  location: LocationData | null
  locationUsageCount: number
  successMsg?: string
  errorMsg?: string
}) {
  const [plz, setPlz] = useState(location?.plz ?? '')
  const [lat, setLat] = useState(location?.latitude != null ? String(location.latitude) : '')
  const [lon, setLon] = useState(location?.longitude != null ? String(location.longitude) : '')
  const [lookupMsg, setLookupMsg] = useState('')

  // PLZ/Ort vorhanden != Koordinaten vorhanden != Radius-Suche greift
  const geoComplete =
    location?.latitude != null &&
    location?.longitude != null &&
    location?.geo_point != null

  async function fillFromPlz() {
    const trimmed = plz.trim()
    if (!/^\d{4,5}$/.test(trimmed)) {
      setLookupMsg('PLZ muss 4 oder 5 Ziffern haben.')
      return
    }
    try {
      const res = await fetch('/data/plz-coords.json')
      const data = (await res.json()) as Record<string, [number, number]>
      const coords = data[trimmed]
      if (!coords) {
        setLookupMsg('PLZ nicht im Lookup gefunden. Koordinaten bitte manuell eintragen.')
        return
      }
      setLat(String(coords[0]))
      setLon(String(coords[1]))
      setLookupMsg(`Koordinaten aus PLZ ${trimmed} übernommen.`)
    } catch {
      setLookupMsg('Fehler beim Laden des PLZ-Lookups.')
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Standort</h2>

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

      {location === null ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Für diese Band ist noch keine Home-Location verknüpft. Dieser Admin kann aktuell nur bestehende, exklusive Standorte bearbeiten.
        </p>
      ) : locationUsageCount > 1 ? (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-amber-800 text-sm">
            Diese Location wird von {locationUsageCount} Bands genutzt. Änderungen würden mehrere Bands betreffen. Bearbeitung ist in dieser Band-Maske gesperrt.
          </div>
          <LocationReadOnlyFields location={location} geoComplete={geoComplete} />
        </>
      ) : (
        <>
          <GeoStatusBadge geoComplete={geoComplete} />

          <form action={updateLocationAction}>
            <input type="hidden" name="band_id" value={bandId} />
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                  <input
                    name="plz"
                    type="text"
                    value={plz}
                    onChange={(e) => { setPlz(e.target.value); setLookupMsg('') }}
                    maxLength={5}
                    placeholder="z. B. 93155"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ort/Stadt <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="city_name"
                    type="text"
                    defaultValue={location.city_name}
                    maxLength={200}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                  <input
                    name="latitude"
                    type="text"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="z. B. 47.5640945"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                  <input
                    name="longitude"
                    type="text"
                    value={lon}
                    onChange={(e) => setLon(e.target.value)}
                    placeholder="z. B. 14.2380409"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={fillFromPlz}
                  className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Koordinaten aus PLZ übernehmen
                </button>
                {lookupMsg && (
                  <span className={`text-xs ${lookupMsg.includes('übernommen') ? 'text-green-700' : 'text-amber-700'}`}>
                    {lookupMsg}
                  </span>
                )}
              </div>

              {(location.landkreis || location.regierungsbezirk || location.bundesland || location.country) && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">Weitere Standortdaten (read-only)</p>
                  <dl className="space-y-1 text-xs text-gray-600">
                    {location.landkreis && (
                      <div className="flex gap-2">
                        <dt className="w-28 shrink-0 text-gray-400">Landkreis</dt>
                        <dd>{location.landkreis}</dd>
                      </div>
                    )}
                    {location.regierungsbezirk && (
                      <div className="flex gap-2">
                        <dt className="w-28 shrink-0 text-gray-400">Reg.-Bezirk</dt>
                        <dd>{location.regierungsbezirk}</dd>
                      </div>
                    )}
                    {location.bundesland && (
                      <div className="flex gap-2">
                        <dt className="w-28 shrink-0 text-gray-400">Bundesland</dt>
                        <dd>{location.bundesland}</dd>
                      </div>
                    )}
                    {location.country && (
                      <div className="flex gap-2">
                        <dt className="w-28 shrink-0 text-gray-400">Land</dt>
                        <dd>{location.country}{location.country_code ? ` (${location.country_code})` : ''}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </div>

            <div className="mt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
              >
                Standort speichern
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}

function GeoStatusBadge({ geoComplete }: { geoComplete: boolean }) {
  if (geoComplete) {
    return (
      <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
        ✓ Koordinaten und geo_point vorhanden — Radius-Suche kann greifen.
      </p>
    )
  }
  return (
    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
      ⚠ PLZ/Ort vorhanden, aber Koordinaten oder geo_point fehlen. Die Band kann über Text/PLZ sichtbar sein, fällt aber ggf. aus der echten Radius-Suche.
    </p>
  )
}

function LocationReadOnlyFields({
  location,
  geoComplete,
}: {
  location: LocationData
  geoComplete: boolean
}) {
  return (
    <div>
      <GeoStatusBadge geoComplete={geoComplete} />
      <dl className="space-y-1 text-xs text-gray-700">
        {location.plz && (
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-gray-400">PLZ</dt>
            <dd>{location.plz}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-gray-400">Ort</dt>
          <dd>{location.city_name}</dd>
        </div>
        {location.latitude != null && (
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-gray-400">Latitude</dt>
            <dd>{location.latitude}</dd>
          </div>
        )}
        {location.longitude != null && (
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-gray-400">Longitude</dt>
            <dd>{location.longitude}</dd>
          </div>
        )}
        {location.landkreis && (
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-gray-400">Landkreis</dt>
            <dd>{location.landkreis}</dd>
          </div>
        )}
        {location.regierungsbezirk && (
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-gray-400">Reg.-Bezirk</dt>
            <dd>{location.regierungsbezirk}</dd>
          </div>
        )}
        {location.bundesland && (
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-gray-400">Bundesland</dt>
            <dd>{location.bundesland}</dd>
          </div>
        )}
        {location.country && (
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-gray-400">Land</dt>
            <dd>{location.country}{location.country_code ? ` (${location.country_code})` : ''}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
