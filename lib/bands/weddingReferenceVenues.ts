import type { ReferenceEvent } from '@/lib/types/band';

// Eintraege der Zeile "Hier gespielt: ..." im Hochzeitsblock: Referenzen mit
// Art "hochzeit" in Admin-Reihenfolge, je "Location (Ort)"; fehlt die Location,
// steht nur der Ort, fehlt der Ort, nur die Location; fehlen beide, entfaellt
// die Referenz.
export function weddingReferenceVenues(events: ReferenceEvent[]): string[] {
  const out: string[] = [];
  for (const ev of events) {
    if (ev.kind !== 'hochzeit') continue;
    if (ev.venue && ev.city) out.push(`${ev.venue} (${ev.city})`);
    else if (ev.venue || ev.city) out.push((ev.venue ?? ev.city) as string);
  }
  return out;
}
