'use client'
import { useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Image from 'next/image'
import {
  createBandDocumentAction,
  updateBandDocumentAction,
  replaceBandDocumentPdfAction,
  replaceBandDocumentCoverAction,
  deleteBandDocumentAction,
  moveBandDocumentAction,
} from './actions'

const PDF_ACCEPTED_TYPES = 'application/pdf'
const COVER_ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp'

export type BandDocumentData = {
  id: string
  audienceLabel: string
  title: string
  description: string | null
  fileUrl: string
  thumbnailUrl: string | null
}

function TinySubmitButton({
  children,
  title,
  pendingLabel,
  disabled,
}: {
  children: React.ReactNode
  title: string
  pendingLabel?: string
  disabled?: boolean
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      title={title}
      className="px-2 py-1 text-xs rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  )
}

function SaveButton({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="px-3 py-1.5 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-violet-700"
    >
      {pending ? 'Wird gespeichert …' : label}
    </button>
  )
}

function DocumentReorderControls({
  bandId,
  documentId,
  isFirst,
  isLast,
}: {
  bandId: string
  documentId: string
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <div className="flex gap-1.5">
      <form action={moveBandDocumentAction}>
        <input type="hidden" name="band_id" value={bandId} />
        <input type="hidden" name="document_id" value={documentId} />
        <input type="hidden" name="direction" value="up" />
        <TinySubmitButton title="Nach oben verschieben">{isFirst ? '—' : '↑'}</TinySubmitButton>
      </form>
      <form action={moveBandDocumentAction}>
        <input type="hidden" name="band_id" value={bandId} />
        <input type="hidden" name="document_id" value={documentId} />
        <input type="hidden" name="direction" value="down" />
        <TinySubmitButton title="Nach unten verschieben">{isLast ? '—' : '↓'}</TinySubmitButton>
      </form>
      <form
        action={deleteBandDocumentAction}
        onSubmit={(e) => {
          if (!confirm('Dokument wirklich löschen?')) e.preventDefault()
        }}
      >
        <input type="hidden" name="band_id" value={bandId} />
        <input type="hidden" name="document_id" value={documentId} />
        <TinySubmitButton title="Dokument löschen">Löschen</TinySubmitButton>
      </form>
    </div>
  )
}

function DocumentTextForm({ bandId, doc }: { bandId: string; doc: BandDocumentData }) {
  return (
    <form action={updateBandDocumentAction} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <input type="hidden" name="band_id" value={bandId} />
      <input type="hidden" name="document_id" value={doc.id} />

      <div>
        <label htmlFor={`aud_${doc.id}`} className="block text-xs font-medium text-gray-600 mb-1">
          Zielgruppe
        </label>
        <input
          id={`aud_${doc.id}`}
          name="audience_label"
          type="text"
          defaultValue={doc.audienceLabel}
          maxLength={100}
          placeholder="z. B. Für Veranstalter & Festwirte"
          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor={`title_${doc.id}`} className="block text-xs font-medium text-gray-600 mb-1">
          Titel
        </label>
        <input
          id={`title_${doc.id}`}
          name="title"
          type="text"
          defaultValue={doc.title}
          maxLength={200}
          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={`desc_${doc.id}`} className="block text-xs font-medium text-gray-600 mb-1">
          Beschreibung <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          id={`desc_${doc.id}`}
          name="description"
          defaultValue={doc.description ?? ''}
          rows={2}
          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      <div className="sm:col-span-2">
        <SaveButton label="Text speichern" />
      </div>
    </form>
  )
}

function DocumentPdfForm({ bandId, doc }: { bandId: string; doc: BandDocumentData }) {
  const [hasSelection, setHasSelection] = useState(false)

  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-2">
        PDF:{' '}
        <a
          href={doc.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-700 hover:text-violet-900 underline"
        >
          PDF ansehen
        </a>
      </p>
      <form action={replaceBandDocumentPdfAction} className="space-y-2">
        <input type="hidden" name="band_id" value={bandId} />
        <input type="hidden" name="document_id" value={doc.id} />
        <input
          name="document_pdf"
          type="file"
          accept={PDF_ACCEPTED_TYPES}
          onChange={(e) => setHasSelection(!!e.target.files?.[0])}
          className="block w-full text-sm text-gray-700 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-gray-300 file:bg-white file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50"
        />
        <p className="text-xs text-gray-400">Nur PDF. Maximale Dateigröße: 4 MB. Wird kein neues PDF ausgewählt, bleibt das bestehende erhalten.</p>
        <TinySubmitButton title="PDF ersetzen" pendingLabel="Wird hochgeladen …" disabled={!hasSelection}>
          PDF ersetzen
        </TinySubmitButton>
      </form>
    </div>
  )
}

function DocumentCoverForm({ bandId, doc }: { bandId: string; doc: BandDocumentData }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [hasSelection, setHasSelection] = useState(false)
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
    setHasSelection(!!file)
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    setPreviewUrl(url)
  }

  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-2">Cover</p>
      <div className="flex items-start gap-3">
        <div className="relative w-16 h-20 shrink-0 rounded-md overflow-hidden border border-gray-200 bg-gray-50">
          {previewUrl ? (
            // Lokale blob:-URL -- next/image kann/soll hier nicht optimieren.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Vorschau des ausgewählten Covers" className="w-full h-full object-contain" />
          ) : doc.thumbnailUrl ? (
            <Image src={doc.thumbnailUrl} alt={`Cover von ${doc.title}`} fill className="object-contain" sizes="64px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 text-center px-1">
              kein Cover
            </div>
          )}
        </div>
        <form action={replaceBandDocumentCoverAction} className="flex-1 space-y-2">
          <input type="hidden" name="band_id" value={bandId} />
          <input type="hidden" name="document_id" value={doc.id} />
          <input
            name="document_cover"
            type="file"
            accept={COVER_ACCEPTED_TYPES}
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-700 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-gray-300 file:bg-white file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50"
          />
          <p className="text-xs text-gray-400">
            JPEG, PNG oder WebP, max. 4 MB. Hochformat ist ausdrücklich in Ordnung (kein Zuschnitt-Zwang).
          </p>
          <TinySubmitButton
            title={doc.thumbnailUrl ? 'Cover ersetzen' : 'Cover hochladen'}
            pendingLabel="Wird hochgeladen …"
            disabled={!hasSelection}
          >
            {doc.thumbnailUrl ? 'Cover ersetzen' : 'Cover hochladen'}
          </TinySubmitButton>
        </form>
      </div>
    </div>
  )
}

