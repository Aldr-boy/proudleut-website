import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { logoutAction } from '@/app/admin/actions'
import {
  createEventTypeAction,
  updateEventTypeAction,
  archiveEventTypeAction,
  reactivateEventTypeAction,
} from './actions'
export const metadata: Metadata = { title: 'Veranstaltungstypen' }
export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  archived: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-700',
}

const EVENT_TYPES_ERROR_MESSAGES: Record<string, string> = {
  event_types_name_required:               'Name ist erforderlich.',
  event_types_slug_required:               'Unerwarteter Fehler beim Speichern – bitte erneut versuchen.',
  event_types_slug_invalid:                'Unerwarteter Fehler beim Speichern – bitte erneut versuchen.',
  event_types_slug_conflict:               'Ein Veranstaltungstyp mit diesem Namen (bzw. Slug) existiert bereits.',
  event_types_not_found:                   'Veranstaltungstyp nicht gefunden – bitte Seite neu laden.',
  event_types_archive_not_active:          'Dieser Veranstaltungstyp ist nicht aktiv und kann nicht archiviert werden.',
  event_types_reactivate_not_archived:     'Dieser Veranstaltungstyp ist nicht archiviert und kann nicht reaktiviert werden.',
  db_error:                                'Datenbankfehler – bitte erneut versuchen.',
}

type EventTypeRow = {
  id: string
  name: string
  slug: string
  anfrage_label: string | null
  status: string
  parent_id: string | null
}

type AssignedBandRow = {
  event_type_id: string
  bands: { id: string; name: string; slug: string; status: string } | null
}

type AssignedBand = { id: string; name: string; slug: string; status: string }

type SearchParams = Promise<{
  event_types_created?: string
  event_types_updated?: string
  event_types_archived?: string
  event_types_reactivated?: string
  event_types_error?: string
}>

