// Welche Anfrage-Flaeche gilt zu einem Scrollstand: die kompakte Header-Pille
// (ab 1024 px) oder die untere Anfrageleiste (bis 1023 px). Die Entscheidung
// "Leiste an" selbst faellt in lib/bands/barVisibility.ts (computeBarVisible,
// unveraendert); hier wird sie nur auf die Flaeche verteilt, damit hoechstens
// EINE Flaeche aktiv ist.

export type SurfaceInput = {
  // Ergebnis von computeBarVisible.
  barVisible: boolean;
  // Viewport mindestens 1024 px breit (matchMedia '(min-width: 1024px)').
  wide: boolean;
  // Die Band hat einen Hero-Button (Bandbild vorhanden).
  hasHeroButton: boolean;
  // Nur ohne Hero-Button: Der kurze Kopf (h1) ist aus dem Bild gescrollt
  // (Unterkante der h1 <= Unterkante der normalen Pille).
  headPassed: boolean;
};

// Kompakte Pille: Leiste an, breit, und bei Bands ohne Hero-Button erst, wenn der
// kurze Kopf aus dem Bild ist (bis dahin bleibt die normale Pille mit der
// Navigation sichtbar).
export function compactPillActive({ barVisible, wide, hasHeroButton, headPassed }: SurfaceInput): boolean {
  return barVisible && wide && (hasHeroButton || headPassed);
}

// Untere Anfrageleiste: Leiste an und nicht breit.
export function bottomBarActive({ barVisible, wide }: Pick<SurfaceInput, 'barVisible' | 'wide'>): boolean {
  return barVisible && !wide;
}
