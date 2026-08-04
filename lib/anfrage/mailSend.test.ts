import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sendMailViaResend, isWithinProviderIdempotencyProtectionWindow } from './mailSend.ts'
import type { ResendEmailsClient } from './mailSend.ts'

const PARAMS = {
  to: 'kontakt@band-a.de',
  replyTo: 'anna@beispiel.de',
  subject: 'Neue Anfrage über proudleut.com für Band A',
  bodyText: 'Hallo Band A-Team, ...',
  idempotencyKey: 'inquiry/anfrage-id/band/band-id/v1',
}

function fakeClient(send: ResendEmailsClient['emails']['send']): ResendEmailsClient {
  return { emails: { send } }
}

// ── Erfolg / eindeutiger Fehler / unklarer Zustand ──────────────────────

test('sendMailViaResend: eindeutiger Erfolg -> gesendet mit Message-ID', async () => {
  const client = fakeClient(async () => ({ data: { id: 'msg_123' }, error: null, headers: null }) as never)
  const outcome = await sendMailViaResend(PARAMS, client)
  assert.deepEqual(outcome, { status: 'gesendet', messageId: 'msg_123' })
})

test('sendMailViaResend: klare API-Fehlerantwort -> fehlgeschlagen (NICHT ungeklaert)', async () => {
  const client = fakeClient(
    async () => ({ data: null, error: { message: 'invalid_from_address', statusCode: 422, name: 'invalid_from_address' }, headers: null }) as never
  )
  const outcome = await sendMailViaResend(PARAMS, client)
  assert.equal(outcome.status, 'fehlgeschlagen')
});

test('sendMailViaResend: Exception waehrend des Aufrufs (Timeout/Netzwerkabbruch) -> ungeklaert', async () => {
  const client = fakeClient(async () => {
    throw new Error('fetch failed: network timeout')
  })
  const outcome = await sendMailViaResend(PARAMS, client)
  assert.equal(outcome.status, 'ungeklaert')
})

test('sendMailViaResend: kein Fehler aber auch keine Message-ID -> ungeklaert (nicht faelschlich gesendet)', async () => {
  const client = fakeClient(async () => ({ data: null, error: null, headers: null }) as never)
  const outcome = await sendMailViaResend(PARAMS, client)
  assert.equal(outcome.status, 'ungeklaert')
})

test('sendMailViaResend: uebergibt denselben idempotencyKey unveraendert an den Provider', async () => {
  let receivedOptions: { idempotencyKey?: string } | undefined
  const client = fakeClient(async (_payload, options) => {
    receivedOptions = options as { idempotencyKey?: string }
    return { data: { id: 'msg_1' }, error: null, headers: null } as never
  })
  await sendMailViaResend(PARAMS, client)
  assert.equal(receivedOptions?.idempotencyKey, PARAMS.idempotencyKey)
})

// ── 24h-Schutzzeitraum ───────────────────────────────────────────────────

test('isWithinProviderIdempotencyProtectionWindow: innerhalb 24h -> true', () => {
  const lastAttempt = new Date('2026-01-01T10:00:00Z')
  const now = new Date('2026-01-01T20:00:00Z')
  assert.equal(isWithinProviderIdempotencyProtectionWindow(lastAttempt, now), true)
})

test('isWithinProviderIdempotencyProtectionWindow: genau an der 24h-Grenze -> false', () => {
  const lastAttempt = new Date('2026-01-01T10:00:00Z')
  const now = new Date('2026-01-02T10:00:00Z')
  assert.equal(isWithinProviderIdempotencyProtectionWindow(lastAttempt, now), false)
})

test('isWithinProviderIdempotencyProtectionWindow: ausserhalb 24h -> false', () => {
  const lastAttempt = new Date('2026-01-01T10:00:00Z')
  const now = new Date('2026-01-03T10:00:00Z')
  assert.equal(isWithinProviderIdempotencyProtectionWindow(lastAttempt, now), false)
})
