import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import { submitKontakt } from './service.ts'
import type { ResendEmailsClient } from '../anfrage/mailSend.ts'

function validSubmission(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    anlass: 'Allgemeine Nachricht',
    vorname: 'Anna',
    nachname: 'Müller',
    email: 'anna@beispiel.de',
    telefon: '',
    nachricht: 'Hallo, ich hätte eine Frage.',
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

function buildRateLimitClient(status: 'allowed' | 'blocked' | 'fail_closed') {
  const rpcCalls: string[] = []
  const client = {
    rpc: (name: string) => {
      rpcCalls.push(name)
      if (name === 'check_and_consume_anfrage_rate_limit') {
        return {
          single: async () => {
            if (status === 'allowed') return { data: { allowed: true, retry_after_seconds: 0 }, error: null }
            if (status === 'blocked') return { data: { allowed: false, retry_after_seconds: 42 }, error: null }
            return { data: null, error: { code: 'PGRST202', message: 'missing function' } }
          },
        }
      }
      throw new Error(`Unerwarteter rpc()-Aufruf: ${name}`)
    },
  } as unknown as SupabaseClient
  return { client, rpcCalls }
}

function buildRecordingResend(behavior: () => { data: unknown; error: unknown } | Promise<{ data: unknown; error: unknown }>) {
  const sendCalls: { to: string; subject: string; replyTo: string; bodyText: string }[] = []
  const send = async (payload: Record<string, unknown>) => {
    sendCalls.push({
      to: payload.to as string,
      subject: payload.subject as string,
      replyTo: payload.replyTo as string,
      bodyText: payload.text as string,
    })
    return behavior()
  }
  const resendClient = { emails: { send } } as unknown as ResendEmailsClient
  return { resendClient, sendCalls }
}

test('submitKontakt: Erfolg -- sendet Mail an KONTAKT_NOTIFY_EMAIL mit Reply-To des Absenders', async () => {
  await withEnv({ KONTAKT_NOTIFY_EMAIL: 'xandi@beispiel.de' }, async () => {
    const { client } = buildRateLimitClient('allowed')
    const { resendClient, sendCalls } = buildRecordingResend(() => ({ data: { id: 'msg_1' }, error: null }))

    const result = await submitKontakt(
      validSubmission(),
      { ipHash: 'a'.repeat(64) },
      { client, getResendClient: () => resendClient }
    )

    assert.deepEqual(result, { kind: 'accepted' })
    assert.equal(sendCalls.length, 1)
    assert.equal(sendCalls[0].to, 'xandi@beispiel.de')
    assert.equal(sendCalls[0].replyTo, 'anna@beispiel.de')
    assert.match(sendCalls[0].subject, /Allgemeine Nachricht/)
    assert.match(sendCalls[0].bodyText, /Hallo, ich hätte eine Frage\./)
  })
})

test('submitKontakt: Honeypot befuellt -- stiller Bot-Fall, kein Rate-Limit-/Mail-Aufruf', async () => {
  const { client, rpcCalls } = buildRateLimitClient('allowed')
  const { resendClient, sendCalls } = buildRecordingResend(() => ({ data: { id: 'x' }, error: null }))

  const result = await submitKontakt(
    validSubmission({ firmaHidden: 'Firma GmbH' }),
    { ipHash: 'a'.repeat(64) },
    { client, getResendClient: () => resendClient }
  )

  assert.deepEqual(result, { kind: 'bot_silent' })
  assert.equal(rpcCalls.length, 0)
  assert.equal(sendCalls.length, 0)
})

test('submitKontakt: Mindest-Öffnungszeit unterschritten -- ehrlicher Fehler statt stiller Erfolg, kein Rate-Limit-/Mail-Aufruf', async () => {
  const { client, rpcCalls } = buildRateLimitClient('allowed')
  const { resendClient, sendCalls } = buildRecordingResend(() => ({ data: { id: 'x' }, error: null }))

  const result = await submitKontakt(
    validSubmission({ openedAt: Date.now() - 100 }),
    { ipHash: 'a'.repeat(64) },
    { client, getResendClient: () => resendClient }
  )

  assert.equal(result.kind, 'too_fast')
  assert.match((result as { message: string }).message, /noch einmal/)
  assert.equal(rpcCalls.length, 0)
  assert.equal(sendCalls.length, 0)
})

test('submitKontakt: Validierungsfehler wird durchgereicht, kein Rate-Limit-/Mail-Aufruf', async () => {
  const { client, rpcCalls } = buildRateLimitClient('allowed')
  const { resendClient, sendCalls } = buildRecordingResend(() => ({ data: { id: 'x' }, error: null }))

  const result = await submitKontakt(
    validSubmission({ email: 'keine-email' }),
    { ipHash: 'a'.repeat(64) },
    { client, getResendClient: () => resendClient }
  )

  assert.equal(result.kind, 'validation_error')
  assert.equal(rpcCalls.length, 0)
  assert.equal(sendCalls.length, 0)
})

test('submitKontakt: Rate-Limit blockiert -- kein Mail-Aufruf', async () => {
  await withEnv({ KONTAKT_NOTIFY_EMAIL: 'xandi@beispiel.de' }, async () => {
    const { client } = buildRateLimitClient('blocked')
    const { resendClient, sendCalls } = buildRecordingResend(() => ({ data: { id: 'x' }, error: null }))

    const result = await submitKontakt(
      validSubmission(),
      { ipHash: 'a'.repeat(64) },
      { client, getResendClient: () => resendClient }
    )

    assert.deepEqual(result, { kind: 'rate_limited', retryAfterSeconds: 42 })
    assert.equal(sendCalls.length, 0)
  })
})

test('submitKontakt: Rate-Limit-RPC technisch fehlgeschlagen -- fail-closed, kein Mail-Aufruf', async () => {
  await withEnv({ KONTAKT_NOTIFY_EMAIL: 'xandi@beispiel.de' }, async () => {
    const { client } = buildRateLimitClient('fail_closed')
    const { resendClient, sendCalls } = buildRecordingResend(() => ({ data: { id: 'x' }, error: null }))

    const result = await submitKontakt(
      validSubmission(),
      { ipHash: 'a'.repeat(64) },
      { client, getResendClient: () => resendClient }
    )

    assert.deepEqual(result, { kind: 'temporarily_unavailable' })
    assert.equal(sendCalls.length, 0)
  })
})

test('submitKontakt: KONTAKT_NOTIFY_EMAIL fehlt -- fail-closed, kein Mail-Aufruf', async () => {
  await withEnv({ KONTAKT_NOTIFY_EMAIL: undefined }, async () => {
    const { client } = buildRateLimitClient('allowed')
    const { resendClient, sendCalls } = buildRecordingResend(() => ({ data: { id: 'x' }, error: null }))

    const result = await submitKontakt(
      validSubmission(),
      { ipHash: 'a'.repeat(64) },
      { client, getResendClient: () => resendClient }
    )

    assert.deepEqual(result, { kind: 'temporarily_unavailable' })
    assert.equal(sendCalls.length, 0)
  })
})

test('submitKontakt: Resend liefert Fehlerantwort -- ehrlicher server_error, kein ok:true', async () => {
  await withEnv({ KONTAKT_NOTIFY_EMAIL: 'xandi@beispiel.de' }, async () => {
    const { client } = buildRateLimitClient('allowed')
    const { resendClient } = buildRecordingResend(() => ({ data: null, error: { message: 'invalid_api_key' } }))

    const result = await submitKontakt(
      validSubmission(),
      { ipHash: 'a'.repeat(64) },
      { client, getResendClient: () => resendClient }
    )

    assert.deepEqual(result, { kind: 'server_error' })
  })
})

test('submitKontakt: Resend wirft Exception (ungeklaerter Zustand) -- ehrlicher server_error, kein ok:true', async () => {
  await withEnv({ KONTAKT_NOTIFY_EMAIL: 'xandi@beispiel.de' }, async () => {
    const { client } = buildRateLimitClient('allowed')
    const { resendClient } = buildRecordingResend(() => {
      throw new Error('network timeout')
    })

    const result = await submitKontakt(
      validSubmission(),
      { ipHash: 'a'.repeat(64) },
      { client, getResendClient: () => resendClient }
    )

    assert.deepEqual(result, { kind: 'server_error' })
  })
})
