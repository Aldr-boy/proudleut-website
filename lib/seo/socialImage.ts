// Link-Vorschau-Bild der Bandseiten (og:image): 1200x630 JPEG aus dem Hauptbild,
// fuer alle Baender nach derselben Regel zugeschnitten (cover). Der Bildfokus ist
// derselbe wie im mobilen Header (MOBILE_HERO_OBJECT_POSITION), gemeint ist der
// Fokuspunkt, nicht das Seitenverhaeltnis des Headers. Die Rechenlogik ist rein
// (ohne Bildbibliothek) und getestet; das Rendern steht in
// app/band/[slug]/og.jpg/route.ts.
import { MOBILE_HERO_OBJECT_POSITION } from '../bands/heroImagePresentation.ts'

export const SOCIAL_IMAGE_WIDTH = 1200
export const SOCIAL_IMAGE_HEIGHT = 630
export const SOCIAL_IMAGE_MAX_BYTES = 300 * 1024

// "50% 35%" -> { x: 0.5, y: 0.35 } (wie CSS object-position).
export function parseFocus(position: string): { x: number; y: number } {
  const [x, y] = position.split(/\s+/).map((p) => Number.parseFloat(p) / 100)
  return { x: Number.isFinite(x) ? x : 0.5, y: Number.isFinite(y) ? y : 0.5 }
}

export type SocialCrop = {
  // Groesse, auf die das Bild skaliert wird (deckt 1200x630 vollstaendig ab)
  resizeWidth: number
  resizeHeight: number
  // Ausschnitt 1200x630 aus dem skalierten Bild
  left: number
  top: number
  // Anteil des urspruenglichen Bildinhalts, der im Ausschnitt sichtbar ist (0..1)
  visibleShare: number
}

export function computeSocialCrop(
  width: number,
  height: number,
  focus: { x: number; y: number } = parseFocus(MOBILE_HERO_OBJECT_POSITION),
): SocialCrop {
  const scale = Math.max(SOCIAL_IMAGE_WIDTH / width, SOCIAL_IMAGE_HEIGHT / height)
  const resizeWidth = Math.max(SOCIAL_IMAGE_WIDTH, Math.round(width * scale))
  const resizeHeight = Math.max(SOCIAL_IMAGE_HEIGHT, Math.round(height * scale))
  return {
    resizeWidth,
    resizeHeight,
    left: Math.round((resizeWidth - SOCIAL_IMAGE_WIDTH) * focus.x),
    top: Math.round((resizeHeight - SOCIAL_IMAGE_HEIGHT) * focus.y),
    visibleShare: (SOCIAL_IMAGE_WIDTH * SOCIAL_IMAGE_HEIGHT) / (resizeWidth * resizeHeight),
  }
}
