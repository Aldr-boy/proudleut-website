import { MAX_LENGTHS, MIN_SUBMIT_TIME_MS } from './constants.ts';
import type { KontaktParseResult } from './types.ts';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CRLF_REGEX = /[\r\n]/;

function trimOrEmpty(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function hasCrlf(value: string): boolean {
  return CRLF_REGEX.test(value);
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && !hasCrlf(email) && email.length <= MAX_LENGTHS.email;
}

// Honeypot separat von der Mindestzeit gehalten (anders als
// lib/anfrage/validation.ts::isLikelyBotSubmission, die beides zu einem
// gemeinsamen "bot"-Fall zusammenfasst) -- Freigabe-Auflage Auftrag L-A1b:
// nur ein befuellter Honeypot gilt hier als Bot (stille Erfolgsantwort), ein
// zu frueher Submit bekommt eine ehrliche Fehlermeldung.
export function isHoneypotFilled(payload: Pick<KontaktSubmissionPayloadLike, 'firmaHidden' | 'websiteHidden'>): boolean {
  return Boolean(payload.firmaHidden || payload.websiteHidden);
}

export function isTooFast(openedAt: number): boolean {
  return typeof openedAt === 'number' && !Number.isNaN(openedAt) && Date.now() - openedAt < MIN_SUBMIT_TIME_MS;
}

type KontaktSubmissionPayloadLike = { firmaHidden: string; websiteHidden: string };

// Parst und validiert den vollstaendigen /api/kontakt-Payload. Reine Funktion
// (kein I/O) -- direkt testbar, wird von lib/kontakt/service.ts als erster
// Schritt aufgerufen. Reihenfolge bewusst: Honeypot -> Mindestzeit -> Felder,
// damit ein Bot-Treffer nie erst durch die (potenziell teurere) Feldvalidierung
// laeuft.
export function parseKontaktSubmission(raw: unknown): KontaktParseResult {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, reason: 'validation', message: 'Ungültige Anfrage' };
  }
  const body = raw as Record<string, unknown>;

  const firmaHidden = trimOrEmpty(body.firmaHidden ?? body.firma_hidden);
  const websiteHidden = trimOrEmpty(body.websiteHidden ?? body.website_hidden);
  const openedAt = typeof body.openedAt === 'number' ? body.openedAt : NaN;

  if (isHoneypotFilled({ firmaHidden, websiteHidden })) {
    return { ok: false, reason: 'bot' };
  }

  if (isTooFast(openedAt)) {
    return { ok: false, reason: 'too_fast' };
  }

  const anlass = trimOrEmpty(body.anlass);
  if (!anlass || anlass.length > MAX_LENGTHS.anlass) {
    return { ok: false, reason: 'validation', message: 'Bitte wähle ein Anliegen aus' };
  }

  const vorname = trimOrEmpty(body.vorname);
  if (!vorname || vorname.length > MAX_LENGTHS.vorname) {
    return { ok: false, reason: 'validation', message: 'Vor- und Nachname sind Pflichtfelder' };
  }

  const nachname = trimOrEmpty(body.nachname);
  if (!nachname || nachname.length > MAX_LENGTHS.nachname) {
    return { ok: false, reason: 'validation', message: 'Vor- und Nachname sind Pflichtfelder' };
  }

  const email = trimOrEmpty(body.email);
  if (!email || !isValidEmail(email)) {
    return { ok: false, reason: 'validation', message: 'Bitte gib eine gültige E-Mail-Adresse ein' };
  }

  const telefon = trimOrEmpty(body.telefon);
  if (telefon.length > MAX_LENGTHS.telefon || hasCrlf(telefon)) {
    return { ok: false, reason: 'validation', message: 'Ungültige Telefonnummer' };
  }

  const nachricht = trimOrEmpty(body.nachricht);
  if (!nachricht || nachricht.length > MAX_LENGTHS.nachricht) {
    return { ok: false, reason: 'validation', message: 'Bitte schreib eine kurze Nachricht' };
  }

  if (hasCrlf(vorname) || hasCrlf(nachname) || hasCrlf(anlass)) {
    return { ok: false, reason: 'validation', message: 'Ungültige Eingabe' };
  }

  if (body.datenschutz !== true) {
    return { ok: false, reason: 'validation', message: 'Datenschutz-Zustimmung fehlt' };
  }

  return {
    ok: true,
    data: {
      anlass,
      vorname,
      nachname,
      email,
      telefon: telefon || null,
      nachricht,
    },
  };
}
