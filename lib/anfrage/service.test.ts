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
import { BAND_TEMPLATE_VERSION, CONFIRMATION_TEMPLATE_VERSION } from './constants.ts'

// Default template_version = 'v1' -- bestehende Tests unten pruefen damit
// weiterhin bewusst den eingefrorenen v1-Pfad (renderHtmlFromTextSnapshot),
// unveraendert gegenueber vor Block "Bandanfrage-Mail V3". anfragen ist ein
// realistischer Default fuer den v2-Dispatch, wird von v1-Tests aber nicht
// gelesen.
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
    template_version: 'v1',
    band_name_snapshot: 'Band A',
    anfragen: {
      anlass: 'Hochzeit',
      datum_text: '20.06.2027',
      plz_ort: '80331 München',
      location: 'Festscheune Müller',
      telefon: '0151 1234567',
      vorname: 'Anna',
      nachname: 'Müller',
      nachricht: 'Freuen uns sehr auf euch!',
    },
    // Block "Bandmail V3.1": eingebettet ueber den bereits bestehenden
    // anfrage_bands.band_id-FK, wird von v1-Tests nicht gelesen.
    bands: { slug: 'band-a' },
    ...overrides,
  }
}

// Default confirmation_template_version = 'v1' -- bestehende Tests unten
// pruefen damit weiterhin bewusst den eingefrorenen v1-Pfad
// (renderHtmlFromTextSnapshot), unveraendert gegenueber vor Block
// "Confirmation V2". vorname/anlass/... und anfrage_bands sind realistische
// Defaults fuer den v2-Dispatch, werden von v1-Tests aber nicht gelesen.
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
    confirmation_template_version: 'v1',
    vorname: 'Anna',
    anlass: 'Hochzeit',
    datum_text: '20.06.2027',
    location: 'Festscheune Müller',
    plz_ort: '80331 München',
    nachricht: 'Freuen uns sehr auf euch!',
    anfrage_bands: [{ band_name_snapshot: 'Band A', bands: { slug: 'band-a' } }],
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

// bandStatuses steuert das Ergebnis von areAllBandsSent() (Block
// "Confirmation V2"), das intern per .select('send_status').eq('anfrage_id', ...)
// OHNE .maybeSingle() abgefragt wird -- die zurueckgegebene eq()-Fake muss
// deshalb sowohl thenable (Array-Form) als auch mit .maybeSingle()
// (Einzelzeilen-Form, fuer den bestehenden Row-Fetch per id) nutzbar sein,
// genau wie der reale Supabase-Query-Builder. Default [] (= "nicht alle
// gesendet"), damit bestehende retryBandSend-Tests, die den Nachtrigger
// nicht pruefen, unveraendert bleiben; retryConfirmation-Erfolgstests
// setzen bandStatuses explizit auf ['gesendet'].
function buildRowFetchClient(
  row: Record<string, unknown> | null,
  updateEvents: string[],
  bandStatuses: string[] = []
) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: row, error: null }),
          then: (resolve: (v: { data: unknown; error: null }) => void) =>
            resolve({ data: bandStatuses.map((s) => ({ send_status: s })), error: null }),
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

test('retryConfirmation: veraltetes ausstehend UND alle Bands bereits gesendet ist retrybar und sendet mit unveraendertem Snapshot', async () => {
  const events: string[] = []
  const row = confirmationRow({
    confirmation_status: 'ausstehend',
    confirmation_last_attempt_at: new Date(Date.now() - 10 * 60_000).toISOString(),
    confirmation_recipient: 'veranstalter@beispiel.de',
  })
  const client = buildRowFetchClient(row, events, ['gesendet'])
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'msg_x' }, error: null })

  const result = await retryConfirmation('anfrage-1', { client, getResendClient: () => resendClient })

  assert.deepEqual(result, { ok: true })
  assert.equal(sendCalls[0].payload.to, 'veranstalter@beispiel.de')
})

test('retryConfirmation: v2 mit Bands noch nicht vollstaendig gesendet -> keine Erfolgsmail, bands_not_complete', async () => {
  const events: string[] = []
  const row = confirmationRow({
    confirmation_template_version: CONFIRMATION_TEMPLATE_VERSION,
    confirmation_status: 'ausstehend',
    confirmation_last_attempt_at: new Date(Date.now() - 10 * 60_000).toISOString(),
  })
  const client = buildRowFetchClient(row, events, ['gesendet', 'fehlgeschlagen'])
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'msg_x' }, error: null })

  const result = await retryConfirmation('anfrage-1', { client, getResendClient: () => resendClient })

  assert.deepEqual(result, { ok: false, reason: 'bands_not_complete' })
  assert.equal(sendCalls.length, 0)
})

