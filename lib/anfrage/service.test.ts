import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  sendAndPersistBandMail,
  sendAndPersistConfirmation,
  submitAnfrage,
  retryBandSend,
  retryConfirmation,
} from './service.ts'
import type { AnfrageBandSendRow, AnfrageConfirmationRow } from './service.ts'
import type { ResendEmailsClient } from './mailSend.ts'

function bandRow(overrides: Partial<AnfrageBandSendRow> = {}): AnfrageBandSendRow {
  return {
    id: 'band-row-1',
    anfrage_id: 'anfrage-1',
    recipient_email: 'kontakt@band-a.de',
    reply_to: 'anna@beispiel.de',
    subject: 'Betreff Original',
    body_text: 'Body Original',
    provider_idempotency_key: 'inquiry/anfrage-1/band/band-row-1/v1',
    send_status: 'ausstehend',
    attempts: 0,
    last_attempt_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function confirmationRow(overrides: Partial<AnfrageConfirmationRow> = {}): AnfrageConfirmationRow {
  return {
    id: 'anfrage-1',
    confirmation_recipient: 'anna@beispiel.de',
    confirmation_reply_to: null,
    confirmation_subject: 'Bestaetigung Original',
    confirmation_body_text: 'Bestaetigung Body Original',
    confirmation_provider_idempotency_key: 'inquiry/anfrage-1/confirmation/v1',
    confirmation_attempts: 0,
    confirmation_status: 'ausstehend',
    confirmation_last_attempt_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

// Minimaler Test-Double, der Update-Aufrufe (Tabelle + Patch-Keys, in
// Reihenfolge) sowie Resend-Sendeaufrufe in einem gemeinsamen Ereignis-Array
// protokolliert -- beweist damit direkt die Reihenfolge
// "Markierung -> Resend-Aufruf -> Abschluss-Update".
function buildRecordingClient() {
  const events: string[] = []
  const updatePatches: Record<string, unknown>[] = []
  const client = {
    from: (table: string) => ({
      update: (patch: Record<string, unknown>) => ({
        eq: async () => {
          events.push(`update:${table}:${Object.keys(patch).sort().join(',')}`)
          updatePatches.push(patch)
          return { error: null }
        },
      }),
    }),
  } as unknown as SupabaseClient
  return { client, events, updatePatches }
}

function buildRecordingResend(outcome: { data: unknown; error: unknown } | (() => never)) {
  const sendCalls: { payload: Record<string, unknown>; options: Record<string, unknown> }[] = []
  const send = async (payload: Record<string, unknown>, options: Record<string, unknown>) => {
    sendCalls.push({ payload, options })
    if (typeof outcome === 'function') return outcome()
    return outcome
  }
  const resendClient = { emails: { send } } as unknown as ResendEmailsClient
  return { resendClient, sendCalls }
}

// ── Befund 1: sendAndPersistBandMail ────────────────────────────────────

test('sendAndPersistBandMail: markiert attempts/last_attempt_at VOR dem Resend-Aufruf, danach Abschluss-Update ohne erneutes attempts', async () => {
  const { client, events } = buildRecordingClient()
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'msg_1' }, error: null })

  await sendAndPersistBandMail(client, bandRow({ attempts: 2 }), () => resendClient)

  assert.equal(events[0], 'update:anfrage_bands:attempts,last_attempt_at')
  assert.equal(events[1], 'update:anfrage_bands:error_message,resend_message_id,send_status,sent_at')
  assert.equal(events.length, 2)
  assert.equal(sendCalls.length, 1)
})

test('sendAndPersistBandMail: erhoeht attempts um genau 1 gegenueber dem uebergebenen Stand', async () => {
  const { client, updatePatches } = buildRecordingClient()
  const { resendClient } = buildRecordingResend({ data: { id: 'msg_1' }, error: null })

  await sendAndPersistBandMail(client, bandRow({ attempts: 2 }), () => resendClient)

  assert.equal(updatePatches[0].attempts, 3)
  assert.ok(typeof updatePatches[0].last_attempt_at === 'string')
})

test('sendAndPersistBandMail: schlaegt die Vorab-Markierung fehl, wird Resend NICHT aufgerufen', async () => {
  const client = {
    from: () => ({
      update: () => ({
        eq: async () => ({ error: { message: 'db unreachable' } }),
      }),
    }),
  } as unknown as SupabaseClient
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'msg_1' }, error: null })

  await sendAndPersistBandMail(client, bandRow(), () => resendClient)

  assert.equal(sendCalls.length, 0)
})

