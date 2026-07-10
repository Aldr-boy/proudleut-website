import type { Band } from '@/lib/types/band';

export function getSimilarBands(currentBand: Band, allBands: Band[], maxCount = 3): Band[] {
  const manualNames = [
    currentBand.similarBands?.manual1,
    currentBand.similarBands?.manual2,
    currentBand.similarBands?.manual3,
  ]
    .filter((n): n is string => Boolean(n?.trim()))
    .map((n) => n.trim().toLowerCase());

  const matched: Band[] = [];

  // Phase 1: manuelle Empfehlungen per Bandnamen-Vergleich (case-insensitive)
  for (const targetName of manualNames) {
    const found = allBands.find(
      (b) =>
        b.slug !== currentBand.slug &&
        b.status === 'active' &&
        b.name.trim().toLowerCase() === targetName
    );
    if (found && !matched.some((m) => m.slug === found.slug)) {
      matched.push(found);
    }
  }

  return matched.slice(0, maxCount);
}