// Codex P1 "Preserve retries for v1 confirmations": das All-Bands-Sent-Gate
// darf ausschliesslich fuer Confirmation v2 gelten. Historische v1-Zeilen
// muessen unabhaengig vom Bandstatus retrybar bleiben, weil v1 die
// Erfolgsaussage "ist raus" gar nicht verwendet.
test('retryConfirmation: v1 bleibt retrybar, auch wenn Bands NICHT vollstaendig gesendet sind (kein bands_not_complete)', async () => {
  const events: string[] = []
  const row = confirmationRow({
    confirmation_template_version: 'v1',
    confirmation_status: 'ausstehend',
    confirmation_last_attempt_at: new Date(Date.now() - 10 * 60_000).toISOString(),
    confirmation_recipient: 'veranstalter@beispiel.de',
  })
  const client = buildRowFetchClient(row, events, ['gesendet', 'fehlgeschlagen'])
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'msg_v1_retry' }, error: null })

  const result = await retryConfirmation('anfrage-1', { client, getResendClient: () => resendClient })

  assert.deepEqual(result, { ok: true })
  assert.equal(sendCalls.length, 1)
  assert.equal(sendCalls[0].payload.to, 'veranstalter@beispiel.de')
  // Bestehender v1-Snapshot-/HTML-Pfad bleibt erhalten (renderHtmlFromTextSnapshot),
  // NICHT der v2-HTML-Renderer.
  const html = sendCalls[0].payload.html as string
  assert.match(html, /Bestaetigung Body Original/)
  assert.doesNotMatch(html, /Band ansehen/)
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

// ── Block "Bandanfrage-Mail V3": v1/v2/unbekannt-Dispatch beim Versand ──

test('sendAndPersistBandMail: template_version=v1 sendet weiterhin ueber renderHtmlFromTextSnapshot (Text-Snapshot, escaped + <br />)', async () => {
  const { client } = buildRecordingClient()
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'msg_v1' }, error: null })

  const row = bandRow({
    template_version: 'v1',
    subject: 'Betreff mit & Sonderzeichen',
    body_text: 'Zeile1\nZeile2',
  })
  await sendAndPersistBandMail(client, row, () => resendClient)

  const html = sendCalls[0].payload.html as string
  assert.match(html, /Zeile1<br \/>Zeile2/)
  assert.match(html, /&amp;/)
  // v1-HTML enthaelt keine V3-Struktur (z. B. kein Logo-Bild/H1-Eyebrow).
  assert.doesNotMatch(html, /Neue Anfrage/)
})

test('sendAndPersistBandMail: template_version=BAND_TEMPLATE_VERSION rendert V3-HTML aus den eingebetteten Anfragewerten', async () => {
  const { client } = buildRecordingClient()
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'msg_v2' }, error: null })

  const row = bandRow({
    template_version: BAND_TEMPLATE_VERSION,
    band_name_snapshot: 'Donnaweda',
    anfragen: {
      anlass: 'Feuerwehrball',
      datum_text: '30.01.2027',
      plz_ort: '92331 Parsberg',
      location: 'Burgsaal',
      telefon: null,
      vorname: 'Roland',
      nachname: 'Lutter',
      nachricht: null,
    },
  })
  await sendAndPersistBandMail(client, row, () => resendClient)

  const html = sendCalls[0].payload.html as string
  assert.match(html, /Servus <strong>Donnaweda<\/strong>,/)
  assert.match(html, /Feuerwehrball/)
  assert.match(html, /30\.01\.2027/)
  assert.equal(sendCalls.length, 1)
})

test('sendAndPersistBandMail: unbekannte template_version sendet NICHT, faellt fail closed auf fehlgeschlagen zurueck', async () => {
  const { client, updatePatches } = buildRecordingClient()
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'x' }, error: null })

  const row = bandRow({ template_version: 'v99', attempts: 0 })
  await sendAndPersistBandMail(client, row, () => resendClient)

  assert.equal(sendCalls.length, 0)
  assert.equal(updatePatches[0].attempts, 1)
  assert.equal(updatePatches[1].send_status, 'fehlgeschlagen')
  assert.equal(updatePatches[1].sent_at, null)
  assert.match(updatePatches[1].error_message as string, /Unbekannte Template-Version/)
})

