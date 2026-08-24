import { NextRequest, NextResponse } from 'next/server';
import { extractClientIp } from '@/lib/anfrage/clientIp';
import { hashClientIp } from '@/lib/anfrage/rateLimit';
import { submitBandIntro } from '@/lib/bandIntro/service';
import { createAdminClient } from '@/lib/supabase/server';
import { getResendClient } from '@/lib/resend/client';

// Erstkontakt-Endpunkt "Bandseite anfragen" (Paket 2A). Duennwandiger
// Wrapper -- die eigentliche Geschaeftslogik liegt vollstaendig in
// lib/bandIntro/service.ts (submitBandIntro) und ist unabhaengig von dieser
// Route testbar. Reine IP-Hash-Namensraum-Trennung von /api/anfrage: dasselbe
// ANFRAGE_RATE_LIMIT_SALT/dieselbe RPC werden wiederverwendet, aber mit
// einem "band-intro:"-Praefix gehasht, damit beide Formulare unabhaengige
// Rate-Limit-Fenster pro IP haben (kein neues Rate-Limit-System noetig).
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
    ipHash = hashClientIp(`band-intro:${clientIp}`);
  } catch (err) {
    console.error('[api/band-introductions] Rate-Limit-Konfiguration fehlt, fail-closed', err);
    return NextResponse.json(
      { error: 'Deine Bandvorstellung kann gerade nicht verarbeitet werden. Bitte versuche es in einigen Minuten erneut.' },
      { status: 503 }
    );
  }

  const result = await submitBandIntro(body, { ipHash }, { client: createAdminClient(), getResendClient });

  switch (result.kind) {
    case 'bot_silent':
      // Stille 200-Antwort, damit Bots die Anfrage faelschlich fuer
      // erfolgreich halten (identisches, uebernommenes Verhalten wie
      // /api/anfrage).
      return NextResponse.json({ ok: true });

    case 'accepted':
      return NextResponse.json({ ok: true, confirmationMailSent: result.confirmationMailSent });

    case 'validation_error':
      return NextResponse.json({ error: result.message }, { status: 400 });

    case 'rate_limited':
      return NextResponse.json(
        { error: 'Zu viele Anfragen — bitte versuche es in Kürze erneut.' },
        { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } }
      );

    case 'temporarily_unavailable':
      return NextResponse.json(
        { error: 'Deine Bandvorstellung kann gerade nicht verarbeitet werden. Bitte versuche es in einigen Minuten erneut.' },
        { status: 503 }
      );

    case 'server_error':
    default:
      return NextResponse.json(
        { error: 'Deine Bandvorstellung konnte nicht gespeichert werden — bitte versuche es später erneut.' },
        { status: 500 }
      );
  }
}
