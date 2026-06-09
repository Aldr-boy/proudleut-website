import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { updateBandAction, createContactAction, updateContactAction, updateBandEventTypesAction, updateBandBandTypesAction } from './actions'
import { logoutAction } from '@/app/admin/actions'
import { DeleteContactButton } from './DeleteContactButton'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Band bearbeiten' }

const STATUS_OPTIONS = [
  { value: 'new', label: 'Neu' },
  { value: 'draft', label: 'Entwurf' },
  { value: 'active', label: 'Aktiv' },
  { value: 'paused', label: 'Pausiert' },
  { value: 'archived', label: 'Archiviert' },
]

const FLEXIBILITY_OPTIONS = [
  { value: 'unknown', label: 'Unbekannt' },
  { value: 'fixed', label: 'Fest' },
  { value: 'flexible', label: 'Flexibel' },
  { value: 'modular', label: 'Modular' },
]

const PRICE_TIER_OPTIONS = [
  { value: '', label: '–' },
  { value: 'budget', label: 'Budget' },
  { value: 'mid', label: 'Mittelklasse' },
  { value: 'premium', label: 'Premium' },
  { value: 'on_request', label: 'Auf Anfrage' },
]

const CONTACT_ROLE_OPTIONS = [
  { value: '', label: '– keine Rolle –' },
  { value: 'management', label: 'Management' },
  { value: 'booking', label: 'Booking' },
  { value: 'band_direct', label: 'Band direkt' },
  { value: 'technik', label: 'Technik' },
  { value: 'press', label: 'Presse' },
]

const EVENT_TYPES_ERROR_MESSAGES: Record<string, string> = {
  invalid_band:       'Band nicht gefunden.',
  invalid_event_type: 'Ungültige Event-Type-ID – bitte Seite neu laden.',
  db_error:           'Datenbankfehler – bitte erneut versuchen.',
}

const BAND_TYPES_ERROR_MESSAGES: Record<string, string> = {
  invalid_band:         'Band nicht gefunden.',
  missing_primary:      'Bitte eine primäre Bandart auswählen.',
  primary_in_secondary: 'Die primäre Bandart darf nicht auch als sekundär gewählt sein.',
  invalid_band_type:    'Ungültige Bandart-ID – bitte Seite neu laden.',
  db_error:             'Datenbankfehler – bitte erneut versuchen.',
}

type ActiveEventType = {
  id: string
  name: string
  sort_order: number
}

type AssignedEventTypeRow = {
  event_type_id: string
  event_types: { name: string; status: string } | null
}

type ActiveBandType = {
  id: string
  name: string
  sort_order: number
}

type AssignedBandTypeRow = {
  band_type_id: string
  is_primary: boolean
}

const CONTACT_ERROR_MESSAGES: Record<string, string> = {
  missing_fields: 'Mindestens Name, E-Mail oder Telefon muss befüllt sein.',
  too_long: 'Ein Feld überschreitet die maximale Zeichenanzahl.',
  invalid_role: 'Ungültige Rolle.',
  invalid_email: 'Bitte eine gültige E-Mail-Adresse eingeben.',
  duplicate_role: 'Diese Rolle ist für diese Band bereits vergeben.',
  primary_conflict: 'Es gibt bereits einen primären Anfragekontakt.',
  check_failed: 'Ungültiger Wert (Datenbankprüfung fehlgeschlagen).',
  invalid_contact: 'Kontakt nicht gefunden oder nicht dieser Band zugeordnet.',
  db_error: 'Datenbankfehler – bitte erneut versuchen.',
}

type BandContact = {
  id: string
  contact_name: string | null
  email: string | null
  phone: string | null
  contact_role: string | null
  is_public: boolean
  is_primary_inquiry: boolean
  created_at: string
  updated_at: string
}

