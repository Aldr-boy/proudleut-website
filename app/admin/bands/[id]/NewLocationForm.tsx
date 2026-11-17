'use client'
import { useEffect, useId, useState } from 'react'
import { createLocationAndAssignAction, type LocationSearchResult } from './actions'
import { loadPlzCoords } from './LocationEditSection'

export type RegionSuggestions = {
  landkreis: string[]
  regierungsbezirk: string[]
  bundesland: string[]
}

const COUNTRIES = [
  { code: 'de', label: 'Deutschland', plzLength: 5 },
  { code: 'at', label: 'Österreich', plzLength: 4 },
] as const

const ERROR_MESSAGES: Record<string, string> = {
  invalid_plz: 'PLZ passt nicht zum Land (Deutschland: 5 Ziffern, Österreich: 4 Ziffern).',
  invalid_city: 'Bitte einen Ort eingeben (maximal 200 Zeichen).',
  invalid_country: 'Bitte ein gültiges Land wählen.',
  invalid_region: 'Landkreis, Regierungsbezirk und Bundesland dürfen höchstens 200 Zeichen lang sein.',
  invalid_coordinates: 'Die Koordinaten sind ungültig.',
  band_not_found: 'Band nicht gefunden.',
  db_error: 'Datenbankfehler – bitte erneut versuchen.',
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent'

export function NewLocationForm({
  bandId,
  initialPlz,
  initialCity,
  suggestions,
  onSelectExisting,
  onCancel,
}: {
  bandId: string
  initialPlz: string
  initialCity: string
  suggestions: RegionSuggestions
  onSelectExisting: (r: LocationSearchResult) => void
  onCancel: () => void
}) {
  const listId = useId()
  const [countryCode, setCountryCode] = useState<'de' | 'at'>('de')
  const [plz, setPlz] = useState(initialPlz)
  const [city, setCity] = useState(initialCity)
  const [landkreis, setLandkreis] = useState('')
  const [regierungsbezirk, setRegierungsbezirk] = useState('')
  const [bundesland, setBundesland] = useState('')
  const [coords, setCoords] = useState<[number, number] | null>(null)
  const [coordsMsg, setCoordsMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [duplicates, setDuplicates] = useState<{ plzConflict: boolean; matches: LocationSearchResult[] } | null>(null)
  const [regionWarningShown, setRegionWarningShown] = useState(false)

  const plzLength = COUNTRIES.find((c) => c.code === countryCode)?.plzLength ?? 5
  const plzValid = new RegExp(`^\\d{${plzLength}}$`).test(plz.trim())

  // Koordinaten passend zum Land aus der vorhandenen PLZ-Datei (DE: 5-, AT: 4-stellig)
  useEffect(() => {
    let cancelled = false
    async function lookup() {
      if (!plzValid) {
        setCoords(null)
        setCoordsMsg('')
        return
      }
      try {
        const data = await loadPlzCoords()
        if (cancelled) return
        const found = data[plz.trim()]
        if (found) {
          setCoords(found)
          setCoordsMsg(`Koordinaten aus der PLZ gefunden (${found[0]}, ${found[1]}).`)
        } else {
          setCoords(null)
          setCoordsMsg('Keine Koordinaten zur PLZ gefunden – der Ort wird ohne Koordinaten gespeichert.')
        }
      } catch {
        if (cancelled) return
        setCoords(null)
        setCoordsMsg('PLZ-Datei konnte nicht geladen werden – der Ort wird ohne Koordinaten gespeichert.')
      }
    }
    void lookup()
    return () => {
      cancelled = true
    }
  }, [plz, plzValid])

  const regionMissing = countryCode === 'de' && (!landkreis.trim() || !regierungsbezirk.trim())

  async function submit(allowSameName: boolean) {
    setError('')
    if (regionMissing && !regionWarningShown) {
      setRegionWarningShown(true)
      return
    }
    setSaving(true)
    const fd = new FormData()
    fd.set('band_id', bandId)
    fd.set('country_code', countryCode)
    fd.set('plz', plz.trim())
    fd.set('city_name', city.trim())
    fd.set('landkreis', landkreis)
    fd.set('regierungsbezirk', regierungsbezirk)
    fd.set('bundesland', bundesland)
    fd.set('latitude', coords ? String(coords[0]) : '')
    fd.set('longitude', coords ? String(coords[1]) : '')
    if (allowSameName) fd.set('allow_same_name', '1')
    // Bei Erfolg leitet die Server-Aktion weiter (Seite lädt neu).
    const outcome = await createLocationAndAssignAction(fd)
    setSaving(false)
    if (outcome && !outcome.ok) {
      if (outcome.error === 'duplicates') {
        setDuplicates({ plzConflict: outcome.plzConflict, matches: outcome.matches })
      } else {
        setError(ERROR_MESSAGES[outcome.error] ?? 'Ort konnte nicht angelegt werden.')
      }
    }
  }

  function onFieldChange() {
    setDuplicates(null)
    setError('')
    setRegionWarningShown(false)
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4">
      <p className="text-sm font-medium text-gray-700 mb-3">Neuen Ort anlegen</p>

      <datalist id={`${listId}-landkreis`}>
        {suggestions.landkreis.map((v) => <option key={v} value={v} />)}
      </datalist>
      <datalist id={`${listId}-regierungsbezirk`}>
        {suggestions.regierungsbezirk.map((v) => <option key={v} value={v} />)}
      </datalist>
      <datalist id={`${listId}-bundesland`}>
        {suggestions.bundesland.map((v) => <option key={v} value={v} />)}
      </datalist>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Land</label>
          <select
            value={countryCode}
            onChange={(e) => { setCountryCode(e.target.value as 'de' | 'at'); onFieldChange() }}
            className={inputClass}
          >
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            PLZ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={plz}
            onChange={(e) => { setPlz(e.target.value); onFieldChange() }}
            maxLength={5}
            placeholder={countryCode === 'de' ? 'z. B. 93128' : 'z. B. 6068'}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ort <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => { setCity(e.target.value); onFieldChange() }}
            maxLength={200}
            placeholder="z. B. Regenstauf"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Landkreis</label>
          <input
            type="text"
            list={`${listId}-landkreis`}
            value={landkreis}
            onChange={(e) => { setLandkreis(e.target.value); onFieldChange() }}
            maxLength={200}
            placeholder="z. B. Landkreis Regensburg"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Regierungsbezirk</label>
          <input
            type="text"
            list={`${listId}-regierungsbezirk`}
            value={regierungsbezirk}
            onChange={(e) => { setRegierungsbezirk(e.target.value); onFieldChange() }}
            maxLength={200}
            placeholder="z. B. Oberpfalz"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bundesland</label>
          <input
            type="text"
            list={`${listId}-bundesland`}
            value={bundesland}
            onChange={(e) => { setBundesland(e.target.value); onFieldChange() }}
            maxLength={200}
            placeholder="z. B. Bayern"
            className={inputClass}
          />
        </div>
      </div>

      {coordsMsg && <p className="text-xs text-gray-500 mb-3">{coordsMsg}</p>}

      {regionWarningShown && regionMissing && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-amber-800 text-sm">
          {'Landkreis oder Regierungsbezirk fehlt. Diese Angaben erscheinen auf Bandprofilen. Du kannst sie jetzt ergänzen oder den Ort trotzdem anlegen.'}
        </div>
      )}

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {duplicates && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-sm">
          <p className="text-amber-800 mb-2">
            {duplicates.plzConflict
              ? 'Zu dieser PLZ gibt es schon einen Ort. Bitte stattdessen diesen auswählen:'
              : 'Einen Ort mit diesem Namen gibt es schon. Bitte prüfen und möglichst den vorhandenen auswählen:'}
          </p>
          <ul className="space-y-2">
            {duplicates.matches.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3">
                <span className="text-gray-800">
                  {m.plz ?? '–'} {m.city_name}
                  <span className="text-gray-500 text-xs">
                    {' '}· {[m.landkreis, m.regierungsbezirk, m.bundesland].filter(Boolean).join(' · ') || 'keine Region'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onSelectExisting(m)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-white transition-colors"
                >
                  Auswählen
                </button>
              </li>
            ))}
          </ul>
          {!duplicates.plzConflict && (
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={saving}
              className="mt-3 px-3 py-1.5 text-xs border border-amber-300 rounded-lg text-amber-800 hover:bg-white transition-colors disabled:opacity-50"
            >
              Trotzdem neu anlegen (andere PLZ)
            </button>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={saving || !plzValid || !city.trim()}
          className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving
            ? 'Speichern…'
            : regionWarningShown && regionMissing
              ? 'Trotzdem anlegen und zuordnen'
              : 'Anlegen und als Home-Location zuordnen'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </div>
  )
}
