import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { logoutAction } from '@/app/admin/actions'

export const metadata: Metadata = { title: 'Bands' }
export const dynamic = 'force-dynamic'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Alle' },
  { value: 'new', label: 'Neu' },
  { value: 'draft', label: 'Entwurf' },
  { value: 'active', label: 'Aktiv' },
  { value: 'paused', label: 'Pausiert' },
  { value: 'archived', label: 'Archiviert' },
]

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  archived: 'bg-red-100 text-red-700',
}

type BandRow = {
  id: string
  name: string
  slug: string
  status: string
  is_published: boolean
  updated_at: string
  // Supabase returns FK-joins as array; home_location_id is 0..1
  locations: { city_name: string }[] | null
}

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string }>
}

export default async function AdminBandsPage({ searchParams }: PageProps) {
  const { q, status } = await searchParams

  const client = createAdminClient()

  let query = client
    .from('bands')
    .select('id, name, slug, status, is_published, updated_at, locations(city_name)')
    .order('name', { ascending: true })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (q && q.trim()) {
    query = query.or(`name.ilike.%${q.trim()}%,slug.ilike.%${q.trim()}%`)
  }

  const { data: bands, error } = await query

  const activeStatus = status ?? 'all'
  const bandList = (bands ?? []) as unknown as BandRow[]

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

      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Bands</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {bandList.length} {bandList.length === 1 ? 'Band' : 'Bands'}
            </span>
            <Link
              href="/admin/moods"
              className="text-sm text-violet-700 hover:text-violet-900 hover:underline transition-colors"
            >
              Mood-Katalog verwalten
            </Link>
            <Link
              href="/admin/repertoire-styles"
              className="text-sm text-violet-700 hover:text-violet-900 hover:underline transition-colors"
            >
              Repertoire-Katalog verwalten
            </Link>
            <Link
              href="/admin/anfragen"
              className="text-sm text-violet-700 hover:text-violet-900 hover:underline transition-colors"
            >
              Anfragen verwalten
            </Link>
            <a
              href="/admin/bands/new"
              className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
            >
              + Neue Band anlegen
            </a>
          </div>
        </div>

        {/* Filter bar */}
        <form method="GET" className="mb-4 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Name oder Slug suchen…"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <select
            name="status"
            defaultValue={activeStatus}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-gray-900">
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
          >
            Suchen
          </button>
          {(q || (status && status !== 'all')) && (
            <a
              href="/admin/bands"
              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors text-center"
            >
              Zurücksetzen
            </a>
          )}
        </form>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 text-sm">
            Fehler beim Laden: {error.message}
          </div>
        )}

        {/* Table */}
        {!error && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {bandList.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-12">
                Keine Bands gefunden.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Slug</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Pub.</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Ort</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Geändert</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bandList.map((band) => (
                    <tr key={band.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <a
                          href={`/admin/bands/${band.id}`}
                          className="hover:text-violet-700 hover:underline transition-colors"
                        >
                          {band.name}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{band.slug}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_STYLES[band.status] ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {band.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {band.is_published ? (
                          <span className="text-green-600" title="Veröffentlicht">✓</span>
                        ) : (
                          <span className="text-gray-300" title="Nicht veröffentlicht">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {band.locations?.[0]?.city_name ?? '–'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(band.updated_at).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
