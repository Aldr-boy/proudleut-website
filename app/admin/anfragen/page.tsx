import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import { logoutAction } from '@/app/admin/actions'

export const metadata: Metadata = { title: 'Anfragen' }
export const dynamic = 'force-dynamic'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Alle' },
  { value: 'eingegangen', label: 'Eingegangen' },
  { value: 'teilweise_versendet', label: 'Teilweise versendet' },
  { value: 'versendet', label: 'Versendet' },
  { value: 'fehlerhaft', label: 'Fehlerhaft' },
  { value: 'ungeklaert', label: 'Ungeklärt' },
]

const STATUS_STYLES: Record<string, string> = {
  eingegangen: 'bg-blue-100 text-blue-800',
  teilweise_versendet: 'bg-yellow-100 text-yellow-800',
  versendet: 'bg-green-100 text-green-800',
  fehlerhaft: 'bg-red-100 text-red-700',
  ungeklaert: 'bg-orange-100 text-orange-800',
}

const CONFIRMATION_STATUS_LABELS: Record<string, string> = {
  ausstehend: 'Bestätigung ausstehend',
  gesendet: 'Bestätigung gesendet',
  fehlgeschlagen: 'Bestätigung fehlgeschlagen',
  ungeklaert: 'Bestätigung ungeklärt',
}

type AnfrageRow = {
  id: string
  created_at: string
  vorname: string
  nachname: string | null
  email: string
  datum_text: string
  status: string
  confirmation_status: string
  anfrage_bands: { id: string }[] | null
}

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string }>
}

export default async function AdminAnfragenPage({ searchParams }: PageProps) {
  const { q, status } = await searchParams

  const client = createAdminClient()
  const activeStatus = status ?? 'all'
  const term = q?.trim() ?? ''

  let matchingIdsFromBandName: string[] | null = null
  if (term) {
    const { data: bandMatches } = await client
      .from('anfrage_bands')
      .select('anfrage_id')
      .ilike('band_name_snapshot', `%${term}%`)
    matchingIdsFromBandName = Array.from(new Set((bandMatches ?? []).map((r) => r.anfrage_id)))
  }

  let query = client
    .from('anfragen')
    .select('id, created_at, vorname, nachname, email, datum_text, status, confirmation_status, anfrage_bands(id)')
    .order('created_at', { ascending: false })

  if (activeStatus !== 'all') {
    query = query.eq('status', activeStatus)
  }

  if (term) {
    const orParts = [`vorname.ilike.%${term}%`, `nachname.ilike.%${term}%`, `email.ilike.%${term}%`]
    if (matchingIdsFromBandName && matchingIdsFromBandName.length > 0) {
      orParts.push(`id.in.(${matchingIdsFromBandName.join(',')})`)
    }
    query = query.or(orParts.join(','))
  }

  const { data: anfragenRaw, error } = await query
  const anfragen = (anfragenRaw ?? []) as unknown as AnfrageRow[]

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">proudleut Admin</span>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            Abmelden
          </button>
        </form>
      </header>

      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <a href="/admin/bands" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              ← Bands
            </a>
            <h1 className="text-2xl font-semibold text-gray-900 mt-2">Anfragen</h1>
          </div>
          <span className="text-sm text-gray-500">
            {anfragen.length} {anfragen.length === 1 ? 'Anfrage' : 'Anfragen'}
          </span>
        </div>

        <form method="GET" className="mb-4 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Veranstalter, E-Mail oder Bandname suchen…"
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
          {(q || activeStatus !== 'all') && (
            <a
              href="/admin/anfragen"
              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors text-center"
            >
              Zurücksetzen
            </a>
          )}
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 text-sm">
            Fehler beim Laden: {error.message}
          </div>
        )}

        {!error && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {anfragen.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-12">Keine Anfragen gefunden.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Eingang</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Veranstalter</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Datum(stext)</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Bands</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Bestätigung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {anfragen.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(a.created_at).toLocaleString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <a href={`/admin/anfragen/${a.id}`} className="hover:text-violet-700 hover:underline transition-colors">
                          {[a.vorname, a.nachname].filter(Boolean).join(' ')}
                        </a>
                        <div className="text-xs text-gray-400">{a.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{a.datum_text}</td>
                      <td className="px-4 py-3 text-gray-600">{a.anfrage_bands?.length ?? 0}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_STYLES[a.status] ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {CONFIRMATION_STATUS_LABELS[a.confirmation_status] ?? a.confirmation_status}
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
