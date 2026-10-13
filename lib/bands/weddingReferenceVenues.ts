import type { ReferenceEvent } from '@/lib/types/band';

// Hoechstzahl der Hochzeits-Referenzen in der Zeile "Hier feiern wir gerne
// Hochzeit" (Hochzeitsblock der Bandseite).
export const MAX_WEDDING_REFERENCE_VENUES = 6;

// Eintraege dieser Zeile: Referenzen mit Art "hochzeit" in Admin-Reihenfolge,
// je "Location, Ort"; fehlt die Location, steht nur der Ort, fehlt der Ort,
// nur die Location; fehlen beide, entfaellt die Referenz. Maximal
// MAX_WEDDING_REFERENCE_VENUES Eintraege.
export function weddingReferenceVenues(events: ReferenceEvent[]): string[] {
  const out: string[] = [];
  for (const ev of events) {
    if (ev.kind !== 'hochzeit') continue;
    const label = [ev.venue, ev.city].filter(Boolean).join(', ');
    if (label) out.push(label);
    if (out.length >= MAX_WEDDING_REFERENCE_VENUES) break;
  }
  return out;
}
