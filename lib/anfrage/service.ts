import 'server-only';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/server';
import { getResendClient } from '@/lib/resend/client';
import { parseAnfrageSubmission } from './validation';
import { resolveActiveBandsWithContact } from './resolveBands';
import { checkAndConsumeRateLimit } from './rateLimit';
import { renderBandMail, renderConfirmationMail } from './templates';
import { buildBandMailIdempotencyKey, buildConfirmationIdempotencyKey } from './idempotencyKeys';
import { sendMailViaResend, isWithinProviderIdempotencyProtectionWindow } from './mailSend';
import { computeOverallStatus } from './status';
import { ANFRAGE_SENDER_EMAIL, CURRENT_DATENSCHUTZ_VERSION, TEMPLATE_VERSION } from './constants';
import type { MailSendOutcome, SubmitAnfrageResult } from './types';

type StatusPatch = {
  status: 'gesendet' | 'fehlgeschlagen' | 'ungeklaert';
  attempts: number;
  lastAttemptAt: string;
  sentAt: string | null;
  messageId: string | null;
  errorMessage: string | null;
};

function computeStatusPatch(outcome: MailSendOutcome, attemptTimeIso: string, previousAttempts: number): StatusPatch {
  const attempts = previousAttempts + 1;
  if (outcome.status === 'gesendet') {
    return {
      status: 'gesendet',
      attempts,
      lastAttemptAt: attemptTimeIso,
      sentAt: attemptTimeIso,
      messageId: outcome.messageId,
      errorMessage: null,
    };
  }
  return {
    status: outcome.status,
    attempts,
    lastAttemptAt: attemptTimeIso,
    sentAt: null,
    messageId: null,
    errorMessage: outcome.errorMessage,
  };
}

type AnfrageBandSendRow = {
  id: string;
  anfrage_id: string;
  recipient_email: string;
  reply_to: string;
  subject: string;
  body_text: string;
  provider_idempotency_key: string;
  send_status: string;
  attempts: number;
  last_attempt_at: string | null;
};

async function sendAndPersistBandMail(client: SupabaseClient, row: AnfrageBandSendRow): Promise<void> {
  const attemptTimeIso = new Date().toISOString();
  const outcome = await sendMailViaResend(
    {
      to: row.recipient_email,
      replyTo: row.reply_to,
      subject: row.subject,
      bodyText: row.body_text,
      idempotencyKey: row.provider_idempotency_key,
    },
    getResendClient()
  );
  const patch = computeStatusPatch(outcome, attemptTimeIso, row.attempts);
  await client
    .from('anfrage_bands')
    .update({
      send_status: patch.status,
      attempts: patch.attempts,
      last_attempt_at: patch.lastAttemptAt,
      sent_at: patch.sentAt,
      resend_message_id: patch.messageId,
      error_message: patch.errorMessage,
    })
    .eq('id', row.id);
}

type AnfrageConfirmationRow = {
  confirmation_recipient: string;
  confirmation_reply_to: string | null;
  confirmation_subject: string;
  confirmation_body_text: string;
  confirmation_provider_idempotency_key: string;
  confirmation_attempts: number;
};

async function sendAndPersistConfirmation(client: SupabaseClient, anfrageId: string): Promise<void> {
  const { data: anfrage } = await client
    .from('anfragen')
    .select(
      'confirmation_recipient, confirmation_reply_to, confirmation_subject, confirmation_body_text, confirmation_provider_idempotency_key, confirmation_attempts'
    )
    .eq('id', anfrageId)
    .maybeSingle();
  if (!anfrage) return;

  const row = anfrage as AnfrageConfirmationRow;
  const attemptTimeIso = new Date().toISOString();
  const outcome = await sendMailViaResend(
    {
      to: row.confirmation_recipient,
      replyTo: row.confirmation_reply_to ?? ANFRAGE_SENDER_EMAIL,
      subject: row.confirmation_subject,
      bodyText: row.confirmation_body_text,
      idempotencyKey: row.confirmation_provider_idempotency_key,
    },
    getResendClient()
  );
  const patch = computeStatusPatch(outcome, attemptTimeIso, row.confirmation_attempts);
  await client
    .from('anfragen')
    .update({
      confirmation_status: patch.status,
      confirmation_attempts: patch.attempts,
      confirmation_last_attempt_at: patch.lastAttemptAt,
      confirmation_sent_at: patch.sentAt,
      confirmation_message_id: patch.messageId,
      confirmation_error: patch.errorMessage,
    })
    .eq('id', anfrageId);
}

