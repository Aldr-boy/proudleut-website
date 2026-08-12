import type { Band } from '../types/band';

// Ausgelagert aus components/band/BandWeddingModule.tsx (JSX-Dateien sind in
// diesem Repo nicht direkt per node:test importierbar) fuer deterministische
// Tests der "ohne Hochzeit"-Bedingung (Auftrag 5).
export function hasWeddingContent(band: Pick<Band, 'eventTypes'>): boolean {
  return band.eventTypes.some((et) => et.trim().toLowerCase().includes('hochzeit'));
}
