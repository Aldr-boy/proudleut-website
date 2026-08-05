import { LEGAL_LINKS } from './constants.ts';
import type { NormalizedAnfrageInput, ResolvedBand } from './types.ts';

export type RenderedMail = { subject: string; bodyText: string };

function line(label: string, value: string | null): string {
  return value ? `${label}: ${value}` : '';
}

function joinNonEmpty(lines: string[]): string {
  return lines.filter((l) => l.trim() !== '').join('\n');
}

// Individuelle Mail an EINE Band. Nennt ausschliesslich diese Band --
// erwaehnt niemals andere in derselben Anfrage ausgewaehlte Bands (siehe
// docs/anfragesystem-uebergabe.md: "Keine Massenanfrage-Wirkung fuer
// Bands").
export function renderBandMail(input: NormalizedAnfrageInput, band: ResolvedBand): RenderedMail {
  const veranstalterName = [input.vorname, input.nachname].filter(Boolean).join(' ');
  const subject = `Neue Anfrage über proudleut.com für ${band.name}`;

  const bodyText = joinNonEmpty([
    `Hallo ${band.name}-Team,`,
    '',
    `über proudleut.com hat ${veranstalterName} eine Anfrage für euch gestellt.`,
    '',
    'Veranstaltung:',
    line('Anlass', input.anlass),
    line('Wunschtermin oder möglicher Zeitraum', input.datumText),
    line('PLZ & Ort', input.plzOrt),
    line('Veranstaltungsort', input.location),
    line('Gästezahl ca.', input.gaestezahl),
    line('Spielzeit', input.spielzeit),
    '',
    input.nachricht ? `Persönliche Nachricht von ${input.vorname}:\n${input.nachricht}` : '',
    '',
    'Kontakt:',
    line('Name', veranstalterName || null),
    line('E-Mail', input.email),
    line('Telefon', input.telefon),
    '',
    `Bitte antwortet direkt auf diese E-Mail (Antworten geht direkt an ${input.vorname}), um mit ${input.vorname} in Kontakt zu treten.`,
    '',
    '—',
    'proudleut.com',
    `Impressum: ${LEGAL_LINKS.impressumUrl}`,
    `Datenschutz: ${LEGAL_LINKS.datenschutzUrl}`,
  ]);

  return { subject, bodyText };
}

// EINE gemeinsame Bestaetigung an den Veranstalter. Bestaetigt nur den
// Eingang, keine Zusage/Verfuegbarkeit, keine internen Versanddetails,
// keine aehnlichen Bands (Produktentscheidungen 6/7).
export function renderConfirmationMail(input: NormalizedAnfrageInput, bands: ResolvedBand[]): RenderedMail {
  const subject =
    bands.length === 1
      ? `Deine Anfrage bei ${bands[0].name} ist eingegangen`
      : `Deine Anfrage bei ${bands.length} Bands ist eingegangen`;

  const bandList = bands.map((b) => `- ${b.name}`).join('\n');

  const bodyText = joinNonEmpty([
    `Hallo ${input.vorname},`,
    '',
    'vielen Dank für deine Anfrage über proudleut.com!',
    '',
    'Deine Anfrage ist bei uns eingegangen und wurde an folgende Band(s) weitergeleitet:',
    bandList,
    '',
    'Die Band(s) melden sich in der Regel direkt bei dir. Das ist keine Zusage und keine Verfügbarkeitsbestätigung — proudleut vermittelt ausschließlich den Kontakt.',
    '',
    'Deine Angaben:',
    line('Anlass', input.anlass),
    line('Wunschtermin oder möglicher Zeitraum', input.datumText),
    line('PLZ & Ort', input.plzOrt),
    line('Veranstaltungsort', input.location),
    '',
    input.nachricht ? `Deine Nachricht:\n${input.nachricht}` : '',
    '',
    '—',
    'proudleut.com',
    `Impressum: ${LEGAL_LINKS.impressumUrl}`,
    `Datenschutz: ${LEGAL_LINKS.datenschutzUrl}`,
  ]);

  return { subject, bodyText };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Erzeugt aus einem GESPEICHERTEN Text-Snapshot (subject/body_text) sicheres
// HTML fuer den tatsaechlichen Versand -- bewusst unabhaengig von der
// aktuellen Template-Version. Ein Retry sendet damit garantiert exakt den
// urspruenglich gerenderten und persistierten Inhalt, auch wenn sich
// renderBandMail/renderConfirmationMail zwischenzeitlich geaendert haben
// (Snapshot-Regel: historische Mailinhalte muessen nicht aus einer
// moeglicherweise geaenderten Template-Version rekonstruiert werden).
export function renderHtmlFromTextSnapshot(subject: string, bodyText: string): string {
  const safeSubject = escapeHtml(subject);
  const safeBody = escapeHtml(bodyText).replace(/\n/g, '<br />');
  return `<!doctype html><html lang="de"><head><meta charset="utf-8" /><title>${safeSubject}</title></head><body style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#1a1818;"><div>${safeBody}</div></body></html>`;
}
