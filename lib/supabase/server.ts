import 'server-only'
// SECURITY: Uses SUPABASE_SERVICE_ROLE_KEY — bypasses Row Level Security.
// The 'server-only' import above causes the Next.js build to fail if this file
// is accidentally imported in a 'use client' component.
//
// PRODUCTION NOTE: For multi-user or higher-security scenarios, upgrade admin auth to:
//   - HMAC-signed cookie (e.g. via the `jose` library)
//   - Supabase Auth with email/password login
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Supabase admin env vars missing: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set'
    )
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
