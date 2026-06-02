'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const ADMIN_COOKIE = 'admin_session'
const COOKIE_MAX_AGE = 60 * 60 * 8 // 8 hours

export async function loginAction(formData: FormData) {
  const secret = formData.get('secret') as string
  const adminSecret = process.env.ADMIN_SECRET

  if (!adminSecret) {
    redirect('/admin/login?error=not_configured')
  }

  if (!secret || secret !== adminSecret) {
    redirect('/admin/login?error=invalid')
  }

  // SECURITY NOTE: Cookie value equals ADMIN_SECRET directly (plain comparison).
  // This is adequate for a single-user internal tool on HTTPS.
  // For production or multi-user use: replace with HMAC-signed token (jose)
  // or migrate to Supabase Auth email/password login.
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE, adminSecret, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  redirect('/admin/bands')
}
