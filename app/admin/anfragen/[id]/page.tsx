import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { logoutAction } from '@/app/admin/actions'
import { isWithinProviderIdempotencyProtectionWindow } from '@/lib/anfrage/mailSend'
import { retryBandSendAction, retryConfirmationAction } from '../actions'

export const metadata: Metadata = { title: 'Anfrage-Detail' }
export const dynamic = 'force-dynamic'

const RETRY_ERROR_MESSAGES: Record<string, string> = {
  not_found: 'Eintrag nicht gefunden.',
  already_sent: 'Diese Mail wurde bereits erfolgreich versendet und wird nicht erneut gesendet.',
  protection_window_expired:
    'Der 24-Stunden-Schutzzeitraum für diesen ungeklärten Versand ist abgelaufen. Aus Sicherheit vor Doppelzustellung ist kein automatischer erneuter Versand mehr möglich — bei Bedarf manuell klären.',
}

type AnfrageDetail = {
  id: string
  created_at: string
  vorname: string
  nachname: string | null
  email: string
  telefon: string | null
  anlass: string | null
  datum_text: string
  location: string | null
  plz_ort: string | null
  nachricht: string | null
  gaestezahl: string | null
  spielzeit: string | null
  source: string
  status: string
  datenschutz_accepted_at: string
  datenschutz_version: string
  confirmation_recipient: string
  confirmation_reply_to: string | null
  confirmation_status: string
  confirmation_provider_idempotency_key: string
  confirmation_attempts: number
  confirmation_last_attempt_at: string | null
  confirmation_sent_at: string | null
  confirmation_message_id: string | null
  confirmation_error: string | null
  confirmation_subject: string | null
  confirmation_body_text: string | null
  confirmation_template_version: string
}

type AnfrageBandDetail = {
  id: string
  position: number
  band_name_snapshot: string
  recipient_email: string
  reply_to: string
  template_version: string
  provider_idempotency_key: string
  subject: string
  body_text: string
  send_status: string
  attempts: number
  last_attempt_at: string | null
  sent_at: string | null
  resend_message_id: string | null
  error_message: string | null
}

function formatDateTime(value: string | null): string {
  if (!value) return '–'
  return new Date(value).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ausstehend: 'bg-gray-100 text-gray-700',
    eingegangen: 'bg-blue-100 text-blue-800',
    teilweise_versendet: 'bg-yellow-100 text-yellow-800',
    versendet: 'bg-green-100 text-green-800',
    gesendet: 'bg-green-100 text-green-800',
    fehlerhaft: 'bg-red-100 text-red-700',
    fehlgeschlagen: 'bg-red-100 text-red-700',
    ungeklaert: 'bg-orange-100 text-orange-800',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  )
}

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ retry_ok?: string; retry_error?: string }>
}

