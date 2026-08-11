import type { BandAnfrageEventType } from '../types/band.ts';

// Block "Event-Type-Anfrage-Label V1". Reine, unabhaengig testbare Logik
// fuer components/band/AnfrageModal.tsx -- ausgelagert nach bestehendem
// Repo-Muster (z. B. lib/homepage/heroMosaicChips.test.ts,
// lib/bands/bandExplorerMoodUrlState.ts), da dieses Repo bewusst keine
// React-Komponenten-Test-Infrastruktur nutzt.

// Sichtbarer/gesendeter Wert im nativen Anfrageformular: anfrage_label
// falls vorhanden, sonst der kanonische Name (Owner-Entscheidung, Block
// "Event-Type-Anfrage-Label V1"). Der Name ist bewusst zweckgebunden
// ("anfrage_label"), nicht grammatikalisch ("label_singular") -- das
// Label kann eine bewusst andere Kurzform sein, nicht nur eine
// Singularform des kanonischen Namens.
export function resolveAnfrageDisplayLabel(option: BandAnfrageEventType): string {
  return option.anfrageLabel ?? option.name;
}

// Schnittmenge ueber die KANONISCHE Identitaet (slug), NICHT ueber das
// Anfrage-Label oder den Namen -- das Label ist reine Darstellung/
// Submit-Snapshot, keine Identitaet. Bei mehreren Bands werden nur Event
// Types uebernommen, die JEDER ausgewaehlten Band ueber denselben Slug
// zugeordnet sind (unveraenderte fachliche Semantik gegenueber der
// bisherigen namensbasierten Schnittmenge).
export function computeAvailableAnfrageEventTypes(
  bands: { anfrageEventTypes: BandAnfrageEventType[] }[]
): BandAnfrageEventType[] {
  if (bands.length === 0) return [];

  const uniqueBySlug = (options: BandAnfrageEventType[]): BandAnfrageEventType[] => {
    const bySlug = new Map<string, BandAnfrageEventType>();
    for (const option of options) {
      if (!bySlug.has(option.slug)) bySlug.set(option.slug, option);
    }
    return [...bySlug.values()];
  };

  const firstBandOptions = uniqueBySlug(bands[0].anfrageEventTypes);
  if (bands.length === 1) return firstBandOptions;

  return firstBandOptions.filter((option) =>
    bands.every((band) =>
      uniqueBySlug(band.anfrageEventTypes).some((candidate) => candidate.slug === option.slug)
    )
  );
}
