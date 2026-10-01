import type { Band } from '../types/band';
import { formatLocation } from '../utils/formatLocation.ts';

export type BandFact = { label: string; value: string };

// Ab dieser Laenge wird wedding_constellation nicht mehr als Besetzung in der
// Leiste gezeigt: dort stehen teils Aufzaehlungen ueber mehrere
// Besetzungsvarianten ("Solo | Duo | Trio | ..."), die in eine Leistenzelle
// nicht passen.
export const BESETZUNG_FALLBACK_MAX_LENGTH = 24;

// Besetzung: bevorzugt die Mitgliederzahl ("6 Personen"); fehlt sie, dient der
// kurze Freitext wedding_constellation als Fallback (wie zuvor in der Fakten-
// spalte von BandDescription). Zu lange Texte entfallen, ebenso der
// Platzhalterwert "fix" (ohne Aussagekraft als Besetzung).
function resolveBesetzung(band: Pick<Band, 'weddingInfo'>): string {
  const size = band.weddingInfo?.bandSize;
  if (size) return size;
  const constellation = band.weddingInfo?.constellation?.trim();
  if (!constellation || constellation.toLowerCase() === 'fix') return '';
  return constellation.length <= BESETZUNG_FALLBACK_MAX_LENGTH ? constellation : '';
}

// Faktenleiste/Steckbrief unter dem Hero (Herkunft, Besetzung, Stil). Fehlende
// Werte entfallen einzeln, keine leeren Zellen.
export function getBandFacts(
  band: Pick<Band, 'location' | 'weddingInfo' | 'musikalischVerortet'>,
): BandFact[] {
  const facts: BandFact[] = [
    { label: 'Herkunft', value: formatLocation(band.location) },
    { label: 'Besetzung', value: resolveBesetzung(band) },
    { label: 'Stil', value: band.musikalischVerortet[0] ?? '' },
  ];
  return facts.filter((f) => f.value);
}
