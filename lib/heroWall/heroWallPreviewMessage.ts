import type { HeroWallImage } from '@/components/hero/HeroWall'

// Gemeinsamer Nachrichtenvertrag zwischen dem Hero-Bilder-Admin-Editor
// (Sender, HeroImagesEditor.tsx) und der eigenstaendigen Vorschau-Route
// (Empfaenger, app/admin/hero-images/preview/page.tsx). Die Vorschau lebt
// in einem eigenen <iframe> mit echter Geraetebreite/-hoehe, damit
// Tailwinds Breakpoints innerhalb des Iframes tatsaechlich auf ein
// eigenes Viewport reagieren (nicht auf das Browserfenster des Admins) --
// siehe HeroImagesEditor.tsx. Der unsaved Auswahl-Stand wird per
// postMessage uebertragen, NICHT ueber einen zweiten Datenspeicher
// (kein sessionStorage, keine erneute DB-Abfrage): rein transientes
// In-Memory-Handshake fuer die Dauer der Editor-Sitzung.
export const HERO_WALL_PREVIEW_MESSAGE_TYPE = 'proudleut:hero-wall-preview'

export type HeroWallPreviewMessage = {
  type: typeof HERO_WALL_PREVIEW_MESSAGE_TYPE
  images: HeroWallImage[]
}
