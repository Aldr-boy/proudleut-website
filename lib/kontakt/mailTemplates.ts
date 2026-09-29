import type { NormalizedKontaktInput } from './types.ts';

export type RenderedMail = { subject: string; bodyText: string };

function line(label: string, value: string | null): string {
  return value ? `${label}: ${value}` : '';
}

function joinNonEmpty(lines: string[]): string {
  return lines.filter((l) => l.trim() !== '').join('\n');
}

// Reiner Text-Renderer -- kein eigenes HTML-Template. sendMailViaResend()
// erzeugt ohne expliziten html-Parameter automatisch escapetes HTML aus genau
// diesem Text (lib/anfrage/templates.ts::renderHtmlFromTextSnapshot,
// identisches Muster wie die historischen v1-Mails im Anfragesystem) -- fuer
// eine einzelne interne Benachrichtigung ohne Retry-/Versions-Anforderungen
// ist ein eigenes HTML-Layout nicht noetig.
export function renderKontaktNotificationMail(content: NormalizedKontaktInput): RenderedMail {
  const subject = `Kontaktformular: ${content.anlass}`;
  const kontaktName = [content.vorname, content.nachname].filter(Boolean).join(' ');

  const bodyText = joinNonEmpty([
    'Neue Nachricht über das Kontaktformular auf proudleut.com:',
    '',
    line('Anliegen', content.anlass),
    line('Name', kontaktName || null),
    line('E-Mail', content.email),
    line('Telefon', content.telefon),
    '',
    'Nachricht:',
    content.nachricht,
  ]);

  return { subject, bodyText };
}
