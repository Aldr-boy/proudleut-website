import type { Band } from '../types/band';

/**
 * MusicGroup JSON-LD für ein Bandprofil generieren.
 *
 * Gibt nur Felder aus, für die sinnvolle Daten vorhanden sind.
 * Keine leeren Strings, keine Platzhalter.
 *
 * Hinweis: Referenz-Events werden im Durchstich NICHT als MusicEvent
 * ins JSON-LD aufgenommen. Ein bloßes Jahr (z. B. "2024") ist kein
 * konkretes Datum im Sinne von Schema.org. MusicEvent erst in Phase 3
 * einbauen, wenn ein echtes startDate (mindestens YYYY-MM-DD) vorliegt.
 * Bis dahin: Referenz-Events nur im UI anzeigen.
 */
export function generateBandJsonLd(band: Band) {
  // sameAs: Website + Social Links sammeln
  const sameAs = [
    band.websiteUrl,
    band.socialLinks.facebook,
    band.socialLinks.instagram,
    band.socialLinks.spotify,
    band.socialLinks.youtube,
  ].filter(Boolean);

  // Genre aus Kategorie und Eventtypen
  const genre = [band.category, ...band.eventTypes].filter(Boolean);

  // Location nur wenn sinnvolle Daten vorhanden
  const hasLocation = band.location.city || band.location.state;
  const location = hasLocation
    ? {
        '@type': 'Place' as const,
        address: {
          '@type': 'PostalAddress' as const,
          ...(band.location.city && { addressLocality: band.location.city }),
          ...(band.location.state && { addressRegion: band.location.state }),
          ...(band.location.country && { addressCountry: band.location.country }),
        },
      }
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: band.name,
    url: `https://proudleut.com/band/${band.slug}`,
    ...(sameAs.length > 0 && { sameAs }),
    ...(genre.length > 0 && { genre }),
    ...(band.description && { description: band.description.slice(0, 300) }),
    ...(band.heroImage && { image: band.heroImage.url }),
    ...(location && { location }),
  };
}
