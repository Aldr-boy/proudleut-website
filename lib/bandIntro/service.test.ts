import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import { submitBandIntro } from './service.ts'
import { BAND_INTRO_SENDER_EMAIL } from './constants.ts'
import type { ResendEmailsClient } from '../anfrage/mailSend.ts'

function validSubmission(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    idempotencyKey: 'web-1234567890',
    bandName: 'Testband',
    region: 'München und Umgebung',
    websiteUrl: '',
    additionalLinks: [],
    description: 'Wir spielen seit zehn Jahren Rock und Pop auf Hochzeiten und Firmenfeiern.',
    firstName: 'Anna',
    lastName: '',
    nickname: '',
    email: 'anna@beispiel.de',
    phone: '',
    datenschutz: true,
    firmaHidden: '',
    websiteHidden: '',
    openedAt: Date.now() - 5000,
    ...overrides,
  }
}

function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void>): Promise<void> {
  const previous: Record<string, string | undefined> = {}
  for (const key of Object.keys(vars)) previous[key] = process.env[key]
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  return fn().finally(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })
}

function buildRecordingClient(opts: { rateLimit?: 'allowed' | 'blocked' | 'fail_closed'; insertError?: { code: string; message: string } | null } = {}) {
  const events: string[] = []
  const insertPayloads: Record<string, unknown>[] = []
  const rateLimit = opts.rateLimit ?? 'allowed'
  const insertError = opts.insertError ?? null

  const client = {
    rpc: (name: string) => {
      events.push(`rpc:${name}`)
      if (name === 'check_and_consume_anfrage_rate_limit') {
        return {
          single: async () => {
            if (rateLimit === 'allowed') return { data: { allowed: true, retry_after_seconds: 0 }, error: null }
            if (rateLimit === 'blocked') return { data: { allowed: false, retry_after_seconds: 42 }, error: null }
            return { data: null, error: { code: 'PGRST202', message: 'missing function' } }
          },
        }
      }
      throw new Error(`Unerwarteter rpc()-Aufruf: ${name}`)
    },
    from: (table: string) => {
      events.push(`from:${table}`)
      return {
        insert: async (payload: Record<string, unknown>) => {
          events.push(`insert:${table}`)
          insertPayloads.push(payload)
          return { error: insertError }
        },
      }
    },
  } as unknown as SupabaseClient

  return { client, events, insertPayloads }
}

function buildRecordingResend(behavior: (to: string) => { data: unknown; error: unknown }) {
  const sendCalls: { to: string; subject: string; replyTo: string; bodyText: string; html: string }[] = []
  const send = async (payload: Record<string, unknown>) => {
    sendCalls.push({
      to: payload.to as string,
      subject: payload.subject as string,
      replyTo: payload.replyTo as string,
      bodyText: payload.text as string,
      html: payload.html as string,
    })
    return behavior(payload.to as string)
  }
  const resendClient = { emails: { send } } as unknown as ResendEmailsClient
  return { resendClient, sendCalls }
}

test('submitBandIntro: Bot (Honeypot) wird still abgelehnt, keine DB-/Mail-Aufrufe', async () => {
  const { client, events } = buildRecordingClient()
  const { resendClient, sendCalls } = buildRecordingResend(() => ({ data: { id: 'x' }, error: null }))

  const result = await submitBandIntro(
    validSubmission({ firmaHidden: 'Firma GmbH' }),
    { ipHash: 'a'.repeat(64) },
    { client, getResendClient: () => resendClient }
  )

  assert.deepEqual(result, { kind: 'bot_silent' })
  assert.equal(events.length, 0)
  assert.equal(sendCalls.length, 0)
})

test('submitBandIntro: Validierungsfehler wird durchgereicht, keine DB-/Mail-Aufrufe', async () => {
  const { client, events } = buildRecordingClient()
  const { resendClient, sendCalls } = buildRecordingResend(() => ({ data: { id: 'x' }, error: null }))

  const result = await submitBandIntro(
    validSubmission({ bandName: '' }),
    { ipHash: 'a'.repeat(64) },
    { client, getResendClient: () => resendClient }
  )

  assert.equal(result.kind, 'validation_error')
  assert.equal(events.length, 0)
  assert.equal(sendCalls.length, 0)
})

