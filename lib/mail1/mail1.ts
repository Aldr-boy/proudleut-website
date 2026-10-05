import { SITE_URL } from '../seo/metadata.ts';

// Mail 1 ("Proudleut ist neu"): Vorlage, Anrede/Schluss-Regeln und die
// Hauptmail-Signatur (v4). Rein funktional, ohne Netzwerk- oder Env-Zugriff
// -- die persoenlichen Kontaktdaten (E-Mail, Telefonnummern) stehen bewusst
// NICHT im Code (oeffentliches Repository), sondern werden als
// SignatureContact uebergeben (siehe loadSignatureContactFromEnv).

export const MAIL1_SUBJECT = 'Proudleut ist neu – schaut euch euer Profil an';
export const MAIL1_DEFAULT_SIGNOFF_NAME = 'Alex';

export type SignatureContact = {
  email: string;
  phoneMobile: string;
  phoneLandline: string;
};

export type Mail1Input = {
  bandName: string;
  bandSlug: string;
  spitzname: string | null;
  contactName: string | null;
  callsMeAs: string | null;
};

export type RenderedMail1 = {
  subject: string;
  text: string;
  html: string;
  greetingName: string;
  signoffName: string;
  profileUrl: string;
};

const ENV_KEYS = {
  email: 'MAIL_MAIN_EMAIL',
  phoneMobile: 'MAIL_MAIN_PHONE_MOBILE',
  phoneLandline: 'MAIL_MAIN_PHONE_LANDLINE',
} as const;

// Fail-closed: fehlt ein Wert, wird nichts gerendert und nichts versendet.
export function loadSignatureContactFromEnv(
  env: Record<string, string | undefined>
): SignatureContact {
  const missing = Object.values(ENV_KEYS).filter((k) => !env[k]?.trim());
  if (missing.length > 0) {
    throw new Error(`Fehlende Einstellung(en): ${missing.join(', ')}`);
  }
  return {
    email: env[ENV_KEYS.email]!.trim(),
    phoneMobile: env[ENV_KEYS.phoneMobile]!.trim(),
    phoneLandline: env[ENV_KEYS.phoneLandline]!.trim(),
  };
}

function clean(value: string | null | undefined): string {
  return (value ?? '').trim();
}

// Anrede: Spitzname, sonst Vorname (erstes Wort des Kontaktnamens).
export function resolveGreetingName(spitzname: string | null, contactName: string | null): string {
  const nick = clean(spitzname);
  if (nick) return nick;
  return clean(contactName).split(/\s+/)[0] ?? '';
}

// Schluss: "Wie nennt mich der Kontakt?", sonst Alex.
export function resolveSignoffName(callsMeAs: string | null): string {
  return clean(callsMeAs) || MAIL1_DEFAULT_SIGNOFF_NAME;
}

