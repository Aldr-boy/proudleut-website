import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { parseBandIntroSubmission } from './validation.ts';
import { checkAndConsumeRateLimit } from '../anfrage/rateLimit.ts';
import {
  renderBandIntroConfirmationMail,
  renderBandIntroConfirmationMailHtml,
  renderBandIntroInternalNotification,
  renderBandIntroInternalNotificationHtml,
} from './mailTemplates.ts';
import { sendMailViaResend } from '../anfrage/mailSend.ts';
import type { ResendEmailsClient } from '../anfrage/mailSend.ts';
import {
  CURRENT_DATENSCHUTZ_VERSION,
  BAND_INTRO_TEMPLATE_VERSION,
  BAND_INTRO_SENDER_EMAIL,
  getBandIntroNotifyEmail,
} from './constants.ts';
import type { SubmitBandIntroResult } from './types.ts';

// Gleiches Dependency-Injection-Muster wie lib/anfrage/service.ts: Client und
// Resend-Client-Fabrik werden als Pflichtparameter uebergeben, damit diese
// Datei ohne Next.js-Request-Kontext per node:test mit einem Fake-Client
// testbar bleibt. Der reale, gecachte Client wird ausschliesslich in
// app/api/band-introductions/route.ts aufgeloest.
export type BandIntroServiceDeps = {
  client: SupabaseClient;
  getResendClient: () => ResendEmailsClient;
};

export type SubmitBandIntroContext = { ipHash: string };

const UNIQUE_VIOLATION = '23505';

