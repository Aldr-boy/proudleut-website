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

  // Phase 2: Fallback über gemeinsame eventTypes (deterministisch)
  if (matched.length < maxCount) {
    const currentEventTypes = new Set(currentBand.eventTypes);
    const alreadyIncluded = new Set([currentBand.slug, ...matched.map((b) => b.slug)]);

    const candidates = allBands
      .filter(
        (b) =>
          !alreadyIncluded.has(b.slug) &&
          b.status === 'active' &&
          b.eventTypes.some((et) => currentEventTypes.has(et))
      )
      .sort((a, b) => {
        const aShared = a.eventTypes.filter((et) => currentEventTypes.has(et)).length;
        const bShared = b.eventTypes.filter((et) => currentEventTypes.has(et)).length;
        if (bShared !== aShared) return bShared - aShared;
        return a.name.localeCompare(b.name, 'de');
      });

    for (const c of candidates) {
      if (matched.length >= maxCount) break;
      matched.push(c);
    }
  }

  return matched.slice(0, maxCount);
}
