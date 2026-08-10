import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { parseAnfrageSubmission } from './validation.ts';
import { resolveActiveBandsWithContact } from './resolveBands.ts';
import { checkAndConsumeRateLimit } from './rateLimit.ts';
import { renderBandMailV2, renderBandMailV2Html, renderConfirmationMail, renderHtmlFromTextSnapshot } from './templates.ts';
import type { BandMailV2Content } from './templates.ts';
import { buildBandMailIdempotencyKey, buildConfirmationIdempotencyKey } from './idempotencyKeys.ts';
import { sendMailViaResend } from './mailSend.ts';
import type { ResendEmailsClient } from './mailSend.ts';
import { evaluateRetryEligibility } from './staleness.ts';
import { computeOverallStatus } from './status.ts';
import { ANFRAGE_SENDER_EMAIL, BAND_TEMPLATE_VERSION, CONFIRMATION_TEMPLATE_VERSION, CURRENT_DATENSCHUTZ_VERSION } from './constants.ts';
import type { MailSendOutcome, SubmitAnfrageResult } from './types.ts';

// Gemeinsame Abhaengigkeiten fuer alle exportierten Funktionen dieser Datei.
// Client und Resend-Client-Fabrik werden bewusst als Pflichtparameter
// uebergeben (Dependency Injection, gleiches Muster wie
// lib/anfrage/resolveBands.ts und lib/anfrage/mailSend.ts) -- dadurch bleibt
// diese Datei trotz 'server-only' (Orchestrierung bleibt serverseitig)
// vollstaendig ueber Fake-Client per node:test testbar: der reale, gecachte
// Client wird ausschliesslich an den Aufrufstellen (app/api/anfrage/route.ts,
// app/admin/anfragen/actions.ts) aufgeloest. getResendClient ist eine
// FABRIK (kein bereits konstruierter Client), damit RESEND_API_KEY weiterhin
// erst unmittelbar vor dem ersten tatsaechlichen Sendeversuch ausgewertet
// wird (fail-closed bei fehlendem Key, exakt wie zuvor) und nicht schon beim
// Aufbau der Abhaengigkeiten.
export type AnfrageServiceDeps = {
  client: SupabaseClient;
  getResendClient: () => ResendEmailsClient;
};

type StatusPatch = {
  status: 'gesendet' | 'fehlgeschlagen' | 'ungeklaert';
  sentAt: string | null;
  messageId: string | null;
  errorMessage: string | null;
};

function computeFinalStatusPatch(outcome: MailSendOutcome, attemptTimeIso: string): StatusPatch {
  if (outcome.status === 'gesendet') {
    return { status: 'gesendet', sentAt: attemptTimeIso, messageId: outcome.messageId, errorMessage: null };
  }
  return { status: outcome.status, sentAt: null, messageId: null, errorMessage: outcome.errorMessage };
}

// Auf anfrage_bands eingebettete Anfragewerte (Block "Bandanfrage-Mail V3"),
// nur fuer den v2-HTML-Renderer benoetigt. Diese Werte werden auf der
// anfragen-Zeile nach dem Erstschreiben nie mehr veraendert (kein UPDATE
// irgendwo im Code beruehrt sie) -- damit ohne Schemaaenderung fuer
// spaetere Retries verfuegbar.
type AnfrageBandSendRowAnfrage = {
  anlass: string | null;
  datum_text: string;
  plz_ort: string | null;
  location: string | null;
  telefon: string | null;
  vorname: string;
  nachname: string | null;
  nachricht: string | null;
};

export type AnfrageBandSendRow = {
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
  created_at: string;
  template_version: string;
  band_name_snapshot: string;
  // PostgREST liefert eine per Fremdschluessel eingebettete Eltern-Zeile je
  // nach Abfragekontext als Objekt oder als Array mit einem Element (siehe
  // exakt dasselbe Muster in lib/supabase/normalizeBand.ts::asArr) --
  // deshalb defensiv als Union getypt und beim Zugriff normalisiert.
  anfragen: AnfrageBandSendRowAnfrage | AnfrageBandSendRowAnfrage[] | null;
  // Eingebettet ueber den bereits bestehenden anfrage_bands.band_id-FK
  // (Block "Bandmail V3.1") -- keine neue Spalte, kein neuer Snapshot: der
  // Bandseiten-Link wird bei jedem Versand/Retry live ueber diese Relation
  // aufgeloest, genau wie anfragen(...) oben. Gleiche Array/Objekt-Union
  // aus demselben PostgREST-Grund.
  bands: { slug: string } | { slug: string }[] | null;
};

