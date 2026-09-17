import type { Band } from '@/lib/types/band';
import type { ImageAsset } from '@/lib/types/image';

// Kleine, zentrale, optionale Darstellungskonfiguration fuer den
// Bandprofil-Hero (Auftrag "Bandseiten-Redesign", Abschnitt 7) -- explizit
// als dokumentierte Uebergangsloesung erlaubt, solange kein Fokuspunkt-/
// Crop-Feld auf ImageAsset/media_assets existiert (siehe lib/types/image.ts).
// Bewusst KEINE Datenbankmigration, KEINE neue Admin-Funktion, KEINE
// zusaetzliche Datenbankabfrage: arbeitet ausschliesslich mit bereits
// geladenen band.heroImage/band.gallery-Werten.
//
// desktopObjectPosition / mobileObjectPosition: CSS object-position-Werte
//   (per Inline-Style gesetzt, da die konkreten Werte nicht als feste
//   Tailwind-Klassen vorliegen) fuer dasselbe Bild auf den beiden
//   Breakpoint-Gruppen -- ein einzelnes <Image> reicht dafuer aus, kein
//   zweites Bild, kein Performance-Nachteil. Ohne Wert gilt object-center.
// mobileImageUrlContains: Teilstring der URL eines bereits vorhandenen
//   Bildes aus band.heroImage/band.gallery derselben Band (stabiler
//   Speicherpfad, siehe lib/bandImages/storagePath.ts), das mobil anstelle
//   des Hero-Bildes verwendet werden soll. Kein Treffer -> Fallback auf das
//   reguelaere Hero-Bild (siehe resolveMobileHeroImage unten).
export type HeroImagePresentationEntry = {
  desktopObjectPosition?: string;
  mobileObjectPosition?: string;
  mobileImageUrlContains?: string;
};

// Werte fuer blechstreet-boys/donnaweda aus dem finalen Entwurf
// ("Bandseite Blechstreet + Donnaweda.dc.html", Auftrag "Bandseiten-
// Redesign Finalisierung"): dort pro Band als heroPosDesk/heroPosMob
// hinterlegt, damit das jeweils entscheidende Bildmotiv (Instrumente bzw.
// Feuerspucker) im sichtbaren Bildausschnitt bleibt. Ohne Eintrag gilt der
// gemeinsame Standard (object-center, dasselbe Bild mobil wie desktop).
const HERO_IMAGE_PRESENTATION: Record<string, HeroImagePresentationEntry> = {
  'blechstreet-boys': { desktopObjectPosition: 'center 24%', mobileObjectPosition: '52% 24%' },
  donnaweda: { desktopObjectPosition: 'center 30%', mobileObjectPosition: '58% 28%' },
};

export function resolveHeroImagePresentation(
  slug: string,
  presentation: Record<string, HeroImagePresentationEntry> = HERO_IMAGE_PRESENTATION,
): HeroImagePresentationEntry {
  return presentation[slug] ?? {};
}

/**
 * Waehlt das mobile Hero-Motiv. Ohne konfigurierten Eintrag oder ohne
 * Treffer in band.heroImage/band.gallery faellt es auf band.heroImage
 * zurueck -- fehlende referenzierte Bilder duerfen laut Auftrag niemals zu
 * einem leeren Hero fuehren. `presentation` ist injizierbar, damit die
 * Match-/Fallback-Logik unabhaengig vom aktuellen Inhalt der zentralen
 * Konfiguration testbar bleibt.
 */
export function resolveMobileHeroImage(
  band: Pick<Band, 'slug' | 'heroImage' | 'gallery'>,
  presentation: Record<string, HeroImagePresentationEntry> = HERO_IMAGE_PRESENTATION,
): ImageAsset | undefined {
  const entry = resolveHeroImagePresentation(band.slug, presentation);
  if (!entry.mobileImageUrlContains) return band.heroImage;

  const candidates = [band.heroImage, ...band.gallery].filter(
    (img): img is ImageAsset => img !== undefined,
  );
  const match = candidates.find((img) => img.url.includes(entry.mobileImageUrlContains!));
  return match ?? band.heroImage;
}