test('sendAndPersistBandMail: verwendet Empfaenger/Reply-To/Betreff/Body/Provider-Key exakt aus dem Snapshot', async () => {
  const { client } = buildRecordingClient()
  const row = bandRow({
    recipient_email: 'kontakt@band-x.de',
    reply_to: 'organisator@beispiel.de',
    subject: 'Ein ganz bestimmter Betreff',
    body_text: 'Ein ganz bestimmter Body',
    provider_idempotency_key: 'inquiry/anfrage-9/band/band-9/v1',
  })
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'msg_1' }, error: null })

  await sendAndPersistBandMail(client, row, () => resendClient)

  assert.equal(sendCalls[0].payload.to, 'kontakt@band-x.de')
  assert.equal(sendCalls[0].payload.replyTo, 'organisator@beispiel.de')
  assert.equal(sendCalls[0].payload.subject, 'Ein ganz bestimmter Betreff')
  assert.equal(sendCalls[0].payload.text, 'Ein ganz bestimmter Body')
  assert.equal(sendCalls[0].options.idempotencyKey, 'inquiry/anfrage-9/band/band-9/v1')
})

test('sendAndPersistBandMail: Erfolg setzt send_status=gesendet und sent_at, Fehler setzt fehlgeschlagen ohne sent_at', async () => {
  const { client: successClient, updatePatches: successPatches } = buildRecordingClient()
  const { resendClient: successResend } = buildRecordingResend({ data: { id: 'msg_1' }, error: null })
  await sendAndPersistBandMail(successClient, bandRow(), () => successResend)
  assert.equal(successPatches[1].send_status, 'gesendet')
  assert.equal(successPatches[1].resend_message_id, 'msg_1')
  assert.ok(successPatches[1].sent_at)

  const { client: failClient, updatePatches: failPatches } = buildRecordingClient()
  const { resendClient: failResend } = buildRecordingResend({ data: null, error: { message: 'invalid_from_address' } })
  await sendAndPersistBandMail(failClient, bandRow(), () => failResend)
  assert.equal(failPatches[1].send_status, 'fehlgeschlagen')
  assert.equal(failPatches[1].sent_at, null)
})

// ── Befund 2: sendAndPersistConfirmation (analog) ───────────────────────

test('sendAndPersistConfirmation: markiert confirmation_attempts/confirmation_last_attempt_at VOR dem Resend-Aufruf', async () => {
  const { client, events } = buildRecordingClient()
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'msg_2' }, error: null })

  await sendAndPersistConfirmation(client, confirmationRow({ confirmation_attempts: 1 }), () => resendClient)

  assert.equal(events[0], 'update:anfragen:confirmation_attempts,confirmation_last_attempt_at')
  assert.equal(events[1], 'update:anfragen:confirmation_error,confirmation_message_id,confirmation_sent_at,confirmation_status')
  assert.equal(sendCalls.length, 1)
})

test('sendAndPersistConfirmation: schlaegt die Vorab-Markierung fehl, wird Resend NICHT aufgerufen', async () => {
  const client = {
    from: () => ({ update: () => ({ eq: async () => ({ error: { message: 'db unreachable' } }) }) }),
  } as unknown as SupabaseClient
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'msg_2' }, error: null })

  await sendAndPersistConfirmation(client, confirmationRow(), () => resendClient)

  assert.equal(sendCalls.length, 0)
})

test('sendAndPersistConfirmation: verwendet Empfaenger/Betreff/Body/Provider-Key exakt aus dem Snapshot', async () => {
  const { client } = buildRecordingClient()
  const row = confirmationRow({
    confirmation_recipient: 'veranstalter@beispiel.de',
    confirmation_subject: 'Deine Anfrage ist eingegangen',
    confirmation_body_text: 'Konkreter Bestaetigungstext',
    confirmation_provider_idempotency_key: 'inquiry/anfrage-9/confirmation/v1',
  })
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'msg_2' }, error: null })

  await sendAndPersistConfirmation(client, row, () => resendClient)

  assert.equal(sendCalls[0].payload.to, 'veranstalter@beispiel.de')
  assert.equal(sendCalls[0].payload.subject, 'Deine Anfrage ist eingegangen')
  assert.equal(sendCalls[0].payload.text, 'Konkreter Bestaetigungstext')
  assert.equal(sendCalls[0].options.idempotencyKey, 'inquiry/anfrage-9/confirmation/v1')
})

