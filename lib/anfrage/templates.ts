import { LEGAL_LINKS, BAND_MAIL_LOGO_URL, BAND_MAIL_PORTRAIT_URL } from './constants.ts';
import type { NormalizedAnfrageInput, ResolvedBand } from './types.ts';

export type RenderedMail = { subject: string; bodyText: string };

function line(label: string, value: string | null): string {
  return value ? `${label}: ${value}` : '';
}

function joinNonEmpty(lines: string[]): string {
  return lines.filter((l) => l.trim() !== '').join('\n');
}

// Reale, oeffentliche Banddetailseite -- exakt dieselbe URL-Konvention wie
// lib/seo/jsonLd.ts (band.url), keine neue erfunden (Block "Bandmail V3.1").
function buildBandPageUrl(slug: string): string {
  return `https://proudleut.com/band/${slug}`;
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

// v2-Plain-Text-Version der Band-Mail (Block "Bandanfrage-Mail V3").
// Inhaltlich dieselbe Aussage wie renderBandMailV2Html, aber bewusst KEIN
// Nachbau des HTML-Layouts in Plain Text (Owner-Vorgabe). Der bisherige
// v1-Renderer renderBandMail() bleibt unveraendert und wird fuer neue
// Anfragen nicht mehr aufgerufen (siehe service.ts), bleibt aber fuer den
// v1-Retry-Pfad als eingefrorene Referenz bestehen.
export function renderBandMailV2(input: NormalizedAnfrageInput, band: ResolvedBand): RenderedMail {
  const veranstalterName = [input.vorname, input.nachname].filter(Boolean).join(' ');
  const subject = `Neue Anfrage über proudleut.com für ${band.name}`;

  const bodyText = joinNonEmpty([
    `Servus ${band.name},`,
    '',
    `über eure Bandseite bei proudleut hat euch ${input.vorname} eine neue Anfrage geschickt.`,
    `Bandseite: ${buildBandPageUrl(band.slug)}`,
    '',
    'Veranstaltung:',
    line('Anlass', input.anlass),
    line('Wunschtermin oder möglicher Zeitraum', input.datumText),
    line('Veranstaltungsort', input.location),
    line('PLZ & Ort', input.plzOrt),
    '',
    input.nachricht
      ? `Nachricht von ${input.vorname}:\n${input.nachricht}`
      : 'Keine persönliche Nachricht hinterlassen.',
    '',
    'Kontakt:',
    line('Name', veranstalterName || null),
    line('E-Mail', input.email),
    line('Telefon', input.telefon),
    '',
    `Ihr könnt auch einfach auf diese E-Mail antworten – eure Antwort geht direkt an ${input.vorname}.`,
    '',
    `Bitte gebt ${input.vorname} möglichst zeitnah direkt Bescheid – ob es für euch passt oder nicht. So weiß er schnell, woran er ist.`,
    '',
    'Wenn ich euch bei der Anfrage unterstützen kann, meldet euch einfach bei mir.',
    '',
    'Liebe Grüße',
    'Alex',
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

export type ConfirmationBandRef = {
  name: string;
  slug: string;
};

export type ConfirmationMailV2Content = {
  vorname: string;
  bands: ConfirmationBandRef[];
  anlass: string | null;
  datumText: string;
  location: string | null;
  plzOrt: string | null;
  nachricht: string | null;
};

// v2-Plain-Text der Veranstalter-Bestaetigung (Block "Confirmation V2",
// Owner-Entscheidung Variante A). "ist raus" ist hier technisch wahr, weil
// diese Funktion nur aufgerufen wird, nachdem service.ts bereits verifiziert
// hat, dass ALLE zugehoerigen Bandmails send_status='gesendet' erreicht
// haben -- die Funktion selbst kennt/prueft das nicht, sie rendert nur.
export function renderConfirmationMailV2(content: ConfirmationMailV2Content): RenderedMail {
  const isSingle = content.bands.length === 1;
  const subject = isSingle
    ? `Deine Anfrage an ${content.bands[0].name} ist raus`
    : `Deine Anfrage an ${content.bands.length} Bands ist raus`;

  const bandLines = content.bands.map((b) => `- ${b.name}: ${buildBandPageUrl(b.slug)}`);
  const nachrichtVorhanden = !!content.nachricht && content.nachricht.trim() !== '';

  const bodyText = joinNonEmpty([
    `Servus ${content.vorname},`,
    '',
    isSingle
      ? 'vielen Dank für deine Anfrage über proudleut.com. Wir haben deine Anfrage an folgende Band weitergeleitet:'
      : 'vielen Dank für deine Anfrage über proudleut.com. Wir haben deine Anfrage an folgende Bands weitergeleitet:',
    ...bandLines,
    '',
    'Deine Veranstaltung:',
    line('Anlass', content.anlass),
    line('Wunschtermin oder möglicher Zeitraum', content.datumText),
    line('PLZ & Ort', content.plzOrt),
    line('Veranstaltungsort', content.location),
    '',
    nachrichtVorhanden ? `Deine Nachricht:\n${content.nachricht}` : '',
    '',
    'Wie geht’s jetzt weiter?',
    isSingle ? 'Die Band meldet sich direkt bei dir.' : 'Die Bands melden sich direkt bei dir.',
    'Mit deiner Anfrage ist noch keine Buchung verbunden – alles Weitere klärt ihr anschließend direkt miteinander.',
    '',
    'Falls du Fragen hast oder Unterstützung bei der Auswahl brauchst, melde dich einfach bei mir.',
    '',
    'Viel Vorfreude auf euer Event!',
    'Liebe Grüße',
    'Alex',
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

// Entfernt aus einer frei eingegebenen Telefonnummer AUSSCHLIESSLICH
// offensichtliche Formatzeichen (Owner-Entscheidung A1, Block
// "Bandanfrage-Mail V3"). Kein Erraten/Ergaenzen einer Landesvorwahl. Das
// Ergebnis ist nur dann als tel:-Link zulaessig, wenn danach ausschliesslich
// Ziffern oder genau ein fuehrendes "+" gefolgt von Ziffern uebrig bleibt --
// andernfalls null (sichtbare Anzeige bleibt in jedem Fall die
// Originaleingabe, siehe renderBandMailV2Html).
export function buildTelHref(telefon: string): string | null {
  const stripped = telefon.replace(/[\s\-.\/()]/g, '');
  if (/^\d+$/.test(stripped) || /^\+\d+$/.test(stripped)) {
    return `tel:${stripped}`;
  }
  return null;
}

export type BandMailV2Content = {
  bandName: string;
  bandSlug: string | null;
  vorname: string;
  nachname: string | null;
  email: string;
  telefon: string | null;
  anlass: string | null;
  datumText: string;
  location: string | null;
  plzOrt: string | null;
  nachricht: string | null;
};

// Echtes V3-HTML fuer NEUE Bandanfragen (template_version = v2, siehe
// BAND_TEMPLATE_VERSION). Eingefroren nach diesem Block: spaetere
// Mail-Designaenderungen duerfen diese Funktion nicht still veraendern,
// sondern muessten eine neue Version (v3, ...) erhalten -- alte v2-Retries
// wuerden sonst rueckwirkend ein anderes Layout bekommen als urspruenglich
// versendet.
export function renderBandMailV2Html(content: BandMailV2Content): string {
  const safeBandName = escapeHtml(content.bandName);
  const veranstalterName = [content.vorname, content.nachname].filter(Boolean).join(' ');
  const safeVeranstalterName = escapeHtml(veranstalterName);
  const safeVorname = escapeHtml(content.vorname);
  const safeEmail = escapeHtml(content.email);
  const safeBandUrl = content.bandSlug ? escapeHtml(buildBandPageUrl(content.bandSlug)) : null;

  const hatAnlass = !!content.anlass && content.anlass.trim() !== '';
  const h1Text = hatAnlass ? (content.anlass as string) : `Anfrage von ${veranstalterName}`;
  const safeH1 = escapeHtml(h1Text);

  const metaParts = [content.datumText, content.location, content.plzOrt].filter(
    (v): v is string => !!v && v.trim() !== ''
  );
  const safeMetaLine = metaParts.map(escapeHtml).join(' &middot; ');
  const safePreheader = escapeHtml(`${[h1Text, ...metaParts].join(' · ')} – neue Anfrage von ${veranstalterName}`);

  const telHref = content.telefon ? buildTelHref(content.telefon) : null;
  const safeTelefonDisplay = content.telefon ? escapeHtml(content.telefon) : '';

  const anrufButton = telHref
    ? `
                  <td style="padding:0 0 10px 0;">
                    <a href="${telHref}" style="display:inline-block;background:#ffffff;color:#5f5a56;text-decoration:none;font-size:14px;font-weight:600;line-height:1;border:1px solid #e6e1dc;border-radius:999px;padding:11px 17px;">
                      ${safeVorname} anrufen
                    </a>
                  </td>`
    : '';

  const telefonZeile = !content.telefon
    ? ''
    : telHref
      ? `<br><a href="${telHref}" style="color:#262626;text-decoration:underline;">${safeTelefonDisplay}</a>`
      : `<br>${safeTelefonDisplay}`;

  const veranstaltungZeilen = [
    hatAnlass ? `<strong>${escapeHtml(content.anlass as string)}</strong>` : '',
    escapeHtml(content.datumText),
    content.location && content.location.trim() !== '' ? escapeHtml(content.location) : '',
    content.plzOrt && content.plzOrt.trim() !== '' ? escapeHtml(content.plzOrt) : '',
  ].filter((v) => v !== '');

  const nachrichtVorhanden = !!content.nachricht && content.nachricht.trim() !== '';
  const nachrichtBorderColor = nachrichtVorhanden ? '#734b8b' : '#d9d3ce';
  const nachrichtTextColor = nachrichtVorhanden ? '#333333' : '#9a938e';
  const nachrichtInhalt = nachrichtVorhanden
    ? escapeHtml(content.nachricht as string)
    : 'Keine persönliche Nachricht hinterlassen.';

  const bandseiteAusdruck = safeBandUrl
    ? `<a href="${safeBandUrl}" target="_blank" style="color:#262626;text-decoration:underline;">Bandseite bei <strong>proudleut</strong></a>`
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
      .pl-stack {
        display: block !important;
        width: 100% !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        border-left: none !important;
      }
      .pl-stack-second {
        padding-top: 22px !important;
        margin-top: 22px !important;
        border-top: 1px solid #ece8e4 !important;
      }
      .pl-h1 {
        font-size: 24px !important;
      }
      .pl-px {
        padding-left: 22px !important;
        padding-right: 22px !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">

  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    ${safePreheader}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f4f2ee;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:32px 14px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #e6e1dc;border-radius:16px;border-collapse:separate;">

          <tr>
            <td class="pl-px" style="padding:32px 34px 20px 34px;">
              <a href="https://www.proudleut.com" target="_blank" style="text-decoration:none;">
                <img src="${BAND_MAIL_LOGO_URL}"
                     width="141" height="26" alt="proudleut" border="0"
                     style="display:block;width:141px;height:26px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#1a1a1a;">
              </a>
            </td>
          </tr>

          <tr>
            <td class="pl-px" style="padding:0 34px;">
              <div style="font-size:11px;line-height:1.4;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#734b8b;">
                Neue Anfrage
              </div>
              <h1 class="pl-h1" style="margin:7px 0 6px 0;font-size:30px;line-height:1.15;letter-spacing:-0.025em;color:#1a1a1a;">
                ${safeH1}
              </h1>
              <div style="font-size:14px;line-height:1.5;color:#77706b;">
                ${safeMetaLine}
              </div>
            </td>
          </tr>

          <tr>
            <td class="pl-px" style="padding:20px 34px 0 34px;font-size:15px;line-height:1.6;color:#262626;">
              <p style="margin:0 0 14px 0;">Servus <strong>${safeBandName}</strong>,</p>
              <p style="margin:0;">
                über eure ${bandseiteAusdruck} hat euch ${safeVorname} eine neue Anfrage geschickt.
              </p>
            </td>
          </tr>

          <tr>
            <td class="pl-px" style="padding:20px 34px 0 34px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 10px 10px 0;">
                    <a href="mailto:${safeEmail}"
                       style="display:inline-block;background:#734b8b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;line-height:1;border-radius:999px;padding:12px 18px;">
                      ${safeVorname} antworten
                    </a>
                  </td>${anrufButton}
                </tr>
              </table>
              <div style="font-size:12px;line-height:1.5;color:#77706b;margin-top:2px;">
                Ihr könnt auch einfach auf diese E-Mail antworten – eure Antwort geht direkt an ${safeVorname}.
              </div>
            </td>
          </tr>

          <tr>
            <td class="pl-px" style="padding:32px 34px 0 34px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                <tr>
                  <td class="pl-stack" width="50%" valign="top" style="width:50%;padding:0 18px 0 0;">
                    <div style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#77706b;margin-bottom:9px;">
                      Kontakt
                    </div>
                    <div style="font-size:15px;line-height:1.55;color:#262626;">
                      <strong>${safeVeranstalterName}</strong><br>
                      <a href="mailto:${safeEmail}" style="color:#262626;text-decoration:underline;word-break:break-word;overflow-wrap:anywhere;">${safeEmail}</a>${telefonZeile}
                    </div>
                  </td>
                  <td class="pl-stack pl-stack-second" width="50%" valign="top" style="width:50%;padding:0 0 0 18px;border-left:1px solid #ece8e4;">
                    <div style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#77706b;margin-bottom:9px;">
                      Veranstaltung
                    </div>
                    <div style="font-size:15px;line-height:1.55;color:#262626;">
                      ${veranstaltungZeilen.join('<br>')}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="pl-px" style="padding:32px 34px 0 34px;">
              <div style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#77706b;margin-bottom:9px;">
                Nachricht von ${safeVorname}
              </div>
              <div style="background:#f7f5f3;border-left:3px solid ${nachrichtBorderColor};border-radius:0 10px 10px 0;padding:16px 18px;font-size:15px;line-height:1.6;color:${nachrichtTextColor};white-space:pre-line;overflow-wrap:anywhere;word-break:break-word;">${nachrichtInhalt}</div>
            </td>
          </tr>

          <tr>
            <td class="pl-px" style="padding:32px 34px 0 34px;font-size:15px;line-height:1.65;color:#262626;">
              <p style="margin:0 0 14px 0;">
                Bitte gebt ${safeVorname} möglichst zeitnah direkt Bescheid – ob es für euch passt oder nicht. So weiß er schnell, woran er ist.
              </p>
              <p style="margin:0 0 18px 0;">
                Wenn ich euch bei der Anfrage unterstützen kann, meldet euch einfach bei mir.
              </p>
              <p style="margin:0;">
                Liebe Grüße<br>
                <strong>Alex</strong>
              </p>
            </td>
          </tr>

          <tr>
            <td class="pl-px" style="padding:32px 34px 0 34px;">
              <div style="border-top:1px solid #e6e1dc;"></div>
            </td>
          </tr>

          <tr>
            <td class="pl-px" style="padding:20px 34px 10px 34px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td valign="middle" style="padding:0 16px 0 0;">
                    <img src="${BAND_MAIL_PORTRAIT_URL}" width="64" height="64" alt="Alexander Dressler" border="0"
                         style="display:block;width:64px;height:64px;border-radius:50%;">
                  </td>
                  <td valign="middle" style="border-left:2px solid #734b8b;padding-left:16px;">
                    <div style="font-size:14px;font-weight:700;line-height:1.35;color:#1a1a1a;">Alexander Dressler</div>
                    <div style="font-size:13px;line-height:1.35;color:#6b6b6b;">Musik- und Anfragenmanagement</div>
                    <div style="margin-top:8px;font-size:13px;line-height:1.45;">
                      <a href="mailto:alexander.dressler@proudleut.com" style="color:#734b8b;text-decoration:none;word-break:break-word;overflow-wrap:anywhere;">alexander.dressler@proudleut.com</a><br>
                      <a href="tel:+491752721331" style="color:#6b6b6b;text-decoration:none;">+49 175 2721331</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="pl-px" style="padding:10px 34px 32px 34px;">
              <div style="border-top:1px solid #ece8e4;padding-top:13px;font-size:12px;line-height:1.55;color:#8a837e;">
                <strong style="color:#5e5955;">Bands aus und für Bayern entdecken.</strong>
                <span style="color:#734b8b;font-weight:700;"> Live. Echt. Nah.</span>
                <br>
                <a href="https://www.proudleut.com" style="color:#734b8b;text-decoration:none;font-weight:700;">proudleut.com</a>
              </div>

              <div style="margin-top:16px;font-size:10px;line-height:1.45;color:#9a938e;">
                Diese Nachricht wurde automatisch über proudleut.com versendet, weil diese E-Mail-Adresse als Bandkontakt bei proudleut hinterlegt ist.
              </div>

              <div style="margin-top:10px;font-size:10px;line-height:1.4;">
                <a href="mailto:alexander.dressler@proudleut.com" style="color:#77706b;text-decoration:none;">Kontakt</a>
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

// Echtes V2-HTML fuer die Veranstalter-Bestaetigung (Block "Confirmation
// V2", Owner-Entscheidung Variante A). Designreferenz ist ausschliesslich
// renderBandMailV2Html() -- gleicher Aussenrahmen (Karte 640px, Border
// #e6e1dc, Radius 16px, Container-Padding 34px/22px ueber .pl-px, Vertical-
// Rhythmus 20px/32px), gleiches Preheader-Muster, gleiche Alex-Signatur,
// gleicher Legal-Footer. "Band ansehen" nutzt bewusst denselben
// zurueckgenommenen Sekundaer-Button-Stil wie der Anruf-Button in
// renderBandMailV2Html (weiss/#e6e1dc-Border/#5f5a56-Text/font-weight 600),
// damit er nicht mit einem Primary-CTA konkurriert -- es gibt hier bewusst
// keinen Primary-CTA. Eingefroren nach diesem Block: spaetere Aenderungen
// erhoehen CONFIRMATION_TEMPLATE_VERSION, aendern v1/v2 nicht rueckwirkend.
export function renderConfirmationMailV2Html(content: ConfirmationMailV2Content): string {
  const safeVorname = escapeHtml(content.vorname);
  const isSingle = content.bands.length === 1;
  const subject = isSingle
    ? `Deine Anfrage an ${content.bands[0].name} ist raus`
    : `Deine Anfrage an ${content.bands.length} Bands ist raus`;
  const safeSubject = escapeHtml(subject);

  const safePreheader = escapeHtml(
    `${subject} – automatische Bestätigung von proudleut.com`
  );

  const dankSatz = isSingle
    ? 'vielen Dank für deine Anfrage über proudleut.com. Wir haben deine Anfrage an folgende Band weitergeleitet:'
    : 'vielen Dank für deine Anfrage über proudleut.com. Wir haben deine Anfrage an folgende Bands weitergeleitet:';

  const bandRowsHtml = content.bands
    .map((b, index) => {
      const isLast = index === content.bands.length - 1;
      const borderStyle = isLast ? '' : 'border-bottom:1px solid #ece8e4;';
      const safeBandName = escapeHtml(b.name);
      const safeBandUrl = escapeHtml(buildBandPageUrl(b.slug));
      return `
                <tr>
                  <td style="padding:15px 0;${borderStyle}">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="middle" style="font-size:17px;font-weight:700;line-height:1.3;color:#1a1a1a;">
                          ${safeBandName}
                        </td>
                        <td valign="middle" align="right" style="white-space:nowrap;padding-left:12px;">
                          <a href="${safeBandUrl}" target="_blank" style="color:#734b8b;text-decoration:none;font-size:14px;font-weight:600;">
                            Band ansehen &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`;
    })
    .join('');

  // Label/Wert-Tabelle statt flacher <br>-Liste (Block "Confirmation V2 --
  // Designtransfer Preview v3"). Als echte HTML-<table> statt Grid/Flex
  // fuer Mail-Kompatibilitaet. Bestehende Conditional-Logik (optionale
  // Felder nur bei vorhandenem Wert) unveraendert uebernommen, nur visuell
  // als Label/Wert-Zeile statt als gefilterte <br>-Zeile dargestellt.
  const veranstaltungZeilenHtml = (
    [
      content.anlass && content.anlass.trim() !== '' ? { label: 'Anlass', value: escapeHtml(content.anlass) } : null,
      { label: 'Termin', value: escapeHtml(content.datumText) },
      content.plzOrt && content.plzOrt.trim() !== '' ? { label: 'Ort', value: escapeHtml(content.plzOrt) } : null,
      content.location && content.location.trim() !== ''
        ? { label: 'Location', value: escapeHtml(content.location) }
        : null,
    ] as ({ label: string; value: string } | null)[]
  )
    .filter((row): row is { label: string; value: string } => row !== null)
    .map(
      (row) => `
                <tr>
                  <td style="padding:4px 0;width:92px;font-size:13px;line-height:1.6;color:#8a837e;vertical-align:top;">${row.label}</td>
                  <td style="padding:4px 0;font-size:16px;line-height:1.6;color:#262626;vertical-align:top;">${row.value}</td>
                </tr>`
    )
    .join('');

  const nachrichtVorhanden = !!content.nachricht && content.nachricht.trim() !== '';
  const nachrichtBlock = nachrichtVorhanden
    ? `
          <tr>
            <td class="pl-px" style="padding:32px 34px 0 34px;">
              <div style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#77706b;margin-bottom:9px;">
                Deine Nachricht
              </div>
              <div style="background:#f7f5f3;border-left:3px solid #734b8b;border-radius:0 10px 10px 0;padding:14px 16px;font-size:16px;line-height:1.6;color:#333333;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(
                content.nachricht as string
              ).replace(/\n/g, '<br>')}</div>
            </td>
          </tr>`
    : '';

  const weiterSatz = isSingle ? 'Die Band meldet sich direkt bei dir.' : 'Die Bands melden sich direkt bei dir.';

  return `<!doctype html>
<html lang="de" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <title>${safeSubject} &middot; proudleut</title>
  <style>
    @media only screen and (max-width: 480px) {
      .pl-h1 {
        font-size: 24px !important;
      }
      .pl-px {
        padding-left: 22px !important;
        padding-right: 22px !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">

  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    ${safePreheader}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f4f2ee;margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:32px 14px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #e6e1dc;border-radius:16px;border-collapse:separate;">

          <tr>
            <td class="pl-px" style="padding:32px 34px 20px 34px;">
              <a href="https://www.proudleut.com" target="_blank" style="text-decoration:none;">
                <img src="${BAND_MAIL_LOGO_URL}"
                     width="141" height="26" alt="proudleut" border="0"
                     style="display:block;width:141px;height:26px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#1a1a1a;">
              </a>
            </td>
          </tr>

          <tr>
            <td class="pl-px" style="padding:0 34px;">
              <div style="font-size:11px;line-height:1.4;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#734b8b;">
                Bestätigung
              </div>
              <h1 class="pl-h1" style="margin:7px 0 6px 0;font-size:30px;line-height:1.15;letter-spacing:-0.025em;color:#1a1a1a;">
                ${safeSubject}
              </h1>
            </td>
          </tr>

          <tr>
            <td class="pl-px" style="padding:20px 34px 0 34px;font-size:16px;line-height:1.65;color:#262626;">
              <p style="margin:0 0 14px 0;">Servus <strong>${safeVorname}</strong>,</p>
              <p style="margin:0;">
                ${dankSatz}
              </p>
            </td>
          </tr>

          <tr>
            <td class="pl-px" style="padding:22px 34px 0 34px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                ${bandRowsHtml}
              </table>
            </td>
          </tr>

          <tr>
            <td class="pl-px" style="padding:32px 34px 0 34px;">
              <div style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#77706b;margin-bottom:9px;">
                Deine Veranstaltung
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                ${veranstaltungZeilenHtml}
              </table>
            </td>
          </tr>
${nachrichtBlock}

          <tr>
            <td class="pl-px" style="padding:32px 34px 0 34px;font-size:16px;line-height:1.65;color:#262626;">
              <div style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#77706b;margin-bottom:9px;">
                Wie geht's jetzt weiter?
              </div>
              <p style="margin:0 0 12px 0;font-size:17px;font-weight:700;color:#1a1a1a;">
                ${weiterSatz}
              </p>
              <p style="margin:0 0 14px 0;">
                Mit deiner Anfrage ist noch keine Buchung verbunden – alles Weitere klärt ihr anschließend direkt miteinander.
              </p>
              <p style="margin:0 0 18px 0;">
                Falls du Fragen hast oder Unterstützung bei der Auswahl brauchst, melde dich einfach bei mir.
              </p>
              <p style="margin:0 0 10px 0;">
                Viel Vorfreude auf euer Event!
              </p>
              <p style="margin:0;">
                Liebe Grüße<br>
                <strong>Alex</strong>
              </p>
            </td>
          </tr>

          <tr>
            <td class="pl-px" style="padding:14px 34px 0 34px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td valign="middle" style="padding:0 16px 0 0;">
                    <img src="${BAND_MAIL_PORTRAIT_URL}" width="64" height="64" alt="Alexander Dressler" border="0"
                         style="display:block;width:64px;height:64px;border-radius:50%;">
                  </td>
                  <td valign="middle" style="border-left:2px solid #734b8b;padding-left:16px;">
                    <div style="font-size:14px;font-weight:700;line-height:1.35;color:#1a1a1a;">Alexander Dressler</div>
                    <div style="font-size:13px;line-height:1.35;color:#6b6b6b;">Musik- und Anfragenmanagement</div>
                    <div style="margin-top:8px;font-size:13px;line-height:1.45;">
                      <a href="mailto:alexander.dressler@proudleut.com" style="color:#734b8b;text-decoration:none;word-break:break-word;overflow-wrap:anywhere;">alexander.dressler@proudleut.com</a><br>
                      <a href="tel:+491752721331" style="color:#6b6b6b;text-decoration:none;">+49 175 2721331</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="pl-px" style="padding:28px 34px 0 34px;">
              <div style="border-top:1px solid #e6e1dc;"></div>
            </td>
          </tr>

          <tr>
            <td class="pl-px" style="padding:18px 34px 32px 34px;">
              <div style="padding-top:13px;font-size:12px;line-height:1.55;color:#8a837e;">
                <strong style="color:#5e5955;">Bands aus und für Bayern entdecken.</strong>
                <span style="color:#734b8b;font-weight:700;"> Live. Echt. Nah.</span>
                <br>
                <a href="https://www.proudleut.com" style="color:#734b8b;text-decoration:none;font-weight:700;">proudleut.com</a>
              </div>

              <div style="margin-top:16px;font-size:10px;line-height:1.45;color:#9a938e;">
                Diese Bestätigung wurde automatisch nach deiner Anfrage auf proudleut.com verschickt.
              </div>

              <div style="margin-top:10px;font-size:10px;line-height:1.4;">
                <a href="mailto:alexander.dressler@proudleut.com" style="color:#77706b;text-decoration:none;">Kontakt</a>
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
