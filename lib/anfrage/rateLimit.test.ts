import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkAndConsumeRateLimit } from './rateLimit.ts'
import type { SupabaseClient } from '@supabase/supabase-js'

const IP_HASH = 'a'.repeat(64)

function fakeClient(single: () => Promise<{ data: unknown; error: unknown }>): SupabaseClient {
  return {
    rpc: () => ({ single }),
  } as unknown as SupabaseClient
}

function captureConsoleError(): { calls: unknown[][]; restore: () => void } {
  const calls: unknown[][] = []
  const original = console.error
  console.error = (...args: unknown[]) => {
    calls.push(args)
  }
  return { calls, restore: () => { console.error = original } }
}

// ── Codex-Nachtrag PR #26, Befund 3: vollstaendig fail-closed ──────────

test('checkAndConsumeRateLimit: gueltige Antwort allowed=true -> allowed', async () => {
  const client = fakeClient(async () => ({ data: { allowed: true, retry_after_seconds: 0 }, error: null }))
  const result = await checkAndConsumeRateLimit(client, IP_HASH)
  assert.deepEqual(result, { status: 'allowed' })
})

test('checkAndConsumeRateLimit: gueltige Antwort allowed=false -> blocked mit retryAfterSeconds', async () => {
  const client = fakeClient(async () => ({ data: { allowed: false, retry_after_seconds: 42 }, error: null }))
  const result = await checkAndConsumeRateLimit(client, IP_HASH)
  assert.deepEqual(result, { status: 'blocked', retryAfterSeconds: 42 })
})

test('checkAndConsumeRateLimit: RPC-Fehlerantwort (z.B. fehlende Funktion/Tabelle) -> fail_closed', async () => {
  const client = fakeClient(async () => ({
    data: null,
    error: { code: 'PGRST202', message: 'Could not find the function public.check_and_consume_anfrage_rate_limit' },
  }))
  const result = await checkAndConsumeRateLimit(client, IP_HASH)
  assert.deepEqual(result, { status: 'fail_closed' })
})

test('checkAndConsumeRateLimit: Berechtigungsfehler -> fail_closed', async () => {
  const client = fakeClient(async () => ({
    data: null,
    error: { code: '42501', message: 'permission denied for function check_and_consume_anfrage_rate_limit' },
  }))
  const result = await checkAndConsumeRateLimit(client, IP_HASH)
  assert.deepEqual(result, { status: 'fail_closed' })
})

test('checkAndConsumeRateLimit: Exception waehrend des Aufrufs (Netzwerkfehler) -> fail_closed', async () => {
  const client = fakeClient(async () => {
    throw new Error('fetch failed: network error')
  })
  const result = await checkAndConsumeRateLimit(client, IP_HASH)
  assert.deepEqual(result, { status: 'fail_closed' })
})

test('checkAndConsumeRateLimit: ungueltige/unerwartete Rueckgabeform -> fail_closed', async () => {
  const client = fakeClient(async () => ({ data: { unexpected: 'shape' }, error: null }))
  const result = await checkAndConsumeRateLimit(client, IP_HASH)
  assert.deepEqual(result, { status: 'fail_closed' })
})

test('checkAndConsumeRateLimit: data=null ohne Fehler -> fail_closed (kein stiller Fehlerpfad)', async () => {
  const client = fakeClient(async () => ({ data: null, error: null }))
  const result = await checkAndConsumeRateLimit(client, IP_HASH)
  assert.deepEqual(result, { status: 'fail_closed' })
})

test('checkAndConsumeRateLimit: unbekannter/nicht klassifizierbarer Fehler -> ebenfalls fail_closed (keine Heuristik)', async () => {
  const client = fakeClient(async () => ({ data: null, error: { code: 'XX999', message: 'irgendein unbekannter Fehler' } }))
  const result = await checkAndConsumeRateLimit(client, IP_HASH)
  assert.deepEqual(result, { status: 'fail_closed' })
})

test('checkAndConsumeRateLimit: strukturiertes Logging bei RPC-Fehler enthaelt weder IP noch ipHash', async () => {
  const spy = captureConsoleError()
  try {
    const client = fakeClient(async () => ({ data: null, error: { code: 'PGRST202', message: 'missing function' } }))
    await checkAndConsumeRateLimit(client, IP_HASH)
    assert.equal(spy.calls.length, 1)
    const loggedArgs = JSON.stringify(spy.calls[0])
    assert.doesNotMatch(loggedArgs, new RegExp(IP_HASH))
    assert.match(loggedArgs, /check_and_consume_anfrage_rate_limit/)
  } finally {
    spy.restore()
  }
})

test('checkAndConsumeRateLimit: strukturiertes Logging bei Exception enthaelt weder IP noch ipHash', async () => {
  const spy = captureConsoleError()
  try {
    const client = fakeClient(async () => {
      throw new Error('network timeout')
    })
    await checkAndConsumeRateLimit(client, IP_HASH)
    assert.equal(spy.calls.length, 1)
    const loggedArgs = JSON.stringify(spy.calls[0])
    assert.doesNotMatch(loggedArgs, new RegExp(IP_HASH))
  } finally {
    spy.restore()
  }
})
