import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { logoutAction } from '@/app/admin/actions'
import {
  createRepertoireStyleAction,
  updateRepertoireStyleAction,
  archiveRepertoireStyleAction,
  reactivateRepertoireStyleAction,
} from './actions'
export const metadata: Metadata = { title: 'Repertoire-Katalog' }
export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  archived: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-700',
}

const REPERTOIRE_STYLES_ERROR_MESSAGES: Record<string, string> = {
  repertoire_styles_name_required:            'Name ist erforderlich.',
  repertoire_styles_slug_required:            'Unerwarteter Fehler beim Speichern – bitte erneut versuchen.',
  repertoire_styles_slug_invalid:             'Unerwarteter Fehler beim Speichern – bitte erneut versuchen.',
  repertoire_styles_slug_conflict:            'Ein Repertoire-Stil mit diesem Namen (bzw. Slug) existiert bereits.',
  repertoire_styles_name_conflict:            'Dieser Name wird bereits von einem anderen aktiven Repertoire-Stil verwendet.',
  repertoire_styles_not_found:                'Repertoire-Stil nicht gefunden – bitte Seite neu laden.',
  repertoire_styles_archive_in_use:           'Dieser Repertoire-Stil kann nicht archiviert werden, da er noch Bands zugeordnet ist.',
  repertoire_styles_archive_not_active:       'Dieser Repertoire-Stil ist nicht aktiv und kann nicht archiviert werden.',
  repertoire_styles_reactivate_not_archived:  'Dieser Repertoire-Stil ist nicht archiviert und kann nicht reaktiviert werden.',
  db_error:                                   'Datenbankfehler – bitte erneut versuchen.',
}

type RepertoireStyleRow = {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
  sort_order: number
}

type AssignedBandRow = {
  repertoire_style_id: string
  bands: { id: string; name: string; slug: string; status: string } | null
}

type AssignedBand = { id: string; name: string; slug: string; status: string }

type SearchParams = Promise<{
  repertoire_styles_created?: string
  repertoire_styles_updated?: string
  repertoire_styles_archived?: string
  repertoire_styles_reactivated?: string
  repertoire_styles_error?: string
}>