// Waehlt anhand der auf der Zeile gespeicherten template_version den
// passenden Renderer und ruft Resend auf. 'v1' bleibt bewusst als Literal
// stehen (nicht als Konstante) -- v1 ist historisch eingefroren und aendert
// sich nie mehr, unabhaengig davon, welchen Wert BAND_TEMPLATE_VERSION
// spaeter fuer neue Versionen annimmt. Eine unbekannte Version sendet
// NICHTS (fail closed, Owner-Entscheidung) und nutzt denselben bestehenden
// 'fehlgeschlagen'-Pfad wie ein echter Resend-Fehler -- kein neuer
// Fehlermechanismus.
async function renderAndSendBandMail(
  row: AnfrageBandSendRow,
  getResendClient: () => ResendEmailsClient
): Promise<MailSendOutcome> {
  let html: string;

  if (row.template_version === 'v1') {
    html = renderHtmlFromTextSnapshot(row.subject, row.body_text);
  } else if (row.template_version === BAND_TEMPLATE_VERSION) {
    const anfrageRow = Array.isArray(row.anfragen) ? row.anfragen[0] : row.anfragen;
    if (!anfrageRow) {
      return {
        status: 'fehlgeschlagen',
        errorMessage: `Anfragedaten fuer Template-Version ${row.template_version} nicht verfuegbar`,
      };
    }
    const bandRow = Array.isArray(row.bands) ? row.bands[0] : row.bands;
    const content: BandMailV2Content = {
      bandName: row.band_name_snapshot,
      bandSlug: bandRow?.slug ?? null,
      vorname: anfrageRow.vorname,
      nachname: anfrageRow.nachname,
      email: row.reply_to,
      telefon: anfrageRow.telefon,
      anlass: anfrageRow.anlass,
      datumText: anfrageRow.datum_text,
      location: anfrageRow.location,
      plzOrt: anfrageRow.plz_ort,
      nachricht: anfrageRow.nachricht,
    };
    html = renderBandMailV2Html(content);
  } else {
    console.error('[anfrage] Unbekannte Band-Template-Version -- fail closed, kein Versand', {
      anfrage_band_id: row.id,
      template_version: row.template_version,
    });
    return {
      status: 'fehlgeschlagen',
      errorMessage: `Unbekannte Template-Version: ${row.template_version}`,
    };
  }

  return sendMailViaResend(
    {
      to: row.recipient_email,
      replyTo: row.reply_to,
      subject: row.subject,
      bodyText: row.body_text,
      html,
      idempotencyKey: row.provider_idempotency_key,
    },
    getResendClient()
  );
}

// Codex-Nachtrag PR #26, Befund 1: attempts/last_attempt_at werden JETZT in
// einem eigenen Schreibvorgang VOR dem Resend-Aufruf persistiert (vorher:
// erst nach Rueckkehr des Aufrufs -- ein Prozessabbruch dazwischen liess die
// Zeile dauerhaft auf attempts=0/last_attempt_at=null stehen, siehe
// lib/anfrage/staleness.ts). Schlaegt bereits diese Markierung fehl, wird
// KEIN Resend-Aufruf gestartet, der Fehler wird sicher geloggt, und die Zeile
// bleibt unveraendert -- sie wird spaeter ueber die Stale-Pending-Regel
// erneut als retrybar erkannt statt fälschlich als gesendet zu gelten.
export async function sendAndPersistBandMail(
  client: SupabaseClient,
  row: AnfrageBandSendRow,
  getResendClient: () => ResendEmailsClient
): Promise<void> {
  const attemptTimeIso = new Date().toISOString();
  const nextAttempts = row.attempts + 1;

  const { error: markError } = await client
    .from('anfrage_bands')
    .update({ attempts: nextAttempts, last_attempt_at: attemptTimeIso })
    .eq('id', row.id);

  if (markError) {
    console.error('[anfrage] Attempt-Markierung vor Band-Mail-Versand fehlgeschlagen -- Resend-Aufruf uebersprungen', {
      table: 'anfrage_bands',
      anfrage_band_id: row.id,
      error: markError.message,
    });
    return;
  }

  const outcome = await renderAndSendBandMail(row, getResendClient);

  const patch = computeFinalStatusPatch(outcome, attemptTimeIso);
  await client
    .from('anfrage_bands')
    .update({
      send_status: patch.status,
      sent_at: patch.sentAt,
      resend_message_id: patch.messageId,
      error_message: patch.errorMessage,
    })
    .eq('id', row.id);
}

export type AnfrageConfirmationRow = {
  id: string;
  confirmation_recipient: string;
  confirmation_reply_to: string | null;
  confirmation_subject: string;
  confirmation_body_text: string;
  confirmation_provider_idempotency_key: string;
  confirmation_attempts: number;
  confirmation_status: string;
  confirmation_last_attempt_at: string | null;
  created_at: string;
};

