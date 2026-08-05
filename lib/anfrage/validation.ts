import { MAX_BANDS_PER_ANFRAGE, MAX_LENGTHS } from './constants.ts';
import type { AnfrageSubmissionPayload, ParseResult } from './types.ts';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_REGEX = /^[a-z0-9-]+$/;
const IDEMPOTENCY_KEY_REGEX = /^[A-Za-z0-9_-]+$/;
const CRLF_REGEX = /[\r\n]/;
const MIN_SUBMIT_TIME_MS = 3000;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string';
}

function trimOrEmpty(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function hasCrlf(value: string): boolean {
  return CRLF_REGEX.test(value);
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && !hasCrlf(email) && email.length <= MAX_LENGTHS.email;
}

export function isValidBandSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug);
}

export function isValidIdempotencyKey(key: string): boolean {
  return (
    key.length >= MAX_LENGTHS.idempotencyKeyMin &&
    key.length <= MAX_LENGTHS.idempotencyKeyMax &&
    IDEMPOTENCY_KEY_REGEX.test(key)
  );
}

// Prueft, ob die 1-8-Band-Auswahl gueltig ist: mindestens 1, hoechstens
// MAX_BANDS_PER_ANFRAGE, keine Duplikate, jeder Eintrag ein gueltiger Slug.
// Serverseitiger Backstop zum bereits bestehenden clientseitigen Cap in
// stores/anfrageStore.ts.
export function validateBandSlugs(raw: unknown): { ok: true; slugs: string[] } | { ok: false; message: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, message: 'Bitte wähle mindestens eine Band aus.' };
  }
  if (raw.length > MAX_BANDS_PER_ANFRAGE) {
    return { ok: false, message: `Es können maximal ${MAX_BANDS_PER_ANFRAGE} Bands gleichzeitig angefragt werden.` };
  }
  const slugs: string[] = [];
  for (const entry of raw) {
    if (!isNonEmptyString(entry)) {
      return { ok: false, message: 'Ungültige Bandauswahl.' };
    }
    const slug = entry.trim();
    if (!isValidBandSlug(slug)) {
      return { ok: false, message: 'Ungültige Bandauswahl.' };
    }
    slugs.push(slug);
  }
  if (new Set(slugs).size !== slugs.length) {
    return { ok: false, message: 'Jede Band darf nur einmal ausgewählt werden.' };
  }
  return { ok: true, slugs };
}

// Bot-Erkennung: Honeypot befuellt ODER Submit innerhalb der
// Mindestzeit. Beides fuehrt im Aufrufer zu einer stillen 200-Antwort,
// damit Bots die Anfrage faelschlich fuer erfolgreich halten.
export function isLikelyBotSubmission(payload: Pick<AnfrageSubmissionPayload, 'firmaHidden' | 'websiteHidden' | 'openedAt'>): boolean {
  if (payload.firmaHidden || payload.websiteHidden) return true;
  if (typeof payload.openedAt === 'number' && Date.now() - payload.openedAt < MIN_SUBMIT_TIME_MS) return true;
  return false;
}

// Parst und validiert den vollstaendigen Anfrage-Payload aus dem
// AnfrageModal. Reine Funktion (kein I/O) -- direkt testbar, wird von
// lib/anfrage/service.ts als erster Schritt aufgerufen.
export function parseAnfrageSubmission(raw: unknown): ParseResult {
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

  const bandSlugsResult = validateBandSlugs(body.bandSlugs);
  if (!bandSlugsResult.ok) {
    return { ok: false, reason: 'validation', message: bandSlugsResult.message };
  }

  const vorname = trimOrEmpty(body.vorname);
  if (!vorname || vorname.length > MAX_LENGTHS.vorname) {
    return { ok: false, reason: 'validation', message: 'Vorname ist erforderlich' };
  }

  const nachname = trimOrEmpty(body.nachname);
  if (nachname.length > MAX_LENGTHS.nachname) {
    return { ok: false, reason: 'validation', message: 'Nachname ist zu lang' };
  }

  const email = trimOrEmpty(body.email);
  if (!email || !isValidEmail(email)) {
    return { ok: false, reason: 'validation', message: 'Bitte gib eine gültige E-Mail-Adresse ein' };
  }

  const telefon = trimOrEmpty(body.telefon);
  if (telefon.length > MAX_LENGTHS.telefon || hasCrlf(telefon)) {
    return { ok: false, reason: 'validation', message: 'Ungültige Telefonnummer' };
  }

  const anlass = trimOrEmpty(body.anlass);
  if (anlass.length > MAX_LENGTHS.anlass) {
    return { ok: false, reason: 'validation', message: 'Anlass ist zu lang' };
  }

  const datumText = trimOrEmpty(body.datumText ?? body.datum);
  if (!datumText || datumText.length > MAX_LENGTHS.datumText) {
    return { ok: false, reason: 'validation', message: 'Bitte gib einen Wunschtermin oder möglichen Zeitraum an' };
  }

  const location = trimOrEmpty(body.location ?? body.veranstaltungsort);
  if (location.length > MAX_LENGTHS.location) {
    return { ok: false, reason: 'validation', message: 'Veranstaltungsort ist zu lang' };
  }

  const plzOrt = trimOrEmpty(body.plzOrt ?? body.ort);
  if (plzOrt.length > MAX_LENGTHS.plzOrt) {
    return { ok: false, reason: 'validation', message: 'PLZ & Ort ist zu lang' };
  }

  const gaestezahl = trimOrEmpty(body.gaestezahl);
  if (gaestezahl.length > MAX_LENGTHS.gaestezahl) {
    return { ok: false, reason: 'validation', message: 'Gästezahl ist zu lang' };
  }

  const spielzeit = trimOrEmpty(body.spielzeit);
  if (spielzeit.length > MAX_LENGTHS.spielzeit) {
    return { ok: false, reason: 'validation', message: 'Spielzeit ist zu lang' };
  }

  const nachricht = trimOrEmpty(body.nachricht);
  if (nachricht.length > MAX_LENGTHS.nachricht) {
    return { ok: false, reason: 'validation', message: 'Nachricht ist zu lang' };
  }
  if (hasCrlf(vorname) || hasCrlf(nachname)) {
    return { ok: false, reason: 'validation', message: 'Ungültige Eingabe' };
  }

  if (body.datenschutz !== true) {
    return { ok: false, reason: 'validation', message: 'Datenschutz-Zustimmung fehlt' };
  }

  return {
    ok: true,
    data: {
      idempotencyKey,
      bandSlugs: bandSlugsResult.slugs,
      anlass: anlass || null,
      datumText,
      location: location || null,
      plzOrt: plzOrt || null,
      gaestezahl: gaestezahl || null,
      spielzeit: spielzeit || null,
      nachricht: nachricht || null,
      vorname,
      nachname: nachname || null,
      email,
      telefon: telefon || null,
    },
  };
}