export default async function AdminRepertoireStylesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const client = createAdminClient()

  const [
    { data: stylesRaw, error: stylesError },
    { data: assignmentsRaw, error: assignmentsError },
  ] = await Promise.all([
    // Bewusst OHNE Statusfilter -- aktive UND archivierte Werte werden
    // geladen, exakt wie im Mood-Katalog (app/admin/moods/page.tsx).
    client
      .from('repertoire_styles')
      .select('id, name, slug, description, status, sort_order')
      .returns<RepertoireStyleRow[]>(),
    // Jede Zeile zaehlt, unabhaengig vom Status der referenzierenden
    // Band -- identisches Prinzip wie beim Mood-Katalog: eine
    // archivierte oder pausierte Band darf ein Archivieren nicht
    // faelschlich als sicher erscheinen lassen. Kein N+1: genau eine
    // zusaetzliche Query fuer alle Bandzuordnungen, nicht pro Katalogwert.
    client
      .from('band_repertoire_styles')
      .select('repertoire_style_id, bands(id, name, slug, status)')
      .returns<AssignedBandRow[]>(),
  ])

  // Ein Lesefehler darf NICHT als "kein Katalog vorhanden" interpretiert
  // werden -- sonst koennte z. B. ein Archivieren faelschlich als sicher
  // erscheinen. Bei Ladefehler: Seite zeigt nur die Fehlermeldung, kein
  // Formular, keine Tabelle, keine Schreibaktion.
  const loadError = !!stylesError || !!assignmentsError

  // Gruppierung nach repertoire_style_id -- jede band_repertoire_styles-
  // Zeile hat per Primary Key (band_id, repertoire_style_id) hoechstens
  // einen Treffer pro Band, daher keine Vervielfachung der Zuordnungszahl
  // durch den bands(...)-Embed.
  const assignedBandsByStyleId = new Map<string, AssignedBand[]>()
  for (const row of assignmentsRaw ?? []) {
    if (!row.bands) continue
    const list = assignedBandsByStyleId.get(row.repertoire_style_id) ?? []
    list.push(row.bands)
    assignedBandsByStyleId.set(row.repertoire_style_id, list)
  }
  for (const list of assignedBandsByStyleId.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }

  // Anzeige-Sortierung (Production-Smoke-Nachtrag): sort_order fliesst
  // bewusst nicht mehr in die Kartenreihenfolge ein -- nur noch Status
  // (active zuerst), dann alphabetisch nach Name (deutsche Locale), bei
  // identischem Namen deterministischer Tie-Breaker ueber slug. sort_order
  // bleibt als Datenfeld unveraendert und weiterhin sichtbar (Rang-Badge).
  const sortedStyles = [...(stylesRaw ?? [])].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1
    const nameCompare = a.name.localeCompare(b.name, 'de')
    if (nameCompare !== 0) return nameCompare
    return a.slug.localeCompare(b.slug, 'de')
  })

  const errorMsg = sp.repertoire_styles_error
    ? (REPERTOIRE_STYLES_ERROR_MESSAGES[sp.repertoire_styles_error] ?? 'Unbekannter Fehler – bitte erneut versuchen.')
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
            <h1 className="text-2xl font-semibold text-gray-900">Repertoire-Katalog</h1>
            <p className="text-sm text-gray-500 mt-1">„Musikalisch verortet&#8220; – Repertoire und Musikrichtungen</p>
          </div>
          <Link
            href="/admin/bands"
            className="text-sm text-violet-700 hover:text-violet-900 hover:underline transition-colors"
          >
            ← Zu den Bands
          </Link>
        </div>

        {/* Success banners */}
        {sp.repertoire_styles_created && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
            Repertoire-Stil angelegt.
          </div>
        )}
        {sp.repertoire_styles_updated && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
            Repertoire-Stil gespeichert.
          </div>
        )}
        {sp.repertoire_styles_archived && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
            Repertoire-Stil archiviert.
          </div>
        )}
        {sp.repertoire_styles_reactivated && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
            Repertoire-Stil reaktiviert.
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
            {errorMsg}
          </div>
        )}

        {loadError ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
            Repertoire-Katalog konnte nicht vollständig geladen werden — bitte Seite neu laden. Es
            wird nichts angezeigt oder gespeichert, um keine falschen Annahmen über bestehende
            Zuordnungen zu riskieren.
          </p>
        ) : (
          <>
            {/* Fachlicher Hinweis */}
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 mb-5 text-sm text-violet-900">
              „Musikalisch verortet“ beschreibt das musikalische Spektrum, das Repertoire und die
              spielbaren Musikrichtungen einer Band – nicht ihre Wirkung, Atmosphäre oder Haltung.
              Begriffe wie Rockig, Herzlich oder Festlich gehören in den Mood-Katalog, nicht hierher.
            </div>

            {/* Neuen Repertoire-Stil anlegen */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Neuen Repertoire-Stil anlegen</h2>
              <form action={createRepertoireStyleAction} className="space-y-3">
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
                  <label htmlFor="new_description" className="block text-sm font-medium text-gray-700 mb-1">
                    Beschreibung (optional)
                  </label>
                  <textarea
                    id="new_description"
                    name="description"
                    rows={2}
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
              {sortedStyles.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-12 bg-white border border-gray-200 rounded-xl">
                  Noch keine Repertoire-Stile im Katalog.
                </p>
              ) : (
                sortedStyles.map((style) => {
                  const assignedBands = assignedBandsByStyleId.get(style.id) ?? []
                  const usageCount = assignedBands.length
                  return (
                    <div key={style.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              STATUS_STYLES[style.status] ?? 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {style.status}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">{style.slug}</span>
                          <span className="text-xs text-gray-400">Rang {style.sort_order}</span>
                          <span className="text-xs text-gray-500">
                            {usageCount} {usageCount === 1 ? 'Zuordnung' : 'Zuordnungen'}
                          </span>
                        </div>

                        {style.status === 'active' ? (
                          <form action={archiveRepertoireStyleAction}>
                            <input type="hidden" name="repertoire_style_id" value={style.id} />
                            <button
                              type="submit"
                              disabled={usageCount > 0}
                              title={
                                usageCount > 0
                                  ? `Kann nicht archiviert werden – ${usageCount} bestehende Zuordnung(en)`
                                  : undefined
                              }
                              className="text-xs text-red-700 hover:text-red-900 hover:underline transition-colors disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed"
                            >
                              Archivieren
                            </button>
                          </form>
                        ) : style.status === 'archived' ? (
                          <form action={reactivateRepertoireStyleAction}>
                            <input type="hidden" name="repertoire_style_id" value={style.id} />
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

                      <form action={updateRepertoireStyleAction} className="p-4 space-y-3">
                        <input type="hidden" name="repertoire_style_id" value={style.id} />
                        <div>
                          <label
                            htmlFor={`name_${style.id}`}
                            className="block text-xs font-medium text-gray-600 mb-1"
                          >
                            Name
                          </label>
                          <input
                            id={`name_${style.id}`}
                            name="name"
                            type="text"
                            defaultValue={style.name}
                            required
                            maxLength={100}
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`description_${style.id}`}
                            className="block text-xs font-medium text-gray-600 mb-1"
                          >
                            Beschreibung (optional)
                          </label>
                          <textarea
                            id={`description_${style.id}`}
                            name="description"
                            defaultValue={style.description ?? ''}
                            rows={2}
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
