import { NextRequest, NextResponse } from 'next/server';

type ClientPayload = {
  bands: { slug: string; name: string }[];
  eventtyp: string;
  eventtyp_custom: string;
  datum: string;
  ort: string;
  veranstaltungsort: string;
  gaestezahl: string;
  spielzeit: string;
  nachricht: string;
  vorname: string;
  nachname: string;
  email: string;
  telefon: string;
  firma_hidden: string;
  website_hidden: string;
  datenschutz: boolean;
  openedAt: number;
};

function isValidEmail(email: string): boolean {
  return /\S+@\S+\.\S+/.test(email);
}

export async function POST(req: NextRequest) {
  let payload: ClientPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }

  // Honeypot – stille 200-Antwort damit Bots denken, die Anfrage sei erfolgreich
  if (payload.firma_hidden || payload.website_hidden) {
    return NextResponse.json({ ok: true });
  }

  // Zeitstempel-Check – stille 200-Antwort für Bot-Täuschung
  if (typeof payload.openedAt === 'number' && Date.now() - payload.openedAt < 3000) {
    return NextResponse.json({ ok: true });
  }

  if (!payload.bands || payload.bands.length < 1) {
    return NextResponse.json({ error: 'Keine Band ausgewählt' }, { status: 400 });
  }

  if (!payload.vorname?.trim() || !payload.email?.trim()) {
    return NextResponse.json({ error: 'Vorname und E-Mail sind Pflichtfelder' }, { status: 400 });
  }

  if (!isValidEmail(payload.email.trim())) {
    return NextResponse.json({ error: 'Bitte gib eine gültige E-Mail-Adresse ein' }, { status: 400 });
  }

  if (payload.datenschutz !== true) {
    return NextResponse.json({ error: 'Datenschutz-Zustimmung fehlt' }, { status: 400 });
  }

  const webhookUrl = process.env.MAKE_ANFRAGE_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('[api/anfrage] MAKE_ANFRAGE_WEBHOOK_URL ist nicht gesetzt');
    return NextResponse.json({ error: 'Konfigurationsfehler – bitte später erneut versuchen' }, { status: 500 });
  }

  const makePayload = {
    anfrage_id: crypto.randomUUID(),
    source: 'proudleut-next' as const,
    timestamp: new Date().toISOString(),
    bands: payload.bands,
    eventtyp: payload.eventtyp,
    eventtyp_custom: payload.eventtyp_custom,
    datum: payload.datum,
    ort: payload.ort,
    veranstaltungsort: payload.veranstaltungsort,
    gaestezahl: payload.gaestezahl,
    spielzeit: payload.spielzeit,
    nachricht: payload.nachricht,
    vorname: payload.vorname.trim(),
    nachname: payload.nachname,
    email: payload.email.trim(),
    telefon: payload.telefon,
    firma_hidden: payload.firma_hidden,
    website_hidden: payload.website_hidden,
    datenschutz: payload.datenschutz,
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makePayload),
    });
    if (!res.ok) {
      console.error('[api/anfrage] Make Webhook Fehler', res.status, await res.text());
      return NextResponse.json({ error: 'Anfrage konnte nicht gesendet werden – bitte später erneut versuchen' }, { status: 500 });
    }
  } catch (err) {
    console.error('[api/anfrage] Netzwerkfehler beim Make Webhook', err);
    return NextResponse.json({ error: 'Anfrage konnte nicht gesendet werden – bitte später erneut versuchen' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
