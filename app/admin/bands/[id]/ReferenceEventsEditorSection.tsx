'use client'
import { useFormStatus } from 'react-dom'
import type { AdminReferenceEvent } from '@/lib/types/band'
import {
  createReferenceEventAction,
  updateReferenceEventAction,
  deleteReferenceEventAction,
  moveReferenceEventAction,
} from './actions'

function TinySubmitButton({
  children,
  title,
  disabled,
}: {
  children: React.ReactNode
  title: string
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
      {children}
    </button>
  )
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-3 py-1.5 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-violet-700"
    >
      {pending ? 'Wird gespeichert …' : label}
    </button>
  )
}

function ReferenceEventReorderControls({
  bandId,
  referenceEventId,
  isFirst,
  isLast,
}: {
  bandId: string
  referenceEventId: string
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <div className="flex gap-1.5">
      <form action={moveReferenceEventAction}>
        <input type="hidden" name="band_id" value={bandId} />
        <input type="hidden" name="reference_event_id" value={referenceEventId} />
        <input type="hidden" name="direction" value="up" />
        <TinySubmitButton title="Nach oben verschieben">{isFirst ? '—' : '↑'}</TinySubmitButton>
      </form>
      <form action={moveReferenceEventAction}>
        <input type="hidden" name="band_id" value={bandId} />
        <input type="hidden" name="reference_event_id" value={referenceEventId} />
        <input type="hidden" name="direction" value="down" />
        <TinySubmitButton title="Nach unten verschieben">{isLast ? '—' : '↓'}</TinySubmitButton>
      </form>
      <form
        action={deleteReferenceEventAction}
        onSubmit={(e) => {
          if (!confirm('Referenz wirklich löschen?')) e.preventDefault()
        }}
      >
        <input type="hidden" name="band_id" value={bandId} />
        <input type="hidden" name="reference_event_id" value={referenceEventId} />
        <TinySubmitButton title="Referenz löschen">Löschen</TinySubmitButton>
      </form>
    </div>
  )
}

function ReferenceEventForm({
  bandId,
  referenceEvent,
}: {
  bandId: string
  referenceEvent: AdminReferenceEvent
}) {
  return (
    <form action={updateReferenceEventAction} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <input type="hidden" name="band_id" value={bandId} />
      <input type="hidden" name="reference_event_id" value={referenceEvent.id} />

      <div className="sm:col-span-2">
        <label htmlFor={`event_name_${referenceEvent.id}`} className="block text-xs font-medium text-gray-600 mb-1">
          Veranstaltung/Referenz
        </label>
        <input
          id={`event_name_${referenceEvent.id}`}
          name="event_name"
          type="text"
          defaultValue={referenceEvent.eventName}
          maxLength={200}
          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor={`location_name_${referenceEvent.id}`} className="block text-xs font-medium text-gray-600 mb-1">
          Location <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id={`location_name_${referenceEvent.id}`}
          name="location_name"
          type="text"
          defaultValue={referenceEvent.locationName ?? ''}
          maxLength={200}
          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor={`city_${referenceEvent.id}`} className="block text-xs font-medium text-gray-600 mb-1">
          Ort <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id={`city_${referenceEvent.id}`}
          name="city"
          type="text"
          defaultValue={referenceEvent.city ?? ''}
          maxLength={200}
          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor={`year_${referenceEvent.id}`} className="block text-xs font-medium text-gray-600 mb-1">
          Jahr <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id={`year_${referenceEvent.id}`}
          name="year"
          type="number"
          min={1900}
          max={2100}
          defaultValue={referenceEvent.year ?? ''}
          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={`description_${referenceEvent.id}`} className="block text-xs font-medium text-gray-600 mb-1">
          Zusatz <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id={`description_${referenceEvent.id}`}
          name="description"
          type="text"
          defaultValue={referenceEvent.description ?? ''}
          maxLength={200}
          placeholder="z. B. Wiederkehrendes Engagement"
          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      <div className="sm:col-span-2">
        <SaveButton label="Speichern" />
      </div>
    </form>
  )
}

