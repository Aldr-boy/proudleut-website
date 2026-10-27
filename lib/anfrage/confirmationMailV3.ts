import { LEGAL_LINKS, BAND_MAIL_LOGO_URL, CONFIRMATION_MAIL_PORTRAIT_URL } from './constants.ts';
import { SITE_URL } from '../seo/metadata.ts';
import { escapeHtml } from './templates.ts';
import type { ConfirmationMailV2Content } from './templates.ts';

export type ConfirmationMailV3Band = {
  name: string;
  slug: string;
  // Quadratisches Vorschaubild (192x192 JPEG, siehe mailThumbnails.ts) oder
  // null, wenn keins vorliegt -- die Karte zeigt dann nur Name und Button.
  thumbUrl: string | null;
};

export type ConfirmationMailV3Content = Omit<ConfirmationMailV2Content, 'bands'> & {
  bands: ConfirmationMailV3Band[];
};

const WEEKDAY_FILLER = /^(?:montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|den|am|,|\s)*$/i;
const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

// Nur ein EINZELNES, eindeutiges Datum (z. B. "22.01.2027" oder "Sonntag, den
// 22.07.2026") wird gross dargestellt. Alles andere (Zeitraum, mehrere
// Termine, Freitext) bleibt woertlich als Zeile "Termin" stehen -- es wird
// nichts interpretiert oder umformuliert.
export function parseSingleDate(datumText: string): { tag: string; monat: string; jahr: string } | null {
  const matches = [...datumText.matchAll(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g)];
  if (matches.length !== 1) return null;
  const [full, d, m, y] = matches[0];
  const day = Number(d);
  const month = Number(m);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  if (!WEEKDAY_FILLER.test(datumText.replace(full, ''))) return null;
  return { tag: String(day), monat: MONTH_NAMES[month - 1], jahr: y };
}

const LABEL = 'font-size:11px;font-weight:bold;letter-spacing:.14em;text-transform:uppercase;color:#77706b;';
const WRAP = 'word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;';

function has(v: string | null | undefined): v is string {
  return !!v && v.trim() !== '';
}

function bandCard(b: ConfirmationMailV3Band, index: number): string {
  const safeName = escapeHtml(b.name);
  const url = escapeHtml(`${SITE_URL}/band/${b.slug}`);
  const foto = b.thumbUrl
    ? `<td width="96" valign="middle" style="width:96px;padding:0 16px 0 0;"><img src="${escapeHtml(b.thumbUrl)}" width="96" height="96" alt="${safeName}" border="0" style="display:block;width:96px;height:96px;border-radius:6px;background-color:#1a1a1a;color:#f4f2ee;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;"></td>`
    : '';
  return `
                <tr>
                  <td style="${index === 0 ? '' : 'padding-top:10px;'}">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#f4f2ee;border-radius:8px;">
                      <tr>
                        <td style="padding:10px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                            <tr>
                              ${foto}
                              <td valign="middle" style="padding:4px 6px 4px 0;">
                                <div style="font-size:20px;line-height:1.25;font-weight:bold;color:#1a1a1a;${WRAP}">${safeName}</div>
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
                                  <tr>
                                    <td bgcolor="#1a1a1a" style="background-color:#1a1a1a;border-radius:5px;">
                                      <a href="${url}" target="_blank" style="display:inline-block;padding:10px 16px;font-size:14px;line-height:1.2;font-weight:bold;color:#ffffff;text-decoration:none;white-space:nowrap;">Band ansehen &rarr;</a>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`;
}

function step(n: string, text: string, bold: boolean): string {
  return `
                <tr>
                  <td valign="top" width="34" style="width:34px;padding:2px 0;font-size:16px;line-height:1.4;font-weight:bold;color:#734b8b;">${n}</td>
                  <td valign="top" style="padding:2px 0;font-size:16px;line-height:1.4;${bold ? 'font-weight:bold;' : ''}color:#1a1a1a;">${text}</td>
                </tr>`;
}