test('submitBandIntro: Rate-Limit blockiert -> rate_limited, keine Persistenz', async () => {
  const { client, events } = buildRecordingClient({ rateLimit: 'blocked' })
  const { resendClient, sendCalls } = buildRecordingResend(() => ({ data: { id: 'x' }, error: null }))

  const result = await submitBandIntro(validSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })

  assert.deepEqual(result, { kind: 'rate_limited', retryAfterSeconds: 42 })
  assert.equal(events.includes('from:band_introductions'), false)
  assert.equal(sendCalls.length, 0)
})

test('submitBandIntro: Rate-Limit technisch fehlgeschlagen -> fail-closed, temporarily_unavailable, keine Persistenz', async () => {
  const { client, events } = buildRecordingClient({ rateLimit: 'fail_closed' })
  const { resendClient, sendCalls } = buildRecordingResend(() => ({ data: { id: 'x' }, error: null }))

  const result = await submitBandIntro(validSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })

  assert.deepEqual(result, { kind: 'temporarily_unavailable' })
  assert.equal(events.includes('from:band_introductions'), false)
  assert.equal(sendCalls.length, 0)
})

test('submitBandIntro: Doppel-Submit (Unique-Violation auf idempotency_key) -> accepted, kein Mailversand', async () => {
  const { client, events } = buildRecordingClient({ insertError: { code: '23505', message: 'duplicate key' } })
  const { resendClient, sendCalls } = buildRecordingResend(() => ({ data: { id: 'x' }, error: null }))

  const result = await submitBandIntro(validSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })

  assert.equal(result.kind, 'accepted')
  if (result.kind === 'accepted') assert.equal(result.confirmationMailSent, false)
  assert.equal(sendCalls.length, 0)
  assert.equal(events.filter((e) => e === 'insert:band_introductions').length, 1)
})

test('submitBandIntro: sonstiger DB-Fehler beim Insert -> server_error', async () => {
  const { client } = buildRecordingClient({ insertError: { code: '55000', message: 'irgendein Fehler' } })
  const { resendClient, sendCalls } = buildRecordingResend(() => ({ data: { id: 'x' }, error: null }))

  const result = await submitBandIntro(validSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })

  assert.deepEqual(result, { kind: 'server_error' })
  assert.equal(sendCalls.length, 0)
})

test('submitBandIntro: erfolgreicher Submit speichert zuerst, sendet danach Bestaetigung an die Band UND interne Benachrichtigung an Xandi', async () =>
  withEnv({ BAND_INTRO_NOTIFY_EMAIL: 'xandi@proudleut.com' }, async () => {
    const { client, events, insertPayloads } = buildRecordingClient()
    const { resendClient, sendCalls } = buildRecordingResend(() => ({ data: { id: 'msg_1' }, error: null }))

    const result = await submitBandIntro(validSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })

    assert.equal(result.kind, 'accepted')
    if (result.kind === 'accepted') assert.equal(result.confirmationMailSent, true)

    // Reihenfolge: Rate-Limit -> Insert -> Mails (Auftrag Abschnitt 20)
    assert.deepEqual(events, ['rpc:check_and_consume_anfrage_rate_limit', 'from:band_introductions', 'insert:band_introductions'])

    assert.equal(insertPayloads.length, 1)
    assert.equal(insertPayloads[0].band_name, 'Testband')
    assert.equal(insertPayloads[0].email, 'anna@beispiel.de')
    assert.ok(typeof insertPayloads[0].id === 'string')
    assert.ok(typeof insertPayloads[0].idempotency_key === 'string')

    assert.equal(sendCalls.length, 2)
    assert.equal(sendCalls[0].to, 'anna@beispiel.de')
    assert.equal(sendCalls[1].to, 'xandi@proudleut.com')
  }))

test('submitBandIntro: keine band_id im Insert-Payload, kein Schreiben in eine andere Tabelle', async () => {
  const { client, events, insertPayloads } = buildRecordingClient()
  const { resendClient } = buildRecordingResend(() => ({ data: { id: 'x' }, error: null }))

  await submitBandIntro(validSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })

  assert.equal('band_id' in insertPayloads[0], false)
  assert.deepEqual(
    events.filter((e) => e.startsWith('from:')),
    ['from:band_introductions']
  )
})