test('sendAndPersistBandMail: unbekannte template_version ohne eingebettete Anfragewerte scheitert ebenfalls fail closed (Verteidigung gegen fehlenden Join)', async () => {
  const { client } = buildRecordingClient()
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'x' }, error: null })

  const row = bandRow({ template_version: BAND_TEMPLATE_VERSION, anfragen: null })
  await sendAndPersistBandMail(client, row, () => resendClient)

  assert.equal(sendCalls.length, 0)
})

// ── Block "Bandmail V3.1": Bandseiten-Link ueber den bands(slug)-Embed ──

test('sendAndPersistBandMail: v2-HTML enthaelt den Bandseiten-Link der jeweils angefragten Band aus dem bands(slug)-Embed', async () => {
  const { client } = buildRecordingClient()
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'msg_v2_link' }, error: null })

  const row = bandRow({
    template_version: BAND_TEMPLATE_VERSION,
    band_name_snapshot: "Ö'ha",
    bands: { slug: 'oeha-band' },
  })
  await sendAndPersistBandMail(client, row, () => resendClient)

  const html = sendCalls[0].payload.html as string
  assert.match(html, /<a href="https:\/\/proudleut\.com\/band\/oeha-band"/)
})

test('sendAndPersistBandMail: bands-Embed als Array (PostgREST-Formvariante) wird identisch aufgeloest wie ein Objekt', async () => {
  const { client } = buildRecordingClient()
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'msg_v2_arr' }, error: null })

  const row = bandRow({ template_version: BAND_TEMPLATE_VERSION, bands: [{ slug: 'band-a' }] })
  await sendAndPersistBandMail(client, row, () => resendClient)

  const html = sendCalls[0].payload.html as string
  assert.match(html, /<a href="https:\/\/proudleut\.com\/band\/band-a"/)
})

test('retryBandSend: v2-Retry rendert denselben Bandseiten-Link ueber dieselbe bands(slug)-Relation, ohne Schemaaenderung', async () => {
  const events: string[] = []
  const row = bandRow({
    send_status: 'fehlgeschlagen',
    template_version: BAND_TEMPLATE_VERSION,
    band_name_snapshot: "Ö'ha",
    bands: { slug: 'oeha-band' },
    last_attempt_at: new Date(Date.now() - 10 * 60_000).toISOString(),
  })
  const client = buildRowFetchClient(row, events)
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'msg_retry_link' }, error: null })

  const result = await retryBandSend('band-row-1', { client, getResendClient: () => resendClient })

  assert.deepEqual(result, { ok: true })
  const html = sendCalls[0].payload.html as string
  assert.match(html, /<a href="https:\/\/proudleut\.com\/band\/oeha-band"/)
})

// ── Block "Confirmation V2": v1/v2/unbekannt-Dispatch beim Versand ──────

test('sendAndPersistConfirmation: confirmation_template_version=v1 sendet weiterhin ueber renderHtmlFromTextSnapshot (Text-Snapshot, escaped + <br />)', async () => {
  const { client } = buildRecordingClient()
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'msg_cv1' }, error: null })

  const row = confirmationRow({
    confirmation_template_version: 'v1',
    confirmation_subject: 'Betreff mit & Sonderzeichen',
    confirmation_body_text: 'Zeile1\nZeile2',
  })
  await sendAndPersistConfirmation(client, row, () => resendClient)

  const html = sendCalls[0].payload.html as string
  assert.match(html, /Zeile1<br \/>Zeile2/)
  assert.match(html, /&amp;/)
  // v1-HTML enthaelt keine V2-Struktur (z. B. keinen "Band ansehen"-CTA).
  assert.doesNotMatch(html, /Band ansehen/)
})

test('sendAndPersistConfirmation: confirmation_template_version=CONFIRMATION_TEMPLATE_VERSION rendert V2-HTML aus den eingebetteten Bandzeilen', async () => {
  const { client } = buildRecordingClient()
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'msg_cv2' }, error: null })

  const row = confirmationRow({
    confirmation_template_version: CONFIRMATION_TEMPLATE_VERSION,
    vorname: 'Pia',
    anfrage_bands: [
      { band_name_snapshot: 'Donnaweda', bands: { slug: 'donnaweda' } },
      { band_name_snapshot: "Ö'ha", bands: { slug: 'oeha-band' } },
    ],
  })
  await sendAndPersistConfirmation(client, row, () => resendClient)

  const html = sendCalls[0].payload.html as string
  assert.match(html, /Servus <strong>Pia<\/strong>,/)
  assert.match(html, /href="https:\/\/proudleut\.com\/band\/donnaweda"/)
  assert.match(html, /href="https:\/\/proudleut\.com\/band\/oeha-band"/)
  assert.equal((html.match(/Band ansehen/g) ?? []).length, 2)
  assert.equal(sendCalls.length, 1)
})

