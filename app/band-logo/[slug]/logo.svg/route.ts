import {
  BAND_LOGO_CACHE_CONTROL,
  BAND_LOGO_MAX_BYTES,
  BAND_LOGO_SECURITY_HEADERS,
  buildBandLogoUpstreamUrl,
  looksLikeSvg,
} from '@/lib/bandLogos/svgLogoProxy';

// Band-Logo (SVG) ueber proudleut.com: der Browser fragt /band-logo/<slug>/logo.svg
// an, der Server holt die Datei aus dem EIGENEN Supabase-Projekt
// (band-media/<slug>/logo.svg) und liefert sie selbst aus -- keine
// Weiterleitung. Ausgeliefert wird ausschliesslich genau dieses Muster: der
// Slug ist auf [a-z0-9-] beschraenkt, Host und Pfad kommen aus fester
// Konfiguration, nicht aus der Anfrage. Details zu Schutz-Kopfzeilen und
// Cache: lib/bandLogos/svgLogoProxy.ts.
export const dynamic = 'force-dynamic';

function failure(status: number, body: string) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const upstream = buildBandLogoUpstreamUrl(slug, process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!upstream) return failure(404, 'Not found');

  try {
    // redirect: 'error' -- eine Weiterleitung von Supabase wird nie verfolgt.
    const res = await fetch(upstream, { redirect: 'error', signal: AbortSignal.timeout(8000) });
    if (res.status === 404 || res.status === 400) return failure(404, 'Not found');
    if (!res.ok) return failure(502, 'Bad gateway');

    const declared = Number(res.headers.get('content-length') ?? 0);
    if (declared > BAND_LOGO_MAX_BYTES) return failure(502, 'Bad gateway');
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > BAND_LOGO_MAX_BYTES || !looksLikeSvg(bytes)) {
      return failure(502, 'Bad gateway');
    }

    return new Response(bytes, {
      headers: { ...BAND_LOGO_SECURITY_HEADERS, 'Cache-Control': BAND_LOGO_CACHE_CONTROL },
    });
  } catch {
    return failure(502, 'Bad gateway');
  }
}