async function recomputeOverallStatus(client: SupabaseClient, anfrageId: string): Promise<void> {
  const { data: rows } = await client.from('anfrage_bands').select('send_status').eq('anfrage_id', anfrageId);
  const statuses = (rows ?? []).map((r) => r.send_status as import('./types').SendStatus);
  const overall = computeOverallStatus(statuses);
  await client.from('anfragen').update({ status: overall }).eq('id', anfrageId);
}

// Ein Fehler bei einer Band-Mail darf weder die uebrigen Band-Mails noch
// die Veranstalter-Bestaetigung verhindern (DoD 8/9 sinngemaess,
// Teilpaket 7 "Versandablauf"): Promise.allSettled fuer die Band-Mails,
// die Bestaetigung wird IMMER im Anschluss versucht, unabhaengig vom
// Ergebnis der Band-Mails.
async function sendAllBandMailsAndConfirmation(client: SupabaseClient, anfrageId: string): Promise<void> {
  const { data: bandRows } = await client
    .from('anfrage_bands')
    .select('id, anfrage_id, recipient_email, reply_to, subject, body_text, provider_idempotency_key, send_status, attempts, last_attempt_at')
    .eq('anfrage_id', anfrageId);

  await Promise.allSettled(
    ((bandRows ?? []) as AnfrageBandSendRow[]).map((row) => sendAndPersistBandMail(client, row))
  );

  await sendAndPersistConfirmation(client, anfrageId);
  await recomputeOverallStatus(client, anfrageId);
}

export type SubmitAnfrageContext = { ipHash: string };

// Orchestriert den vollstaendigen nativen Anfrageablauf (Teilpaket 4):
// validieren -> Rate-Limit -> Bands aufloesen -> Mailinhalte rendern +
// Provider-Idempotency-Keys festlegen -> atomar persistieren -> Band-Mails
// versenden -> Bestaetigung versenden -> Versandstatus/Gesamtstatus
// aktualisieren. Unabhaengig genug, um aus der API-Route UND aus Tests
// aufgerufen zu werden, ohne Geschaeftslogik zu duplizieren.
export async function submitAnfrage(rawBody: unknown, ctx: SubmitAnfrageContext): Promise<SubmitAnfrageResult> {
  const parsed = parseAnfrageSubmission(rawBody);
  if (!parsed.ok) {
    if (parsed.reason === 'bot') return { kind: 'bot_silent' };
    return { kind: 'validation_error', message: parsed.message };
  }
  const input = parsed.data;

  const rateLimit = await checkAndConsumeRateLimit(ctx.ipHash);
  if (!rateLimit.allowed) {
    return { kind: 'rate_limited', retryAfterSeconds: rateLimit.retryAfterSeconds };
  }

  const client = createAdminClient();

  // Bandname und Empfaengeradresse kommen NIE vom Client -- ausschliesslich
  // serverseitig aus Supabase aufgeloest (DoD 6/7). Kann eine Band nicht
  // eindeutig als aktive Band mit gueltigem Anfragekontakt aufgeloest
  // werden, wird die GESAMTE Anfrage vor jeder Persistenz abgelehnt.
  const resolved = await resolveActiveBandsWithContact(client, input.bandSlugs);
  if (!resolved.ok) {
    return { kind: 'unresolvable_band', bandName: resolved.bandName };
  }

  const anfrageId = randomUUID();
  const nowIso = new Date().toISOString();

  const confirmationRendered = renderConfirmationMail(input, resolved.bands);
  const confirmationProviderKey = buildConfirmationIdempotencyKey(anfrageId);

  const bandRows = resolved.bands.map((band, index) => {
    const anfrageBandId = randomUUID();
    const rendered = renderBandMail(input, band);
    return {
      id: anfrageBandId,
      band_id: band.bandId,
      position: index + 1,
      band_name_snapshot: band.name,
      recipient_email: band.recipientEmail,
      reply_to: input.email,
      template_version: TEMPLATE_VERSION,
      provider_idempotency_key: buildBandMailIdempotencyKey(anfrageId, anfrageBandId),
      subject: rendered.subject,
      body_text: rendered.bodyText,
    };
  });

  const anfragePayload = {
    id: anfrageId,
    idempotency_key: input.idempotencyKey,
    vorname: input.vorname,
    nachname: input.nachname,
    email: input.email,
    telefon: input.telefon,
    anlass: input.anlass,
    datum_text: input.datumText,
    location: input.location,
    plz_ort: input.plzOrt,
    nachricht: input.nachricht,
    gaestezahl: input.gaestezahl,
    spielzeit: input.spielzeit,
    source: 'proudleut-next',
    datenschutz_accepted_at: nowIso,
    datenschutz_version: CURRENT_DATENSCHUTZ_VERSION,
    confirmation_recipient: input.email,
    confirmation_reply_to: null,
    confirmation_provider_idempotency_key: confirmationProviderKey,
    confirmation_subject: confirmationRendered.subject,
    confirmation_body_text: confirmationRendered.bodyText,
    confirmation_template_version: TEMPLATE_VERSION,
  };

  // Atomarer Erstschreibvorgang inkl. Idempotency-Handling (Race-sicher,
  // siehe supabase/fn_create_anfrage_with_bands.sql). Persistenz ist damit
  // vollstaendig abgeschlossen, BEVOR der erste Resend-Aufruf passiert.
  const { data: writeResult, error: writeError } = await client
    .rpc('create_anfrage_with_bands', { p_anfrage: anfragePayload, p_bands: bandRows })
    .single();

  if (writeError || !writeResult) {
    console.error('[anfrage] Persistenz fehlgeschlagen', writeError);
    return { kind: 'server_error' };
  }

  const result = writeResult as { anfrage_id: string; was_created: boolean };

  if (!result.was_created) {
    // Doppel-Submit mit bereits bekanntem idempotency_key: kein erneuter
    // Insert, kein erneuter Versand, keine erhoehten Attempts (DoD 17).
    return { kind: 'accepted' };
  }

  await sendAllBandMailsAndConfirmation(client, result.anfrage_id);

  return { kind: 'accepted' };
}

