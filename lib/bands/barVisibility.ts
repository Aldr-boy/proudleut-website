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
//     verdeckt ist (Hero-Button; rein geometrisch, siehe isCoveredByPill).
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

// Rect des Hero-Buttons mit x-Grenzen (Viewport-Koordinaten).
export type HeroRect = VerticalRect & { left: number; right: number };

// Rechteck der NORMALEN Header-Pille (Border-Box des <header> mit
// data-nav-footprint, siehe components/Header.tsx).
export type PillRect = { left: number; right: number; top: number; bottom: number };

export type ButtonPosition = 'usable' | 'above' | 'below';

export type BarVisibilityInput = {
  hasHeroButton: boolean;
  // Rect des Hero-Buttons (Viewport-Koordinaten) bzw. null, wenn nicht im DOM.
  hero: HeroRect | null;
  // Rechteck der normalen Header-Pille bzw. null, wenn es sie nicht gibt (dann
  // gilt der Hero-Button als nicht verdeckt). Die Pille deckt den Hero-Button am
  // Handy und bei ca. 768-1030 px ab; am breiten Desktop liegt der Button links
  // neben ihr.
  pill: PillRect | null;
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

// Verdeckung des Hero-Buttons durch die Header-Pille, rein geometrisch: der
// Mittelpunkt des sichtbaren Teils (x: Mitte von left/right, y: usablePointY)
// liegt im Pillenrechteck. Halboffen (left <= x < right, top <= y < bottom),
// wie ein Treffertest an der Pixelgrenze. Ersetzt das fruehere
// elementFromPoint; unabhaengig von Dialogen, der Leiste und davon, welche
// Pillenform gerade angezeigt wird.
export function isCoveredByPill(
  hero: HeroRect,
  pill: PillRect | null,
  viewportHeight: number,
  merklisteHeight: number,
): boolean {
  if (!pill) return false;
  const y = usablePointY(hero, viewportHeight, merklisteHeight);
  if (y === null) return false;
  const x = (hero.left + hero.right) / 2;
  return x >= pill.left && x < pill.right && y >= pill.top && y < pill.bottom;
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
  const { hasHeroButton, hero, pill, cta, viewportHeight, merklisteHeight } = input;

  const heroPassed = hasHeroButton
    ? hero !== null &&
      classifyButton(hero, viewportHeight, merklisteHeight, isCoveredByPill(hero, pill, viewportHeight, merklisteHeight)) === 'above'
    : true;
  if (!heroPassed) return false;

  // Ohne CTA-Button im DOM gibt es nichts, dem die Leiste weichen muesste.
  return cta === null || classifyButton(cta, viewportHeight, merklisteHeight, false) === 'below';
}