function DocumentCard({
  bandId,
  doc,
  position,
  isFirst,
  isLast,
}: {
  bandId: string
  doc: BandDocumentData
  position: number
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">#{position} — {doc.title}</span>
        <DocumentReorderControls bandId={bandId} documentId={doc.id} isFirst={isFirst} isLast={isLast} />
      </div>
      <div className="p-4 space-y-4">
        <DocumentTextForm bandId={bandId} doc={doc} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
          <DocumentPdfForm bandId={bandId} doc={doc} />
          <DocumentCoverForm bandId={bandId} doc={doc} />
        </div>
      </div>
    </div>
  )
}

function CreateDocumentForm({ bandId }: { bandId: string }) {
  const [pdfSelected, setPdfSelected] = useState(false)

  return (
    <form action={createBandDocumentAction} className="space-y-3 border-t border-gray-100 pt-5">
      <h3 className="text-sm font-semibold text-gray-900">Dokument hinzufügen</h3>
      <input type="hidden" name="band_id" value={bandId} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="new_document_audience" className="block text-xs font-medium text-gray-600 mb-1">
            Zielgruppe
          </label>
          <input
            id="new_document_audience"
            name="audience_label"
            type="text"
            maxLength={100}
            placeholder="z. B. Für Veranstalter & Festwirte"
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="new_document_title" className="block text-xs font-medium text-gray-600 mb-1">
            Titel
          </label>
          <input
            id="new_document_title"
            name="title"
            type="text"
            maxLength={200}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="new_document_description" className="block text-xs font-medium text-gray-600 mb-1">
            Beschreibung <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="new_document_description"
            name="description"
            rows={2}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label htmlFor="new_document_pdf" className="block text-sm font-medium text-gray-700 mb-1">
          PDF
        </label>
        <input
          id="new_document_pdf"
          name="document_pdf"
          type="file"
          accept={PDF_ACCEPTED_TYPES}
          onChange={(e) => setPdfSelected(!!e.target.files?.[0])}
          className="block w-full text-sm text-gray-700 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-gray-300 file:bg-white file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50"
        />
        <p className="mt-1 text-xs text-gray-400">
          Nur PDF, maximal 4 MB. Ein Coverbild lässt sich direkt danach am neu angelegten Dokument
          ergänzen (empfohlen, aber technisch optional).
        </p>
      </div>

      <div className="pt-1">
        <SaveButton label="Dokument anlegen" disabled={!pdfSelected} />
      </div>
    </form>
  )
}

export function BandDocumentsEditorSection({
  bandId,
  documents,
  loadError,
  successMsg,
  errorMsg,
}: {
  bandId: string
  documents: BandDocumentData[]
  // true, wenn das Laden der band_documents-Zeilen fehlgeschlagen ist --
  // darf NIE als "keine Dokumente" interpretiert werden (fail-closed,
  // gleiches Muster wie Galerie/Moods/Repertoire-Styles).
  loadError?: boolean
  successMsg?: string
  errorMsg?: string
}) {
  if (loadError) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Unterlagen &amp; Präsentationen</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3 text-red-700 text-sm">
          Dokumente konnten nicht geladen werden. Bitte Seite neu laden. Aus Sicherheitsgründen wird
          hier kein Bearbeitungsformular angezeigt, solange der aktuelle Zustand nicht zuverlässig
          bekannt ist.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Unterlagen &amp; Präsentationen</h2>
      <p className="text-xs text-gray-400 mb-4">
        Optionale Dokumente für Veranstalter (z. B. eine PDF-Präsentation). Erscheinen auf der
        öffentlichen Bandseite nach der Galerie. Der Anzeigetext des Buttons wird automatisch bestimmt
        („Präsentation ansehen“ bei genau einem Dokument, „Ansehen“ bei mehreren) und ist hier nicht
        editierbar.
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
        <p className="text-xs font-medium text-gray-600 mb-2">Vorhandene Dokumente ({documents.length})</p>
        {documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc, index) => (
              <DocumentCard
                key={doc.id}
                bandId={bandId}
                doc={doc}
                position={index + 1}
                isFirst={index === 0}
                isLast={index === documents.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="w-full h-16 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
            <p className="text-sm text-gray-400">Noch keine Dokumente vorhanden</p>
          </div>
        )}
      </div>

      <CreateDocumentForm bandId={bandId} />
    </div>
  )
}