test('sendAndPersistConfirmation: unbekannte confirmation_template_version sendet NICHT, faellt fail closed auf fehlgeschlagen zurueck', async () => {
  const { client, updatePatches } = buildRecordingClient()
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'x' }, error: null })

  const row = confirmationRow({ confirmation_template_version: 'v99' })
  await sendAndPersistConfirmation(client, row, () => resendClient)

  assert.equal(sendCalls.length, 0)
  assert.equal(updatePatches[1].confirmation_status, 'fehlgeschlagen')
  assert.equal(updatePatches[1].confirmation_sent_at, null)
  assert.match(updatePatches[1].confirmation_error as string, /Unbekannte Confirmation-Template-Version/)
})

test('sendAndPersistConfirmation: v2 ohne eingebettete Bandzeilen scheitert ebenfalls fail closed (Verteidigung gegen fehlenden Join)', async () => {
  const { client } = buildRecordingClient()
  const { resendClient, sendCalls } = buildRecordingResend({ data: { id: 'x' }, error: null })

  const row = confirmationRow({ confirmation_template_version: CONFIRMATION_TEMPLATE_VERSION, anfrage_bands: [] })
  await sendAndPersistConfirmation(client, row, () => resendClient)

  assert.equal(sendCalls.length, 0)
})

// ── Block "Confirmation V2": Status-Persistenzfehler (bestaetigter A-Punkt) ─

test('sendAndPersistBandMail: Fehler beim finalen send_status-Update wird erkannt und geloggt, ohne den Sendeausgang zu verschweigen', async () => {
  const events: string[] = []
  let call = 0
  const client = {
    from: (table: string) => ({
      update: (patch: Record<string, unknown>) => ({
        eq: async () => {
          call += 1
          events.push(`update:${table}:${Object.keys(patch).sort().join(',')}`)
          if (call === 2) return { error: { message: 'db unreachable on final update' } }
          return { error: null }
        },
      }),
    }),
  } as unknown as SupabaseClient
  const { resendClient } = buildRecordingResend({ data: { id: 'msg_1' }, error: null })

  const originalConsoleError = console.error
  const loggedCalls: unknown[][] = []
  console.error = (...args: unknown[]) => loggedCalls.push(args)
  try {
    await sendAndPersistBandMail(client, bandRow(), () => resendClient)
  } finally {
    console.error = originalConsoleError
  }

  assert.equal(events.length, 2)
  assert.ok(
    loggedCalls.some((args) => typeof args[0] === 'string' && args[0].includes('Abschluss-Update nach Band-Mail-Versand fehlgeschlagen'))
  )
})

test('sendAndPersistConfirmation: Fehler beim finalen confirmation_status-Update wird erkannt und geloggt', async () => {
  let call = 0
  const client = {
    from: (table: string) => ({
      update: (patch: Record<string, unknown>) => ({
        eq: async () => {
          call += 1
          if (call === 2) return { error: { message: 'db unreachable on final update' } }
          return { error: null }
        },
      }),
    }),
  } as unknown as SupabaseClient
  const { resendClient } = buildRecordingResend({ data: { id: 'msg_1' }, error: null })

  const originalConsoleError = console.error
  const loggedCalls: unknown[][] = []
  console.error = (...args: unknown[]) => loggedCalls.push(args)
  try {
    await sendAndPersistConfirmation(client, confirmationRow(), () => resendClient)
  } finally {
    console.error = originalConsoleError
  }

  assert.ok(
    loggedCalls.some(
      (args) => typeof args[0] === 'string' && args[0].includes('Abschluss-Update nach Bestaetigungs-Versand fehlgeschlagen')
    )
  )
})

// ── Block "Confirmation V2": Versandlogik Erstversand (Owner-Entscheidung
//    Variante A) -- FULL SUCCESS / PARTIAL / TOTAL FAILURE / UNGEKLAERT ──