// ── Retry-Berechtigung end-to-end (retryBandSend / retryConfirmation) ───

function buildRowFetchClient(row: Record<string, unknown> | null, updateEvents: string[]) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: row, error: null }),
        }),
      }),
      update: (patch: Record<string, unknown>) => ({
        eq: async () => {
          updateEvents.push(Object.keys(patch).sort().join(','))
          return { error: null }
        },
      }),
    }),
  } as unknown as SupabaseClient
}

test('retryBandSend: bereits gesendet bleibt unantastbar (kein Resend-Aufruf)', async () => {
  const events: string[] = []
  const client = buildRowFetchClient({ ...bandRow({ send_status: 'gesendet' }) }, events)
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'x' }, error: null })

  const result = await retryBandSend('band-row-1', { client, getResendClient: () => resendClient })

  assert.deepEqual(result, { ok: false, reason: 'already_sent' })
  assert.equal(sendCalls.length, 0)
})

test('retryBandSend: frisches ausstehend (< 5 Minuten) wird abgelehnt, kein Resend-Aufruf', async () => {
  const events: string[] = []
  // retryBandSend ermittelt "jetzt" intern ueber `new Date()` (nicht
  // injizierbar) -- last_attempt_at daher relativ zur tatsaechlichen
  // Echtzeit setzen, nicht relativ zu einer fixen Testkonstante.
  const row = bandRow({
    send_status: 'ausstehend',
    last_attempt_at: new Date(Date.now() - 60_000).toISOString(),
  })
  const client = buildRowFetchClient(row, events)
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'x' }, error: null })

  const result = await retryBandSend('band-row-1', { client, getResendClient: () => resendClient })

  assert.deepEqual(result, { ok: false, reason: 'not_stale_yet' })
  assert.equal(sendCalls.length, 0)
})

test('retryBandSend: veraltetes ausstehend (>= 5 Minuten) ist retrybar und sendet mit unveraendertem Provider-Key', async () => {
  const events: string[] = []
  const row = bandRow({
    send_status: 'ausstehend',
    attempts: 0,
    last_attempt_at: new Date(Date.now() - 10 * 60_000).toISOString(),
    provider_idempotency_key: 'inquiry/anfrage-1/band/band-row-1/v1',
  })
  const client = buildRowFetchClient(row, events)
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'msg_retry' }, error: null })

  const result = await retryBandSend('band-row-1', { client, getResendClient: () => resendClient })

  assert.deepEqual(result, { ok: true })
  assert.equal(sendCalls.length, 1)
  assert.equal(sendCalls[0].options.idempotencyKey, 'inquiry/anfrage-1/band/band-row-1/v1')
})

test('retryBandSend: nicht gefundene Zeile liefert not_found', async () => {
  const events: string[] = []
  const client = buildRowFetchClient(null, events)
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'x' }, error: null })

  const result = await retryBandSend('unbekannt', { client, getResendClient: () => resendClient })

  assert.deepEqual(result, { ok: false, reason: 'not_found' })
  assert.equal(sendCalls.length, 0)
})

test('retryConfirmation: bereits gesendet bleibt unantastbar', async () => {
  const events: string[] = []
  const client = buildRowFetchClient(confirmationRow({ confirmation_status: 'gesendet' }), events)
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'x' }, error: null })

  const result = await retryConfirmation('anfrage-1', { client, getResendClient: () => resendClient })

  assert.deepEqual(result, { ok: false, reason: 'already_sent' })
  assert.equal(sendCalls.length, 0)
})

test('retryConfirmation: veraltetes ausstehend ist retrybar und sendet mit unveraendertem Snapshot', async () => {
  const events: string[] = []
  const row = confirmationRow({
    confirmation_status: 'ausstehend',
    confirmation_last_attempt_at: new Date(Date.now() - 10 * 60_000).toISOString(),
    confirmation_recipient: 'veranstalter@beispiel.de',
  })
  const client = buildRowFetchClient(row, events)
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'msg_x' }, error: null })

  const result = await retryConfirmation('anfrage-1', { client, getResendClient: () => resendClient })

  assert.deepEqual(result, { ok: true })
  assert.equal(sendCalls[0].payload.to, 'veranstalter@beispiel.de')
})

