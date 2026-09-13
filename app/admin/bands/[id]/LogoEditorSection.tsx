'use client'
import { useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Image from 'next/image'
import { updateBandLogoAction, removeBandLogoAction } from './actions'

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp'

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-violet-700"
    >
      {pending ? 'Wird hochgeladen …' : 'Speichern'}
    </button>
  )
}

function RemoveButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Wird entfernt …' : 'Logo entfernen'}
    </button>
  )
}

export function LogoEditorSection({
  bandId,
  logoImage,
  loadError,
  isAmbiguous,
  successMsg,
  errorMsg,
}: {
  bandId: string
  // aktuelles Logo dieser Band, oder null (Empty State)
  logoImage: { url: string; alt: string } | null
  // true, wenn das Laden der media_assets-Zeilen fehlgeschlagen ist -- darf
  // NIE als "kein Logo vorhanden" interpretiert werden (fail-closed).
  loadError?: boolean
  // true, wenn mehrere Logo-Zeilen ohne eindeutigen sort_order vorliegen
  // (siehe resolvePubliclyUsedMediaRow) -- Hochladen/Entfernen ist dann
  // gesperrt, keine automatische Bereinigung.
  isAmbiguous?: boolean
  successMsg?: string
  errorMsg?: string
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewBg, setPreviewBg] = useState<'light' | 'dark'>('light')
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    // Object-URL der vorherigen Auswahl wieder freigeben, sobald die
    // Komponente unmountet (z. B. nach erfolgreichem Redirect).
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    const file = e.target.files?.[0]
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    setPreviewUrl(url)
  }

  if (loadError) {
    return (
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Bandlogo</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3 text-red-700 text-sm">
          Logo konnte nicht geladen werden. Bitte Seite neu laden. Aus Sicherheitsgründen wird hier
          kein Bearbeitungsformular angezeigt, solange der aktuelle Zustand nicht zuverlässig
          bekannt ist.
        </div>
      </div>
    )
  }

  // Vorschau-Hintergrund betrifft ausschliesslich die Admin-Vorschau (helle
  // Flaeche fuer dunkle Logos, dunkle Flaeche fuer helle/weisse Logos) --
  // keine Auswirkung auf die oeffentliche Bandseite.
  const previewBgClass = previewBg === 'dark' ? 'bg-gray-900' : 'bg-white'

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-1">Bandlogo</h2>
      <p className="text-xs text-gray-400 mb-4">
        Das Logo auf der öffentlichen Bandseite. Wird vollständig und proportional dargestellt, ohne
        Beschnitt oder Verzerrung -- auch bei breiten oder quadratischen Formaten. PNG, WebP oder
        JPEG, Transparenz bleibt erhalten.
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
      {isAmbiguous && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-amber-800 text-sm">
          Datenkonflikt: Für diese Band sind mehrere Logos ohne eindeutige Reihenfolge hinterlegt.
          Hochladen und Entfernen sind gesperrt, bis das außerhalb dieses Editors geklärt ist. Es
          wird keine automatische Bereinigung vorgenommen.
        </div>
      )}

      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-600">Aktuelles Logo</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Vorschauhintergrund:</span>
            <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
              <button
                type="button"
                onClick={() => setPreviewBg('light')}
                aria-pressed={previewBg === 'light'}
                className={`px-2.5 py-1 text-xs transition-colors ${
                  previewBg === 'light' ? 'bg-violet-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Hell
              </button>
              <button
                type="button"
                onClick={() => setPreviewBg('dark')}
                aria-pressed={previewBg === 'dark'}
                className={`px-2.5 py-1 text-xs transition-colors ${
                  previewBg === 'dark' ? 'bg-violet-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Dunkel
              </button>
            </div>
          </div>
        </div>

        {logoImage ? (
          <div className={`relative w-full max-w-sm h-32 rounded-lg overflow-hidden border border-gray-200 ${previewBgClass}`}>
            <Image src={logoImage.url} alt={logoImage.alt} fill className="object-contain p-3" sizes="384px" />
          </div>
        ) : (
          <div className="w-full max-w-sm h-32 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
            <p className="text-sm text-gray-400">Kein Logo vorhanden</p>
          </div>
        )}
      </div>

      {!isAmbiguous && (
        <form action={updateBandLogoAction} className="space-y-3">
          <input type="hidden" name="band_id" value={bandId} />

          <div>
            <label htmlFor="logo_image" className="block text-sm font-medium text-gray-700 mb-1">
              {logoImage ? 'Logo ersetzen' : 'Logo hochladen'}
            </label>
            <input
              id="logo_image"
              name="logo_image"
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-700 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-gray-300 file:bg-white file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50"
            />
            <p className="mt-1 text-xs text-gray-400">
              Erlaubte Formate: JPEG, PNG, WebP. Maximale Dateigröße: 4 MB.
            </p>
          </div>

          {previewUrl && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Vorschau (noch nicht gespeichert)</p>
              <div className={`relative w-full max-w-sm h-32 rounded-lg overflow-hidden border border-gray-200 ${previewBgClass}`}>
                {/* Lokale blob:-URL -- next/image kann/soll hier nicht optimieren, daher bewusst plain <img>. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Vorschau des ausgewählten Logos" className="w-full h-full object-contain p-3" />
              </div>
            </div>
          )}

          <div className="pt-1 flex items-center gap-3">
            <SubmitButton disabled={!previewUrl} />
          </div>
        </form>
      )}

      {!isAmbiguous && logoImage && (
        <form
          action={removeBandLogoAction}
          onSubmit={(e) => {
            if (!confirm('Logo wirklich entfernen?')) e.preventDefault()
          }}
          className="pt-3 mt-3 border-t border-gray-100"
        >
          <input type="hidden" name="band_id" value={bandId} />
          <RemoveButton />
        </form>
      )}
    </div>
  )
}
