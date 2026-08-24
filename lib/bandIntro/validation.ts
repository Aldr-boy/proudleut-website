import { MAX_ADDITIONAL_LINKS, MAX_LENGTHS } from './constants.ts';
import type { BandIntroSubmissionPayload, ParseResult } from './types.ts';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/\S+$/i;
const IDEMPOTENCY_KEY_REGEX = /^[A-Za-z0-9_-]+$/;
const CRLF_REGEX = /[\r\n]/;
const MIN_SUBMIT_TIME_MS = 3000;

function trimOrEmpty(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function hasCrlf(value: string): boolean {
  return CRLF_REGEX.test(value);
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && !hasCrlf(email) && email.length <= MAX_LENGTHS.email;
}

export function isValidUrl(url: string, maxLength: number): boolean {
  return URL_REGEX.test(url) && !hasCrlf(url) && url.length <= maxLength;
}

export function isValidIdempotencyKey(key: string): boolean {
  return (
    key.length >= MAX_LENGTHS.idempotencyKeyMin &&
    key.length <= MAX_LENGTHS.idempotencyKeyMax &&
    IDEMPOTENCY_KEY_REGEX.test(key)
  );
}

// Trimmen, http(s)-URLs validieren, identische Duplikate entfernen
// (Reihenfolge der ersten Nennung bleibt erhalten), auf maximal 6 begrenzen.
// Leere Eintraege werden stillschweigend uebersprungen (z. B. ein leeres
// Eingabefeld, das die Band nicht ausgefuellt hat), damit "Website und
// zusaetzliche Links duerfen gemeinsam leer sein" nicht an einem einzelnen
// leeren Feld scheitert.
export function normalizeAdditionalLinks(
  raw: unknown
): { ok: true; links: string[] } | { ok: false; message: string } {
  if (raw === undefined || raw === null) return { ok: true, links: [] };
  if (!Array.isArray(raw)) {
    return { ok: false, message: 'Ungültige zusätzliche Links' };
  }

  const seen = new Set<string>();
  const links: string[] = [];

  for (const entry of raw) {
    const trimmed = typeof entry === 'string' ? entry.trim() : '';
    if (!trimmed) continue;
    if (!isValidUrl(trimmed, MAX_LENGTHS.additionalLinkUrl)) {
      return { ok: false, message: 'Bitte gib bei den zusätzlichen Links nur gültige Adressen an (z. B. https://instagram.com/eurename).' };
    }
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    links.push(trimmed);
  }

  if (links.length > MAX_ADDITIONAL_LINKS) {
    return { ok: false, message: `Es können maximal ${MAX_ADDITIONAL_LINKS} zusätzliche Links angegeben werden.` };
  }

  return { ok: true, links };
}

// Bot-Erkennung: identisches Muster wie lib/anfrage/validation.ts --
// Honeypot befuellt ODER Submit innerhalb der Mindestzeit.
export function isLikelyBotSubmission(
  payload: Pick<BandIntroSubmissionPayload, 'firmaHidden' | 'websiteHidden' | 'openedAt'>
): boolean {
  if (payload.firmaHidden || payload.websiteHidden) return true;
  if (typeof payload.openedAt === 'number' && Date.now() - payload.openedAt < MIN_SUBMIT_TIME_MS) return true;
  return false;
}

// Parst und validiert den vollstaendigen Bandvorstellungs-Payload. Reine
// Funktion (kein I/O) -- direkt testbar, wird von lib/bandIntro/service.ts
// als erster Schritt aufgerufen.
export function parseBandIntroSubmission(raw: unknown): ParseResult {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, reason: 'validation', message: 'Ungültige Anfrage' };
  }
  const body = raw as Record<string, unknown>;

  const firmaHidden = trimOrEmpty(body.firmaHidden ?? body.firma_hidden);
  const websiteHidden = trimOrEmpty(body.websiteHidden ?? body.website_hidden);
  const openedAt = typeof body.openedAt === 'number' ? body.openedAt : NaN;

  if (isLikelyBotSubmission({ firmaHidden, websiteHidden, openedAt })) {
    return { ok: false, reason: 'bot' };
  }

  const idempotencyKey = trimOrEmpty(body.idempotencyKey);
  if (!idempotencyKey || !isValidIdempotencyKey(idempotencyKey)) {
    return { ok: false, reason: 'validation', message: 'Ungültiger Anfrage-Schlüssel' };
  }

  const bandName = trimOrEmpty(body.bandName);
  if (!bandName || bandName.length > MAX_LENGTHS.bandName) {
    return { ok: false, reason: 'validation', message: 'Bitte gib euren Bandnamen an' };
  }

  const region = trimOrEmpty(body.region);
  if (!region || region.length > MAX_LENGTHS.region) {
    return { ok: false, reason: 'validation', message: 'Bitte gib euren Heimatort oder eure Region an' };
  }

  const websiteUrl = trimOrEmpty(body.websiteUrl);
  if (websiteUrl && !isValidUrl(websiteUrl, MAX_LENGTHS.websiteUrl)) {
    return { ok: false, reason: 'validation', message: 'Bitte gib eine gültige Website-Adresse an (z. B. https://eure-band.de).' };
  }

  const linksResult = normalizeAdditionalLinks(body.additionalLinks);
  if (!linksResult.ok) {
    return { ok: false, reason: 'validation', message: linksResult.message };
  }

  const description = trimOrEmpty(body.description);
  if (description.length < MAX_LENGTHS.descriptionMin) {
    return { ok: false, reason: 'validation', message: `Erzähl uns bitte etwas ausführlicher von euch (mindestens ${MAX_LENGTHS.descriptionMin} Zeichen).` };
  }
  if (description.length > MAX_LENGTHS.description) {
    return { ok: false, reason: 'validation', message: `Bitte kürzen – maximal ${MAX_LENGTHS.description} Zeichen.` };
  }

  const firstName = trimOrEmpty(body.firstName);
  if (!firstName || firstName.length > MAX_LENGTHS.firstName) {
    return { ok: false, reason: 'validation', message: 'Bitte gib deinen Vornamen an' };
  }

  const lastName = trimOrEmpty(body.lastName);
  if (lastName.length > MAX_LENGTHS.lastName) {
    return { ok: false, reason: 'validation', message: 'Nachname ist zu lang' };
  }

  const nickname = trimOrEmpty(body.nickname);
  if (nickname.length > MAX_LENGTHS.nickname) {
    return { ok: false, reason: 'validation', message: 'Spitzname ist zu lang' };
  }

  const email = trimOrEmpty(body.email);
  if (!email || !isValidEmail(email)) {
    return { ok: false, reason: 'validation', message: 'Bitte gib eine gültige E-Mail-Adresse ein' };
  }

  const phone = trimOrEmpty(body.phone);
  if (phone.length > MAX_LENGTHS.phone || hasCrlf(phone)) {
    return { ok: false, reason: 'validation', message: 'Ungültige Telefonnummer' };
  }

  if (hasCrlf(bandName) || hasCrlf(region) || hasCrlf(firstName) || hasCrlf(lastName) || hasCrlf(nickname)) {
    return { ok: false, reason: 'validation', message: 'Ungültige Eingabe' };
  }

  if (body.datenschutz !== true) {
    return { ok: false, reason: 'validation', message: 'Datenschutz-Zustimmung fehlt' };
  }

  return {
    ok: true,
    data: {
      idempotencyKey,
      bandName,
      region,
      websiteUrl: websiteUrl || null,
      additionalLinks: linksResult.links,
      description,
      firstName,
      lastName: lastName || null,
      nickname: nickname || null,
      email,
      phone: phone || null,
    },
  };
}