test('submitBandIntro: Bestaetigungsmail schlaegt fehl -> Submission bleibt accepted, confirmationMailSent=false (Fall B)', async () =>
  withEnv({ BAND_INTRO_NOTIFY_EMAIL: 'xandi@proudleut.com' }, async () => {
    const { client } = buildRecordingClient()
    let callCount = 0
    const { resendClient, sendCalls } = buildRecordingResend(() => {
      callCount += 1
      if (callCount === 1) return { data: null, error: { message: 'Resend down' } }
      return { data: { id: 'msg_2' }, error: null }
    })

    const result = await submitBandIntro(validSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })

    assert.equal(result.kind, 'accepted')
    if (result.kind === 'accepted') assert.equal(result.confirmationMailSent, false)
    // Die interne Benachrichtigung wird trotzdem versucht (Schritt 4 laeuft unabhaengig von Schritt 3).
    assert.equal(sendCalls.length, 2)
  }))

test('submitBandIntro: BAND_INTRO_NOTIFY_EMAIL fehlt -> interne Mail wird uebersprungen, Submission bleibt accepted (Fall C)', async () =>
  withEnv({ BAND_INTRO_NOTIFY_EMAIL: undefined }, async () => {
    const { client } = buildRecordingClient()
    const { resendClient, sendCalls } = buildRecordingResend(() => ({ data: { id: 'msg_1' }, error: null }))

    const result = await submitBandIntro(validSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })

    assert.equal(result.kind, 'accepted')
    if (result.kind === 'accepted') assert.equal(result.confirmationMailSent, true)
    assert.equal(sendCalls.length, 1)
    assert.equal(sendCalls[0].to, 'anna@beispiel.de')
  }))

test('submitBandIntro: interne Mail schlaegt fehl -> Submission bleibt accepted, Bandvorstellung nicht zurueckgerollt (Fall C)', async () =>
  withEnv({ BAND_INTRO_NOTIFY_EMAIL: 'xandi@proudleut.com' }, async () => {
    const { client, insertPayloads } = buildRecordingClient()
    let callCount = 0
    const { resendClient } = buildRecordingResend(() => {
      callCount += 1
      if (callCount === 1) return { data: { id: 'msg_1' }, error: null }
      return { data: null, error: { message: 'Resend down' } }
    })

    const result = await submitBandIntro(validSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })

    assert.equal(result.kind, 'accepted')
    if (result.kind === 'accepted') assert.equal(result.confirmationMailSent, true)
    assert.equal(insertPayloads.length, 1)
  }))

// ── Reply-To (Auftrag Abschnitt 26) ───────────────────────────────────────
// Antworten der Band auf die Bestaetigungsmail muessen an eine tatsaechlich
// ueberwachte proudleut-Adresse gehen -- keine neue Mailadresse, sondern
// entweder die konfigurierte interne Benachrichtigungsadresse oder die
// bestehende, bereits im nativen Anfragesystem produktiv genutzte
// proudleut-Absenderadresse (lib/anfrage/constants.ts::ANFRAGE_SENDER_EMAIL,
// hier re-exportiert als BAND_INTRO_SENDER_EMAIL).

test('submitBandIntro: Reply-To der Bestaetigungsmail ist BAND_INTRO_NOTIFY_EMAIL, wenn gesetzt', async () =>
  withEnv({ BAND_INTRO_NOTIFY_EMAIL: 'xandi@proudleut.com' }, async () => {
    const { client } = buildRecordingClient()
    const { resendClient, sendCalls } = buildRecordingResend(() => ({ data: { id: 'msg_1' }, error: null }))

    await submitBandIntro(validSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })

    const confirmationCall = sendCalls.find((c) => c.to === 'anna@beispiel.de')
    assert.equal(confirmationCall?.replyTo, 'xandi@proudleut.com')
  }))

test('submitBandIntro: Reply-To der Bestaetigungsmail faellt ohne BAND_INTRO_NOTIFY_EMAIL auf die bestehende, ueberwachte proudleut-Absenderadresse zurueck (keine neue Adresse)', async () =>
  withEnv({ BAND_INTRO_NOTIFY_EMAIL: undefined }, async () => {
    const { client } = buildRecordingClient()
    const { resendClient, sendCalls } = buildRecordingResend(() => ({ data: { id: 'msg_1' }, error: null }))

    await submitBandIntro(validSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })

    const confirmationCall = sendCalls.find((c) => c.to === 'anna@beispiel.de')
    assert.equal(confirmationCall?.replyTo, BAND_INTRO_SENDER_EMAIL)
  }))

