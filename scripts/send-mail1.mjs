// Mail 1 ("Proudleut ist neu") -- lokales Skript, kein oeffentlicher Endpunkt.
// Versand ueber die VEROEFFENTLICHTE Resend-Vorlage mail1-profil-pruefen:
// uebergeben werden nur die Vorlage und drei Werte (ANREDE_NAME, PROFIL_LINK,
// SCHLUSSNAME). Text, Betreff und Footer stehen in der Vorlage (Resend-Dashboard).
//
//   node scripts/send-mail1.mjs --slug freunde-des-brautpaares          -> nur Versandpaket anzeigen (Standard)
//   node scripts/send-mail1.mjs --slug freunde-des-brautpaares --send   -> echter Versand (genau eine Mail)
//
// Regeln: nur Baender aus ALLOWED_SLUGS; Baender mit gesetztem
// "zuletzt angefragt am" werden uebersprungen; "zuletzt angefragt am" wird
// erst NACH der Annahme durch Resend gesetzt; "zuletzt bestaetigt am" wird
// nie angefasst. Der Absender kommt aus .env.local (MAIL_MAIN_EMAIL).

import fs from 'node:fs';
import path from 'node:path';
import { Resend } from 'resend';
import { resolveGreetingName, resolveSignoffName, buildProfileUrl } from '../lib/mail1/mail1.ts';

const ALLOWED_SLUGS = ['freunde-des-brautpaares'];
// Kennung der Resend-Vorlage mail1-profil-pruefen (kein Geheimnis).
const TEMPLATE_ID = '89ad911c-24f6-49b2-bc39-c04e7a9da91e';

function loadEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    out[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '');
  }
  return out;
}

const args = process.argv.slice(2);
const slug = args[args.indexOf('--slug') + 1];
const doSend = args.includes('--send');

if (!slug || !ALLOWED_SLUGS.includes(slug)) {
  console.error(`Abbruch: --slug muss einer von [${ALLOWED_SLUGS.join(', ')}] sein.`);
  process.exit(1);
}

const env = { ...loadEnvFile('.env.cutover-test.local'), ...loadEnvFile('.env.local'), ...process.env };
const supaUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supaKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supaHeaders = { apikey: supaKey, Authorization: `Bearer ${supaKey}`, 'Content-Type': 'application/json' };

const senderEmail = env.MAIL_MAIN_EMAIL?.trim();
if (!senderEmail) {
  console.error('Abbruch: MAIL_MAIN_EMAIL fehlt in .env.local.');
  process.exit(1);
}

// Band + Primaerkontakt aus der echten Datenbank
const res = await fetch(
  `${supaUrl}/rest/v1/bands?select=id,name,slug,review_requested_at,band_contacts(contact_name,email,spitzname,calls_me_as,is_primary_inquiry)&slug=eq.${slug}`,
  { headers: supaHeaders }
);
const rows = await res.json();
if (!res.ok || !Array.isArray(rows) || rows.length !== 1) {
  console.error('Abbruch: Band nicht eindeutig gefunden.', res.status);
  process.exit(1);
}
const band = rows[0];
const primaries = band.band_contacts.filter((c) => c.is_primary_inquiry);
if (primaries.length !== 1 || !primaries[0].email) {
  console.error('Abbruch: Primaerkontakt nicht eindeutig oder ohne E-Mail.');
  process.exit(1);
}
const pc = primaries[0];

// Die drei Werte der Vorlage (Regeln wie bisher)
const variables = {
  ANREDE_NAME: resolveGreetingName(pc.spitzname, pc.contact_name),
  PROFIL_LINK: buildProfileUrl(band.slug),
  SCHLUSSNAME: resolveSignoffName(pc.calls_me_as),
};
const from = `Alexander Dressler <${senderEmail}>`;
const payload = {
  from,
  to: pc.email,
  replyTo: senderEmail,
  template: { id: TEMPLATE_ID, variables },
};

if (band.review_requested_at) {
  console.log(`Uebersprungen: ${band.name} hat bereits "zuletzt angefragt am" = ${band.review_requested_at}. Nichts versendet.`);
  process.exit(0);
}

if (!doSend) {
  // Vorschau: nur das Versandpaket anzeigen, nichts senden, nichts aendern.
  console.log('VERSANDPAKET (nichts gesendet, keine Daten geaendert):');
  console.log(JSON.stringify({ ...payload, replyTo: payload.replyTo }, null, 2));
  console.log(`Band: ${band.name}, "zuletzt angefragt am": ${band.review_requested_at ?? 'leer'}`);
  process.exit(0);
}

// ── Echter Versand ──
if (!env.RESEND_API_KEY) {
  console.error('Abbruch: RESEND_API_KEY fehlt.');
  process.exit(1);
}

const resend = new Resend(env.RESEND_API_KEY);
let sendResult;
try {
  sendResult = await resend.emails.send(payload, { idempotencyKey: `mail1-tpl-v1-${band.id}` });
} catch (err) {
  console.error('Versand fehlgeschlagen (Ausnahme):', err instanceof Error ? err.message : 'unbekannt');
  console.error('"zuletzt angefragt am" wurde NICHT gesetzt.');
  process.exit(1);
}
if (sendResult.error || !sendResult.data?.id) {
  console.error('Versand fehlgeschlagen:', sendResult.error?.name ?? 'keine Message-ID', '-', sendResult.error?.message ?? '');
  console.error('"zuletzt angefragt am" wurde NICHT gesetzt.');
  process.exit(1);
}
console.log(`Resend hat die Mail angenommen (ID ${sendResult.data.id}).`);

const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
const upd = await fetch(`${supaUrl}/rest/v1/bands?id=eq.${band.id}&review_requested_at=is.null`, {
  method: 'PATCH',
  headers: { ...supaHeaders, Prefer: 'return=minimal' },
  body: JSON.stringify({ review_requested_at: today }),
});
if (!upd.ok) {
  console.error(`ACHTUNG: Mail ist raus, aber "zuletzt angefragt am" konnte nicht gesetzt werden (Status ${upd.status}). Bitte von Hand eintragen: ${today}`);
  process.exit(1);
}
console.log(`"zuletzt angefragt am" bei ${band.name} auf ${today} gesetzt.`);