// ── DoD 6: Doppel-Submit mit bekanntem Idempotency-Key loest KEINEN
//    Wiederanlauf und KEINEN neuen Versand aus ─────────────────────────

function buildDuplicateSubmitClient(): { client: SupabaseClient; fromCalls: string[]; rpcCalls: string[] } {
  const fromCalls: string[] = []
  const rpcCalls: string[] = []
  const client = {
    from: (table: string) => {
      fromCalls.push(table)
      if (table === 'bands') {
        return {
          select: () => ({
            in: async () => ({
              data: [
                {
                  id: 'band-1',
                  name: 'Band Eins',
                  slug: 'band-eins',
                  status: 'active',
                  band_contacts: [{ email: 'kontakt@band-eins.de', is_primary_inquiry: true }],
                },
              ],
              error: null,
            }),
          }),
        }
      }
      throw new Error(`Unerwarteter from()-Aufruf fuer Tabelle "${table}" -- sendAllBandMailsAndConfirmation haette bei was_created=false nie aufgerufen werden duerfen`)
    },
    rpc: (name: string) => {
      rpcCalls.push(name)
      if (name === 'check_and_consume_anfrage_rate_limit') {
        return { single: async () => ({ data: { allowed: true, retry_after_seconds: 0 }, error: null }) }
      }
      if (name === 'create_anfrage_with_bands') {
        return { single: async () => ({ data: { anfrage_id: 'existing-anfrage-id', was_created: false }, error: null }) }
      }
      throw new Error(`Unerwarteter rpc()-Aufruf: ${name}`)
    },
  } as unknown as SupabaseClient
  return { client, fromCalls, rpcCalls }
}

test('submitAnfrage: Doppel-Submit (was_created=false) sendet keine Mails und ruft anfrage_bands nie ab', async () => {
  const { client, fromCalls } = buildDuplicateSubmitClient()
  let resendCalled = false
  const getResendClient = () =>
    ({ emails: { send: async () => { resendCalled = true; return { data: { id: 'x' }, error: null } } } }) as unknown as ResendEmailsClient

  const result = await submitAnfrage(
    {
      idempotencyKey: 'web-duplicate-key-123',
      bandSlugs: ['band-eins'],
      anlass: 'Hochzeit',
      datumText: '20.06.2027',
      location: '',
      plzOrt: '',
      gaestezahl: '',
      spielzeit: '',
      nachricht: '',
      vorname: 'Anna',
      nachname: '',
      email: 'anna@beispiel.de',
      telefon: '',
      datenschutz: true,
      firmaHidden: '',
      websiteHidden: '',
      openedAt: Date.now() - 5000,
    },
    { ipHash: 'a'.repeat(64) },
    { client, getResendClient }
  )

  assert.deepEqual(result, { kind: 'accepted' })
  assert.equal(resendCalled, false)
  assert.equal(fromCalls.includes('anfrage_bands'), false)
})

test('submitAnfrage: fail-closed Rate-Limit liefert temporarily_unavailable ohne Bandaufloesung/Persistenz', async () => {
  let bandsQueried = false
  const client = {
    from: (table: string) => {
      if (table === 'bands') bandsQueried = true
      return { select: () => ({ in: async () => ({ data: [], error: null }) }) }
    },
    rpc: () => ({ single: async () => ({ data: null, error: { code: 'PGRST202', message: 'missing function' } }) }),
  } as unknown as SupabaseClient
  const getResendClient = () => ({ emails: { send: async () => ({ data: { id: 'x' }, error: null }) } }) as unknown as ResendEmailsClient

  const result = await submitAnfrage(
    {
      idempotencyKey: 'web-rate-limit-fail-closed',
      bandSlugs: ['band-eins'],
      anlass: '',
      datumText: '20.06.2027',
      location: '',
      plzOrt: '',
      gaestezahl: '',
      spielzeit: '',
      nachricht: '',
      vorname: 'Anna',
      nachname: '',
      email: 'anna@beispiel.de',
      telefon: '',
      datenschutz: true,
      firmaHidden: '',
      websiteHidden: '',
      openedAt: Date.now() - 5000,
    },
    { ipHash: 'a'.repeat(64) },
    { client, getResendClient }
  )

  assert.deepEqual(result, { kind: 'temporarily_unavailable' })
  assert.equal(bandsQueried, false)
})
