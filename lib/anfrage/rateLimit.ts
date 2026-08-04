import 'server-only';
import { createAdminClient } from '@/lib/supabase/server';

export { hashClientIp } from './ipHash.ts';

export type RateLimitCheck = { allowed: boolean; retryAfterSeconds: number };

// Ruft die atomare, race-freie DB-Funktion
// check_and_consume_anfrage_rate_limit() auf (siehe
// supabase/anfragesystem_native_migration.sql). Faellt bewusst FAIL-OPEN
// zurueck, wenn die RPC selbst technisch fehlschlaegt (z. B. Migration
// noch nicht ausgefuehrt) -- Honeypot, Timing-Check, 8er-Cap und die
// serverseitige Bandauflösung sind unabhaengige, zusaetzliche
// Schutzschichten, die legitime Nutzer bei einem DB-Hiccup nicht
// mitausbremsen sollen. Der Fehlschlag wird geloggt, nicht verschluckt.
export async function checkAndConsumeRateLimit(
  ipHash: string,
  opts?: { windowSeconds?: number; maxRequests?: number }
): Promise<RateLimitCheck> {
  const client = createAdminClient();
  const { data, error } = await client
    .rpc('check_and_consume_anfrage_rate_limit', {
      p_ip_hash: ipHash,
      p_window_seconds: opts?.windowSeconds ?? 3600,
      p_max_requests: opts?.maxRequests ?? 5,
    })
    .single();

  if (error || !data) {
    console.error('[anfrage] Rate-Limit-Prüfung fehlgeschlagen, fail-open', error);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const row = data as { allowed: boolean; retry_after_seconds: number };
  return { allowed: row.allowed, retryAfterSeconds: row.retry_after_seconds };
}
