import { LEGAL_LINKS, BAND_MAIL_LOGO_URL, CONFIRMATION_MAIL_PORTRAIT_URL } from './constants.ts';
import { SITE_URL } from '../seo/metadata.ts';
import { buildReplyMailto, buildTelHref, escapeHtml } from './templates.ts';
import type { BandMailV2Content } from './templates.ts';

const LABEL = 'font-size:11px;font-weight:bold;letter-spacing:.14em;text-transform:uppercase;color:#77706b;';
const NOWRAP_WORDS = 'word-break:normal;overflow-wrap:normal;';

function has(v: string | null | undefined): v is string {
  return !!v && v.trim() !== '';
}

// Anfrage-Mail an die Band, Gestaltung V3: gleiche Optik wie die
// Veranstalter-Bestaetigung V3 (confirmationMailV3.ts). Texte, Reihenfolge und
// Link-Ziele sind identisch zu renderBandMailV2Html -- nur die Gestaltung
// aendert sich. Eingefroren nach Erstversand: v2-Zeilen rendern weiter mit
// renderBandMailV2Html, v1 mit dem Text-Snapshot.
export function renderBandMailV3Html(content: BandMailV2Content): string {
  const safeBandName = escapeHtml(content.bandName);
  const veranstalterName = [content.vorname, content.nachname].filter(Boolean).join(' ');
  const safeVeranstalterName = escapeHtml(veranstalterName);
  const safeVorname = escapeHtml(content.vorname);
  const safeEmail = escapeHtml(content.email);
  const safeBandUrl = content.bandSlug ? escapeHtml(`${SITE_URL}/band/${content.bandSlug}`) : null;

  const hatAnlass = has(content.anlass);
  const h1Text = hatAnlass ? (content.anlass as string) : `Anfrage von ${veranstalterName}`;
  const safeH1 = escapeHtml(h1Text);

  const metaParts = [content.datumText, content.location, content.plzOrt].filter(has);
  const safeMetaLine = metaParts.map(escapeHtml).join(' &middot; ');
  const safePreheader = escapeHtml(`${[h1Text, ...metaParts].join(' · ')} – neue Anfrage von ${veranstalterName}`);

  const telHref = content.telefon ? buildTelHref(content.telefon) : null;
  const safeTelefonDisplay = content.telefon ? escapeHtml(content.telefon) : '';

  const anrufButton = telHref
    ? `
                  <td style="padding:0 0 10px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="border:1px solid #1a1a1a;border-radius:5px;">
                          <a href="${telHref}" style="display:inline-block;padding:9px 15px;font-size:14px;line-height:1.2;font-weight:bold;color:#1a1a1a;text-decoration:none;white-space:nowrap;">${safeVorname} anrufen</a>
                        </td>
                      </tr>
                    </table>
                  </td>`
    : '';

  const telefonZeile = !content.telefon
    ? ''
    : telHref
      ? `<br><a href="${telHref}" style="color:#1a1a1a;text-decoration:none;">${safeTelefonDisplay}</a>`
      : `<br>${safeTelefonDisplay}`;

  const veranstaltungZeilen = [
    hatAnlass ? `<strong>${escapeHtml(content.anlass as string)}</strong>` : '',
    escapeHtml(content.datumText),
    has(content.location) ? escapeHtml(content.location) : '',
    has(content.plzOrt) ? escapeHtml(content.plzOrt) : '',
  ].filter((v) => v !== '');

  const nachrichtVorhanden = has(content.nachricht);
  const nachrichtBarColor = nachrichtVorhanden ? '#734b8b' : '#d9d3ce';
  const nachrichtTextColor = nachrichtVorhanden ? '#1a1a1a' : '#9a938e';
  const nachrichtInhalt = nachrichtVorhanden
    ? escapeHtml(content.nachricht as string).replace(/\r?\n/g, '<br>')
    : 'Keine persönliche Nachricht hinterlassen.';

  const bandseiteAusdruck = safeBandUrl
    ? `<a href="${safeBandUrl}" target="_blank" style="color:#734b8b;text-decoration:none;">Bandseite bei <strong>proudleut</strong></a>`
    : `Bandseite bei <strong>proudleut</strong>`;

  return `<!doctype html>
<html lang="de" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <title>${safeH1} &middot; proudleut</title>
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
    ${safePreheader}
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
                  <td valign="middle" align="right" style="font-size:11px;font-weight:bold;letter-spacing:.14em;text-transform:uppercase;color:#734b8b;">Neue Anfrage</td>
                </tr>
              </table>
              <h1 class="pl-h1" style="margin:28px 0 0 0;font-size:32px;line-height:1.1;font-weight:bold;letter-spacing:-0.025em;color:#1a1a1a;">${safeH1}</h1>
              <div style="margin-top:8px;font-size:14px;line-height:1.5;color:#77706b;">${safeMetaLine}</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:22px;">
                <tr><td height="2" bgcolor="#1a1a1a" style="height:2px;font-size:0;line-height:0;background-color:#1a1a1a;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="pl-px" style="padding:28px 36px 0 36px;font-size:16px;line-height:1.7;color:#1a1a1a;">
              <p style="margin:0 0 10px 0;">Servus <strong>${safeBandName}</strong>,</p>
              <p style="margin:0;">
                über eure ${bandseiteAusdruck} hat euch ${safeVorname} eine neue Anfrage geschickt.
              </p>
            </td>
          </tr>

          <tr>
            <td class="pl-px" style="padding:22px 36px 0 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 10px 10px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td bgcolor="#1a1a1a" style="background-color:#1a1a1a;border-radius:5px;">
                          <a href="${escapeHtml(buildReplyMailto(content))}" style="display:inline-block;padding:10px 16px;font-size:14px;line-height:1.2;font-weight:bold;color:#ffffff;text-decoration:none;white-space:nowrap;">${safeVorname} antworten</a>
                        </td>
                      </tr>
                    </table>
                  </td>${anrufButton}
                </tr>
              </table>
              <div style="font-size:14px;line-height:1.6;color:#77706b;margin-top:2px;">
                Ihr könnt auch einfach auf diese E-Mail antworten – eure Antwort geht direkt an ${safeVorname}.
              </div>
            </td>
          </tr>

          <tr>
            <td class="pl-px pl-gap" style="padding:56px 36px 0 36px;">
              <div style="${LABEL}margin-bottom:16px;">Kontakt</div>
              <div style="font-size:16px;line-height:1.6;color:#1a1a1a;${NOWRAP_WORDS}">
                <strong>${safeVeranstalterName}</strong><br>
                <a href="mailto:${safeEmail}" style="color:#734b8b;text-decoration:none;overflow-wrap:anywhere;">${safeEmail}</a>${telefonZeile}
              </div>
            </td>
          </tr>

          <tr>
            <td class="pl-px pl-gap" style="padding:56px 36px 0 36px;">
              <div style="${LABEL}margin-bottom:16px;">Veranstaltung</div>
              <div style="font-size:16px;line-height:1.6;color:#1a1a1a;${NOWRAP_WORDS}">
                ${veranstaltungZeilen.join('<br>')}
              </div>
            </td>
          </tr>

          <tr>
            <td class="pl-px pl-gap" style="padding:56px 36px 0 36px;">
              <div style="${LABEL}margin-bottom:18px;">Nachricht von ${safeVorname}</div>
              <div style="border-left:3px solid ${nachrichtBarColor};padding:6px 0 6px 18px;font-size:16px;line-height:1.7;color:${nachrichtTextColor};word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;">${nachrichtInhalt}</div>
            </td>
          </tr>

          <tr>
            <td class="pl-px pl-gap" style="padding:56px 36px 0 36px;font-size:16px;line-height:1.7;color:#1a1a1a;">
              <p style="margin:0 0 14px 0;">
                Bitte gebt ${safeVorname} möglichst zeitnah direkt Bescheid – ob es für euch passt oder nicht. So gibt es schnell Klarheit.
              </p>
              <p style="margin:0 0 14px 0;">
                Wenn ich euch bei der Anfrage unterstützen kann, meldet euch einfach bei mir.
              </p>
              <p style="margin:0;">
                Liebe Grüße<br>
                <strong>Alex</strong>
              </p>
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
                    </table>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:16px;">
                    <div style="border-top:1px solid #e2e2e2;padding-top:11px;font-size:12px;line-height:1.5;color:#8a8a8a;">
                      <span style="color:#8a8a8a;">Bands aus und für Bayern entdecken.</span> <span style="color:#734b8b;font-weight:bold;">Live. Echt. Nah.</span>
                      <div style="margin-top:5px;">
                        <a href="${SITE_URL}" style="color:#734b8b;text-decoration:none;font-weight:bold;">proudleut.com</a>
                      </div>
                      <div style="margin-top:8px;font-size:11px;color:#8a8a8a;">Diese Nachricht wurde automatisch über <a href="${SITE_URL}" style="color:#8a8a8a;text-decoration:none;">proudleut.com</a> versendet, weil diese E-Mail-Adresse als Bandkontakt bei proudleut hinterlegt ist.</div>
                      <div style="margin-top:8px;">
                        <a href="mailto:alexander.dressler@proudleut.com" style="color:#8a8a8a;text-decoration:none;">Kontakt</a>
                        <span style="color:#cfcfcf;">&nbsp;&middot;&nbsp;</span>
                        <a href="${LEGAL_LINKS.impressumUrl}" style="color:#8a8a8a;text-decoration:none;">Impressum</a>
                        <span style="color:#cfcfcf;">&nbsp;&middot;&nbsp;</span>
                        <a href="${LEGAL_LINKS.datenschutzUrl}" style="color:#8a8a8a;text-decoration:none;">Datenschutz</a>
                      </div>
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