// Veranstalter-Bestaetigung v3 (Variante 3a der Design-Vorlage). Nur Tabellen,
// Arial/Helvetica, keine Webfonts/Schatten/Effekte, einspaltig, max. 640 px.
// Eingefroren nach Erstversand: v2-Zeilen rendern weiter mit
// renderConfirmationMailV2Html, v1 mit dem Text-Snapshot.
export function renderConfirmationMailV3Html(content: ConfirmationMailV3Content): string {
  const isSingle = content.bands.length === 1;
  const subject = isSingle ? `Deine Anfrage an ${content.bands[0].name} ist raus` : 'Deine Anfragen sind raus';
  const h1Html = isSingle
    ? `Deine Anfrage an <span style="color:#734b8b;">${escapeHtml(content.bands[0].name)}</span> ist raus`
    : 'Deine Anfragen sind raus';
  const intro = isSingle
    ? 'vielen Dank für deine Anfrage über proudleut.com. Wir haben deine Anfrage an folgende Band weitergeleitet:'
    : 'vielen Dank für deine Anfrage über proudleut.com. Wir haben deine Anfrage an folgende Bands weitergeleitet:';
  const weiterSatz = isSingle ? 'Die Band meldet sich direkt bei dir.' : 'Die Bands melden sich direkt bei dir.';

  const datum = parseSingleDate(content.datumText);
  const datumBlock = datum
    ? `<div style="margin:0 0 14px 0;font-size:64px;line-height:1;font-weight:bold;letter-spacing:-0.04em;color:#1a1a1a;">${datum.tag}<span style="padding-left:10px;font-size:15px;line-height:1;font-weight:bold;letter-spacing:0;color:#734b8b;">${datum.monat} ${datum.jahr}</span></div>`
    : '';

  const detailRows = (
    [
      datum ? null : { label: 'Termin', value: content.datumText },
      has(content.anlass) ? { label: 'Anlass', value: content.anlass } : null,
      has(content.plzOrt) ? { label: 'Ort', value: content.plzOrt } : null,
      has(content.location) ? { label: 'Location', value: content.location } : null,
    ] as ({ label: string; value: string } | null)[]
  )
    .filter((r): r is { label: string; value: string } => r !== null)
    .map(
      (r) => `
                        <tr>
                          <td valign="top" width="90" style="width:90px;padding:3px 12px 3px 0;font-size:16px;line-height:1.6;color:#77706b;">${r.label}</td>
                          <td valign="top" style="padding:3px 0;font-size:16px;line-height:1.6;color:#1a1a1a;word-break:normal;overflow-wrap:normal;">${escapeHtml(r.value)}</td>
                        </tr>`
    )
    .join('');

  const nachrichtBlock = has(content.nachricht)
    ? `
          <tr>
            <td class="pl-px pl-gap" style="padding:56px 36px 0 36px;">
              <div style="${LABEL}margin-bottom:18px;">Deine Nachricht</div>
              <div style="border-left:3px solid #734b8b;padding:6px 0 6px 18px;font-size:16px;line-height:1.7;color:#1a1a1a;${WRAP}">${escapeHtml(content.nachricht).replace(/\r?\n/g, '<br>')}</div>
            </td>
          </tr>`
    : '';

  return `<!doctype html>
<html lang="de" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <title>${escapeHtml(subject)} &middot; proudleut</title>
  <style>
    @media only screen and (max-width: 480px) {
      .pl-h1 { font-size: 26px !important; }
      .pl-px { padding-left: 22px !important; padding-right: 22px !important; }
      .pl-gap { padding-top: 48px !important; }
      .pl-outer { padding-left: 16px !important; padding-right: 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;-webkit-text-size-adjust:100%;text-size-adjust:100%;background-color:#f4f2ee;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">

  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(`${subject} – automatische Bestätigung von proudleut.com`)}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#f4f2ee;margin:0;padding:0;">
    <tr>
      <td class="pl-outer" align="center" style="padding:28px 32px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;background-color:#ffffff;border-radius:10px;border-collapse:separate;">

          <tr>
            <td class="pl-px" style="padding:28px 36px 0 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                <tr>
                  <td valign="middle" align="left">
                    <a href="${SITE_URL}" target="_blank" style="text-decoration:none;font-size:17px;font-weight:bold;color:#1a1a1a;">
                      <img src="${BAND_MAIL_LOGO_URL}" width="130" height="24" alt="proudleut" border="0" style="display:block;width:130px;height:24px;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:bold;color:#1a1a1a;">
                    </a>
                  </td>
                  <td valign="middle" align="right" style="font-size:11px;font-weight:bold;letter-spacing:.14em;text-transform:uppercase;color:#734b8b;">Bestätigung</td>
                </tr>
              </table>
              <h1 class="pl-h1" style="margin:28px 0 0 0;font-size:32px;line-height:1.1;font-weight:bold;letter-spacing:-0.025em;color:#1a1a1a;">${h1Html}</h1>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:22px;">
                <tr><td height="2" bgcolor="#1a1a1a" style="height:2px;font-size:0;line-height:0;background-color:#1a1a1a;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="pl-px" style="padding:28px 36px 0 36px;font-size:16px;line-height:1.7;color:#1a1a1a;">
              <p style="margin:0 0 10px 0;">Servus <strong>${escapeHtml(content.vorname)}</strong>,</p>
              <p style="margin:0;">${intro}</p>
            </td>
          </tr>

          <tr>
            <td class="pl-px" style="padding:22px 36px 0 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">${content.bands.map(bandCard).join('')}
              </table>
            </td>
          </tr>

          <tr>
            <td class="pl-px pl-gap" style="padding:56px 36px 0 36px;">
              <div style="${LABEL}margin-bottom:16px;">Deine Veranstaltung</div>
              ${datumBlock}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">${detailRows}
              </table>
            </td>
          </tr>
${nachrichtBlock}

          <tr>
            <td class="pl-px pl-gap" style="padding:56px 36px 0 36px;">
              <div style="${LABEL}margin-bottom:8px;">Wie geht's jetzt weiter?</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">${step('1', 'Deine Anfrage ist raus.', true)}${step('2', weiterSatz, false)}${step('3', 'Ihr klärt alles Weitere direkt miteinander.', false)}
              </table>
              <div style="margin-top:6px;padding-left:34px;font-size:14px;line-height:1.6;color:#77706b;">Mit deiner Anfrage ist noch keine Buchung verbunden.</div>
            </td>
          </tr>

          <tr>
            <td class="pl-px pl-gap" style="padding:56px 36px 0 36px;font-size:16px;line-height:1.7;color:#1a1a1a;">
              <p style="margin:0 0 14px 0;">Falls du Fragen hast oder Unterstützung bei der Auswahl brauchst, melde dich einfach bei mir.</p>
              <p style="margin:0;">Liebe Grüße<br><strong>Alex</strong></p>
            </td>
          </tr>

          <tr>
            <td class="pl-px" style="padding:26px 36px 28px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td valign="middle" align="center" width="124" style="width:124px;padding:0 20px 0 0;text-align:center;">
                    <img src="${CONFIRMATION_MAIL_PORTRAIT_URL}" width="104" height="104" alt="Alexander Dressler" border="0" style="display:block;margin:0 auto;width:104px;height:104px;border-radius:52px;background-color:#f4f2ee;">
                  </td>
                  <td valign="middle" style="border-left:2px solid #734b8b;padding-left:20px;">
                    <div style="font-size:14px;font-weight:bold;color:#1a1a1a;line-height:1.3;">Alexander Dressler</div>
                    <div style="font-size:13px;color:#6b6b6b;line-height:1.3;">Musik- und Anfragenmanagement</div>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;border-collapse:collapse;">
                      <tr><td style="padding:0;font-size:13px;line-height:1.35;"><a href="mailto:alexander.dressler@proudleut.com" style="color:#734b8b;text-decoration:none;overflow-wrap:anywhere;">alexander.dressler@proudleut.com</a></td></tr>
                      <tr><td style="padding:0;font-size:13px;line-height:1.35;color:#6b6b6b;"><a href="tel:+491752721331" style="color:#6b6b6b;text-decoration:none;">+49 175 2721331</a></td></tr>
                      <tr><td style="padding:0;font-size:13px;line-height:1.35;color:#6b6b6b;"><a href="tel:+4991852529881" style="color:#6b6b6b;text-decoration:none;">+49 9185 2529881</a></td></tr>
                      <tr><td style="padding:0;font-size:13px;line-height:1.35;color:#6b6b6b;"><a href="https://www.google.com/maps/search/?api=1&amp;query=Am+Rohrfeld+24%2C+92360+M%C3%BChlhausen" style="color:#6b6b6b;text-decoration:none;">Am Rohrfeld 24, 92360 Mühlhausen</a></td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:16px;">
                    <div style="border-top:1px solid #e2e2e2;padding-top:11px;font-size:12px;line-height:1.5;color:#8a8a8a;">
                      <span style="color:#8a8a8a;">Bands aus und für Bayern entdecken.</span> <span style="color:#734b8b;font-weight:bold;">Live. Echt. Nah.</span>
                      <div style="margin-top:5px;">
                        <a href="${SITE_URL}" style="color:#734b8b;text-decoration:none;font-weight:bold;">proudleut.com</a>
                        <span style="color:#cfcfcf;">&nbsp;&middot;&nbsp;</span>
                        <a href="mailto:alexander.dressler@proudleut.com" style="color:#8a8a8a;text-decoration:none;">Kontakt</a>
                        <span style="color:#cfcfcf;">&nbsp;&middot;&nbsp;</span>
                        <a href="${LEGAL_LINKS.impressumUrl}" style="color:#8a8a8a;text-decoration:none;">Impressum</a>
                        <span style="color:#cfcfcf;">&nbsp;&middot;&nbsp;</span>
                        <a href="${LEGAL_LINKS.datenschutzUrl}" style="color:#8a8a8a;text-decoration:none;">Datenschutz</a>
                      </div>
                      <div style="margin-top:8px;font-size:11px;color:#8a8a8a;">Diese Bestätigung wurde automatisch nach deiner Anfrage auf <a href="${SITE_URL}" style="color:#8a8a8a;text-decoration:none;">proudleut.com</a> verschickt.</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