// Codex-Nachtrag PR #26, Befund 2: identisches Vorab-Markierungsmuster wie
// sendAndPersistBandMail, nur auf anfragen.confirmation_*.
export async function sendAndPersistConfirmation(
  client: SupabaseClient,
  row: AnfrageConfirmationRow,
  getResendClient: () => ResendEmailsClient
): Promise<void> {
  const attemptTimeIso = new Date().toISOString();
  const nextAttempts = row.confirmation_attempts + 1;

  const { error: markError } = await client
    .from('anfragen')
    .update({ confirmation_attempts: nextAttempts, confirmation_last_attempt_at: attemptTimeIso })
    .eq('id', row.id);

  if (markError) {
    console.error('[anfrage] Attempt-Markierung vor Bestaetigungs-Versand fehlgeschlagen -- Resend-Aufruf uebersprungen', {
      table: 'anfragen',
      anfrage_id: row.id,
      error: markError.message,
    });
    return;
  }

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

  const patch = computeFinalStatusPatch(outcome, attemptTimeIso);
  await client
    .from('anfragen')
    .update({
      confirmation_status: patch.status,
      confirmation_sent_at: patch.sentAt,
      confirmation_message_id: patch.messageId,
      confirmation_error: patch.errorMessage,
    })
    .eq('id', row.id);
}

async function recomputeOverallStatus(client: SupabaseClient, anfrageId: string): Promise<void> {
  const { data: rows } = await client.from('anfrage_bands').select('send_status').eq('anfrage_id', anfrageId);
  const statuses = (rows ?? []).map((r) => r.send_status as import('./types.ts').SendStatus);
  const overall = computeOverallStatus(statuses);
  await client.from('anfragen').update({ status: overall }).eq('id', anfrageId);
}

// Ein Fehler bei einer Band-Mail darf weder die uebrigen Band-Mails noch
// die Veranstalter-Bestaetigung verhindern: Promise.allSettled fuer die
// Band-Mails, die Bestaetigung wird IMMER im Anschluss versucht,
// unabhaengig vom Ergebnis der Band-Mails.
async function sendAllBandMailsAndConfirmation(
  client: SupabaseClient,
  anfrageId: string,
  getResendClient: () => ResendEmailsClient
): Promise<void> {
  const { data: bandRows } = await client
    .from('anfrage_bands')
    .select(
      'id, anfrage_id, recipient_email, reply_to, subject, body_text, provider_idempotency_key, send_status, attempts, last_attempt_at, created_at, template_version, band_name_snapshot, anfragen(anlass, datum_text, plz_ort, location, telefon, vorname, nachname, nachricht), bands(slug)'
    )
    .eq('anfrage_id', anfrageId);

  await Promise.allSettled(
    ((bandRows ?? []) as AnfrageBandSendRow[]).map((row) => sendAndPersistBandMail(client, row, getResendClient))
  );

  const { data: confirmationRow } = await client
    .from('anfragen')
    .select(
      'id, confirmation_recipient, confirmation_reply_to, confirmation_subject, confirmation_body_text, confirmation_provider_idempotency_key, confirmation_attempts, confirmation_status, confirmation_last_attempt_at, created_at'
    )
    .eq('id', anfrageId)
    .maybeSingle();
  if (confirmationRow) {
    await sendAndPersistConfirmation(client, confirmationRow as AnfrageConfirmationRow, getResendClient);
  }

  await recomputeOverallStatus(client, anfrageId);
}

export type SubmitAnfrageContext = { ipHash: string };

