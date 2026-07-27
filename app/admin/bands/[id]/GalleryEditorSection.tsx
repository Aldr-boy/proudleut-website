'use client'
import { useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Image from 'next/image'
import { addBandGalleryImageAction, deleteBandGalleryImageAction, moveBandGalleryImageAction } from './actions'

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp'
const MAX_GALLERY_IMAGES = 10

export type GalleryImageData = {
  id: string
  url: string
  alt: string
}

function TinySubmitButton({ children, title }: { children: React.ReactNode; title: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      title={title}
      className="px-2 py-1 text-xs rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  )
}

function AddSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-violet-700"
    >
      {pending ? 'Wird hochgeladen …' : 'Bild hinzufügen'}
    </button>
  )
}

function GalleryItem({
  bandId,
  image,
  position,
  isFirst,
  isLast,
}: {
  bandId: string
  image: GalleryImageData
  position: number
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <div className="flex items-center gap-3 border border-gray-200 rounded-lg p-2">
      <div className="relative w-20 h-14 rounded-md overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
        <Image src={image.url} alt={image.alt} fill className="object-cover" sizes="80px" />
      </div>
      <p className="text-xs text-gray-500 w-10 shrink-0">#{position}</p>
      <div className="flex gap-1.5 ml-auto shrink-0">
        <form action={moveBandGalleryImageAction}>
          <input type="hidden" name="band_id" value={bandId} />
          <input type="hidden" name="media_asset_id" value={image.id} />
          <input type="hidden" name="direction" value="up" />
          <TinySubmitButton title="Nach oben verschieben">
            {isFirst ? '—' : '↑'}
          </TinySubmitButton>
        </form>
        <form action={moveBandGalleryImageAction}>
          <input type="hidden" name="band_id" value={bandId} />
          <input type="hidden" name="media_asset_id" value={image.id} />
          <input type="hidden" name="direction" value="down" />
          <TinySubmitButton title="Nach unten verschieben">
            {isLast ? '—' : '↓'}
          </TinySubmitButton>
        </form>
        <form action={deleteBandGalleryImageAction}>
          <input type="hidden" name="band_id" value={bandId} />
          <input type="hidden" name="media_asset_id" value={image.id} />
          <TinySubmitButton title="Bild löschen">Löschen</TinySubmitButton>
        </form>
      </div>
    </div>
  )
}

export function GalleryEditorSection({
  bandId,
  images,
  loadError,
  successMsg,
  errorMsg,
}: {
  bandId: string
  images: GalleryImageData[]
  // true, wenn das Laden der media_assets-Zeilen fehlgeschlagen ist -- darf
  // NIE als "leere Galerie" interpretiert werden (fail-closed).
  loadError?: boolean
  successMsg?: string
  errorMsg?: string
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
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
        <h2 className="text-base font-semibold text-gray-900 mb-1">Galerie</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3 text-red-700 text-sm">
          Galerie konnte nicht geladen werden. Bitte Seite neu laden. Aus Sicherheitsgründen wird hier
          kein Bearbeitungsformular angezeigt, solange der aktuelle Zustand nicht zuverlässig bekannt ist.
        </div>
      </div>
    )
  }

  const atLimit = images.length >= MAX_GALLERY_IMAGES

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Galerie</h2>
      <p className="text-xs text-gray-400 mb-4">
        Diese Bilder erscheinen im Bereich „Bühnenmomente“ auf der öffentlichen Bandseite.
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
        <p className="text-xs font-medium text-gray-600 mb-2">
          Vorhandene Bilder ({images.length}/{MAX_GALLERY_IMAGES})
        </p>
        {images.length > 0 ? (
          <div className="space-y-2">
            {images.map((image, index) => (
              <GalleryItem
                key={image.id}
                bandId={bandId}
                image={image}
                position={index + 1}
                isFirst={index === 0}
                isLast={index === images.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="w-full h-24 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
            <p className="text-sm text-gray-400">Noch keine Galeriebilder vorhanden</p>
          </div>
        )}
      </div>

      {atLimit ? (
        <p className="text-xs text-gray-400 border-t border-gray-100 pt-4">
          Maximale Anzahl von {MAX_GALLERY_IMAGES} Galeriebildern erreicht. Zum Hinzufügen eines neuen
          Bildes bitte zuerst ein bestehendes löschen.
        </p>
      ) : (
        <form action={addBandGalleryImageAction} className="space-y-3 border-t border-gray-100 pt-4">
          <input type="hidden" name="band_id" value={bandId} />

          <div>
            <label htmlFor="gallery_image" className="block text-sm font-medium text-gray-700 mb-1">
              Neues Bild hinzufügen
            </label>
            <input
              id="gallery_image"
              name="gallery_image"
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
            <AddSubmitButton disabled={!previewUrl} />
          </div>
        </form>
      )}
    </div>
  )
}
