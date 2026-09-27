import type { BandLocation } from '@/lib/types/band';

export function formatLocation(location: BandLocation | undefined): string {
  if (!location?.city) return '';
  // Bei kreisfreien Staedten ist der Landkreis-Wert (z. B. "Kreisfreie Stadt
  // München") gegenueber dem Ort redundant und entfaellt in der Anzeige.
  if (location.district?.startsWith('Kreisfreie Stadt')) return location.city;
  const region = location.district || location.administrativeRegion || location.state;
  return region ? `${location.city} · ${region}` : location.city;
}
