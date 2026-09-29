import { NextRequest, NextResponse } from 'next/server';
import { extractClientIp } from '@/lib/anfrage/clientIp';
import { hashClientIp } from '@/lib/anfrage/rateLimit';
import { submitKontakt } from '@/lib/kontakt/service';
import { createAdminClient } from '@/lib/supabase/server';
import { getResendClient } from '@/lib/resend/client';

// Allgemeiner Kontakt-Endpunkt (Auftrag L-A1b, Option B: Mail an Xandi ueber
// Resend, keine Speicherung). Duennwandiger Wrapper -- die eigentliche
// Geschaeftslogik liegt vollstaendig in lib/kontakt/service.ts (submitKontakt)
// und ist unabhaengig von dieser Route testbar. Reine IP-Hash-Namensraum-
// Trennung von /api/anfrage und /api/band-introductions: dasselbe
// ANFRAGE_RATE_LIMIT_SALT/dieselbe RPC werden wiederverwendet, aber mit einem
// "kontakt:"-Praefix gehasht, damit alle drei Formulare unabhaengige
// Rate-Limit-Fenster pro IP haben (kein neues Rate-Limit-System, keine neue
// Tabelle, keine neue RPC, keine GRANT-Aenderung).
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
    ipHash = hashClientIp(`kontakt:${clientIp}`);
  } catch (err) {
    console.error('[api/kontakt] Rate-Limit-Konfiguration fehlt, fail-closed', err);
    return NextResponse.json(
      { error: 'Deine Nachricht kann gerade nicht verarbeitet werden. Bitte versuche es in einigen Minuten erneut oder schreib uns direkt per E-Mail (siehe Kontaktbox rechts).' },
      { status: 503 }
    );
  }

  const result = await submitKontakt(body, { ipHash }, { client: createAdminClient(), getResendClient });

  switch (result.kind) {
    case 'bot_silent':
      // Stille 200-Antwort, damit Bots die Anfrage faelschlich fuer
      // erfolgreich halten (identisches, uebernommenes Verhalten wie
      // /api/anfrage und /api/band-introductions).
      return NextResponse.json({ ok: true });

    case 'accepted':
      return NextResponse.json({ ok: true });

    case 'too_fast':
      return NextResponse.json({ error: result.message }, { status: 400 });

    case 'validation_error':
      return NextResponse.json({ error: result.message }, { status: 400 });

    case 'rate_limited':
      return NextResponse.json(
        {
          error: 'Zu viele Anfragen — bitte versuche es in Kürze erneut oder schreib uns direkt per E-Mail (siehe Kontaktbox rechts).',
        },
        { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } }
      );

    case 'temporarily_unavailable':
      return NextResponse.json(
        { error: 'Deine Nachricht kann gerade nicht verarbeitet werden. Bitte versuche es in einigen Minuten erneut oder schreib uns direkt per E-Mail (siehe Kontaktbox rechts).' },
        { status: 503 }
      );

    case 'server_error':
    default:
      return NextResponse.json(
        { error: 'Deine Nachricht konnte nicht gesendet werden — bitte versuche es später erneut oder schreib uns direkt per E-Mail (siehe Kontaktbox rechts).' },
        { status: 500 }
      );
  }
}