// Stateful Fake-Client, der den relevanten Ausschnitt des realen
// Supabase-Verhaltens nachbildet: create_anfrage_with_bands persistiert
// Band-/Anfragen-Zeilen in einem In-Memory-Store, nachfolgende
// SELECT/UPDATE-Aufrufe lesen/schreiben genau diesen Store -- damit
// verhaelt sich areAllBandsSent() (liest den tatsaechlich persistierten
// Zustand) in diesem Test exakt wie gegen eine echte DB.
function buildEndToEndClient(bandDefs: { slug: string; name: string; email: string }[]) {
  const bandsTable = bandDefs.map((b, i) => ({
    id: `band-${i}`,
    name: b.name,
    slug: b.slug,
    status: 'active',
    band_contacts: [{ email: b.email, is_primary_inquiry: true }],
  }))

  let anfrageBandsRows: Record<string, unknown>[] | null = null
  let anfragenRow: Record<string, unknown> | null = null

  function eqResult(data: unknown) {
    return {
      maybeSingle: async () => ({ data: (Array.isArray(data) ? data[0] : data) ?? null, error: null }),
      then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data, error: null }),
    }
  }

  const client = {
    from: (table: string) => {
      if (table === 'bands') {
        return { select: () => ({ in: async () => ({ data: bandsTable, error: null }) }) }
      }
      if (table === 'anfrage_bands') {
        return {
          select: (cols: string) => ({
            eq: (col: string, val: string) => {
              const rows = (anfrageBandsRows ?? []).filter((r) => (r as Record<string, unknown>)[col] === val)
              if (cols === 'send_status') {
                return eqResult(rows.map((r) => ({ send_status: r.send_status })))
              }
              return eqResult(rows)
            },
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: async (_col: string, val: string) => {
              const row = (anfrageBandsRows ?? []).find((r) => r.id === val)
              if (row) Object.assign(row, patch)
              return { error: null }
            },
          }),
        }
      }
      if (table === 'anfragen') {
        return {
          select: () => ({
            eq: () =>
              eqResult(
                anfragenRow
                  ? {
                      ...anfragenRow,
                      anfrage_bands: (anfrageBandsRows ?? []).map((r) => ({
                        band_name_snapshot: r.band_name_snapshot,
                        bands: { slug: r._slug },
                      })),
                    }
                  : null
              ),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: async () => {
              if (anfragenRow) Object.assign(anfragenRow, patch)
              return { error: null }
            },
          }),
        }
      }
      throw new Error(`Unerwarteter from()-Aufruf fuer Tabelle "${table}"`)
    },
    rpc: (name: string, args: unknown) => {
      if (name === 'check_and_consume_anfrage_rate_limit') {
        return { single: async () => ({ data: { allowed: true, retry_after_seconds: 0 }, error: null }) }
      }
      if (name === 'create_anfrage_with_bands') {
        const a = args as { p_anfrage: Record<string, unknown>; p_bands: Record<string, unknown>[] }
        anfrageBandsRows = a.p_bands.map((b, i) => ({
          id: b.id,
          anfrage_id: a.p_anfrage.id,
          recipient_email: b.recipient_email,
          reply_to: b.reply_to,
          subject: b.subject,
          body_text: b.body_text,
          provider_idempotency_key: b.provider_idempotency_key,
          send_status: 'ausstehend',
          attempts: 0,
          last_attempt_at: null,
          created_at: '2026-01-01T00:00:00.000Z',
          template_version: b.template_version,
          band_name_snapshot: b.band_name_snapshot,
          _slug: bandsTable[i]?.slug,
          anfragen: {
            anlass: a.p_anfrage.anlass,
            datum_text: a.p_anfrage.datum_text,
            plz_ort: a.p_anfrage.plz_ort,
            location: a.p_anfrage.location,
            telefon: a.p_anfrage.telefon,
            vorname: a.p_anfrage.vorname,
            nachname: a.p_anfrage.nachname,
            nachricht: a.p_anfrage.nachricht,
          },
          bands: { slug: bandsTable[i]?.slug },
        }))
        anfragenRow = {
          id: a.p_anfrage.id,
          confirmation_recipient: a.p_anfrage.confirmation_recipient,
          confirmation_reply_to: a.p_anfrage.confirmation_reply_to,
          confirmation_subject: a.p_anfrage.confirmation_subject,
          confirmation_body_text: a.p_anfrage.confirmation_body_text,
          confirmation_provider_idempotency_key: a.p_anfrage.confirmation_provider_idempotency_key,
          confirmation_attempts: 0,
          confirmation_status: 'ausstehend',
          confirmation_last_attempt_at: null,
          created_at: '2026-01-01T00:00:00.000Z',
          confirmation_template_version: a.p_anfrage.confirmation_template_version,
          vorname: a.p_anfrage.vorname,
          anlass: a.p_anfrage.anlass,
          datum_text: a.p_anfrage.datum_text,
          location: a.p_anfrage.location,
          plz_ort: a.p_anfrage.plz_ort,
          nachricht: a.p_anfrage.nachricht,
        }
        return { single: async () => ({ data: { anfrage_id: a.p_anfrage.id, was_created: true }, error: null }) }
      }
      throw new Error(`Unerwarteter rpc()-Aufruf: ${name}`)
    },
  } as unknown as SupabaseClient

  return {
    client,
    getAnfrageBandsRows: () => anfrageBandsRows,
    getAnfragenRow: () => anfragenRow,
  }
}

