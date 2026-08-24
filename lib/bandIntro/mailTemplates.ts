import { LEGAL_LINKS } from './constants.ts';
import { BAND_MAIL_LOGO_URL } from '../anfrage/constants.ts';
import type { NormalizedBandIntroInput } from './types.ts';

export type RenderedMail = { subject: string; bodyText: string };

function line(label: string, value: string | null): string {
  return value ? `${label}: ${value}` : '';
}

function joinNonEmpty(lines: string[]): string {
  return lines.filter((l) => l.trim() !== '').join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// "Wenn Spitzname vorhanden -> Spitzname verwenden, sonst Vorname" (Auftrag
// Abschnitt 13) -- eine einzige Stelle fuer Text- UND HTML-Renderer, damit
// beide garantiert dieselbe Anrede waehlen.
export function resolvePreferredName(input: Pick<NormalizedBandIntroInput, 'firstName' | 'nickname'>): string {
  return input.nickname?.trim() || input.firstName;
}

function wrapSimpleHtml(params: { subject: string; preheader: string; bodyHtml: string }): string {
  const safeSubject = escapeHtml(params.subject);
  const safePreheader = escapeHtml(params.preheader);
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${safeSubject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${safePreheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f4f2ee;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:32px 14px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #e6e1dc;border-radius:16px;border-collapse:separate;">
          <tr>
            <td style="padding:32px 34px 20px 34px;">
              <a href="https://www.proudleut.com" target="_blank" style="text-decoration:none;">
                <img src="${BAND_MAIL_LOGO_URL}" width="141" height="26" alt="proudleut" border="0" style="display:block;width:141px;height:26px;">
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 34px 32px 34px;font-size:15px;line-height:1.65;color:#262626;">
              ${params.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 34px 28px 34px;">
              <div style="border-top:1px solid #ece8e4;padding-top:13px;font-size:12px;line-height:1.55;color:#8a837e;">
                <a href="https://www.proudleut.com" style="color:#734b8b;text-decoration:none;font-weight:700;">proudleut.com</a>
                <span style="color:#c7c1bc;"> &middot; </span>
                <a href="${LEGAL_LINKS.impressumUrl}" style="color:#77706b;text-decoration:none;">Impressum</a>
                <span style="color:#c7c1bc;"> &middot; </span>
                <a href="${LEGAL_LINKS.datenschutzUrl}" style="color:#77706b;text-decoration:none;">Datenschutz</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type ConfirmationMailContent = Pick<NormalizedBandIntroInput, 'bandName' | 'firstName' | 'nickname'>;

// Bestaetigt den Eingang und bittet um Terminvorschlaege PER ANTWORT AUF
// DIESE MAIL (V1-Produktentscheidung, Nachfass-Paket "Terminabstimmung per
// Antwort"): kein externer Terminplaner, keine Online-Terminwahl -- der
// einzige kommunizierte naechste Schritt ist die Antwort mit 2-3
// Terminvorschlaegen und der besten Rueckruf-Telefonnummer. Ersetzt die
// fruehere, optionale meetergo-Logik vollstaendig (MEETERGO_BOOKING_URL/
// getMeetergoBookingUrl wurden entfernt, siehe Abschlussbericht).
export function renderBandIntroConfirmationMail(content: ConfirmationMailContent): RenderedMail {
  const preferredName = resolvePreferredName(content);
  const subject = 'Deine Bandvorstellung bei proudleut ist angekommen';

  const bodyText = joinNonEmpty([
    `Servus ${preferredName},`,
    '',
    `danke fürs Vorstellen von ${content.bandName} – eure Infos sind bei mir angekommen.`,
    '',
    'Bevor wir eine Bandseite aufbauen, würde ich euch gern kurz kennenlernen und einmal miteinander telefonieren.',
    '',
    'Antworte mir dafür einfach auf diese Mail mit zwei oder drei Terminen, an denen es bei dir gut passt, und der Telefonnummer, unter der ich dich am besten erreiche.',
    '',
    'Ich melde mich dann bei dir.',
    '',
    'Liebe Grüße',
    'Xandi',
    '',
    '—',
    'proudleut.com',
    `Impressum: ${LEGAL_LINKS.impressumUrl}`,
    `Datenschutz: ${LEGAL_LINKS.datenschutzUrl}`,
  ]);

  return { subject, bodyText };
}

export function renderBandIntroConfirmationMailHtml(content: ConfirmationMailContent): string {
  const preferredName = resolvePreferredName(content);
  const safePreferredName = escapeHtml(preferredName);
  const safeBandName = escapeHtml(content.bandName);
  const { subject } = renderBandIntroConfirmationMail(content);

  const bodyHtml = `
    <p style="margin:0 0 14px 0;">Servus <strong>${safePreferredName}</strong>,</p>
    <p style="margin:0 0 18px 0;">danke fürs Vorstellen von <strong>${safeBandName}</strong> – eure Infos sind bei mir angekommen.</p>
    <p style="margin:0 0 22px 0;">Bevor wir eine Bandseite aufbauen, würde ich euch gern kurz kennenlernen und einmal miteinander telefonieren.</p>
    <p style="margin:0 0 22px 0;">Antworte mir dafür einfach auf diese Mail mit zwei oder drei Terminen, an denen es bei dir gut passt, und der Telefonnummer, unter der ich dich am besten erreiche.</p>
    <p style="margin:0 0 22px 0;">Ich melde mich dann bei dir.</p>
    <p style="margin:0;">Liebe Grüße<br><strong>Xandi</strong></p>
  `;

  return wrapSimpleHtml({
    subject,
    preheader: `Danke fürs Vorstellen von ${content.bandName} – lass uns kurz telefonieren.`,
    bodyHtml,
  });
}

export type InternalNotificationContent = NormalizedBandIntroInput & {
  id: string;
  createdAtDisplay: string;
  // true, wenn die Bestaetigungsmail an die Band (Schritt 3) nicht
  // nachweislich zugestellt wurde (Fehler ODER Exception) -- Xandi muss das
  // SOFORT sehen, ohne die Bandvorstellung selbst nachzuschlagen, da die
  // Band vermutlich nichts von der Bitte um Terminvorschlaege erfahren hat
  // (Nachfass-Paket Abschnitt 10, Fehlerfall B praktisch beherrschbar
  // machen -- keine neue Retry-/Queue-Infrastruktur).
  confirmationMailFailed: boolean;
};

// Interne Benachrichtigung an Xandi (Auftrag Abschnitt 31) -- nennt
// ausschliesslich die eingegangenen Angaben, erzeugt nichts automatisch
// (kein Band-/Profil-/Kategorie-Anlegen). Betreff bekommt bei fehlgeschlagener
// Bestaetigungsmail einen Praefix, damit die Warnung bereits in der
// Postfach-Liste sichtbar ist, ohne die Mail oeffnen zu muessen.
export function renderBandIntroInternalNotification(content: InternalNotificationContent): RenderedMail {
  const subject = content.confirmationMailFailed
    ? `[Bestätigung fehlgeschlagen] Neue Bandvorstellung: ${content.bandName}`
    : `Neue Bandvorstellung: ${content.bandName}`;
  const kontaktName = [content.firstName, content.lastName].filter(Boolean).join(' ');

  const warningLines = content.confirmationMailFailed
    ? [
        'ACHTUNG: Die Bestätigungsmail an die Band konnte nicht zugestellt werden.',
        'Die Bandvorstellung ist gespeichert, aber die Band hat die Bitte um Terminvorschläge vermutlich NICHT erhalten. Bitte manuell kontaktieren.',
        '',
      ]
    : [];

  const bodyText = joinNonEmpty([
    ...warningLines,
    `Neue Bandvorstellung über proudleut.com:`,
    '',
    line('Band', content.bandName),
    line('Heimatort / Region', content.region),
    line('Website', content.websiteUrl),
    content.additionalLinks.length > 0 ? `Weitere Links:\n${content.additionalLinks.map((l) => `- ${l}`).join('\n')}` : '',
    '',
    'Was macht euch aus:',
    content.description,
    '',
    'Ansprechpartner:',
    line('Name', kontaktName || null),
    line('Spitzname', content.nickname),
    line('E-Mail', content.email),
    line('Telefon', content.phone),
    '',
    line('Eingegangen am', content.createdAtDisplay),
    line('ID', content.id),
  ]);

  return { subject, bodyText };
}

export function renderBandIntroInternalNotificationHtml(content: InternalNotificationContent): string {
  const kontaktName = [content.firstName, content.lastName].filter(Boolean).join(' ');
  const { subject } = renderBandIntroInternalNotification(content);

  const linkRow = (label: string, url: string | null) =>
    url
      ? `<p style="margin:0 0 6px 0;"><strong>${escapeHtml(label)}:</strong> <a href="${escapeHtml(url)}" target="_blank" style="color:#734b8b;text-decoration:underline;word-break:break-word;">${escapeHtml(url)}</a></p>`
      : '';

  const additionalLinksHtml =
    content.additionalLinks.length > 0
      ? `<p style="margin:0 0 6px 0;"><strong>Weitere Links:</strong></p>` +
        content.additionalLinks
          .map((l) => `<p style="margin:0 0 6px 0;padding-left:12px;"><a href="${escapeHtml(l)}" target="_blank" style="color:#734b8b;text-decoration:underline;word-break:break-word;">${escapeHtml(l)}</a></p>`)
          .join('')
      : '';

  const warningHtml = content.confirmationMailFailed
    ? `<div style="margin:0 0 20px 0;padding:14px 16px;background:#fdecea;border-left:4px solid #c0392b;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 4px 0;font-weight:700;color:#7a1f1f;">ACHTUNG: Bestätigungsmail an die Band fehlgeschlagen</p>
        <p style="margin:0;color:#7a1f1f;">Die Bandvorstellung ist gespeichert, aber die Band hat die Bitte um Terminvorschläge vermutlich NICHT erhalten. Bitte manuell kontaktieren.</p>
      </div>`
    : '';

  const bodyHtml = `
    ${warningHtml}
    <p style="margin:0 0 18px 0;">Neue Bandvorstellung über proudleut.com:</p>
    <p style="margin:0 0 6px 0;"><strong>Band:</strong> ${escapeHtml(content.bandName)}</p>
    <p style="margin:0 0 6px 0;"><strong>Heimatort / Region:</strong> ${escapeHtml(content.region)}</p>
    ${linkRow('Website', content.websiteUrl)}
    ${additionalLinksHtml}
    <p style="margin:18px 0 6px 0;"><strong>Was macht euch aus:</strong></p>
    <p style="margin:0 0 18px 0;white-space:pre-line;">${escapeHtml(content.description)}</p>
    <p style="margin:0 0 6px 0;"><strong>Ansprechpartner:</strong> ${escapeHtml(kontaktName)}${content.nickname ? ` (${escapeHtml(content.nickname)})` : ''}</p>
    <p style="margin:0 0 6px 0;"><strong>E-Mail:</strong> <a href="mailto:${escapeHtml(content.email)}" style="color:#734b8b;text-decoration:underline;">${escapeHtml(content.email)}</a></p>
    ${content.phone ? `<p style="margin:0 0 6px 0;"><strong>Telefon:</strong> ${escapeHtml(content.phone)}</p>` : ''}
    <p style="margin:18px 0 0 0;font-size:13px;color:#77706b;">Eingegangen am ${escapeHtml(content.createdAtDisplay)} &middot; ID ${escapeHtml(content.id)}</p>
  `;

  return wrapSimpleHtml({
    subject,
    preheader: `${content.bandName} hat sich vorgestellt.`,
    bodyHtml,
  });
}