type BandDetail = {
  id: string
  name: string
  slug: string
  status: string
  is_published: boolean
  lineup_flexibility: string
  default_member_count: number | null
  website_url: string | null
  locations: { city_name: string }[] | null
  band_profiles: {
    short_description: string | null
    main_text: string | null
    slogan: string | null
    meta_description: string | null
    price_range: string | null
    price_tier: string | null
  }[] | null
  band_contacts: BandContact[]
}

type SearchParams = Promise<{
  saved?: string
  created?: string
  e_name?: string
  e_slug?: string
  e_status?: string
  e_lineup_flexibility?: string
  e_default_member_count?: string
  e_website_url?: string
  e_short_description?: string
  e_slogan?: string
  e_meta_description?: string
  e_price_tier?: string
  e_form?: string
  contact_created?: string
  contact_saved?: string
  contact_deleted?: string
  contact_error?: string
  event_types_saved?: string
  event_types_error?: string
  band_types_saved?: string
  band_types_error?: string
}>

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-xs text-red-600">{msg}</p>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default async function AdminBandDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: SearchParams
}) {
  const { id } = await params
  const sp = await searchParams

  const client = createAdminClient()

  const { data, error } = await client
    .from('bands')
    .select(`
      id, name, slug, status, is_published,
      lineup_flexibility, default_member_count, website_url,
      locations(city_name),
      band_profiles(short_description, main_text, slogan, meta_description, price_range, price_tier),
      band_contacts(id, contact_name, email, phone, contact_role, is_public, is_primary_inquiry, created_at, updated_at)
    `)
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const band = data as unknown as BandDetail
  const profile = band.band_profiles?.[0] ?? null
  const contacts = (band.band_contacts ?? []).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  const location = band.locations?.[0] ?? null

  // Event-Types – admin-spezifische Reads (getrennt von den öffentlichen queries.ts)
  const [
    { data: allActiveEventTypesRaw },
    { data: assignedEventTypesRaw },
    { data: allActiveBandTypesRaw },
    { data: assignedBandTypesRaw },
  ] = await Promise.all([
    client
      .from('event_types')
      .select('id, name, sort_order')
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    client
      .from('band_event_types')
      .select('event_type_id, event_types(name, status)')
      .eq('band_id', id),
    client
      .from('band_types')
      .select('id, name, sort_order')
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    client
      .from('band_band_types')
      .select('band_type_id, is_primary')
      .eq('band_id', id),
  ])

  const allActiveEventTypes = (allActiveEventTypesRaw ?? []) as ActiveEventType[]
  const assignedRows = (assignedEventTypesRaw ?? []) as unknown as AssignedEventTypeRow[]
  const assignedIds = new Set(assignedRows.map(r => r.event_type_id))
  const inactiveAssigned = assignedRows.filter(r => r.event_types?.status !== 'active')

  const allActiveBandTypes = (allActiveBandTypesRaw ?? []) as ActiveBandType[]
  const assignedBandTypeRows = (assignedBandTypesRaw ?? []) as AssignedBandTypeRow[]
  const primaryBandTypeRow = assignedBandTypeRows.find(r => r.is_primary) ?? null
  const secondaryBandTypeIds = new Set(
    assignedBandTypeRows.filter(r => !r.is_primary).map(r => r.band_type_id)
  )

  const showSuccess = !!sp.saved || !!sp.created
  const hasFormError = !!sp.e_form
  const contactErrorMsg = sp.contact_error
    ? (CONTACT_ERROR_MESSAGES[sp.contact_error] ?? 'Unbekannter Fehler – bitte erneut versuchen.')
    : null
  const eventTypesErrorMsg = sp.event_types_error
    ? (EVENT_TYPES_ERROR_MESSAGES[sp.event_types_error] ?? 'Unbekannter Fehler – bitte erneut versuchen.')
    : null
  const bandTypesErrorMsg = sp.band_types_error
    ? (BAND_TYPES_ERROR_MESSAGES[sp.band_types_error] ?? 'Unbekannter Fehler – bitte erneut versuchen.')
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">proudleut Admin</span>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            Abmelden
          </button>
        </form>
      </header>

      <div className="px-6 py-6 max-w-3xl mx-auto">
        {/* Breadcrumb + title */}
        <div className="mb-6">
          <a href="/admin/bands" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            ← Bands
          </a>
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">{band.name}</h1>
          <p className="text-sm text-gray-400 font-mono mt-0.5">{band.slug}</p>
        </div>

        {/* Band success banner */}
        {showSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-5 text-green-700 text-sm">
            {sp.created ? 'Band wurde angelegt.' : 'Änderungen gespeichert.'}
          </div>
        )}

        {/* Band form error */}
        {hasFormError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5 text-red-700 text-sm">
            {sp.e_form}
          </div>
        )}

        {/* Read-only: Standort */}
        {location && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
            <h2 className="text-sm font-medium text-gray-700 mb-3">Standort (read-only)</h2>
            <p className="text-sm text-gray-800">{location.city_name}</p>
          </div>
        )}

        {/* ─── Event-Types ──────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Event-Types</h2>

          {sp.event_types_saved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
              Zuordnungen gespeichert.
            </div>
          )}
          {eventTypesErrorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
              {eventTypesErrorMsg}
            </div>
          )}

          <form action={updateBandEventTypesAction}>
            <input type="hidden" name="band_id" value={band.id} />

            {allActiveEventTypes.length === 0 && inactiveAssigned.length === 0 ? (
              <p className="text-sm text-gray-400 mb-4">Keine aktiven Event-Types vorhanden.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mb-4">
                {allActiveEventTypes.map((et) => (
                  <label
                    key={et.id}
                    className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      name="event_type_id"
                      value={et.id}
                      defaultChecked={assignedIds.has(et.id)}
                      className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    {et.name}
                  </label>
                ))}
              </div>
            )}

            {inactiveAssigned.length > 0 && (
              <div className="border-t border-gray-100 pt-4 mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Inaktiv – bereits zugeordnet
                </p>
                <div className="space-y-2">
                  {inactiveAssigned.map((r) => (
                    <label
                      key={r.event_type_id}
                      className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        name="event_type_id"
                        value={r.event_type_id}
                        defaultChecked
                        className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      {r.event_types?.name ?? r.event_type_id}
                      <span className="text-xs text-amber-600 font-medium">inaktiv</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
            >
              Speichern
            </button>
          </form>
        </div>
        {/* ─── Ende Event-Types ────────────────────── */}

        {/* ─── Bandart ────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Bandart</h2>

          {sp.band_types_saved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
              Zuordnungen gespeichert.
            </div>
          )}
          {bandTypesErrorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
              {bandTypesErrorMsg}
            </div>
          )}

          <form action={updateBandBandTypesAction}>
            <input type="hidden" name="band_id" value={band.id} />

            {!primaryBandTypeRow && (
              <p className="text-sm text-amber-600 font-medium mb-3">
                Noch nicht zugeordnet — bitte eine primäre Bandart auswählen.
              </p>
            )}

            {/* Primäre Bandart */}
            <div className="mb-4">
              <label
                htmlFor="primary_band_type_id"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Primäre Bandart <span className="text-red-500">*</span>
              </label>
              {allActiveBandTypes.length === 0 ? (
                <p className="text-sm text-gray-400">Keine aktiven Bandarten vorhanden.</p>
              ) : (
                <select
                  id="primary_band_type_id"
                  name="primary_band_type_id"
                  defaultValue={primaryBandTypeRow?.band_type_id ?? ''}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">– auswählen –</option>
                  {allActiveBandTypes.map((bt) => (
                    <option key={bt.id} value={bt.id}>{bt.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Sekundäre Bandarten */}
            {allActiveBandTypes.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Sekundäre Bandarten{' '}
                  <span className="text-xs text-gray-400 font-normal">(optional)</span>
                </p>
                <p className="text-xs text-gray-400 mb-2">
                  Die primäre Bandart bitte nicht zusätzlich als sekundäre Bandart auswählen.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                  {allActiveBandTypes.map((bt) => (
                    <label
                      key={bt.id}
                      className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        name="secondary_band_type_id"
                        value={bt.id}
                        defaultChecked={secondaryBandTypeIds.has(bt.id)}
                        className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      {bt.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
            >
              Speichern
            </button>
          </form>
        </div>
        {/* ─── Ende Bandart ───────────────────────── */}

        {/* ─── Kontakte ─────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Kontakte</h2>

          {/* Contact success/error banner */}
          {sp.contact_created && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
              Kontakt wurde angelegt.
            </div>
          )}
          {sp.contact_saved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
              Kontakt gespeichert.
            </div>
          )}
          {sp.contact_deleted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-700 text-sm">
              Kontakt gelöscht.
            </div>
          )}
          {contactErrorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
              {contactErrorMsg}
            </div>
          )}

          {/* Existing contacts */}
          {contacts.length === 0 ? (
            <p className="text-sm text-gray-400 mb-4">Noch keine Kontakte vorhanden.</p>
          ) : (
            <div className="space-y-4 mb-6">
              {contacts.map((c) => (
                <div key={c.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Contact header */}
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">
                        {c.contact_name ?? <span className="text-gray-400 italic">Kein Name</span>}
                      </span>
                      {c.contact_role && (
                        <span className="text-xs text-gray-500 uppercase tracking-wide">
                          {c.contact_role}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {c.is_primary_inquiry && (
                        <span className="text-violet-700 font-medium">Primärkontakt</span>
                      )}
                      {c.is_public && (
                        <span className="text-gray-500">öffentlich</span>
                      )}
                      <DeleteContactButton contactId={c.id} bandId={band.id} />
                    </div>
                  </div>

                  {/* Edit form */}
                  <form action={updateContactAction} className="p-4 space-y-3">
                    <input type="hidden" name="contact_id" value={c.id} />
                    <input type="hidden" name="band_id" value={band.id} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Name */}
                      <div>
                        <label
                          htmlFor={`cn_${c.id}`}
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
                          Name
                        </label>
                        <input
                          id={`cn_${c.id}`}
                          name="contact_name"
                          type="text"
                          defaultValue={c.contact_name ?? ''}
                          maxLength={200}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                      </div>

                      {/* Rolle */}
                      <div>
                        <label
                          htmlFor={`cr_${c.id}`}
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
                          Rolle
                        </label>
                        <select
                          id={`cr_${c.id}`}
                          name="contact_role"
                          defaultValue={c.contact_role ?? ''}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                          {CONTACT_ROLE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* E-Mail */}
                      <div>
                        <label
                          htmlFor={`em_${c.id}`}
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
                          E-Mail
                        </label>
                        <input
                          id={`em_${c.id}`}
                          name="email"
                          type="text"
                          defaultValue={c.email ?? ''}
                          maxLength={254}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                      </div>

                      {/* Telefon */}
                      <div>
                        <label
                          htmlFor={`ph_${c.id}`}
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
                          Telefon
                        </label>
                        <input
                          id={`ph_${c.id}`}
                          name="phone"
                          type="text"
                          defaultValue={c.phone ?? ''}
                          maxLength={80}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Checkboxes */}
                    <div className="flex gap-5">
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          id={`pub_${c.id}`}
                          name="is_public"
                          type="checkbox"
                          value="1"
                          defaultChecked={c.is_public}
                          className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        Öffentlich
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          id={`pri_${c.id}`}
                          name="is_primary_inquiry"
                          type="checkbox"
                          value="1"
                          defaultChecked={c.is_primary_inquiry}
                          className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        Primärer Anfragekontakt
                      </label>
                    </div>

                    {/* Timestamps + submit */}
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs text-gray-400">
                        Angelegt: {formatDate(c.created_at)}
                        {c.updated_at !== c.created_at && (
                          <> · Geändert: {formatDate(c.updated_at)}</>
                        )}
                      </p>
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
                      >
                        Speichern
                      </button>
                    </div>
                  </form>
                </div>
              ))}
            </div>
          )}

          {/* New contact form */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Neuen Kontakt anlegen</h3>
            <form action={createContactAction} className="space-y-3">
              <input type="hidden" name="band_id" value={band.id} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Name */}
                <div>
                  <label htmlFor="new_contact_name" className="block text-xs font-medium text-gray-600 mb-1">
                    Name
                  </label>
                  <input
                    id="new_contact_name"
                    name="contact_name"
                    type="text"
                    maxLength={200}
                    placeholder="z. B. Max Mustermann"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>

                {/* Rolle */}
                <div>
                  <label htmlFor="new_contact_role" className="block text-xs font-medium text-gray-600 mb-1">
                    Rolle
                  </label>
                  <select
                    id="new_contact_role"
                    name="contact_role"
                    defaultValue=""
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {CONTACT_ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* E-Mail */}
                <div>
                  <label htmlFor="new_email" className="block text-xs font-medium text-gray-600 mb-1">
                    E-Mail
                  </label>
                  <input
                    id="new_email"
                    name="email"
                    type="text"
                    maxLength={254}
                    placeholder="kontakt@beispiel.de"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>

                {/* Telefon */}
                <div>
                  <label htmlFor="new_phone" className="block text-xs font-medium text-gray-600 mb-1">
                    Telefon
                  </label>
                  <input
                    id="new_phone"
                    name="phone"
                    type="text"
                    maxLength={80}
                    placeholder="+49 89 …"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex gap-5">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    id="new_is_public"
                    name="is_public"
                    type="checkbox"
                    value="1"
                    className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                  Öffentlich
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    id="new_is_primary_inquiry"
                    name="is_primary_inquiry"
                    type="checkbox"
                    value="1"
                    className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                  Primärer Anfragekontakt
                </label>
              </div>

              <div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
                >
                  Kontakt anlegen
                </button>
              </div>
            </form>
          </div>
        </div>
        {/* ─── Ende Kontakte ─────────────────────────── */}

        {/* Edit form */}
        <form action={updateBandAction} className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <input type="hidden" name="id" value={band.id} />

          {/* Section: Kerndaten */}
          <fieldset>
            <legend className="text-base font-semibold text-gray-900 mb-4">Kerndaten</legend>
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Bandname <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={band.name}
                  maxLength={200}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <FieldError msg={sp.e_name} />
              </div>

              {/* Slug */}
              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                  Slug <span className="text-red-500">*</span>
                </label>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  defaultValue={band.slug}
                  pattern="[a-z0-9-]+"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <FieldError msg={sp.e_slug} />
              </div>

              {/* Status + is_published */}
              <div className="flex flex-wrap gap-4">
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={band.status}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <FieldError msg={sp.e_status} />
                </div>

                <div className="flex items-end gap-2 pb-0.5">
                  <input
                    id="is_published"
                    name="is_published"
                    type="checkbox"
                    value="1"
                    defaultChecked={band.is_published}
                    className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                  <label htmlFor="is_published" className="text-sm text-gray-700">
                    Veröffentlicht
                  </label>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Section: Besetzung */}
          <fieldset className="border-t border-gray-100 pt-5">
            <legend className="text-base font-semibold text-gray-900 mb-4">Besetzung</legend>
            <div className="flex flex-wrap gap-4">
              <div>
                <label htmlFor="lineup_flexibility" className="block text-sm font-medium text-gray-700 mb-1">
                  Besetzungsflexibilität
                </label>
                <select
                  id="lineup_flexibility"
                  name="lineup_flexibility"
                  defaultValue={band.lineup_flexibility}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {FLEXIBILITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <FieldError msg={sp.e_lineup_flexibility} />
              </div>

              <div>
                <label htmlFor="default_member_count" className="block text-sm font-medium text-gray-700 mb-1">
                  Standardgröße (Personen)
                </label>
                <input
                  id="default_member_count"
                  name="default_member_count"
                  type="number"
                  min={1}
                  max={30}
                  defaultValue={band.default_member_count ?? ''}
                  placeholder="–"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <FieldError msg={sp.e_default_member_count} />
              </div>
            </div>
          </fieldset>

          {/* Section: Links */}
          <fieldset className="border-t border-gray-100 pt-5">
            <legend className="text-base font-semibold text-gray-900 mb-4">Links</legend>
            <div>
              <label htmlFor="website_url" className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                id="website_url"
                name="website_url"
                type="url"
                defaultValue={band.website_url ?? ''}
                placeholder="https://"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              <FieldError msg={sp.e_website_url} />
            </div>
          </fieldset>

          {/* Section: Profil */}
          <fieldset className="border-t border-gray-100 pt-5">
            <legend className="text-base font-semibold text-gray-900 mb-4">Profil</legend>
            <div className="space-y-4">
              {/* Slogan */}
              <div>
                <label htmlFor="slogan" className="block text-sm font-medium text-gray-700 mb-1">
                  Slogan
                  <span className="ml-1 text-xs text-gray-400 font-normal">max. 200 Zeichen</span>
                </label>
                <input
                  id="slogan"
                  name="slogan"
                  type="text"
                  defaultValue={profile?.slogan ?? ''}
                  maxLength={200}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <FieldError msg={sp.e_slogan} />
              </div>

              {/* Short description */}
              <div>
                <label htmlFor="short_description" className="block text-sm font-medium text-gray-700 mb-1">
                  Kurzbeschreibung
                  <span className="ml-1 text-xs text-gray-400 font-normal">max. 300 Zeichen</span>
                </label>
                <textarea
                  id="short_description"
                  name="short_description"
                  defaultValue={profile?.short_description ?? ''}
                  maxLength={300}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                />
                <FieldError msg={sp.e_short_description} />
              </div>

              {/* Meta description */}
              <div>
                <label htmlFor="meta_description" className="block text-sm font-medium text-gray-700 mb-1">
                  Meta-Beschreibung (SEO)
                  <span className="ml-1 text-xs text-gray-400 font-normal">max. 160 Zeichen</span>
                </label>
                <textarea
                  id="meta_description"
                  name="meta_description"
                  defaultValue={profile?.meta_description ?? ''}
                  maxLength={160}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                />
                <FieldError msg={sp.e_meta_description} />
              </div>

              {/* Price tier */}
              <div>
                <label htmlFor="price_tier" className="block text-sm font-medium text-gray-700 mb-1">
                  Preis-Tier
                </label>
                <select
                  id="price_tier"
                  name="price_tier"
                  defaultValue={profile?.price_tier ?? ''}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {PRICE_TIER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <FieldError msg={sp.e_price_tier} />
              </div>

              {/* Price range */}
              <div>
                <label htmlFor="price_range" className="block text-sm font-medium text-gray-700 mb-1">
                  Preisspanne (Freitext)
                </label>
                <input
                  id="price_range"
                  name="price_range"
                  type="text"
                  defaultValue={profile?.price_range ?? ''}
                  placeholder="z. B. ab 2.500 €"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              {/* Main text */}
              <div>
                <label htmlFor="main_text" className="block text-sm font-medium text-gray-700 mb-1">
                  Haupttext
                </label>
                <textarea
                  id="main_text"
                  name="main_text"
                  defaultValue={profile?.main_text ?? ''}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y"
                />
              </div>
            </div>
          </fieldset>

          {/* Submit */}
          <div className="border-t border-gray-100 pt-5 flex gap-3">
            <button
              type="submit"
              className="px-5 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
            >
              Speichern
            </button>
            <a
              href="/admin/bands"
              className="px-5 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Zurück zur Liste
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
