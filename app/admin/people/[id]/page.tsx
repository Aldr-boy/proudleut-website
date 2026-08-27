import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import {
  updatePersonAction,
  publishPersonAction,
  archivePersonAction,
  createMembershipAction,
  updateMembershipAction,
  deleteMembershipAction,
} from '../actions'

export const metadata: Metadata = { title: 'Person bearbeiten' }
export const dynamic = 'force-dynamic'

const ERROR_MESSAGES: Record<string, string> = {
  name_required: 'Name ist erforderlich.',
  name_too_long: 'Name: max. 200 Zeichen.',
  invalid_website_url: 'Website-URL ist ungültig (nur http/https).',
  invalid_image_url: 'Bild-URL ist ungültig (nur http/https).',
  slug_conflict: 'Eine Person mit diesem Namen (bzw. Slug) existiert bereits.',
  not_found: 'Person nicht gefunden.',
  publish_not_allowed: 'Veröffentlichen nicht möglich — Person ist bereits aktiv.',
  archive_not_allowed: 'Archivieren nicht möglich — Person ist nicht aktiv.',
  band_required: 'Bitte eine Band auswählen.',
  role_too_long: 'Rolle: max. 100 Zeichen.',
  left_before_joined: 'Ende darf nicht vor dem Beginn liegen.',
  invalid_sort_order: 'Ungültige Reihenfolge (ganzzahlig, ≥ 0).',
  invalid_person: 'Person nicht gefunden — bitte Seite neu laden.',
  invalid_band: 'Diese Band wurde nicht gefunden — bitte Seite neu laden.',
  invalid_instrument: 'Ungültige Instrumentauswahl — bitte Seite neu laden.',
  membership_duplicate: 'Diese Person ist dieser Band bereits zugeordnet.',
  invalid_membership: 'Zuordnung nicht gefunden — bitte Seite neu laden.',
  instruments_partial: 'Gespeichert, aber die Instrumentzuordnung konnte nicht vollständig aktualisiert werden — bitte erneut prüfen.',
  db_error: 'Datenbankfehler – bitte erneut versuchen.',
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  archived: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-700',
}

type PersonRow = {
  id: string
  name: string
  slug: string
  bio: string | null
  website_url: string | null
  image_url: string | null
  status: string
  approved_at: string | null
}

type InstrumentRow = { id: string; name: string; slug: string; sort_order: number }
type BandRow = { id: string; name: string; slug: string }

type MembershipRow = {
  id: string
  band_id: string
  role: string | null
  joined_at: string | null
  left_at: string | null
  is_public: boolean
  sort_order: number
  bands: { id: string; name: string; slug: string } | null
  band_membership_instruments: { instrument_id: string; instruments: { id: string; name: string } | null }[]
}

type SearchParams = Promise<{
  saved?: string
  created?: string
  published?: string
  archived?: string
  membership_created?: string
  membership_saved?: string
  membership_deleted?: string
  people_error?: string
  membership_error?: string
}>

