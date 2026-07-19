import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { logoutAction } from '@/app/admin/actions'
import { createMoodAction, updateMoodAction, archiveMoodAction, reactivateMoodAction } from './actions'
import { hasMissingDescription } from '@/lib/moods/description'

export const metadata: Metadata = { title: 'Mood-Katalog' }
export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  archived: 'bg-red-100 text-red-700',
}

const MOODS_ERROR_MESSAGES: Record<string, string> = {
  moods_name_required:          'Name ist erforderlich.',
  moods_description_required:   'Definition ist erforderlich.',
  moods_slug_required:          'Unerwarteter Fehler beim Speichern – bitte erneut versuchen.',
  moods_slug_invalid:           'Unerwarteter Fehler beim Speichern – bitte erneut versuchen.',
  moods_slug_conflict:          'Ein Mood mit diesem Namen (bzw. Slug) existiert bereits.',
  moods_not_found:              'Mood nicht gefunden – bitte Seite neu laden.',
  moods_archive_in_use:         'Dieser Mood kann nicht archiviert werden, da er noch Bands zugeordnet ist.',
  moods_archive_not_active:     'Dieser Mood ist nicht aktiv und kann nicht archiviert werden.',
  moods_reactivate_not_archived: 'Dieser Mood ist nicht archiviert und kann nicht reaktiviert werden.',
  db_error:                     'Datenbankfehler – bitte erneut versuchen.',
}

type MoodRow = {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
  sort_order: number
}

type SearchParams = Promise<{
  moods_created?: string
  moods_updated?: string
  moods_archived?: string
  moods_reactivated?: string
  moods_error?: string
  moods_error_count?: string
}>

export default async function AdminMoodsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const client = createAdminClient()

  const [
    { data: moodsRaw, error: moodsError },
    { data: bandMoodsRaw, error: bandMoodsError },
  ] = await Promise.all([
    client
      .from('moods')
      .select('id, name, slug, description, status, sort_order')
      .returns<MoodRow[]>(),
    // Jede Zeile zaehlt, unabhaengig vom Status der referenzierenden Band --
    // archivierte/pausierte Baender duerfen bei der Sicherheitspruefung
    // (Archivieren nur ohne Zuordnung) nicht ignoriert werden.
    client.from('band_moods').select('mood_id').returns<{ mood_id: string }[]>(),
  ])

  // Ein Lesefehler darf NICHT als "kein Katalog vorhanden" interpretiert
  // werden -- sonst koennte z. B. ein Archivieren faelschlich als sicher
  // erscheinen. Bei Ladefehler: Seite zeigt nur die Fehlermeldung, kein
  // Formular, keine Tabelle, keine Schreibaktion.
  const loadError = !!moodsError || !!bandMoodsError

  const usageCounts = new Map<string, number>()
  for (const row of bandMoodsRaw ?? []) {
    usageCounts.set(row.mood_id, (usageCounts.get(row.mood_id) ?? 0) + 1)
  }

  const sortedMoods = [...(moodsRaw ?? [])].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.name.localeCompare(b.name)
  })

  const errorMsg = sp.moods_error
    ? sp.moods_error === 'moods_archive_in_use' && sp.moods_error_count
      ? `Dieser Mood kann nicht archiviert werden – er ist noch ${sp.moods_error_count}× einer Band zugeordnet.`
      : (MOODS_ERROR_MESSAGES[sp.moods_error] ?? 'Unbekannter Fehler – bitte erneut versuchen.')
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
            <h1 className="text-2xl font-semibold text-gray-900">Mood-Katalog</h1>
            <p className="text-sm text-gray-500 mt-1">„Klingt nach&#8220; – Wirkung, Atmosphäre und Haltung</p>
          </div>
          <Link
            href="/admin/bands"
            className="text-sm text-violet-700 hover:text-violet-900 hover:underline transition-colors"
          >
            ← Zu den Bands
          </Link>
        </div>

        {/* Success banners */}
        {sp.moods_created && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
            Mood angelegt.
          </div>
        )}
        {sp.moods_updated && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
            Mood gespeichert.
          </div>
        )}
        {sp.moods_archived && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
            Mood archiviert.
          </div>
        )}
        {sp.moods_reactivated && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
            Mood reaktiviert.
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
            {errorMsg}
          </div>
        )}

        {loadError ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
            Mood-Katalog konnte nicht vollständig geladen werden — bitte Seite neu laden. Es
            wird nichts angezeigt oder gespeichert, um keine falschen Annahmen über bestehende
            Zuordnungen zu riskieren.
          </p>
        ) : (
          <>
            {/* Fachlicher Hinweis */}
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 mb-5 text-sm text-violet-900">
              Ein Mood beschreibt Wirkung, Atmosphäre oder Haltung einer Band – nicht
              Musikrichtung oder Repertoire. Begriffe wie Soul, Blues oder Irish Folk sind keine
              Moods.
            </div>

            {/* Neuen Mood anlegen */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Neuen Mood anlegen</h2>
              <form action={createMoodAction} className="space-y-3">
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
                    Definition
                  </label>
                  <textarea
                    id="new_description"
                    name="description"
                    required
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
              {sortedMoods.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-12 bg-white border border-gray-200 rounded-xl">
                  Noch keine Moods im Katalog.
                </p>
              ) : (
                sortedMoods.map((mood) => {
                  const usageCount = usageCounts.get(mood.id) ?? 0
                  const missingDescription = hasMissingDescription(mood.description)
                  return (
                    <div key={mood.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              STATUS_STYLES[mood.status] ?? 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {mood.status}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">{mood.slug}</span>
                          <span className="text-xs text-gray-400">Rang {mood.sort_order}</span>
                          <span className="text-xs text-gray-500">
                            {usageCount} {usageCount === 1 ? 'Zuordnung' : 'Zuordnungen'}
                          </span>
                          {missingDescription && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              ⚠ keine Definition
                            </span>
                          )}
                        </div>

                        {mood.status === 'active' ? (
                          <form action={archiveMoodAction}>
                            <input type="hidden" name="mood_id" value={mood.id} />
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
                        ) : (
                          <form action={reactivateMoodAction}>
                            <input type="hidden" name="mood_id" value={mood.id} />
                            <button
                              type="submit"
                              className="text-xs text-violet-700 hover:text-violet-900 hover:underline transition-colors"
                            >
                              Reaktivieren
                            </button>
                          </form>
                        )}
                      </div>

                      <form action={updateMoodAction} className="p-4 space-y-3">
                        <input type="hidden" name="mood_id" value={mood.id} />
                        <div>
                          <label
                            htmlFor={`name_${mood.id}`}
                            className="block text-xs font-medium text-gray-600 mb-1"
                          >
                            Name
                          </label>
                          <input
                            id={`name_${mood.id}`}
                            name="name"
                            type="text"
                            defaultValue={mood.name}
                            required
                            maxLength={100}
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`description_${mood.id}`}
                            className="block text-xs font-medium text-gray-600 mb-1"
                          >
                            Definition
                          </label>
                          {missingDescription && (
                            <p className="text-xs text-amber-700 mb-1">
                              Für diesen Mood ist noch keine Definition hinterlegt. Bitte ergänzen.
                            </p>
                          )}
                          <textarea
                            id={`description_${mood.id}`}
                            name="description"
                            defaultValue={mood.description ?? ''}
                            required
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