export type RetryOutcome =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'already_sent' | 'protection_window_expired' };

// Admin-Retry fuer eine EINZELNE fehlgeschlagene/ungeklaerte Band-Mail.
// Verwendet unveraendert denselben provider_idempotency_key sowie
// Empfaenger-/Reply-To-/Betreff-/Body-Snapshot wie beim urspruenglichen
// Versuch (DoD 15/16, Teilpaket 8 "Retry"). Bereits gesendete Zeilen sind
// unantastbar.
export async function retryBandSend(anfrageBandId: string): Promise<RetryOutcome> {
  const client = createAdminClient();
  const { data: row } = await client
    .from('anfrage_bands')
    .select('id, anfrage_id, recipient_email, reply_to, subject, body_text, provider_idempotency_key, send_status, attempts, last_attempt_at')
    .eq('id', anfrageBandId)
    .maybeSingle();

  if (!row) return { ok: false, reason: 'not_found' };
  if (row.send_status === 'gesendet') return { ok: false, reason: 'already_sent' };
  if (row.send_status === 'ungeklaert' && row.last_attempt_at) {
    if (!isWithinProviderIdempotencyProtectionWindow(new Date(row.last_attempt_at), new Date())) {
      return { ok: false, reason: 'protection_window_expired' };
    }
  }

  await sendAndPersistBandMail(client, row as AnfrageBandSendRow);
  await recomputeOverallStatus(client, row.anfrage_id);
  return { ok: true };
}

// Admin-Retry fuer die Veranstalter-Bestaetigung -- identische Regeln wie
// retryBandSend, nur auf anfragen.confirmation_* statt anfrage_bands.
export async function retryConfirmation(anfrageId: string): Promise<RetryOutcome> {
  const client = createAdminClient();
  const { data: row } = await client
    .from('anfragen')
    .select('id, confirmation_status, confirmation_last_attempt_at')
    .eq('id', anfrageId)
    .maybeSingle();

  if (!row) return { ok: false, reason: 'not_found' };
  if (row.confirmation_status === 'gesendet') return { ok: false, reason: 'already_sent' };
  if (row.confirmation_status === 'ungeklaert' && row.confirmation_last_attempt_at) {
    if (!isWithinProviderIdempotencyProtectionWindow(new Date(row.confirmation_last_attempt_at), new Date())) {
      return { ok: false, reason: 'protection_window_expired' };
    }
  }

  await sendAndPersistConfirmation(client, anfrageId);
  return { ok: true };
}
