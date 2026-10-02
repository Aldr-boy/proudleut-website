// Entscheidungslogik fuer Faktenleiste (Desktop) und Bottom-Bar (Handy) der
// Banddetailseite als reine Funktion (components/band/BandFloatingCta.tsx ruft
// sie nur auf). Ziel: zu jedem Scrollstand hoechstens EIN benutzbarer
// "Unverbindlich anfragen"-Button, und zwischen Hero-Button und Button der
// CTA-Karte keine Luecke ohne benutzbaren Button.
//
// Ein Button ist "benutzbar", wenn
//   - mindestens USABLE_MIN_FRACTION (0.5) seiner Hoehe im freien Viewport
//     liegen (Viewport abzueglich der MerklisteBar am unteren Rand) und
//   - der Mittelpunkt dieses sichtbaren Teils nicht von der Header-Pill
//     verdeckt ist (Hero-Button; der Aufrufer liefert das per elementFromPoint).
// Bei exakt 0.5 zaehlt der Button (Leiste aus). Es gibt genau EINE
// Vergleichsstelle (isUsable) fuer beide Buttons und beide Uebergaenge.
//
// Zustand je Button: 'usable' | 'above' (nicht benutzbar, oberhalb: schon
// passiert bzw. unter der Header-Pill) | 'below' (noch nicht erreicht). Die
// Leiste ist sichtbar, wenn der Hero-Button passiert ('above') und der
// CTA-Button noch nicht erreicht ('below') ist. Hinter der CTA-Karte bleibt
// sie ausgeblendet. Bei Bands ohne Hero-Button (hasHeroButton=false) zaehlt
// der Hero-Teil als passiert.

export const USABLE_MIN_FRACTION = 0.5;

export type VerticalRect = { top: number; bottom: number };

export type ButtonPosition = 'usable' | 'above' | 'below';

export type BarVisibilityInput = {
  hasHeroButton: boolean;
  // Rect des Hero-Buttons (Viewport-Koordinaten) bzw. null, wenn nicht im DOM.
  hero: VerticalRect | null;
  // true, wenn der Mittelpunkt des sichtbaren Teils des Hero-Buttons von der
  // Header-Pill verdeckt ist (am Handy und bei ca. 768-1100 px; am breiten
  // Desktop deckt die Pill den Hero-Button horizontal nicht ab).
  heroCoveredByHeader: boolean;
  // Rect des Buttons in der CTA-Karte bzw. null.
  cta: VerticalRect | null;
  viewportHeight: number;
  // Hoehe der MerklisteBar (fixed am unteren Rand), 0 wenn nicht vorhanden.
  merklisteHeight: number;
};

function freeBottom(viewportHeight: number, merklisteHeight: number): number {
  return Math.max(0, viewportHeight - merklisteHeight);
}

// Sichtbarer Teil eines Buttons im freien Viewport [0, viewport - Merkliste]
// oder null, wenn nichts sichtbar ist.
export function visibleRange(
  rect: VerticalRect,
  viewportHeight: number,
  merklisteHeight: number,
): VerticalRect | null {
  const top = Math.max(rect.top, 0);
  const bottom = Math.min(rect.bottom, freeBottom(viewportHeight, merklisteHeight));
  return bottom > top ? { top, bottom } : null;
}

export function visibleFraction(rect: VerticalRect, viewportHeight: number, merklisteHeight: number): number {
  const height = rect.bottom - rect.top;
  if (!(height > 0)) return 0;
  const range = visibleRange(rect, viewportHeight, merklisteHeight);
  return range ? (range.bottom - range.top) / height : 0;
}

// Mittelpunkt des sichtbaren Teils (Pruefpunkt fuer die Verdeckung) oder null.
export function usablePointY(rect: VerticalRect, viewportHeight: number, merklisteHeight: number): number | null {
  const range = visibleRange(rect, viewportHeight, merklisteHeight);
  return range ? (range.top + range.bottom) / 2 : null;
}

// Die EINE Vergleichsstelle fuer "benutzbar".
export function isUsable(fraction: number, covered: boolean): boolean {
  return !covered && fraction >= USABLE_MIN_FRACTION;
}

export function classifyButton(
  rect: VerticalRect,
  viewportHeight: number,
  merklisteHeight: number,
  covered: boolean,
): ButtonPosition {
  if (isUsable(visibleFraction(rect, viewportHeight, merklisteHeight), covered)) return 'usable';
  const center = (rect.top + rect.bottom) / 2;
  return center < freeBottom(viewportHeight, merklisteHeight) / 2 ? 'above' : 'below';
}

export function computeBarVisible(input: BarVisibilityInput): boolean {
  const { hasHeroButton, hero, heroCoveredByHeader, cta, viewportHeight, merklisteHeight } = input;

  const heroPassed = hasHeroButton
    ? hero !== null && classifyButton(hero, viewportHeight, merklisteHeight, heroCoveredByHeader) === 'above'
    : true;
  if (!heroPassed) return false;

  // Ohne CTA-Button im DOM gibt es nichts, dem die Leiste weichen muesste.
  return cta === null || classifyButton(cta, viewportHeight, merklisteHeight, false) === 'below';
}