export default async function AnfrageDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const sp = await searchParams

  const client = createAdminClient()

  const { data: anfrageRaw } = await client.from('anfragen').select('*').eq('id', id).maybeSingle()
  if (!anfrageRaw) notFound()
  const anfrage = anfrageRaw as AnfrageDetail

  const { data: bandsRaw } = await client
    .from('anfrage_bands')
    .select('*')
    .eq('anfrage_id', id)
    .order('position', { ascending: true })
  const bands = (bandsRaw ?? []) as AnfrageBandDetail[]

  const now = new Date()

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

      <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
        <div>
          <a href="/admin/anfragen" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            ← Anfragen
          </a>
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">
            Anfrage von {[anfrage.vorname, anfrage.nachname].filter(Boolean).join(' ')}
          </h1>
        </div>

        {sp.retry_ok && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">
            Erneuter Versand ausgelöst.
          </div>
        )}
        {sp.retry_error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {RETRY_ERROR_MESSAGES[sp.retry_error] ?? 'Erneuter Versand nicht möglich.'}
          </div>
        )}

        {/* Anfrage */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Anfrage</h2>
            <StatusBadge status={anfrage.status} />
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-gray-500">Anfrage-ID</dt><dd className="font-mono text-xs text-gray-700">{anfrage.id}</dd></div>
            <div><dt className="text-gray-500">Eingangszeit</dt><dd className="text-gray-900">{formatDateTime(anfrage.created_at)}</dd></div>
            <div><dt className="text-gray-500">Vorname</dt><dd className="text-gray-900">{anfrage.vorname}</dd></div>
            <div><dt className="text-gray-500">Nachname</dt><dd className="text-gray-900">{anfrage.nachname ?? '–'}</dd></div>
            <div><dt className="text-gray-500">E-Mail</dt><dd className="text-gray-900">{anfrage.email}</dd></div>
            <div><dt className="text-gray-500">Telefon</dt><dd className="text-gray-900">{anfrage.telefon ?? '–'}</dd></div>
            <div><dt className="text-gray-500">Anlass</dt><dd className="text-gray-900">{anfrage.anlass ?? '–'}</dd></div>
            <div><dt className="text-gray-500">Wunschtermin / Zeitraum</dt><dd className="text-gray-900">{anfrage.datum_text}</dd></div>
            <div><dt className="text-gray-500">Location</dt><dd className="text-gray-900">{anfrage.location ?? '–'}</dd></div>
            <div><dt className="text-gray-500">PLZ & Ort</dt><dd className="text-gray-900">{anfrage.plz_ort ?? '–'}</dd></div>
            <div><dt className="text-gray-500">Gästezahl</dt><dd className="text-gray-900">{anfrage.gaestezahl ?? '–'}</dd></div>
            <div><dt className="text-gray-500">Spielzeit</dt><dd className="text-gray-900">{anfrage.spielzeit ?? '–'}</dd></div>
            <div><dt className="text-gray-500">Quelle</dt><dd className="text-gray-900">{anfrage.source}</dd></div>
            <div>
              <dt className="text-gray-500">Datenschutz</dt>
              <dd className="text-gray-900">{formatDateTime(anfrage.datenschutz_accepted_at)} ({anfrage.datenschutz_version})</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-gray-500">Persönliche Nachricht</dt>
              <dd className="text-gray-900 whitespace-pre-wrap">{anfrage.nachricht ?? '–'}</dd>
            </div>
          </dl>
        </section>

        {/* Pro Band */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Bands ({bands.length})</h2>
          {bands.map((b) => {
            const canRetry = b.send_status === 'fehlgeschlagen' || b.send_status === 'ungeklaert'
            const withinWindow =
              b.send_status !== 'ungeklaert' || !b.last_attempt_at
                ? true
                : isWithinProviderIdempotencyProtectionWindow(new Date(b.last_attempt_at), now)
            return (
              <div key={b.id} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    #{b.position} — {b.band_name_snapshot}
                  </h3>
                  <StatusBadge status={b.send_status} />
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div><dt className="text-gray-500">Empfänger</dt><dd className="text-gray-900">{b.recipient_email}</dd></div>
                  <div><dt className="text-gray-500">Reply-To</dt><dd className="text-gray-900">{b.reply_to}</dd></div>
                  <div><dt className="text-gray-500">Template-Version</dt><dd className="text-gray-900">{b.template_version}</dd></div>
                  <div><dt className="text-gray-500">Provider-Idempotency-Key</dt><dd className="font-mono text-xs text-gray-700 break-all">{b.provider_idempotency_key}</dd></div>
                  <div><dt className="text-gray-500">Attempts</dt><dd className="text-gray-900">{b.attempts}</dd></div>
                  <div><dt className="text-gray-500">Letzter Versuch</dt><dd className="text-gray-900">{formatDateTime(b.last_attempt_at)}</dd></div>
                  <div><dt className="text-gray-500">Gesendet am</dt><dd className="text-gray-900">{formatDateTime(b.sent_at)}</dd></div>
                  <div><dt className="text-gray-500">Resend-Message-ID</dt><dd className="font-mono text-xs text-gray-700 break-all">{b.resend_message_id ?? '–'}</dd></div>
                  <div className="col-span-2"><dt className="text-gray-500">Betreff</dt><dd className="text-gray-900">{b.subject}</dd></div>
                  <div className="col-span-2"><dt className="text-gray-500">Textfassung</dt><dd className="text-gray-900 whitespace-pre-wrap text-xs bg-gray-50 rounded-lg p-3">{b.body_text}</dd></div>
                  {b.error_message && (
                    <div className="col-span-2"><dt className="text-gray-500">Fehlermeldung</dt><dd className="text-red-700">{b.error_message}</dd></div>
                  )}
                </dl>
                {b.send_status === 'ungeklaert' && !withinWindow && (
                  <p className="mt-3 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-2">
                    Ungeklärter Versandzustand außerhalb des 24-Stunden-Schutzzeitraums — eine Doppelzustellung kann nicht sicher ausgeschlossen werden. Kein automatischer Retry möglich.
                  </p>
                )}
                {canRetry && withinWindow && (
                  <form action={retryBandSendAction} className="mt-4">
                    <input type="hidden" name="anfrage_id" value={anfrage.id} />
                    <input type="hidden" name="anfrage_band_id" value={b.id} />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
                    >
                      Erneut senden
                    </button>
                  </form>
                )}
              </div>
            )
          })}
        </section>

        {/* Bestätigung */}
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Veranstalter-Bestätigung</h2>
            <StatusBadge status={anfrage.confirmation_status} />
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div><dt className="text-gray-500">Empfänger</dt><dd className="text-gray-900">{anfrage.confirmation_recipient}</dd></div>
            <div><dt className="text-gray-500">Reply-To</dt><dd className="text-gray-900">{anfrage.confirmation_reply_to ?? '– (Standard-Absender)'}</dd></div>
            <div><dt className="text-gray-500">Template-Version</dt><dd className="text-gray-900">{anfrage.confirmation_template_version}</dd></div>
            <div><dt className="text-gray-500">Provider-Idempotency-Key</dt><dd className="font-mono text-xs text-gray-700 break-all">{anfrage.confirmation_provider_idempotency_key}</dd></div>
            <div><dt className="text-gray-500">Attempts</dt><dd className="text-gray-900">{anfrage.confirmation_attempts}</dd></div>
            <div><dt className="text-gray-500">Letzter Versuch</dt><dd className="text-gray-900">{formatDateTime(anfrage.confirmation_last_attempt_at)}</dd></div>
            <div><dt className="text-gray-500">Gesendet am</dt><dd className="text-gray-900">{formatDateTime(anfrage.confirmation_sent_at)}</dd></div>
            <div><dt className="text-gray-500">Resend-Message-ID</dt><dd className="font-mono text-xs text-gray-700 break-all">{anfrage.confirmation_message_id ?? '–'}</dd></div>
            <div className="col-span-2"><dt className="text-gray-500">Betreff</dt><dd className="text-gray-900">{anfrage.confirmation_subject ?? '–'}</dd></div>
            <div className="col-span-2"><dt className="text-gray-500">Textfassung</dt><dd className="text-gray-900 whitespace-pre-wrap text-xs bg-gray-50 rounded-lg p-3">{anfrage.confirmation_body_text ?? '–'}</dd></div>
            {anfrage.confirmation_error && (
              <div className="col-span-2"><dt className="text-gray-500">Fehlermeldung</dt><dd className="text-red-700">{anfrage.confirmation_error}</dd></div>
            )}
          </dl>
          {(() => {
            const canRetryConfirmation =
              anfrage.confirmation_status === 'fehlgeschlagen' || anfrage.confirmation_status === 'ungeklaert'
            const withinWindow =
              anfrage.confirmation_status !== 'ungeklaert' || !anfrage.confirmation_last_attempt_at
                ? true
                : isWithinProviderIdempotencyProtectionWindow(new Date(anfrage.confirmation_last_attempt_at), now)
            if (anfrage.confirmation_status === 'ungeklaert' && !withinWindow) {
              return (
                <p className="mt-3 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-2">
                  Ungeklärter Versandzustand außerhalb des 24-Stunden-Schutzzeitraums — eine Doppelzustellung kann nicht sicher ausgeschlossen werden. Kein automatischer Retry möglich.
                </p>
              )
            }
            if (canRetryConfirmation && withinWindow) {
              return (
                <form action={retryConfirmationAction} className="mt-4">
                  <input type="hidden" name="anfrage_id" value={anfrage.id} />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
                  >
                    Bestätigung erneut senden
                  </button>
                </form>
              )
            }
            return null
          })()}
        </section>
      </div>
    </div>
  )
}
