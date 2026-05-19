import type { Band } from '@/lib/types/band';

const BAVARIAN_DISTRICTS = [
  'Oberbayern',
  'Niederbayern',
  'Oberpfalz',
  'Oberfranken',
  'Mittelfranken',
  'Unterfranken',
  'Schwaben',
] as const;

export const REGION_ORDER: string[] = [...BAVARIAN_DISTRICTS, 'Außerhalb Bayerns'];

export function getBandRegionBucket(band: Band): string | null {
  const adminRegion = band.location.administrativeRegion;
  if (adminRegion && (BAVARIAN_DISTRICTS as readonly string[]).includes(adminRegion)) {
    return adminRegion;
  }
  const hasLocation =
    adminRegion ||
    band.location.district ||
    band.location.state ||
    band.location.city;
  return hasLocation ? 'Außerhalb Bayerns' : null;
}
