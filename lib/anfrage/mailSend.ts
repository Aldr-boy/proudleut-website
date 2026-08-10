import type { Resend } from 'resend';
import { renderHtmlFromTextSnapshot } from './templates.ts';
import { ANFRAGE_SENDER_EMAIL, ANFRAGE_SENDER_NAME } from './constants.ts';
import type { MailSendOutcome } from './types.ts';

const PROVIDER_IDEMPOTENCY_PROTECTION_MS = 24 * 60 * 60 * 1000;

function safeErrorMessage(raw: string): string {
  // Sichere, gekuerzte Fehlermeldung fuers Admin-Log -- keine rohen
  // Provider-Interna/Stacktraces, passt in error_message (max. 2000 Zeichen).
  return raw.slice(0, 500);
}

export type SendMailParams = {
  to: string;
  replyTo: string;
  subject: string;
  bodyText: string;
  idempotencyKey: string;
  // Optional: bereits fertig gerendertes HTML (z. B. versionsspezifischer
  // Band-Mail-Renderer, siehe lib/anfrage/service.ts). Wird dieser
  // Parameter weggelassen, verhaelt sich die Funktion exakt wie zuvor und
  // leitet html weiterhin aus subject/bodyText her -- die
  // Veranstalter-Bestaetigung (Block "Bandanfrage-Mail V3": unveraendert)
  // nutzt deshalb bewusst weiterhin keinen expliziten html-Parameter.
  html?: string;
};

export type ResendEmailsClient = {
  emails: { send: Resend['emails']['send'] };
};

// Einziger Ort, der tatsaechlich mit Resend spricht. Ein von Resend
// zurueckgegebener Fehler (klare API-Antwort) gilt als 'fehlgeschlagen'.
// Eine Exception WAEHREND des Aufrufs (Netzwerkabbruch, Timeout,
// Prozessabbruch) gilt als 'ungeklaert' -- Resend hat die Mail
// moeglicherweise dennoch angenommen (DoD 18/19). html wird deterministisch
// aus dem uebergebenen Text-Snapshot erzeugt, niemals aus einer
// aktuellen/geaenderten Template-Version.
//
// Der Client wird bewusst als Pflichtparameter uebergeben (Dependency
// Injection, kein Modul-internes getResendClient()-Fallback) -- damit
// bleibt diese Datei frei von 'server-only'/Env-Zugriff und ist ohne
// Next.js-Request-Kontext direkt per node:test mit einem Fake-Client
// testbar (identisches Muster wie
// lib/bandImages/deleteBandImageIfUnreferenced.ts). Der echte,
// gecachte Client wird ausschliesslich in lib/anfrage/service.ts
// (server-only) aufgeloest und hier hereingereicht.
export async function sendMailViaResend(
  params: SendMailParams,
  resendClient: ResendEmailsClient
): Promise<MailSendOutcome> {
  const html = params.html ?? renderHtmlFromTextSnapshot(params.subject, params.bodyText);

  try {
    const { data, error } = await resendClient.emails.send(
      {
        from: `${ANFRAGE_SENDER_NAME} <${ANFRAGE_SENDER_EMAIL}>`,
        to: params.to,
        replyTo: params.replyTo,
        subject: params.subject,
        html,
        text: params.bodyText,
      },
      { idempotencyKey: params.idempotencyKey }
    );

    if (error) {
      return { status: 'fehlgeschlagen', errorMessage: safeErrorMessage(error.message) };
    }
    if (!data?.id) {
      return { status: 'ungeklaert', errorMessage: 'Kein eindeutiges Sendeergebnis von Resend erhalten' };
    }
    return { status: 'gesendet', messageId: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 'ungeklaert', errorMessage: safeErrorMessage(message) };
  }
}

// Innerhalb dieses Fensters darf ein 'ungeklaert'-Fall mit UNVERAENDERTEM
// Provider-Idempotency-Key sicher erneut angefragt werden (Resend schuetzt
// Wiederholungen mit demselben Key 24h vor Doppelversand). Ausserhalb kein
// automatischer Retry (DoD 18/19, Teilpaket 7 "Unklarer Versandzustand").
export function isWithinProviderIdempotencyProtectionWindow(lastAttemptAt: Date, now: Date): boolean {
  return now.getTime() - lastAttemptAt.getTime() < PROVIDER_IDEMPOTENCY_PROTECTION_MS;
}