const THREE_BANDS = [
  { slug: 'donnaweda', name: 'Donnaweda', email: 'kontakt@donnaweda.de' },
  { slug: 'oeha-band', name: "Ö'ha", email: 'kontakt@oeha.de' },
  { slug: 'de-gaudimacha', name: 'De Gaudimacha', email: 'kontakt@gaudimacha.de' },
]

function threeBandsSubmission(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: 'web-e2e-' + Math.random().toString(36).slice(2),
    bandSlugs: THREE_BANDS.map((b) => b.slug),
    anlass: 'Dult',
    datumText: 'Sonntag, den 22.07.2026',
    location: 'Hauptbühne am Markt',
    plzOrt: '92356 Kelheim',
    gaestezahl: '',
    spielzeit: '',
    nachricht: '',
    vorname: 'Pia',
    nachname: '',
    email: 'pia@beispiel.de',
    telefon: '',
    datenschutz: true,
    firmaHidden: '',
    websiteHidden: '',
    openedAt: Date.now() - 5000,
    ...overrides,
  }
}

// resendOutcomeByRecipient: Map Empfaenger-E-Mail -> Resend-Ergebnis fuer
// GENAU diesen einen Aufruf (Bandmail ODER Confirmation je nach Empfaenger).
function buildOutcomeBasedResend(outcomeByRecipient: Map<string, { data: unknown; error: unknown } | 'throw'>) {
  const sendCalls: { payload: Record<string, unknown> }[] = []
  const send = async (payload: Record<string, unknown>) => {
    sendCalls.push({ payload })
    const outcome = outcomeByRecipient.get(payload.to as string)
    if (outcome === 'throw') throw new Error('network down')
    if (!outcome) return { data: { id: 'msg-default' }, error: null }
    return outcome
  }
  const resendClient = { emails: { send } } as unknown as ResendEmailsClient
  return { resendClient, sendCalls }
}

test('FULL SUCCESS: alle Bandmails gesendet -> Confirmation wird gesendet', async () => {
  const { client, getAnfragenRow } = buildEndToEndClient(THREE_BANDS)
  const outcomes = new Map<string, { data: unknown; error: unknown }>(
    THREE_BANDS.map((b, i) => [b.email, { data: { id: `msg-band-${i}` }, error: null }])
  )
  const { resendClient, sendCalls } = buildOutcomeBasedResend(outcomes)

  await submitAnfrage(threeBandsSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })

  assert.equal(sendCalls.length, 4) // 3 Bandmails + 1 Confirmation
  assert.equal(getAnfragenRow()?.confirmation_status, 'gesendet')
})

test('PARTIAL FAILURE: eine von drei Bandmails fehlgeschlagen -> Confirmation bleibt ausstehend', async () => {
  const { client, getAnfragenRow } = buildEndToEndClient(THREE_BANDS)
  const outcomes = new Map<string, { data: unknown; error: unknown }>([
    [THREE_BANDS[0].email, { data: { id: 'msg-band-0' }, error: null }],
    [THREE_BANDS[1].email, { data: { id: 'msg-band-1' }, error: null }],
    [THREE_BANDS[2].email, { data: null, error: { message: 'invalid_from_address' } }],
  ])
  const { resendClient, sendCalls } = buildOutcomeBasedResend(outcomes)

  await submitAnfrage(threeBandsSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })

  assert.equal(sendCalls.length, 3) // nur 3 Bandmail-Versuche, KEINE Confirmation
  assert.equal(getAnfragenRow()?.confirmation_status, 'ausstehend')
})

