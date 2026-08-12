// Reine Variantenwahl fuer BandReferenceEvents (components/band/
// BandReferenceEvents.tsx), ausgelagert fuer deterministische Tests.
// Auftrag 4.3: 0 -> Section entfaellt. 1 -> kompakt auf hellem Grund.
// 2+ -> eigene dunkle Buehnen-Insel, alle sichtbar (keine Pagination).

export type ReferenceEventsVariant = 'none' | 'compact-light' | 'stage-island';

export function referenceEventsVariant(count: number): ReferenceEventsVariant {
  if (count <= 0) return 'none';
  if (count === 1) return 'compact-light';
  return 'stage-island';
}