// Bewusst das bisherige Profil-Format /bands/<slug>: www.proudleut.com zeigt
// bis zum Domain-Umzug noch auf Webflow (nur /bands/<slug>), danach leitet
// legacyRedirects.ts /bands/<slug> auf /band/<slug> weiter.
export function buildProfileUrl(slug: string): string {
  return `${SITE_URL}/bands/${slug}`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Signatur "proudleut (Hauptmail)" (v4) ────────────────────────────────
// Layout/Texte/Bilder unveraendert aus der Signaturdatei; einzige Aenderung:
// Akzentfarbe #75518b (Website-Lila, app/globals.css --pl-accent).
const ACCENT = '#75518b';
const INK = '#1a1a1a';
const MUTED = '#6b6b6b';

const SIGNATURE_STATIC = {
  person: 'Alexander Dressler',
  role: 'Musik- und Anfragenmanagement',
  portrait:
    'https://bfyucjjyarvqeftqqihm.supabase.co/storage/v1/object/public/band-media/proudleut/Alexander%20Dressler.jpg',
  logo: 'https://bfyucjjyarvqeftqqihm.supabase.co/storage/v1/object/public/band-media/proudleut/proudleut_Logo_rgb_72dpi.png',
  street: 'Am Rohrfeld 24',
  city: '92360 Mühlhausen',
  claim: 'Bands aus und für Bayern entdecken',
  tagline: 'Live. Echt. Nah.',
  homepage: 'https://www.proudleut.com',
  homepageText: 'proudleut.com',
} as const;

function telHref(phone: string): string {
  return `tel:${phone.replace(/\s/g, '')}`;
}

export function buildSignatureHtml(c: SignatureContact): string {
  const S = SIGNATURE_STATIC;
  const row = (inner: string, color?: string) =>
    `<tr><td style="padding:0;font-size:13px;line-height:1.35;${color ? `color:${color};` : ''}">${inner}</td></tr>`;
  const contactRows = [
    row(`<a href="mailto:${esc(c.email)}" style="color:${ACCENT};text-decoration:none;">${esc(c.email)}</a>`),
    row(`<a href="${esc(telHref(c.phoneMobile))}" style="color:${MUTED};text-decoration:none;">${esc(c.phoneMobile)}</a>`, MUTED),
    row(`<a href="${esc(telHref(c.phoneLandline))}" style="color:${MUTED};text-decoration:none;">${esc(c.phoneLandline)}</a>`, MUTED),
    row(`${S.street}, ${S.city}`, MUTED),
  ].join('');

  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Helvetica,Arial,sans-serif;color:${INK};border-collapse:collapse;">
  <tr>
    <td style="vertical-align:middle;padding-right:20px;text-align:center;width:136px;">
      <img src="${S.portrait}" alt="${S.person}" width="116" height="116" style="display:block;margin:0 auto;border-radius:50%;width:116px;height:116px;object-fit:cover;border:0;" />
      <a href="${S.homepage}" style="text-decoration:none;"><img src="${S.logo}" alt="proudleut" height="24" style="display:block;margin:14px auto 0;border:0;max-width:140px;height:24px;" /></a>
    </td>
    <td style="vertical-align:middle;border-left:2px solid ${ACCENT};padding-left:20px;">
      <div style="font-size:14px;font-weight:bold;color:${INK};line-height:1.3;">${S.person}</div>
      <div style="font-size:13px;color:${MUTED};line-height:1.3;">${S.role}</div>
      <div style="font-size:13px;font-weight:bold;color:${ACCENT};margin-top:3px;"><a href="${S.homepage}" style="color:${ACCENT};text-decoration:none;">${S.homepageText}</a></div>
      <table cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;border-collapse:collapse;">
        ${contactRows}
      </table>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="padding-top:16px;">
      <div style="border-top:1px solid #e2e2e2;padding-top:11px;font-size:12px;color:#8a8a8a;">${S.claim} <span style="color:${ACCENT};font-weight:bold;">${S.tagline}</span><div style="margin-top:5px;"><a href="${S.homepage}" style="color:${ACCENT};text-decoration:none;font-weight:bold;">${S.homepageText}</a></div></div>
    </td>
  </tr>
</table>`;
}

export function buildSignatureText(c: SignatureContact): string {
  const S = SIGNATURE_STATIC;
  return [
    S.person,
    S.role,
    S.homepageText,
    '',
    c.email,
    c.phoneMobile,
    c.phoneLandline,
    `${S.street}, ${S.city}`,
    '',
    `${S.claim} ${S.tagline}`,
    S.homepageText,
  ].join('\n');
}

// ── Mail-Text (unveraendert aus dem Auftrag) ─────────────────────────────
export function renderMail1(input: Mail1Input, contact: SignatureContact): RenderedMail1 {
  const greetingName = resolveGreetingName(input.spitzname, input.contactName);
  const signoffName = resolveSignoffName(input.callsMeAs);
  const profileUrl = buildProfileUrl(input.bandSlug);
  const greeting = greetingName ? `Servus ${greetingName},` : 'Servus,';

  const paragraphs = [
    'proudleut hat unter der Haube einen kräftigen Schub bekommen. Das Aussehen ist euch vertraut, aber die Seite wirkt professioneller, lässt sich viel leichter bedienen und ist deutlich flotter unterwegs. Außerdem zeigen die Profile jetzt mehr als früher, und es gibt auch Musikerprofile.',
    null, // Profil-Link (eigene Zeile)
    'Bitte prüft, ob eure Angaben noch stimmen und aktuell sind, also Besetzung, Links, Bilder, Kontaktdaten und was sonst auf eurer Seite steht. Wenn alles passt, antwortet mir kurz mit "passt so". Wenn etwas zu ändern ist, schreibt mir einfach, was.',
    'Und wenn ihr euer Profil gern noch weiter ausbauen möchtet, sagt mir Bescheid. Dann schicke ich euch ein paar Möglichkeiten.',
  ];

  const text = [
    greeting,
    '',
    paragraphs[0],
    '',
    `Hier ist euer Profil: ${profileUrl}`,
    '',
    paragraphs[2],
    '',
    paragraphs[3],
    '',
    'Pfiat eich,',
    signoffName,
    '',
    '--',
    buildSignatureText(contact),
  ].join('\n');

  const p = (s: string) => `<p style="margin:0 0 16px 0;">${esc(s)}</p>`;
  const html = `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(MAIL1_SUBJECT)}</title></head>
<body style="margin:0;padding:24px;background:#ffffff;">
<div style="max-width:620px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${INK};">
${p(greeting)}
${p(paragraphs[0]!)}
<p style="margin:0 0 16px 0;">Hier ist euer Profil: <a href="${esc(profileUrl)}" style="color:${ACCENT};">${esc(profileUrl)}</a></p>
${p(paragraphs[2]!)}
${p(paragraphs[3]!)}
<p style="margin:0 0 28px 0;">Pfiat eich,<br>${esc(signoffName)}</p>
${buildSignatureHtml(contact)}
</div>
</body></html>`;

  return { subject: MAIL1_SUBJECT, text, html, greetingName, signoffName, profileUrl };
}
