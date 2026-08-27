import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { logoutAction } from '@/app/admin/actions'

export const metadata: Metadata = { title: 'Personen' }
export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  archived: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-700',
}

type PersonRow = {
  id: string
  name: string
  slug: string
  status: string
  approved_at: string | null
}

type MembershipCountRow = { person_id: string }

type SearchParams = Promise<{ created?: string }>

export default async function AdminPeoplePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const client = createAdminClient()

  const [{ data: peopleRaw, error: peopleError }, { data: membershipRaw, error: membershipError }] =
    await Promise.all([
      client
        .from('people')
        .select('id, name, slug, status, approved_at')
        .returns<PersonRow[]>(),
      // Jede Zeile zaehlt, unabhaengig von is_public -- die Zahl bildet
      // ALLE Proudleut-Bandzugehoerigkeiten dieser Person ab, nicht nur
      // die oeffentlich sichtbaren (das ist eine reine Admin-Uebersicht,
      // keine Public-Ansicht).
      client.from('band_memberships').select('person_id').returns<MembershipCountRow[]>(),
    ])

  const loadError = !!peopleError || !!membershipError
  const people = peopleRaw ?? []

  const membershipCountByPersonId = new Map<string, number>()
  for (const row of membershipRaw ?? []) {
    membershipCountByPersonId.set(row.person_id, (membershipCountByPersonId.get(row.person_id) ?? 0) + 1)
  }

  const sortedPeople = [...people].sort((a, b) => a.name.localeCompare(b.name, 'de'))

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

      <div className="px-6 py-6 max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Personen</h1>
            <p className="text-sm text-gray-500 mt-1">Musiker- und Personenebene (V1) — Stammdaten und Proudleut-Bandzugehörigkeiten</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/bands"
              className="text-sm text-violet-700 hover:text-violet-900 hover:underline transition-colors"
            >
              ← Zu den Bands
            </Link>
            <Link
              href="/admin/people/new"
              className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
            >
              + Person anlegen
            </Link>
          </div>
        </div>

        {sp.created && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
            Person angelegt.
          </div>
        )}

        {loadError ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
            Personen konnten nicht vollständig geladen werden — bitte Seite neu laden.
          </p>
        ) : sortedPeople.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-12 bg-white border border-gray-200 rounded-xl">
            Noch keine Personen angelegt.
          </p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {sortedPeople.map((person) => {
              const membershipCount = membershipCountByPersonId.get(person.id) ?? 0
              return (
                <Link
                  key={person.id}
                  href={`/admin/people/${person.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_STYLES[person.status] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {person.status}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{person.name}</span>
                    <span className="text-xs text-gray-400 font-mono">{person.slug}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      {membershipCount} {membershipCount === 1 ? 'Proudleut-Band' : 'Proudleut-Bands'}
                    </span>
                    {person.approved_at && (
                      <span>freigegeben {new Date(person.approved_at).toLocaleDateString('de-DE')}</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
