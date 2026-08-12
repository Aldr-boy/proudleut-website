// Reine Layout-Auswahl-Logik fuer BandGallery (components/band/BandGallery.tsx),
// bewusst ausgelagert fuer deterministische Tests -- JSX/next/image-Rendering
// ist in diesem Repo nicht direkt per node:test pruefbar (keine React-
// Komponenten-Test-Infrastruktur, siehe Projektkonvention), die reine
// Auswahl der Layoutvariante je Bildanzahl aber schon.

export type DesktopGalleryComposition =
  | 'single'
  | 'pair'
  | 'leitbild-column'
  | 'leitbild-row'
  | 'quadrant';

// Auftrag 4.2 / Design-Soll 2d: welche feste Komposition je Bildanzahl.
// null bei 0 Bildern -- Section entfaellt vollstaendig (kein Aufruf dieser
// Funktion in dem Fall noetig, aber defensiv abgedeckt).
export function desktopGalleryComposition(count: number): DesktopGalleryComposition | null {
  if (count <= 0) return null;
  if (count === 1) return 'single';
  if (count === 2) return 'pair';
  if (count === 3) return 'leitbild-column';
  if (count === 4) return 'leitbild-row';
  return 'quadrant';
}

// Fuer die "quadrant"-Komposition (5+ Bilder): erste 4 Nicht-Leitbild-Bilder
// bilden den 2x2-Quadranten, alles ab Bild 6 (Index 5) landet im einfachen
// Fortsetzungsraster darunter -- kein Bild wird abgeschnitten oder per
// "+N mehr"-Overlay verdeckt.
export function quadrantSplit<T>(images: T[]): { leitbild: T; quadrant: T[]; continuation: T[] } {
  const [leitbild, ...rest] = images;
  return {
    leitbild,
    quadrant: rest.slice(0, 4),
    continuation: rest.slice(4),
  };
}

// Mobile: eigene Komposition (Auftrag 4.2, entsprechend 2b). Die auf das
// Leitbild folgenden Bilder werden in 2er-Zeilen gruppiert; ein uebrig
// bleibendes ungerades Bild bildet die letzte Gruppe alleine (rendert dann
// als volle Breite statt 2-spaltig). Funktioniert ohne Sonderfall fuer jede
// Bildanzahl >= 0.
export function chunkMobilePairs<T>(rest: T[]): T[][] {
  const pairs: T[][] = [];
  for (let i = 0; i < rest.length; i += 2) pairs.push(rest.slice(i, i + 2));
  return pairs;
}