export default async function AdminEventTypesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const client = createAdminClient()

  const [
    { data: typesRaw, error: typesError },
    { data: assignmentsRaw, error: assignmentsError },
  ] = await Promise.all([
    // Bewusst OHNE Statusfilter -- aktive UND archivierte Werte werden
    // geladen, identisches Muster wie im Mood-/Repertoire-Katalog.
    client
      .from('event_types')
      .select('id, name, slug, anfrage_label, status, parent_id')
      .returns<EventTypeRow[]>(),
    // Jede Zeile zaehlt, unabhaengig vom Status der referenzierenden
    // Band -- eine archivierte oder pausierte Band darf ein Archivieren
    // nicht faelschlich als sicher erscheinen lassen. Kein N+1: genau
    // eine zusaetzliche Query fuer alle Bandzuordnungen.
    client
      .from('band_event_types')
      .select('event_type_id, bands(id, name, slug, status)')
      .returns<AssignedBandRow[]>(),
  ])

  // Ein Lesefehler darf NICHT als "kein Katalog vorhanden" interpretiert
  // werden -- sonst koennte z. B. ein Archivieren faelschlich als sicher
  // erscheinen. Bei Ladefehler: Seite zeigt nur die Fehlermeldung, kein
  // Formular, keine Tabelle, keine Schreibaktion.
  const loadError = !!typesError || !!assignmentsError

  const allTypes = typesRaw ?? []

  // Gruppierung nach event_type_id -- jede band_event_types-Zeile hat per
  // Primary Key (band_id, event_type_id) hoechstens einen Treffer pro
  // Band, daher keine Vervielfachung der Zuordnungszahl durch den
  // bands(...)-Embed.
  const assignedBandsByTypeId = new Map<string, AssignedBand[]>()
  for (const row of assignmentsRaw ?? []) {
    if (!row.bands) continue
    const list = assignedBandsByTypeId.get(row.event_type_id) ?? []
    list.push(row.bands)
    assignedBandsByTypeId.set(row.event_type_id, list)
  }
  for (const list of assignedBandsByTypeId.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }

  // Elternname je Zeile (nur Anzeige, keine Bearbeitungsmoeglichkeit --
  // parent_id ist in diesem Paket bewusst nicht editierbar).
  const nameById = new Map(allTypes.map((t) => [t.id, t.name]))

  // Aktive Kinder je Zeile -- bestimmt, ob Archivieren blockiert ist
  // (siehe archive_event_type in supabase/fn_event_types_catalog_admin.sql).
  const activeChildrenCountByParentId = new Map<string, number>()
  for (const t of allTypes) {
    if (!t.parent_id || t.status !== 'active') continue
    activeChildrenCountByParentId.set(t.parent_id, (activeChildrenCountByParentId.get(t.parent_id) ?? 0) + 1)
  }

  // Anzeige-Sortierung: identisches Muster zu app/admin/repertoire-styles/
  // page.tsx -- Status (active zuerst), dann alphabetisch nach Name
  // (deutsche Locale), bei identischem Namen deterministischer
  // Tie-Breaker ueber slug.
  const sortedTypes = [...allTypes].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1
    const nameCompare = a.name.localeCompare(b.name, 'de')
    if (nameCompare !== 0) return nameCompare
    return a.slug.localeCompare(b.slug, 'de')
  })

  const errorMsg = sp.event_types_error
    ? (EVENT_TYPES_ERROR_MESSAGES[sp.event_types_error] ?? 'Unbekannter Fehler – bitte erneut versuchen.')
    : null

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">proudleut Admin</span>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Abmelden
          </button>
        </form>
      </header>

      <div className="px-6 py-6 max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Veranstaltungstypen</h1>
            <p className="text-sm text-gray-500 mt-1">Anlass-Katalog für Bandzuordnungen und das Anfrageformular</p>
          </div>
          <Link
            href="/admin/bands"
            className="text-sm text-violet-700 hover:text-violet-900 hover:underline transition-colors"
          >
            ← Zu den Bands
          </Link>
        </div>

        {/* Success banners */}
        {sp.event_types_created && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
            Veranstaltungstyp angelegt.
          </div>
        )}
        {sp.event_types_updated && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
            Veranstaltungstyp gespeichert.
          </div>
        )}
        {sp.event_types_archived && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
            Veranstaltungstyp archiviert.
          </div>
        )}
        {sp.event_types_reactivated && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
            Veranstaltungstyp reaktiviert.
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
            {errorMsg}
          </div>
        )}

        {loadError ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
            Veranstaltungstypen-Katalog konnte nicht vollständig geladen werden — bitte Seite neu
            laden. Es wird nichts angezeigt oder gespeichert, um keine falschen Annahmen über
            bestehende Zuordnungen zu riskieren.
          </p>
        ) : (
          <>
            {/* Fachlicher Hinweis */}
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 mb-5 text-sm text-violet-900">
              Der Slug ist nach dem Anlegen eine stabile Identität und wird bei normaler
              Bearbeitung nicht verändert. <code className="font-mono text-xs">anfrage_label</code>{' '}
              wird nur im Anfrageformular verwendet – ist es leer, greift der bestehende
              Fallback auf den Namen.
            </div>

            {/* Neuen Veranstaltungstyp anlegen */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Neuen Veranstaltungstyp anlegen</h2>
              <form action={createEventTypeAction} className="space-y-3">
                <div>
                  <label htmlFor="new_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    id="new_name"
                    name="name"
                    type="text"
                    required
                    maxLength={100}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label htmlFor="new_anfrage_label" className="block text-sm font-medium text-gray-700 mb-1">
                    Anfrage-Label (optional)
                  </label>
                  <input
                    id="new_anfrage_label"
                    name="anfrage_label"
                    type="text"
                    maxLength={100}
                    placeholder="Fällt auf den Namen zurück, wenn leer"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
                >
                  Anlegen
                </button>
              </form>
            </div>

            {/* Katalog-Liste */}
            <div className="space-y-4">
              {sortedTypes.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-12 bg-white border border-gray-200 rounded-xl">
                  Noch keine Veranstaltungstypen im Katalog.
                </p>
              ) : (
                sortedTypes.map((type) => {
                  const assignedBands = assignedBandsByTypeId.get(type.id) ?? []
                  const usageCount = assignedBands.length
                  const activeChildrenCount = activeChildrenCountByParentId.get(type.id) ?? 0
                  const parentName = type.parent_id ? (nameById.get(type.parent_id) ?? null) : null

                  return (
                    <div key={type.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              STATUS_STYLES[type.status] ?? 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {type.status}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">{type.slug}</span>
                          {parentName && (
                            <span className="text-xs text-gray-400">Unterkategorie von {parentName}</span>
                          )}
                          <span className="text-xs text-gray-500">
                            {usageCount} {usageCount === 1 ? 'Zuordnung' : 'Zuordnungen'}
                          </span>
                          {activeChildrenCount > 0 && (
                            <span className="text-xs text-gray-500">
                              {activeChildrenCount} aktive {activeChildrenCount === 1 ? 'Unterkategorie' : 'Unterkategorien'}
                            </span>
                          )}
                        </div>

                        {type.status === 'active' ? (
                          <form action={archiveEventTypeAction}>
                            <input type="hidden" name="event_type_id" value={type.id} />
                            <button
                              type="submit"
                              className="text-xs text-red-700 hover:text-red-900 hover:underline transition-colors"
                            >
                              Archivieren
                            </button>
                          </form>
                        ) : type.status === 'archived' ? (
                          <form action={reactivateEventTypeAction}>
                            <input type="hidden" name="event_type_id" value={type.id} />
                            <button
                              type="submit"
                              className="text-xs text-violet-700 hover:text-violet-900 hover:underline transition-colors"
                            >
                              Reaktivieren
                            </button>
                          </form>
                        ) : null}
                      </div>

                      {assignedBands.length > 0 && (
                        <div className="px-4 py-2 border-b border-gray-100 text-xs text-gray-500 flex flex-wrap items-center gap-x-1 gap-y-1">
                          <span className="text-gray-400">Zugeordnete Bands:</span>
                          {assignedBands.map((band, i) => (
                            <span key={band.id}>
                              <Link
                                href={`/admin/bands/${band.id}`}
                                className="text-violet-700 hover:text-violet-900 hover:underline transition-colors"
                              >
                                {band.name}
                              </Link>
                              {band.status !== 'active' && (
                                <span className="text-gray-400"> ({band.status})</span>
                              )}
                              {i < assignedBands.length - 1 && <span className="text-gray-300">, </span>}
                            </span>
                          ))}
                        </div>
                      )}

                      <form action={updateEventTypeAction} className="p-4 space-y-3">
                        <input type="hidden" name="event_type_id" value={type.id} />
                        <div>
                          <label
                            htmlFor={`name_${type.id}`}
                            className="block text-xs font-medium text-gray-600 mb-1"
                          >
                            Name
                          </label>
                          <input
                            id={`name_${type.id}`}
                            name="name"
                            type="text"
                            defaultValue={type.name}
                            required
                            maxLength={100}
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`slug_${type.id}`}
                            className="block text-xs font-medium text-gray-600 mb-1"
                          >
                            Slug (unveränderlich)
                          </label>
                          <input
                            id={`slug_${type.id}`}
                            type="text"
                            value={type.slug}
                            readOnly
                            disabled
                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 font-mono cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`anfrage_label_${type.id}`}
                            className="block text-xs font-medium text-gray-600 mb-1"
                          >
                            Anfrage-Label (optional)
                          </label>
                          <input
                            id={`anfrage_label_${type.id}`}
                            name="anfrage_label"
                            type="text"
                            defaultValue={type.anfrage_label ?? ''}
                            maxLength={100}
                            placeholder="Fällt auf den Namen zurück, wenn leer"
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                        <button
                          type="submit"
                          className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                        >
                          Speichern
                        </button>
                      </form>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
