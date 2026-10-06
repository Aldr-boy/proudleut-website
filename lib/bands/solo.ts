import type { Band } from '@/lib/types/band';

// Solo-Act = Profil mit der Besetzungsart "Solomusiker" (bands.lineup_type).
// Der Vorname ist das erste Wort des Anzeigenamens -- kein eigenes Datenfeld.
export const KLEINE_BAND = 'Kleine Band (Solo, Duo & Trio)';

export function isSoloBand(band: Pick<Band, 'lineupType'>): boolean {
  return band.lineupType === 'solomusiker';
}

// Vorname fuer Solo-Acts, sonst null (dann gelten die bisherigen Texte).
export function getSoloFirstName(band: Pick<Band, 'name' | 'lineupType'>): string | null {
  if (!isSoloBand(band)) return null;
  return band.name.trim().split(/\s+/)[0] || null;
}

// Sammelfilter: Besetzungsart Solomusiker, Duo oder Trio.
function isSmallBand(band: Pick<Band, 'lineupType'>): boolean {
  return band.lineupType === 'solomusiker' || band.lineupType === 'duo' || band.lineupType === 'trio';
}

type FilterBand = Pick<Band, 'category' | 'lineupType'>;

// Zusaetzliche Filtereintraege neben den Hauptbandarten (band.category).
export function getExtraBandtypOptions(bands: FilterBand[]): string[] {
  const extra: string[] = [];
  if (bands.some(isSmallBand)) extra.push(KLEINE_BAND);
  return extra;
}

// Wert aus der URL auf einen zusaetzlichen Filtereintrag abbilden (oder null).
export function resolveExtraBandtyp(raw: string, bands: FilterBand[]): string | null {
  const wanted = raw.toLowerCase();
  return getExtraBandtypOptions(bands).find((o) => o.toLowerCase() === wanted) ?? null;
}

// Bandart-Filter: Hauptbandart (category) plus die zusaetzlichen Eintraege.
export function bandMatchesBandtyp(band: FilterBand, bandtyp: string): boolean {
  const wanted = bandtyp.toLowerCase();
  if (band.category && band.category.toLowerCase() === wanted) return true;
  if (wanted === KLEINE_BAND.toLowerCase()) return isSmallBand(band);
  return false;
}
