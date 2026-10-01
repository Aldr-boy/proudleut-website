import type { Band } from '@/lib/types/band';
import { formatLocation } from '@/lib/utils/formatLocation';

export type BandFact = { label: string; value: string };

// Faktenleiste/Steckbrief unter dem Hero (Herkunft, Besetzung, Stil). Fehlende
// Werte entfallen einzeln, keine leeren Zellen.
export function getBandFacts(band: Band): BandFact[] {
  const facts: BandFact[] = [
    { label: 'Herkunft', value: formatLocation(band.location) },
    { label: 'Besetzung', value: band.weddingInfo?.bandSize ?? '' },
    { label: 'Stil', value: band.musikalischVerortet[0] ?? '' },
  ];
  return facts.filter((f) => f.value);
}
