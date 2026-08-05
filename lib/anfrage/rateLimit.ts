import type { SupabaseClient } from '@supabase/supabase-js';

export { hashClientIp } from './ipHash.ts';

// Codex-Nachtrag PR #26, Befund 3: vollstaendig FAIL-CLOSED statt
// fail-open. Eine fehlende RPC/Tabelle, ein Berechtigungsfehler, ein
// Schema-/Migrationsfehler oder eine unerwartete Antwortform duerfen den
// oeffentlichen Anfrageweg NIE unbemerkt ohne wirksames Rate-Limit
// weiterlaufen lassen. Die vorhandene Supabase-/PostgREST-Fehlerstruktur
// erlaubt keine zuverlaessige Unterscheidung zwischen "echt transientem
// Netzwerk-Hickup" und "RPC existiert nicht"/"Migration fehlt" -- statt
// einer unsicheren Heuristik wird deshalb bewusst JEDER Fehler (Exception
// waehrend des Aufrufs, RPC-Fehlerantwort, unerwartete/ungueltige
// Rueckgabeform) einheitlich als fail_closed behandelt (ausdruecklich als
// einfachere, sicherere Loesung akzeptiert).
export type RateLimitOutcome =
  | { status: 'allowed' }
  | { status: 'blocked'; retryAfterSeconds: number }
  | { status: 'fail_closed' };

function isValidRateLimitRow(data: unknown): data is { allowed: boolean; retry_after_seconds: number } {
  if (typeof data !== 'object' || data === null) return false;
  const row = data as Record<string, unknown>;
  return typeof row.allowed === 'boolean' && typeof row.retry_after_seconds === 'number';
}

// client wird als Pflichtparameter uebergeben (Dependency Injection, gleiches
// Muster wie lib/anfrage/resolveBands.ts) -- kein Modul-internes
// createAdminClient()-Fallback mehr, damit diese Datei ohne
// Next.js-Request-Kontext per node:test mit einem Fake-Client testbar
// bleibt. Kein IP-/personenbezogener Anfrageinhalt wird geloggt --
// ausschliesslich RPC-Name und die sichere technische Fehlerkennung.
export async function checkAndConsumeRateLimit(
  client: SupabaseClient,
  ipHash: string,
  opts?: { windowSeconds?: number; maxRequests?: number }
): Promise<RateLimitOutcome> {
  const rpcName = 'check_and_consume_anfrage_rate_limit';
  try {
    const { data, error } = await client
      .rpc(rpcName, {
        p_ip_hash: ipHash,
        p_window_seconds: opts?.windowSeconds ?? 3600,
        p_max_requests: opts?.maxRequests ?? 5,
      })
      .single();

    if (error) {
      console.error('[anfrage] Rate-Limit-RPC-Fehlerantwort, fail-closed', {
        rpc: rpcName,
        code: error.code,
        message: error.message,
      });
      return { status: 'fail_closed' };
    }

    if (!isValidRateLimitRow(data)) {
      console.error('[anfrage] Rate-Limit-RPC lieferte unerwartete/ungueltige Antwortform, fail-closed', {
        rpc: rpcName,
      });
      return { status: 'fail_closed' };
    }

    return data.allowed
      ? { status: 'allowed' }
      : { status: 'blocked', retryAfterSeconds: data.retry_after_seconds };
  } catch (err) {
    console.error('[anfrage] Rate-Limit-RPC-Aufruf technisch fehlgeschlagen (Exception), fail-closed', {
      rpc: rpcName,
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: 'fail_closed' };
  }
}