export default async function AdminPersonDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: SearchParams
}) {
  const { id } = await params
  const sp = await searchParams
  const client = createAdminClient()

  const [{ data: person }, { data: membershipsRaw }, { data: bandsRaw }, { data: instrumentsRaw }] = await Promise.all([
    client
      .from('people')
      .select('id, name, slug, bio, website_url, image_url, status, approved_at')
      .eq('id', id)
      .maybeSingle()
      .returns<PersonRow | null>(),
    client
      .from('band_memberships')
      .select(
        'id, band_id, role, joined_at, left_at, is_public, sort_order, bands(id, name, slug), band_membership_instruments(instrument_id, instruments(id, name))',
      )
      .eq('person_id', id)
      .returns<MembershipRow[]>(),
    client.from('bands').select('id, name, slug').order('name', { ascending: true }).returns<BandRow[]>(),
    client
      .from('instruments')
      .select('id, name, slug, sort_order')
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
      .returns<InstrumentRow[]>(),
  ])

  if (!person) {
    return (
      <div className="min-h-screen px-6 py-6 max-w-3xl mx-auto">
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
          Person nicht gefunden. <Link href="/admin/people" className="underline">Zurück zur Übersicht</Link>
        </p>
      </div>
    )
  }

  const memberships = (membershipsRaw ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)
  const bands = bandsRaw ?? []
  const instruments = instrumentsRaw ?? []
  const assignedBandIds = new Set(memberships.map((m) => m.band_id))
  const availableBands = bands.filter((b) => !assignedBandIds.has(b.id))

  const peopleErrorMsg = sp.people_error ? (ERROR_MESSAGES[sp.people_error] ?? 'Unbekannter Fehler.') : null
  const membershipErrorMsg = sp.membership_error ? (ERROR_MESSAGES[sp.membership_error] ?? 'Unbekannter Fehler.') : null

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">proudleut Admin</span>
        <Link href="/admin/people" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
          Zurück zur Übersicht
        </Link>
      </header>

      <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">{person.name}</h1>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              STATUS_STYLES[person.status] ?? 'bg-gray-100 text-gray-700'
            }`}
          >
            {person.status}
          </span>
        </div>

        {sp.created && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">Person angelegt.</div>}
        {sp.saved && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">Stammdaten gespeichert.</div>}
        {sp.published && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">Person veröffentlicht.</div>}
        {sp.archived && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">Person archiviert.</div>}
        {sp.membership_created && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">Bandzugehörigkeit angelegt.</div>}
        {sp.membership_saved && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">Bandzugehörigkeit gespeichert.</div>}
        {sp.membership_deleted && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">Bandzugehörigkeit entfernt.</div>}
        {peopleErrorMsg && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{peopleErrorMsg}</div>}
        {membershipErrorMsg && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{membershipErrorMsg}</div>}

        {/* Status-Aktionen */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Status</h2>
          <p className="text-xs text-gray-500 mb-3">
            Freigegeben (approved_at):{' '}
            {person.approved_at ? new Date(person.approved_at).toLocaleString('de-DE') : 'noch nicht'}
          </p>
          <div className="flex gap-3">
            {(person.status === 'draft' || person.status === 'archived') && (
              <form action={publishPersonAction}>
                <input type="hidden" name="id" value={person.id} />
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
                >
                  Veröffentlichen
                </button>
              </form>
            )}
            {person.status === 'active' && (
              <form action={archivePersonAction}>
                <input type="hidden" name="id" value={person.id} />
                <button
                  type="submit"
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  Archivieren
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Stammdaten */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Stammdaten</h2>
          <form action={updatePersonAction} className="space-y-3">
            <input type="hidden" name="id" value={person.id} />
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                id="name"
                name="name"
                type="text"
                defaultValue={person.name}
                required
                maxLength={200}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label htmlFor="slug" className="block text-xs font-medium text-gray-600 mb-1">Slug (unveränderlich)</label>
              <input
                id="slug"
                type="text"
                value={person.slug}
                readOnly
                disabled
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 font-mono cursor-not-allowed"
              />
            </div>
            <div>
              <label htmlFor="bio" className="block text-xs font-medium text-gray-600 mb-1">Bio</label>
              <textarea
                id="bio"
                name="bio"
                rows={4}
                defaultValue={person.bio ?? ''}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label htmlFor="website_url" className="block text-xs font-medium text-gray-600 mb-1">Website URL</label>
              <input
                id="website_url"
                name="website_url"
                type="text"
                defaultValue={person.website_url ?? ''}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label htmlFor="image_url" className="block text-xs font-medium text-gray-600 mb-1">Bild-URL</label>
              <input
                id="image_url"
                name="image_url"
                type="text"
                defaultValue={person.image_url ?? ''}
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

        {/* Proudleut-Bands */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Proudleut-Bands</h2>
          <p className="text-xs text-gray-500 mb-4">
            Neue Zuordnungen sind zunächst intern (nicht öffentlich sichtbar) — Sichtbarkeit wird pro Zuordnung
            bewusst separat gesteuert und ist unabhängig vom Personenstatus.
          </p>

          <div className="space-y-4 mb-6">
            {memberships.length === 0 ? (
              <p className="text-sm text-gray-500">Noch keine Bandzugehörigkeit hinterlegt.</p>
            ) : (
              memberships.map((m) => {
                const assignedInstrumentIds = new Set(m.band_membership_instruments.map((r) => r.instrument_id))
                return (
                  <div key={m.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{m.bands?.name ?? '(Band gelöscht)'}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            m.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {m.is_public ? 'öffentlich' : 'privat'}
                        </span>
                      </div>
                      <form action={deleteMembershipAction}>
                        <input type="hidden" name="membership_id" value={m.id} />
                        <input type="hidden" name="person_id" value={person.id} />
                        <button type="submit" className="text-xs text-red-700 hover:text-red-900 hover:underline transition-colors">
                          Entfernen
                        </button>
                      </form>
                    </div>
                    <form action={updateMembershipAction} className="p-4 space-y-3">
                      <input type="hidden" name="membership_id" value={m.id} />
                      <input type="hidden" name="person_id" value={person.id} />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Rolle</label>
                          <input
                            name="role"
                            type="text"
                            defaultValue={m.role ?? ''}
                            maxLength={100}
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Reihenfolge</label>
                          <input
                            name="sort_order"
                            type="number"
                            min={0}
                            defaultValue={m.sort_order}
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Beginn</label>
                          <input
                            name="joined_at"
                            type="date"
                            defaultValue={m.joined_at ?? ''}
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Ende (leer = laufend)</label>
                          <input
                            name="left_at"
                            type="date"
                            defaultValue={m.left_at ?? ''}
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="hidden" name="is_public" value="0" />
                        <input type="checkbox" name="is_public" value="1" defaultChecked={m.is_public} className="rounded border-gray-300" />
                        Öffentlich sichtbar
                      </label>
                      <div>
                        <span className="block text-xs font-medium text-gray-600 mb-1">Instrumente</span>
                        <div className="flex flex-wrap gap-3">
                          {instruments.map((instrument) => (
                            <label key={instrument.id} className="flex items-center gap-1.5 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                name="instrument_id"
                                value={instrument.id}
                                defaultChecked={assignedInstrumentIds.has(instrument.id)}
                                className="rounded border-gray-300"
                              />
                              {instrument.name}
                            </label>
                          ))}
                        </div>
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

          {availableBands.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Neue Bandzugehörigkeit hinzufügen</h3>
              <form action={createMembershipAction} className="space-y-3">
                <input type="hidden" name="person_id" value={person.id} />
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Band</label>
                  <select
                    name="band_id"
                    required
                    defaultValue=""
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="" disabled>Bitte wählen…</option>
                    {availableBands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Rolle (optional)</label>
                    <input
                      name="role"
                      type="text"
                      maxLength={100}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Reihenfolge</label>
                    <input
                      name="sort_order"
                      type="number"
                      min={0}
                      defaultValue={0}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Beginn (optional)</label>
                    <input
                      name="joined_at"
                      type="date"
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ende (optional)</label>
                    <input
                      name="left_at"
                      type="date"
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>
                <div>
                  <span className="block text-xs font-medium text-gray-600 mb-1">Instrumente</span>
                  <div className="flex flex-wrap gap-3">
                    {instruments.map((instrument) => (
                      <label key={instrument.id} className="flex items-center gap-1.5 text-sm text-gray-700">
                        <input type="checkbox" name="instrument_id" value={instrument.id} className="rounded border-gray-300" />
                        {instrument.name}
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  Neue Zuordnungen sind zunächst privat — „Öffentlich sichtbar“ kann danach bewusst im
                  Bearbeiten-Formular oben gesetzt werden.
                </p>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
                >
                  Hinzufügen
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