// Orchestriert den vollstaendigen nativen Anfrageablauf: validieren ->
// Rate-Limit (fail-closed bei technischem Fehler) -> Bands aufloesen ->
// Mailinhalte rendern + Provider-Idempotency-Keys festlegen -> atomar
// persistieren -> Band-Mails versenden -> Bestaetigung versenden ->
// Versandstatus/Gesamtstatus aktualisieren. Unabhaengig genug, um aus der
// API-Route UND aus Tests aufgerufen zu werden, ohne Geschaeftslogik zu
// duplizieren.
export async function submitAnfrage(
  rawBody: unknown,
  ctx: SubmitAnfrageContext,
  deps: AnfrageServiceDeps
): Promise<SubmitAnfrageResult> {
  const parsed = parseAnfrageSubmission(rawBody);
  if (!parsed.ok) {
    if (parsed.reason === 'bot') return { kind: 'bot_silent' };
    return { kind: 'validation_error', message: parsed.message };
  }
  const input = parsed.data;

  const rateLimit = await checkAndConsumeRateLimit(deps.client, ctx.ipHash);
  if (rateLimit.status === 'fail_closed') {
    // Codex-Nachtrag PR #26, Befund 3: kein stiller fail-open-Pfad mehr --
    // ein technisch fehlgeschlagenes Rate-Limit blockiert die gesamte
    // Anfrage, bevor irgendetwas persistiert oder versendet wird.
    return { kind: 'temporarily_unavailable' };
  }
  if (rateLimit.status === 'blocked') {
    return { kind: 'rate_limited', retryAfterSeconds: rateLimit.retryAfterSeconds };
  }

  const client = deps.client;

  // Bandname und Empfaengeradresse kommen NIE vom Client -- ausschliesslich
  // serverseitig aus Supabase aufgeloest. Kann eine Band nicht eindeutig als
  // aktive Band mit gueltigem Anfragekontakt aufgeloest werden, wird die
  // GESAMTE Anfrage vor jeder Persistenz abgelehnt.
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
    const rendered = renderBandMailV2(input, band);
    return {
      id: anfrageBandId,
      band_id: band.bandId,
      position: index + 1,
      band_name_snapshot: band.name,
      recipient_email: band.recipientEmail,
      reply_to: input.email,
      template_version: BAND_TEMPLATE_VERSION,
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
    confirmation_template_version: CONFIRMATION_TEMPLATE_VERSION,
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
    // Insert, kein erneuter Versand, keine erhoehten Attempts (DoD 6/17).
    return { kind: 'accepted' };
  }

  await sendAllBandMailsAndConfirmation(client, result.anfrage_id, deps.getResendClient);

  return { kind: 'accepted' };
}

export type RetryOutcome =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'already_sent' | 'not_stale_yet' | 'protection_window_expired' };

// Admin-Retry fuer eine EINZELNE fehlgeschlagene/ungeklaerte/veraltet-
// ausstehende Band-Mail. Verwendet unveraendert denselben
// provider_idempotency_key sowie Empfaenger-/Reply-To-/Betreff-/
// Body-Snapshot wie beim urspruenglichen Versuch. Bereits gesendete Zeilen
// sind unantastbar; frisches 'ausstehend' (< 5 Minuten) ist bewusst NICHT
// retrybar (moeglicherweise laeuft noch ein echter Versuch).
export async function retryBandSend(anfrageBandId: string, deps: AnfrageServiceDeps): Promise<RetryOutcome> {
  const { data: row } = await deps.client
    .from('anfrage_bands')
    .select(
      'id, anfrage_id, recipient_email, reply_to, subject, body_text, provider_idempotency_key, send_status, attempts, last_attempt_at, created_at, template_version, band_name_snapshot, anfragen(anlass, datum_text, plz_ort, location, telefon, vorname, nachname, nachricht), bands(slug)'
    )
    .eq('id', anfrageBandId)
    .maybeSingle();

  if (!row) return { ok: false, reason: 'not_found' };

  const eligibility = evaluateRetryEligibility({
    status: row.send_status,
    lastAttemptAt: row.last_attempt_at,
    createdAt: row.created_at,
    now: new Date(),
  });
  if (!eligibility.eligible) return { ok: false, reason: eligibility.reason };

  await sendAndPersistBandMail(deps.client, row as AnfrageBandSendRow, deps.getResendClient);
  await recomputeOverallStatus(deps.client, row.anfrage_id);
  return { ok: true };
}

// Admin-Retry fuer die Veranstalter-Bestaetigung -- identische Regeln wie
// retryBandSend, nur auf anfragen.confirmation_* statt anfrage_bands.
export async function retryConfirmation(anfrageId: string, deps: AnfrageServiceDeps): Promise<RetryOutcome> {
  const { data: row } = await deps.client
    .from('anfragen')
    .select(
      'id, confirmation_recipient, confirmation_reply_to, confirmation_subject, confirmation_body_text, confirmation_provider_idempotency_key, confirmation_attempts, confirmation_status, confirmation_last_attempt_at, created_at'
    )
    .eq('id', anfrageId)
    .maybeSingle();

  if (!row) return { ok: false, reason: 'not_found' };

  const eligibility = evaluateRetryEligibility({
    status: row.confirmation_status,
    lastAttemptAt: row.confirmation_last_attempt_at,
    createdAt: row.created_at,
    now: new Date(),
  });
  if (!eligibility.eligible) return { ok: false, reason: eligibility.reason };

  await sendAndPersistConfirmation(deps.client, row as AnfrageConfirmationRow, deps.getResendClient);
  return { ok: true };
}
