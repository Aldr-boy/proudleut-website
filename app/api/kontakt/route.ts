import { NextRequest, NextResponse } from 'next/server'

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function isValidEmail(email: string): boolean {
  return /\S+@\S+\.\S+/.test(email)
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const p = body as Record<string, unknown>

  // Honeypot → stille 200 (bewusstes Anti-Spam-Verhalten, Bot-Täuschung)
  if (asString(p.firma_hidden) || asString(p.website_hidden)) {
    return NextResponse.json({ ok: true })
  }

  // Zeitstempel-Check → stille 200 (bewusstes Anti-Spam-Verhalten, Bot-Täuschung)
  if (typeof p.openedAt === 'number' && Date.now() - p.openedAt < 3000) {
    return NextResponse.json({ ok: true })
  }

  const anlass    = asString(p.anlass).trim()
  const vorname   = asString(p.vorname).trim()
  const nachname  = asString(p.nachname).trim()
  const email     = asString(p.email).trim()
  const nachricht = asString(p.nachricht).trim()

  if (!anlass) {
    return NextResponse.json({ error: 'Bitte wähle ein Anliegen aus' }, { status: 400 })
  }
  if (!vorname || !nachname) {
    return NextResponse.json({ error: 'Vor- und Nachname sind Pflichtfelder' }, { status: 400 })
  }
  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { error: 'Bitte gib eine gültige E-Mail-Adresse ein' },
      { status: 400 },
    )
  }
  if (!nachricht) {
    return NextResponse.json({ error: 'Bitte schreib eine kurze Nachricht' }, { status: 400 })
  }
  if (p.datenschutz !== true) {
    return NextResponse.json({ error: 'Datenschutz-Zustimmung fehlt' }, { status: 400 })
  }

  // Stub-Modus: kein E-Mail-Versand, keine personenbezogenen Daten geloggt
  // Phase 2: Resend-Integration hier ergänzen
  return NextResponse.json({ ok: true, mode: 'stub' })
}
