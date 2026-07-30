import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isValidAdminSession } from './isValidAdminSession'

// Bestehender, unveraenderter Auth-Vertrag (middleware.ts,
// app/admin/login/actions.ts, app/admin/actions.ts): Cookie-Wert wird
// direkt gegen ADMIN_SECRET verglichen. Kein HMAC, kein JWT, kein
// Supabase Auth -- dieser Guard bestaetigt ausschliesslich denselben,
// bereits bestehenden Sessionzustand, er entwirft ihn nicht neu.
//
// Grund fuer diesen Guard: die Middleware allein schuetzt HTTP-Requests
// an /admin/*-Seiten, aber exportierte Server Actions sind eigene,
// direkt aufrufbare HTTP-Endpunkte (Next.js erzeugt fuer jede
// 'use server'-Funktion einen eigenen POST-Handler) -- die Middleware
// prueft diese Endpunkte nicht automatisch mit. Jede sicherheitsrelevante
// Server Action muss die Session daher selbst bestaetigen.
//
// Faellt IMMER fail-closed: fehlendes ADMIN_SECRET, fehlendes Cookie und
// falscher Cookie-Wert fuehren alle zu redirect() -- redirect() wirft
// intern (NEXT_REDIRECT), der Aufrufer kann daher nach diesem Aufruf
// nicht mehr fortfahren. Gibt absichtlich keinen Client oder Wert
// zurueck -- ausschliesslich die Session-Bestaetigung selbst.
//
// Die eigentliche Vergleichslogik (isValidAdminSession) liegt bewusst in
// einem eigenen, Next.js-freien Modul -- siehe isValidAdminSession.ts.
const ADMIN_COOKIE = 'admin_session'

export async function requireAdminSession(): Promise<void> {
  const adminSecret = process.env.ADMIN_SECRET

  if (!adminSecret) {
    redirect('/admin/login?error=not_configured')
  }

  const cookieStore = await cookies()
  const session = cookieStore.get(ADMIN_COOKIE)

  if (!isValidAdminSession(session?.value, adminSecret)) {
    redirect('/admin/login?error=session_required')
  }
}