test('submitBandIntro: Reply-To der internen Benachrichtigung ist die E-Mail der Band, damit Xandi direkt antworten kann', async () =>
  withEnv({ BAND_INTRO_NOTIFY_EMAIL: 'xandi@proudleut.com' }, async () => {
    const { client } = buildRecordingClient()
    const { resendClient, sendCalls } = buildRecordingResend(() => ({ data: { id: 'msg_1' }, error: null }))

    await submitBandIntro(validSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })

    const internalCall = sendCalls.find((c) => c.to === 'xandi@proudleut.com')
    assert.equal(internalCall?.replyTo, 'anna@beispiel.de')
  }))

// ── Terminabstimmung ausschliesslich per Antwortmail (ersetzt die fruehere,
// optionale meetergo-Logik vollstaendig -- Nachfass-Paket "Terminabstimmung
// per Antwort", Fall A: MEETERGO_BOOKING_URL/getMeetergoBookingUrl wurden
// aus lib/bandIntro/constants.ts entfernt, da sie ausschliesslich fuer
// diesen Flow eingefuehrt und nirgends sonst im Repo verwendet wurden) ────

test('submitBandIntro: Bestaetigungsmail an die Band enthaelt keinen meetergo-Link/Terminplaner, egal ob MEETERGO_BOOKING_URL in der Umgebung gesetzt ist', async () =>
  withEnv({ BAND_INTRO_NOTIFY_EMAIL: 'xandi@proudleut.com', MEETERGO_BOOKING_URL: 'https://meetergo.com/irrelevant' }, async () => {
    const { client } = buildRecordingClient()
    const { resendClient, sendCalls } = buildRecordingResend(() => ({ data: { id: 'msg_1' }, error: null }))

    const result = await submitBandIntro(validSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })

    assert.equal(result.kind, 'accepted')
    const confirmationCall = sendCalls.find((c) => c.to === 'anna@beispiel.de')
    assert.ok(confirmationCall)
    assert.ok(!/meetergo/i.test(confirmationCall!.bodyText))
    assert.ok(!/meetergo/i.test(confirmationCall!.html))
    assert.ok(confirmationCall!.bodyText.includes('Antworte mir dafür einfach auf diese Mail'))
  }))

// ── Sichtbare Warnung an Xandi bei fehlgeschlagener Bandmail (Nachfass-Paket
// Abschnitt 10) ────────────────────────────────────────────────────────────

test('submitBandIntro: Bandmail schlaegt fehl -> interne Xandi-Mail hat den Warn-Betreffpraefix und den Warnhinweis im Text', async () =>
  withEnv({ BAND_INTRO_NOTIFY_EMAIL: 'xandi@proudleut.com' }, async () => {
    const { client } = buildRecordingClient()
    let callCount = 0
    const { resendClient, sendCalls } = buildRecordingResend(() => {
      callCount += 1
      if (callCount === 1) return { data: null, error: { message: 'Resend down' } }
      return { data: { id: 'msg_2' }, error: null }
    })

    const result = await submitBandIntro(validSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })

    assert.equal(result.kind, 'accepted')
    if (result.kind === 'accepted') assert.equal(result.confirmationMailSent, false)
    const internalCall = sendCalls.find((c) => c.to === 'xandi@proudleut.com')
    assert.ok(internalCall)
    assert.ok(internalCall!.subject.startsWith('[Bestätigung fehlgeschlagen]'))
    assert.ok(/ACHTUNG/.test(internalCall!.bodyText))
    assert.ok(internalCall!.bodyText.includes('vermutlich NICHT erhalten'))
  }))

test('submitBandIntro: Bandmail erfolgreich -> interne Xandi-Mail enthaelt KEINEN Warnhinweis', async () =>
  withEnv({ BAND_INTRO_NOTIFY_EMAIL: 'xandi@proudleut.com' }, async () => {
    const { client } = buildRecordingClient()
    const { resendClient, sendCalls } = buildRecordingResend(() => ({ data: { id: 'msg_1' }, error: null }))

    const result = await submitBandIntro(validSubmission(), { ipHash: 'a'.repeat(64) }, { client, getResendClient: () => resendClient })

    assert.equal(result.kind, 'accepted')
    if (result.kind === 'accepted') assert.equal(result.confirmationMailSent, true)
    const internalCall = sendCalls.find((c) => c.to === 'xandi@proudleut.com')
    assert.ok(internalCall)
    assert.equal(internalCall!.subject, 'Neue Bandvorstellung: Testband')
    assert.ok(!/achtung/i.test(internalCall!.bodyText))
  }))

