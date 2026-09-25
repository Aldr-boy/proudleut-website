import { fetchEventCategoryHero } from '@/sanity/lib/fetchEventCategoryHero'
import { urlFor } from '@/sanity/lib/image'
import type { BandFinderThemeKey } from './bandFinderThemes'

export type BandFinderThemeImage = {
  url: string
  alt: string
  // Optionale CSS object-position fuer die 44px-Quadrat-Kachel (Auftrag
  // "Bandfinder-Bildwechsel"). Nur gesetzt, wenn der Standard-Mittenausschnitt
  // (object-cover, Position 50% 50%) das Motiv erkennbar schneidet -- siehe
  // Kommentare je Eintrag unten. undefined -> BandExplorer.tsx nutzt 'center'.
  objectPosition?: string
}

// Endgueltige Motive pro Themenkasten (Auftrag "Bandfinder-Bildwechsel"),
// liegen lokal unter public/images/bandfinder/ -- ersetzt die vorherigen
// Supabase-Platzhalterfotos fuer alle vier Themen ausser Hochzeit/Festzelt.
//
// Hochzeit/Festzelt nutzen weiterhin unveraendert das bereits bestehende,
// real gepflegte Sanity-eventCategoryHero-Bild -- identische Quelle, die
// auch den grossen Veranstaltungsseiten-Hero speist
// (sanity/lib/fetchEventCategoryHero.ts). Bewusst nicht auf eine lokale
// Kopie umgestellt, damit diese beiden Kacheln weiterhin redaktionell
// ueber Sanity pflegbar bleiben, ohne Code-Aenderung.
//
// Alle vier lokalen Dateien sind bereits quadratisch (256x256, per sharp
// vorab zugeschnitten -- Auftrag "Bandfinder-Bilder quadratisch machen"):
// vorher lieferte next/image bei einem Querformat-Original zur Kachelgroesse
// passende, aber NICHT quadratische Antworten (z. B. 96x64 statt 96x96),
// die der Browser fuer object-cover zusaetzlich vertikal hochskalieren
// musste. Der bisher per object-position gewaehlte Ausschnitt steckt jetzt
// direkt in der Bilddatei -- objectPosition ist dadurch fuer alle vier
// nicht mehr noetig (object-cover auf einem bereits quadratischen Bild ist
// ein No-op). Die Typ-Unterstuetzung fuer objectPosition bleibt bestehen,
// falls ein kuenftiges Motiv wieder ein Nicht-Quadrat ist.
//
// Die Bilder sind rein dekorativ (Kachel-Label daneben traegt die
// Bedeutung) -- alt bewusst leer, identisch zur bisherigen Praxis dieser
// Kacheln.
const STATIC_IMAGES: Record<
  Exclude<BandFinderThemeKey, 'hochzeit' | 'festzelt'>,
  BandFinderThemeImage
> = {
  alle: { url: '/images/bandfinder/bandfinder-alle-bands-donnaweda.webp', alt: '' },
  firmenfeier: { url: '/images/bandfinder/bandfinder-firmenfeier-lpc.webp', alt: '' },
  'stadt-und-buergerfest': {
    url: '/images/bandfinder/bandfinder-stadt-buergerfest-michael-jackts-net.webp',
    alt: '',
  },
  'konzert-club-festival': {
    url: '/images/bandfinder/bandfinder-konzert-club-festival-san2-soul-patrol.webp',
    alt: '',
  },
}

// Generischer Notfall-Fallback, falls der Sanity-Aufruf fuer Hochzeit/
// Festzelt ausnahmsweise leer bleibt (z. B. Sanity kurzzeitig nicht
// erreichbar) -- reales Bandfoto statt eines leeren/kaputten Bildes.
const GENERIC_FALLBACK: BandFinderThemeImage = STATIC_IMAGES.alle

async function resolveSanityThemeImage(slug: string): Promise<BandFinderThemeImage> {
  const hero = await fetchEventCategoryHero(slug)
  if (!hero) return GENERIC_FALLBACK
  return {
    url: urlFor(hero.heroImage).width(120).height(120).fit('crop').url(),
    alt: '',
  }
}

export async function getBandFinderThemeImages(): Promise<
  Record<BandFinderThemeKey, BandFinderThemeImage>
> {
  const [hochzeit, festzelt] = await Promise.all([
    resolveSanityThemeImage('hochzeit'),
    resolveSanityThemeImage('festzelt'),
  ])

  return {
    alle: STATIC_IMAGES.alle,
    hochzeit,
    festzelt,
    firmenfeier: STATIC_IMAGES.firmenfeier,
    'stadt-und-buergerfest': STATIC_IMAGES['stadt-und-buergerfest'],
    'konzert-club-festival': STATIC_IMAGES['konzert-club-festival'],
  }
}
