import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { parseKontaktSubmission } from './validation.ts';
import { renderKontaktNotificationMail } from './mailTemplates.ts';
import { getKontaktNotifyEmail } from './constants.ts';
import { checkAndConsumeRateLimit } from '../anfrage/rateLimit.ts';
import { sendMailViaResend } from '../anfrage/mailSend.ts';
import type { ResendEmailsClient } from '../anfrage/mailSend.ts';
import type { SubmitKontaktResult } from './types.ts';

// Gleiches Dependency-Injection-Muster wie lib/anfrage/service.ts und
// lib/bandIntro/service.ts: Client und Resend-Client-Fabrik werden als
// Pflichtparameter uebergeben, damit diese Datei ohne Next.js-Request-Kontext
// per node:test mit einem Fake-Client testbar bleibt. Der reale, gecachte
// Client wird ausschliesslich in app/api/kontakt/route.ts aufgeloest.
export type KontaktServiceDeps = {
  client: SupabaseClient;
  getResendClient: () => ResendEmailsClient;
};

export type SubmitKontaktContext = { ipHash: string };

// Orchestriert den vollstaendigen /api/kontakt-Ablauf (Option B, Auftrag
// L-A1b): validieren -> Rate-Limit (fail-closed, eigener Namensraum) ->
// Konfiguration pruefen -> Mail an Xandi senden. KEINE Persistenz -- ohne
// Speicherzeile gibt es hier bewusst keinen "angenommen, Mail folgt
// spaeter"-Zustand wie bei lib/anfrage/service.ts: der Client erfaehrt genau
// dann 'accepted', wenn die Mail nachweislich von Resend angenommen wurde,
// sonst ausschliesslich ehrliche Fehler-Kinds -- niemals ok:true ohne
// tatsaechlichen Versand.
export async function submitKontakt(
  rawBody: unknown,
  ctx: SubmitKontaktContext,
  deps: KontaktServiceDeps
): Promise<SubmitKontaktResult> {
  const parsed = parseKontaktSubmission(rawBody);
  if (!parsed.ok) {
    if (parsed.reason === 'bot') return { kind: 'bot_silent' };
    if (parsed.reason === 'too_fast') {
      return {
        kind: 'too_fast',
        message: 'Das ging zu schnell – bitte sende deine Nachricht noch einmal ab.',
      };
    }
    return { kind: 'validation_error', message: parsed.message };
  }
  const input = parsed.data;

  const rateLimit = await checkAndConsumeRateLimit(deps.client, ctx.ipHash);
  if (rateLimit.status === 'fail_closed') {
    return { kind: 'temporarily_unavailable' };
  }
  if (rateLimit.status === 'blocked') {
    return { kind: 'rate_limited', retryAfterSeconds: rateLimit.retryAfterSeconds };
  }

  const notifyEmail = getKontaktNotifyEmail();
  if (!notifyEmail) {
    console.error('[kontakt] KONTAKT_NOTIFY_EMAIL ist nicht gesetzt -- fail-closed, kein Versand');
    return { kind: 'temporarily_unavailable' };
  }

  const rendered = renderKontaktNotificationMail(input);

  // sendMailViaResend faengt Exceptions bereits selbst ab und liefert dafuer
  // status:'ungeklaert' zurueck (siehe lib/anfrage/mailSend.ts) -- ein
  // zusaetzliches try/catch hier waere totes, nie erreichbares Fehlerhandling.
  const outcome = await sendMailViaResend(
    {
      to: notifyEmail,
      replyTo: input.email,
      subject: rendered.subject,
      bodyText: rendered.bodyText,
      idempotencyKey: `kontakt/${randomUUID()}`,
    },
    deps.getResendClient()
  );

  // Ohne Persistenz gibt es keinen spaeteren Retry -- sowohl 'fehlgeschlagen'
  // als auch 'ungeklaert' muessen deshalb ehrlich als Fehler an den Client
  // zurueckgemeldet werden (Freigabe-Auflage: nie ok:true ohne tatsaechlichen
  // Versand).
  if (outcome.status !== 'gesendet') {
    console.error('[kontakt] Mailversand nicht erfolgreich', {
      status: outcome.status,
      error: outcome.errorMessage,
    });
    return { kind: 'server_error' };
  }

  return { kind: 'accepted' };
}
