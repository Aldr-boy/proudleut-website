import type { Band } from '@/lib/types/band';

// Solo-Act = Profil mit der (sekundaeren) Bandart "Solomusiker". Der Vorname
// ist das erste Wort des Anzeigenamens -- kein eigenes Datenfeld.
export const SOLO_BANDART = 'Solomusiker';

export function isSoloBand(band: Pick<Band, 'bandartNames'>): boolean {
  return band.bandartNames.includes(SOLO_BANDART);
}

// Vorname fuer Solo-Acts, sonst null (dann gelten die bisherigen Texte).
export function getSoloFirstName(band: Pick<Band, 'name' | 'bandartNames'>): string | null {
  if (!isSoloBand(band)) return null;
  return band.name.trim().split(/\s+/)[0] || null;
}

// Bandart-Filter: bisher nur die Hauptbandart (category). "Solomusiker" ist
// sekundaer gesetzt und wird deshalb zusaetzlich ueber bandartNames gefunden.
export function bandMatchesBandtyp(
  band: Pick<Band, 'category' | 'bandartNames'>,
  bandtyp: string
): boolean {
  const wanted = bandtyp.toLowerCase();
  if (band.category && band.category.toLowerCase() === wanted) return true;
  return wanted === SOLO_BANDART.toLowerCase() && isSoloBand(band);
}
