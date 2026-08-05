import { NextRequest, NextResponse } from 'next/server';
import { extractClientIp } from '@/lib/anfrage/clientIp';
import { hashClientIp } from '@/lib/anfrage/rateLimit';
import { submitAnfrage } from '@/lib/anfrage/service';
import { createAdminClient } from '@/lib/supabase/server';
import { getResendClient } from '@/lib/resend/client';

// Nativer Anfrage-Endpunkt (Block L-A1): Next.js -> Supabase -> Resend ->
// Admin-Nachweis. Ersetzt den bisherigen Make-Webhook-Forwarder. Der
// bestehende Make/Airtable/Gmail-Weg (Webflow-Formular) laeuft unabhaengig
// davon unveraendert weiter -- diese Route war damit nie verbunden (siehe
// Auftrag). Die eigentliche Geschaeftslogik liegt vollstaendig in
// lib/anfrage/service.ts (submitAnfrage) und ist unabhaengig von dieser
// Route testbar.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
  }

  const clientIp = extractClientIp(req.headers);
  let ipHash: string;
  try {
    ipHash = hashClientIp(clientIp);
  } catch (err) {
    // Fehlendes/ungueltiges ANFRAGE_RATE_LIMIT_SALT ist ebenfalls ein
    // fail-closed-Fall (Codex-Nachtrag PR #26, Befund 3) -- keine
    // Persistenz, kein Versand, dieselbe neutrale Meldung wie bei einem
    // technischen Rate-Limit-RPC-Fehler.
    console.error('[api/anfrage] Rate-Limit-Konfiguration fehlt, fail-closed', err);
    return NextResponse.json(
      { error: 'Deine Anfrage kann gerade nicht verarbeitet werden. Bitte versuche es in einigen Minuten erneut.' },
      { status: 503 }
    );
  }

  const result = await submitAnfrage(
    body,
    { ipHash },
    { client: createAdminClient(), getResendClient }
  );

  switch (result.kind) {
    case 'bot_silent':
      // Stille 200-Antwort, damit Bots die Anfrage faelschlich fuer
      // erfolgreich halten (bestehendes, uebernommenes Verhalten).
      return NextResponse.json({ ok: true });

    case 'accepted':
      // Neutrale Formulierung: suggeriert weder einen vollstaendigen
      // Mailversand-Erfolg noch einen kompletten Fehlschlag bei
      // Teilausfaellen. Interne Mailstatus/Empfaenger/Message-IDs werden
      // nie an den Client ausgegeben.
      return NextResponse.json({
        ok: true,
        message: 'Deine Anfrage ist eingegangen. Eine Bestätigung folgt per E-Mail.',
      });

    case 'validation_error':
      return NextResponse.json({ error: result.message }, { status: 400 });

    case 'rate_limited':
      return NextResponse.json(
        { error: 'Zu viele Anfragen — bitte versuche es in Kürze erneut.' },
        { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } }
      );

    case 'temporarily_unavailable':
      // Rate-Limit-Pruefung selbst technisch fehlgeschlagen (fail-closed,
      // siehe lib/anfrage/rateLimit.ts) -- keine Persistenz, kein Versand,
      // keine internen Fehlerdetails an den Client. Der clientseitige
      // Idempotency-Key bleibt beim Retry unveraendert (AnfrageModal setzt
      // ihn nur bei res.ok zurueck).
      return NextResponse.json(
        { error: 'Deine Anfrage kann gerade nicht verarbeitet werden. Bitte versuche es in einigen Minuten erneut.' },
        { status: 503 }
      );

    case 'unresolvable_band':
      return NextResponse.json(
        {
          error: `Die Band „${result.bandName}" kann aktuell leider nicht angefragt werden. Bitte entferne sie aus deiner Auswahl und versuche es erneut.`,
        },
        { status: 400 }
      );

    case 'server_error':
    default:
      return NextResponse.json(
        { error: 'Deine Anfrage konnte nicht gespeichert werden — bitte versuche es später erneut.' },
        { status: 500 }
      );
  }
}