test('TOTAL FAILURE: keine Bandmail erfolgreich -> Confirmation bleibt ausstehend', async () => {
  const { client, getAnfragenRow } = buildEndToEndClient(THREE_BANDS)
  const outcomes = new Map<string, { data: unknown; error: unknown }>(
    THREE_BANDS.map((b) => [b.email, { data: null, error: { message: 'invalid_from_address' } }])
  )
  const { resendClient, sendCalls } = buildOutcomeBasedResend(outcomes)

  await submitAnfrage(threeBandsSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })

  assert.equal(sendCalls.length, 3)
  assert.equal(getAnfragenRow()?.confirmation_status, 'ausstehend')
})

test('UNGEKLAERT: mindestens eine Bandmail ungeklaert -> Confirmation bleibt ausstehend', async () => {
  const { client, getAnfragenRow } = buildEndToEndClient(THREE_BANDS)
  const outcomes = new Map<string, { data: unknown; error: unknown } | 'throw'>([
    [THREE_BANDS[0].email, { data: { id: 'msg-band-0' }, error: null }],
    [THREE_BANDS[1].email, { data: { id: 'msg-band-1' }, error: null }],
    [THREE_BANDS[2].email, 'throw'],
  ])
  const { resendClient, sendCalls } = buildOutcomeBasedResend(outcomes)

  await submitAnfrage(threeBandsSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })

  assert.equal(sendCalls.length, 3)
  assert.equal(getAnfragenRow()?.confirmation_status, 'ausstehend')
})

// ── Block "Confirmation V2": Band-Retry-Nachtrigger ──────────────────────

test('BAND-RETRY: stellt noch keinen vollstaendigen Erfolg her -> weiterhin keine Confirmation', async () => {
  const { client, getAnfrageBandsRows, getAnfragenRow } = buildEndToEndClient(THREE_BANDS)
  const outcomes = new Map<string, { data: unknown; error: unknown }>([
    [THREE_BANDS[0].email, { data: { id: 'msg-band-0' }, error: null }],
    [THREE_BANDS[1].email, { data: null, error: { message: 'invalid_from_address' } }],
    [THREE_BANDS[2].email, { data: null, error: { message: 'invalid_from_address' } }],
  ])
  const { resendClient, sendCalls } = buildOutcomeBasedResend(outcomes)

  await submitAnfrage(threeBandsSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })
  assert.equal(getAnfragenRow()?.confirmation_status, 'ausstehend')

  // Nur EINE der beiden fehlgeschlagenen Bands erneut versuchen (weiterhin
  // nicht ALLE gesendet) -- Confirmation muss ausstehend bleiben.
  const failedRow = (getAnfrageBandsRows() ?? []).find((r) => r.recipient_email === THREE_BANDS[1].email)!
  ;(failedRow as Record<string, unknown>).last_attempt_at = new Date(Date.now() - 10 * 60_000).toISOString()
  outcomes.set(THREE_BANDS[1].email, { data: { id: 'msg-band-1-retry' }, error: null })

  const result = await retryBandSend(failedRow.id as string, { client, getResendClient: () => resendClient })

  assert.deepEqual(result, { ok: true })
  assert.equal(getAnfragenRow()?.confirmation_status, 'ausstehend')
  assert.equal(sendCalls.length, 4) // 3 initial + 1 Retry, weiterhin keine Confirmation
})

test('BAND-RETRY: stellt erstmals vollstaendigen Erfolg her -> Confirmation wird automatisch nachgetriggert', async () => {
  const { client, getAnfrageBandsRows, getAnfragenRow } = buildEndToEndClient(THREE_BANDS)
  const outcomes = new Map<string, { data: unknown; error: unknown }>([
    [THREE_BANDS[0].email, { data: { id: 'msg-band-0' }, error: null }],
    [THREE_BANDS[1].email, { data: { id: 'msg-band-1' }, error: null }],
    [THREE_BANDS[2].email, { data: null, error: { message: 'invalid_from_address' } }],
  ])
  const { resendClient, sendCalls } = buildOutcomeBasedResend(outcomes)

  await submitAnfrage(threeBandsSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })
  assert.equal(getAnfragenRow()?.confirmation_status, 'ausstehend')
  assert.equal(sendCalls.length, 3) // 3 Bandmails, KEINE Confirmation

  const failedRow = (getAnfrageBandsRows() ?? []).find((r) => r.recipient_email === THREE_BANDS[2].email)!
  ;(failedRow as Record<string, unknown>).last_attempt_at = new Date(Date.now() - 10 * 60_000).toISOString()
  outcomes.set(THREE_BANDS[2].email, { data: { id: 'msg-band-2-retry' }, error: null })

  const result = await retryBandSend(failedRow.id as string, { client, getResendClient: () => resendClient })

  assert.deepEqual(result, { ok: true })
  assert.equal(sendCalls.length, 5) // + 1 Retry + 1 nachgetriggerte Confirmation
  assert.equal(getAnfragenRow()?.confirmation_status, 'gesendet')
})

