// Kleine, zentrale, optionale Darstellungskonfiguration fuer den
// Musikerprofil-Hero (Auftrag "Musiker-Hero: feste Dominik-Position aus dem
// generischen Template loesen") -- identisches Prinzip wie
// lib/bands/heroImagePresentation.ts, aber bewusst eine eigene, von Bands
// getrennte Konfiguration: Musiker und Bands behalten getrennte
// Praesentationsdaten, keine gemeinsame Lookup-Tabelle.
//
// desktopObjectPosition / mobileObjectPosition: CSS object-position-Werte
//   (per Inline-Style/CSS-Variable gesetzt, siehe app/musiker/[slug]/
//   page.tsx) fuer dasselbe Bild auf den beiden Breakpoint-Gruppen. Ohne
//   Eintrag fuer einen Slug gilt DEFAULT_PERSON_HERO_IMAGE_PRESENTATION
//   ("center 30%" auf beiden Breakpoints) -- ein neutraler, leicht nach oben
//   verschobener Ausschnitt statt totem object-center, der bei den meisten
//   Buehnenfotos das Gesicht im Bild haelt, ohne pro Musiker konfiguriert
//   werden zu muessen.
//
// Bewusst KEINE Datenbankmigration, KEINE neue Admin-Funktion, KEINE
// zusaetzliche Datenbankabfrage -- ein persistiertes Focal-Point-Feld waere
// erst bei deutlich mehr Musikerprofilen ein moeglicher spaeterer
// Ausbauschritt und ist ausdruecklich nicht Teil dieser Aenderung.
export type PersonHeroImagePresentationEntry = {
  desktopObjectPosition: string;
  mobileObjectPosition: string;
};

export const DEFAULT_PERSON_HERO_IMAGE_PRESENTATION: PersonHeroImagePresentationEntry = {
  desktopObjectPosition: 'center 30%',
  mobileObjectPosition: 'center 30%',
};

// Dominik Palmers Werte stammen aus der visuellen Live-Abstimmung seines
// vollflaechigen Heros (sein Buehnenfoto ist nahezu quadratisch, ein
// zentrierter Zuschnitt haette auf breiten Desktop-Verhaeltnissen den
// Kopf abgeschnitten) -- unveraendert aus der vorherigen, im Seitenkern
// hartkodierten Version uebernommen, nur hierher ausgelagert.
const PERSON_HERO_IMAGE_PRESENTATION: Record<string, PersonHeroImagePresentationEntry> = {
  'dominik-palmer': { desktopObjectPosition: 'center 10%', mobileObjectPosition: '32% center' },
};

export function resolvePersonHeroImagePresentation(
  slug: string,
  presentation: Record<string, PersonHeroImagePresentationEntry> = PERSON_HERO_IMAGE_PRESENTATION,
): PersonHeroImagePresentationEntry {
  return presentation[slug] ?? DEFAULT_PERSON_HERO_IMAGE_PRESENTATION;
}
