import { isWithinProviderIdempotencyProtectionWindow } from './mailSend.ts';
import type { AnfrageStatus, SendStatus } from './types.ts';

// Codex-Nachtrag PR #26, Befund 1/2: attempts/last_attempt_at werden jetzt
// VOR jedem Resend-Aufruf persistiert (siehe service.ts). Bricht der Prozess
// zwischen Anfragepersistenz und der ersten Versuchsmarkierung ab, bleibt
// eine Zeile auf send_status='ausstehend' mit attempts=0/last_attempt_at=null
// stehen -- der oeffentliche Doppel-Submit hilft hier absichtlich nicht
// (Idempotency verhindert genau das erneute Anstossen). Diese Datei
// definiert zentral, ab wann so eine Zeile als "veraltet" gilt und deshalb
// manuell im Admin wiederaufnehmbar sein muss.
export const STALE_PENDING_AFTER_MINUTES = 5;
const STALE_PENDING_MS = STALE_PENDING_AFTER_MINUTES * 60 * 1000;

// Massgeblicher Zeitpunkt: last_attempt_at, falls vorhanden, sonst created_at
// (deckt genau den Abbruch VOR der ersten Markierung ab).
export function resolveReferenceTimestamp(lastAttemptAt: string | null, createdAt: string): Date {
  return new Date(lastAttemptAt ?? createdAt);
}

export function isStalePending(lastAttemptAt: string | null, createdAt: string, now: Date): boolean {
  const reference = resolveReferenceTimestamp(lastAttemptAt, createdAt);
  return now.getTime() - reference.getTime() >= STALE_PENDING_MS;
}

export type RetryEligibility =
  | { eligible: true }
  | { eligible: false; reason: 'already_sent' | 'not_stale_yet' | 'protection_window_expired' };

// Einheitliche Retry-Berechtigung fuer Band-Mails UND die
// Veranstalter-Bestaetigung (identische Statuswerte 'ausstehend' |
// 'gesendet' | 'fehlgeschlagen' | 'ungeklaert' auf beiden Tabellen) --
// zentral hier definiert, damit lib/anfrage/service.ts (Server-Guard) und
// die Admin-Detailseite (UI-Anzeige, welcher Button erscheint) niemals
// auseinanderlaufen koennen.
//
// - 'gesendet' ist immer unantastbar.
// - 'fehlgeschlagen' ist immer sofort retrybar (Resend hat die Mail
//   nachweislich NICHT versendet).
// - 'ausstehend' ist erst ab STALE_PENDING_AFTER_MINUTES retrybar (davor:
//   moeglicherweise noch ein echt laufender Versuch) und unterliegt danach
//   demselben 24h-Schutzzeitraum wie 'ungeklaert'.
// - 'ungeklaert' unterliegt dem 24h-Schutzzeitraum.
export function evaluateRetryEligibility(params: {
  status: SendStatus;
  lastAttemptAt: string | null;
  createdAt: string;
  now: Date;
}): RetryEligibility {
  const { status, lastAttemptAt, createdAt, now } = params;

  if (status === 'gesendet') {
    return { eligible: false, reason: 'already_sent' };
  }

  if (status === 'fehlgeschlagen') {
    return { eligible: true };
  }

  if (status === 'ausstehend') {
    if (!isStalePending(lastAttemptAt, createdAt, now)) {
      return { eligible: false, reason: 'not_stale_yet' };
    }
    const reference = resolveReferenceTimestamp(lastAttemptAt, createdAt);
    if (!isWithinProviderIdempotencyProtectionWindow(reference, now)) {
      return { eligible: false, reason: 'protection_window_expired' };
    }
    return { eligible: true };
  }

  // 'ungeklaert'
  if (lastAttemptAt && !isWithinProviderIdempotencyProtectionWindow(new Date(lastAttemptAt), now)) {
    return { eligible: false, reason: 'protection_window_expired' };
  }
  return { eligible: true };
}

// Reexport fuer Aufrufer, die nur den Gesamtstatus-Typ brauchen (vermeidet
// einen weiteren Import von types.ts nur fuer diesen einen Typ).
export type { AnfrageStatus, SendStatus };
