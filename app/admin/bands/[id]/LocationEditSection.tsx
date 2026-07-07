'use client'
import { useEffect, useState } from 'react'
import { updateLocationAction } from './actions'

// Ab dieser Distanz gelten PLZ-Lookup-Koordinaten und eingetragene
// Koordinaten als auffällig auseinanderliegend (reine UI-Warnung, kein Blocker).
const PLZ_COORD_MISMATCH_THRESHOLD_KM = 15

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toNumOrNull(v: string): number | null {
  if (v.trim() === '') return null
  const n = parseFloat(v)
  return isFinite(n) ? n : null
}

// Modulweiter Cache für /data/plz-coords.json — einmalig laden, danach
// aus dem Cache bedienen. Eigenständiges Pendant zu loadPlzCoords() aus
// BandExplorer.tsx (dort nicht exportiert, hier bewusst nicht importiert).
type PlzCoords = Record<string, [number, number]>

let plzCoordsCache: PlzCoords | null = null
let plzCoordsPromise: Promise<PlzCoords> | null = null

function loadPlzCoords(): Promise<PlzCoords> {
  if (plzCoordsCache) return Promise.resolve(plzCoordsCache)
  if (!plzCoordsPromise) {
    plzCoordsPromise = fetch('/data/plz-coords.json')
      .then((res) => res.json())
      .then((data: PlzCoords) => {
        plzCoordsCache = data
        return data
      })
      .catch((err) => {
        // Bei Fehlschlag Promise zurücksetzen, damit ein späterer Versuch erneut lädt
        plzCoordsPromise = null
        throw err
      })
  }
  return plzCoordsPromise
}

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
      const data = await loadPlzCoords()
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
          <PlzCoordMismatchWarning plz={plz} latitude={toNumOrNull(lat)} longitude={toNumOrNull(lon)} />

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

function PlzCoordMismatchWarning({
  plz,
  latitude,
  longitude,
}: {
  plz: string | null
  latitude: number | null
  longitude: number | null
}) {
  const [distanceKm, setDistanceKm] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const trimmedPlz = plz?.trim() ?? ''

    if (!/^\d{4,5}$/.test(trimmedPlz) || latitude == null || longitude == null) {
      setDistanceKm(null)
      return
    }

    loadPlzCoords()
      .then((data) => {
        if (cancelled) return
        const expected = data[trimmedPlz]
        setDistanceKm(expected ? haversineKm(expected[0], expected[1], latitude, longitude) : null)
      })
      .catch(() => {
        if (!cancelled) setDistanceKm(null)
      })

    return () => {
      cancelled = true
    }
  }, [plz, latitude, longitude])

  if (distanceKm == null || distanceKm <= PLZ_COORD_MISMATCH_THRESHOLD_KM) return null

  return (
    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
      ⚠ PLZ {plz} und die eingetragenen Koordinaten liegen ca. {Math.round(distanceKm)} km auseinander — bitte prüfen, ob sie zusammenpassen.
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
      <PlzCoordMismatchWarning plz={location.plz} latitude={location.latitude} longitude={location.longitude} />
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
