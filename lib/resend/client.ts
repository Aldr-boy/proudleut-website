import 'server-only';
import { Resend } from 'resend';

// Zentraler, ausschliesslich serverseitiger Resend-Client-Wrapper.
// 'server-only' laesst den Build fehlschlagen, falls dies versehentlich in
// eine 'use client'-Komponente importiert wird. Fehlende Env-Variable wird
// fail-closed behandelt (kein stiller No-Op-Versand).
//
// Benoetigte Env-Variablen (Namen dokumentiert, Werte NICHT im Repo):
//   RESEND_API_KEY              — Resend API-Key
//   ANFRAGE_RATE_LIMIT_SALT     — Secret zum Hashen der Rate-Limit-IP
//                                  (siehe lib/anfrage/rateLimit.ts)
//   Absolute Links in Mails kommen aus SITE_URL (lib/seo/metadata.ts), nicht aus einer Env-Variable.

let cachedClient: Resend | null = null;

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY ist nicht gesetzt — Mailversand fail-closed abgebrochen');
  }
  if (!cachedClient) {
    cachedClient = new Resend(apiKey);
  }
  return cachedClient;
}

// Erlaubt Tests, den gecachten Client zwischen Faellen zurueckzusetzen.
export function __resetResendClientForTests(): void {
  cachedClient = null;
}
