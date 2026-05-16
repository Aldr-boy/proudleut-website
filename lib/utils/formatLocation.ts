import type { BandLocation } from '@/lib/types/band';

export function formatLocation(location: BandLocation | undefined): string {
  if (!location?.city) return '';
  const region = location.district || location.administrativeRegion || location.state;
  return region ? `${location.city} · ${region}` : location.city;
}
