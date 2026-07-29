// Leitet das next/image remotePattern fuer Supabase Storage aus
// NEXT_PUBLIC_SUPABASE_URL ab, statt einen einzelnen Produktionshost fest
// zu verdrahten. Noetig, damit Staging-/Ersatz-Supabase-Projekte und
// lokale Supabase-Instanzen (127.0.0.1/localhost mit Port) ihre
// oeffentlichen Storage-URLs ebenfalls ueber next/image ausliefern
// koennen -- next.config.ts akzeptiert sonst nur den einen Host, der zum
// Zeitpunkt der Konfiguration fest eingetragen war.
//
// Bewusst KEIN Wildcard-Host (kein "*.supabase.co", kein hostname:'**'),
// da next/image sonst beliebige fremde Supabase-Projekte als Bildquelle
// akzeptieren wuerde -- exakt der Host aus der aktuell konfigurierten
// Umgebungsvariable, nichts breiter.
export type SupabaseImageRemotePattern = {
  protocol: 'http' | 'https'
  hostname: string
  port: string
  pathname: string
}

export const SUPABASE_STORAGE_PUBLIC_PATH = '/storage/v1/object/public/**'

// Dokumentierter Fallback ausschliesslich fuer den Fall, dass
// NEXT_PUBLIC_SUPABASE_URL komplett fehlt (z. B. lokaler Build/Test ohne
// .env.local). Bewusst der bisherige, eng gefasste Produktionshost --
// keine Ausweitung. Anders als lib/supabase/client.ts und
// lib/supabase/server.ts (die bei fehlender Variable hart werfen, weil
// ohne sie kein einziger DB-/API-Zugriff funktioniert), ist
// next.config.ts nur fuer next/image-Bildauslieferung zustaendig -- ein
// Build darf daran nicht scheitern, nur weil diese eine Variable zum
// Konfigurationszeitpunkt (noch) nicht gesetzt ist.
const PRODUCTION_FALLBACK_HOSTNAME = 'bfyucjjyarvqeftqqihm.supabase.co'

export class InvalidSupabaseUrlError extends Error {}

// Wirft bewusst bei einer GESETZTEN, aber ungueltigen URL -- niemals wird
// aus einer kaputten Eingabe eine breite Erlaubnis abgeleitet. Nur eine
// komplett FEHLENDE Variable bekommt den engen Fallback oben.
export function deriveSupabaseImageRemotePattern(
  supabaseUrl: string | undefined
): SupabaseImageRemotePattern {
  if (!supabaseUrl) {
    return {
      protocol: 'https',
      hostname: PRODUCTION_FALLBACK_HOSTNAME,
      port: '',
      pathname: SUPABASE_STORAGE_PUBLIC_PATH,
    }
  }

  let parsed: URL
  try {
    parsed = new URL(supabaseUrl)
  } catch {
    throw new InvalidSupabaseUrlError(
      `NEXT_PUBLIC_SUPABASE_URL ist gesetzt, aber keine gueltige URL: "${supabaseUrl}"`
    )
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new InvalidSupabaseUrlError(
      `NEXT_PUBLIC_SUPABASE_URL hat ein nicht unterstuetztes Protokoll ("${parsed.protocol}"), erwartet http oder https: "${supabaseUrl}"`
    )
  }

  if (!parsed.hostname) {
    throw new InvalidSupabaseUrlError(
      `NEXT_PUBLIC_SUPABASE_URL enthaelt keinen Hostnamen: "${supabaseUrl}"`
    )
  }

  return {
    protocol: parsed.protocol === 'https:' ? 'https' : 'http',
    hostname: parsed.hostname,
    port: parsed.port,
    pathname: SUPABASE_STORAGE_PUBLIC_PATH,
  }
}
