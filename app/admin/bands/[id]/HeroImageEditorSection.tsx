'use client'
import { useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Image from 'next/image'
import { updateBandHeroImageAction } from './actions'

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

export function HeroImageEditorSection({
  bandId,
  heroImage,
  loadError,
  successMsg,
  errorMsg,
}: {
  bandId: string
  // aktuelles Hero-Bild dieser Band, oder null (Empty State)
  heroImage: { url: string; alt: string } | null
  // true, wenn das Laden der media_assets-Zeilen fehlgeschlagen ist -- darf
  // NIE als "kein Hero-Bild vorhanden" interpretiert werden (fail-closed).
  loadError?: boolean
  successMsg?: string
  errorMsg?: string
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
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
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Hero-Bild</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3 text-red-700 text-sm">
          Hero-Bild konnte nicht geladen werden. Bitte Seite neu laden. Aus Sicherheitsgründen wird
          hier kein Bearbeitungsformular angezeigt, solange der aktuelle Zustand nicht zuverlässig
          bekannt ist.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Hero-Bild</h2>
      <p className="text-xs text-gray-400 mb-4">
        Das große Titelbild auf der öffentlichen Bandseite. Ein neuer Upload ersetzt das bestehende Bild.
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

      <div className="mb-4">
        <p className="text-xs font-medium text-gray-600 mb-2">Aktuelles Bild</p>
        {heroImage ? (
          <div className="relative w-full max-w-sm h-40 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            <Image src={heroImage.url} alt={heroImage.alt} fill className="object-cover" sizes="384px" />
          </div>
        ) : (
          <div className="w-full max-w-sm h-40 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
            <p className="text-sm text-gray-400">Kein Hero-Bild vorhanden</p>
          </div>
        )}
      </div>

      <form action={updateBandHeroImageAction} className="space-y-3">
        <input type="hidden" name="band_id" value={bandId} />

        <div>
          <label htmlFor="hero_image" className="block text-sm font-medium text-gray-700 mb-1">
            Neues Bild auswählen
          </label>
          <input
            id="hero_image"
            name="hero_image"
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
            <div className="relative w-full max-w-sm h-40 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              {/* Lokale blob:-URL -- next/image kann/soll hier nicht optimieren, daher bewusst plain <img>. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Vorschau des ausgewählten Bildes" className="w-full h-full object-cover" />
            </div>
          </div>
        )}

        <div className="pt-1">
          <SubmitButton disabled={!previewUrl} />
        </div>
      </form>
    </div>
  )
}
