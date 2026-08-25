// Extrahiert eine UUID aus dem `detail`-Text eines RPC-Fehlers, analog zu
// lib/moods/usageCount.ts::extractUsageCountFromDetail. Wird von der
// Mood-zentrierten Bandverwaltung (/admin/moods/[slug]/bands) genutzt, um
// aus einer bandbezogenen RPC-Fehlermeldung (z. B.
// "band_id=<uuid>: 5 moods submitted, maximum 4 allowed") die betroffene
// Band-ID zu gewinnen und serverseitig zu einem Bandnamen aufzuloesen --
// keine sicherheitsrelevante Pruefung, ausschliesslich fuer eine
// praezisere Fehlermeldung im Admin.
const UUID_RE = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i

export function extractUuidFromDetail(details: string | null | undefined): string | null {
  if (!details) return null
  const m = details.match(UUID_RE)
  return m ? m[1] : null
}