function ReferenceEventCard({
  bandId,
  referenceEvent,
  position,
  isFirst,
  isLast,
}: {
  bandId: string
  referenceEvent: AdminReferenceEvent
  position: number
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">#{position} — {referenceEvent.eventName}</span>
        <ReferenceEventReorderControls
          bandId={bandId}
          referenceEventId={referenceEvent.id}
          isFirst={isFirst}
          isLast={isLast}
        />
      </div>
      <div className="p-4">
        <ReferenceEventForm bandId={bandId} referenceEvent={referenceEvent} />
      </div>
    </div>
  )
}

function CreateReferenceEventForm({ bandId }: { bandId: string }) {
  return (
    <form action={createReferenceEventAction} className="space-y-3 border-t border-gray-100 pt-5">
      <h3 className="text-sm font-semibold text-gray-900">Referenz hinzufügen</h3>
      <input type="hidden" name="band_id" value={bandId} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label htmlFor="new_reference_event_name" className="block text-xs font-medium text-gray-600 mb-1">
            Veranstaltung/Referenz
          </label>
          <input
            id="new_reference_event_name"
            name="event_name"
            type="text"
            maxLength={200}
            placeholder="z. B. Stadtfest Regensburg"
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="new_reference_event_location_name" className="block text-xs font-medium text-gray-600 mb-1">
            Location <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="new_reference_event_location_name"
            name="location_name"
            type="text"
            maxLength={200}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="new_reference_event_city" className="block text-xs font-medium text-gray-600 mb-1">
            Ort <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="new_reference_event_city"
            name="city"
            type="text"
            maxLength={200}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="new_reference_event_year" className="block text-xs font-medium text-gray-600 mb-1">
            Jahr <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="new_reference_event_year"
            name="year"
            type="number"
            min={1900}
            max={2100}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="new_reference_event_description" className="block text-xs font-medium text-gray-600 mb-1">
            Zusatz <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="new_reference_event_description"
            name="description"
            type="text"
            maxLength={200}
            placeholder="z. B. Wiederkehrendes Engagement"
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="pt-1">
        <SaveButton label="Referenz anlegen" />
      </div>
    </form>
  )
}

export function ReferenceEventsEditorSection({
  bandId,
  referenceEvents,
  loadError,
  successMsg,
  errorMsg,
}: {
  bandId: string
  referenceEvents: AdminReferenceEvent[]
  // true, wenn das Laden der reference_events-Zeilen fehlgeschlagen ist --
  // darf NIE als "keine Referenzen" interpretiert werden (fail-closed,
  // gleiches Muster wie Galerie/Moods/Dokumente).
  loadError?: boolean
  successMsg?: string
  errorMsg?: string
}) {
  if (loadError) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Referenzen</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3 text-red-700 text-sm">
          Referenzen konnten nicht geladen werden. Bitte Seite neu laden. Aus Sicherheitsgründen wird
          hier kein Bearbeitungsformular angezeigt, solange der aktuelle Zustand nicht zuverlässig
          bekannt ist.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Referenzen</h2>
      <p className="text-xs text-gray-400 mb-4">
        Bisherige Auftritte/Veranstaltungen dieser Band. Erscheinen in dieser Reihenfolge auf der
        öffentlichen Bandseite. Änderungen sind sofort live sichtbar — es gibt keinen separaten
        Entwurfsstatus.
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
        <p className="text-xs font-medium text-gray-600 mb-2">Vorhandene Referenzen ({referenceEvents.length})</p>
        {referenceEvents.length > 0 ? (
          <div className="space-y-3">
            {referenceEvents.map((re, index) => (
              <ReferenceEventCard
                key={re.id}
                bandId={bandId}
                referenceEvent={re}
                position={index + 1}
                isFirst={index === 0}
                isLast={index === referenceEvents.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="w-full h-16 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
            <p className="text-sm text-gray-400">Noch keine Referenzen vorhanden</p>
          </div>
        )}
      </div>

      <CreateReferenceEventForm bandId={bandId} />
    </div>
  )
}