// Orchestriert den vollstaendigen Bandvorstellungs-Ablauf in der im Auftrag
// vorgegebenen Reihenfolge (Abschnitt 20): validieren -> Rate-Limit
// (fail-closed) -> speichern -> Bestaetigungsmail an die Band ->
// interne Benachrichtigung an Xandi -> Ergebnis. Eine Band bekommt niemals
// einen erfolgreichen Submit angezeigt, wenn ihre Vorstellung nicht
// gespeichert wurde -- Mailversand-Fehler (Schritt 3/4) aendern das
// Ergebnis 'accepted' nicht mehr, sie beeinflussen ausschliesslich
// confirmationMailSent im Rueckgabewert (siehe Fall B/C, Auftrag
// Abschnitt 32).
export async function submitBandIntro(
  rawBody: unknown,
  ctx: SubmitBandIntroContext,
  deps: BandIntroServiceDeps
): Promise<SubmitBandIntroResult> {
  const parsed = parseBandIntroSubmission(rawBody);
  if (!parsed.ok) {
    if (parsed.reason === 'bot') return { kind: 'bot_silent' };
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

  const id = randomUUID();
  const nowIso = new Date().toISOString();

  const payload = {
    id,
    idempotency_key: input.idempotencyKey,
    band_name: input.bandName,
    region: input.region,
    website_url: input.websiteUrl,
    additional_links: input.additionalLinks,
    description: input.description,
    first_name: input.firstName,
    last_name: input.lastName,
    nickname: input.nickname,
    email: input.email,
    phone: input.phone,
    datenschutz_accepted_at: nowIso,
    datenschutz_version: CURRENT_DATENSCHUTZ_VERSION,
  };

  // service_role hat auf band_introductions ausschliesslich INSERT (siehe
  // supabase/band_introductions_migration.sql) -- kein .select() danach,
  // damit kein SELECT-Recht benoetigt wird. Die id ist bereits bekannt
  // (oben per randomUUID() erzeugt), ein Read-Back ist nicht noetig.
  const { error: insertError } = await deps.client.from('band_introductions').insert(payload);

  if (insertError) {
    if (insertError.code === UNIQUE_VIOLATION) {
      // Doppel-Submit mit bereits bekanntem idempotency_key (z. B.
      // technischer Retry nach Netzwerk-Timeout): kein erneuter Insert,
      // kein erneuter Versand -- die urspruengliche Zeile ist bereits
      // gespeichert und hat ihre Mails bereits (oder gerade) erhalten.
      return { kind: 'accepted', id, confirmationMailSent: false };
    }
    console.error('[bandIntro] Persistenz fehlgeschlagen', insertError);
    return { kind: 'server_error' };
  }

  // Schritt 3: Bestaetigungsmail an die Band. Ein Fehlschlag hier darf die
  // bereits erfolgreiche Persistenz nicht in einen Fehler verwandeln (Fall
  // B) -- confirmationMailSent spiegelt ausschliesslich den tatsaechlichen
  // Sendeerfolg wider, damit der Client niemals einen Mailversand behauptet,
  // der nicht stattgefunden hat.
  let confirmationMailSent = false;
  try {
    const confirmationRendered = renderBandIntroConfirmationMail({
      bandName: input.bandName,
      firstName: input.firstName,
      nickname: input.nickname,
    });
    const confirmationHtml = renderBandIntroConfirmationMailHtml({
      bandName: input.bandName,
      firstName: input.firstName,
      nickname: input.nickname,
    });
    const outcome = await sendMailViaResend(
      {
        to: input.email,
        // Antworten der Band muessen an eine tatsaechlich ueberwachte
        // proudleut-Adresse gehen (Auftrag Abschnitt 26) -- bevorzugt die
        // konfigurierte interne Benachrichtigungsadresse, sonst die
        // bestehende, bereits ueberwachte proudleut-Absenderadresse.
        replyTo: getBandIntroNotifyEmail() ?? BAND_INTRO_SENDER_EMAIL,
        subject: confirmationRendered.subject,
        bodyText: confirmationRendered.bodyText,
        html: confirmationHtml,
        idempotencyKey: `band-intro/${id}/confirmation/${BAND_INTRO_TEMPLATE_VERSION}`,
      },
      deps.getResendClient()
    );
    confirmationMailSent = outcome.status === 'gesendet';
    if (outcome.status !== 'gesendet') {
      console.error('[bandIntro] Bestaetigungsmail an Band fehlgeschlagen', {
        band_introduction_id: id,
        status: outcome.status,
        error: outcome.errorMessage,
      });
    }
  } catch (err) {
    console.error('[bandIntro] Bestaetigungsmail an Band technisch fehlgeschlagen (Exception)', {
      band_introduction_id: id,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Schritt 4: interne Benachrichtigung an Xandi. Fehlt die
  // Empfaengeradresse (BAND_INTRO_NOTIFY_EMAIL nicht gesetzt) oder schlaegt
  // der Versand fehl, wird ausschliesslich dieser Schritt uebersprungen
  // (Fall C) -- kein Rollback der bereits gespeicherten Bandvorstellung.
  const notifyEmail = getBandIntroNotifyEmail();
  if (!notifyEmail) {
    console.error('[bandIntro] BAND_INTRO_NOTIFY_EMAIL ist nicht gesetzt -- interne Benachrichtigung uebersprungen', {
      band_introduction_id: id,
    });
  } else {
    try {
      const createdAtDisplay = new Date(nowIso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
      // confirmationMailSent ist an dieser Stelle final (Schritt 3 ist
      // bereits abgeschlossen) -- false deckt sowohl einen expliziten
      // Resend-Fehlschlag als auch eine Exception waehrend des Sendeversuchs
      // ab (Nachfass-Paket Abschnitt 10).
      const internalContent = { ...input, id, createdAtDisplay, confirmationMailFailed: !confirmationMailSent };
      const internalRendered = renderBandIntroInternalNotification(internalContent);
      const internalHtml = renderBandIntroInternalNotificationHtml(internalContent);
      const outcome = await sendMailViaResend(
        {
          to: notifyEmail,
          replyTo: input.email,
          subject: internalRendered.subject,
          bodyText: internalRendered.bodyText,
          html: internalHtml,
          idempotencyKey: `band-intro/${id}/internal/${BAND_INTRO_TEMPLATE_VERSION}`,
        },
        deps.getResendClient()
      );
      if (outcome.status !== 'gesendet') {
        console.error('[bandIntro] Interne Benachrichtigung fehlgeschlagen', {
          band_introduction_id: id,
          status: outcome.status,
          error: outcome.errorMessage,
        });
      }
    } catch (err) {
      console.error('[bandIntro] Interne Benachrichtigung technisch fehlgeschlagen (Exception)', {
        band_introduction_id: id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { kind: 'accepted', id, confirmationMailSent };
}