test('BAND-RETRY-Nachtrigger: bestehender deterministischer Confirmation-Idempotency-Key bleibt unveraendert', async () => {
  const { client, getAnfrageBandsRows, getAnfragenRow } = buildEndToEndClient(THREE_BANDS)
  const outcomes = new Map<string, { data: unknown; error: unknown }>([
    [THREE_BANDS[0].email, { data: { id: 'msg-band-0' }, error: null }],
    [THREE_BANDS[1].email, { data: { id: 'msg-band-1' }, error: null }],
    [THREE_BANDS[2].email, { data: null, error: { message: 'invalid_from_address' } }],
  ])
  const { resendClient, sendCalls } = buildOutcomeBasedResend(outcomes)

  await submitAnfrage(threeBandsSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })
  const keyBeforeRetry = getAnfragenRow()?.confirmation_provider_idempotency_key

  const failedRow = (getAnfrageBandsRows() ?? []).find((r) => r.recipient_email === THREE_BANDS[2].email)!
  ;(failedRow as Record<string, unknown>).last_attempt_at = new Date(Date.now() - 10 * 60_000).toISOString()
  outcomes.set(THREE_BANDS[2].email, { data: { id: 'msg-band-2-retry' }, error: null })
  await retryBandSend(failedRow.id as string, { client, getResendClient: () => resendClient })

  assert.equal(getAnfragenRow()?.confirmation_provider_idempotency_key, keyBeforeRetry)
  const confirmationCall = sendCalls.find((c) => c.payload.to === 'pia@beispiel.de')
  assert.ok(confirmationCall)
})

// ── Block "Bandanfrage-Mail V3": Template-Version-Persistenz bei Neuanlage ─

function buildSuccessfulCreateClient() {
  const rpcCalls: { name: string; args: unknown }[] = []
  const client = {
    from: (table: string) => {
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
      // Sendeschritt nach der Persistenz bewusst leer beantworten -- dieser
      // Test prueft ausschliesslich die an create_anfrage_with_bands
      // uebergebene template_version, nicht den nachgelagerten Sendeablauf
      // (bereits durch die Dispatch-Tests oben abgedeckt).
      if (table === 'anfrage_bands') {
        return { select: () => ({ eq: async () => ({ data: [], error: null }) }) }
      }
      if (table === 'anfragen') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
          // recomputeOverallStatus() aktualisiert am Ende immer anfragen.status,
          // unabhaengig davon, dass Band-/Bestaetigungsversand hier bewusst
          // leer beantwortet werden.
          update: () => ({ eq: async () => ({ error: null }) }),
        }
      }
      throw new Error(`Unerwarteter from()-Aufruf fuer Tabelle "${table}"`)
    },
    rpc: (name: string, args: unknown) => {
      rpcCalls.push({ name, args })
      if (name === 'check_and_consume_anfrage_rate_limit') {
        return { single: async () => ({ data: { allowed: true, retry_after_seconds: 0 }, error: null }) }
      }
      if (name === 'create_anfrage_with_bands') {
        return { single: async () => ({ data: { anfrage_id: 'new-anfrage-id', was_created: true }, error: null }) }
      }
      throw new Error(`Unerwarteter rpc()-Aufruf: ${name}`)
    },
  } as unknown as SupabaseClient
  return { client, rpcCalls }
}

test('submitAnfrage: persistiert neue Bandanfragen mit BAND_TEMPLATE_VERSION und die Bestaetigung mit CONFIRMATION_TEMPLATE_VERSION', async () => {
  const { client, rpcCalls } = buildSuccessfulCreateClient()
  const getResendClient = () =>
    ({ emails: { send: async () => ({ data: { id: 'x' }, error: null }) } }) as unknown as ResendEmailsClient

  await submitAnfrage(
    {
      idempotencyKey: 'web-v2-create-test',
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

  const createCall = rpcCalls.find((c) => c.name === 'create_anfrage_with_bands')
  const args = createCall?.args as { p_anfrage: Record<string, unknown>; p_bands: Record<string, unknown>[] }
  assert.equal(args.p_bands[0].template_version, BAND_TEMPLATE_VERSION)
  assert.equal(args.p_anfrage.confirmation_template_version, CONFIRMATION_TEMPLATE_VERSION)
})
