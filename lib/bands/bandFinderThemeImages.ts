import { fetchEventCategoryHero } from '@/sanity/lib/fetchEventCategoryHero'
import { urlFor } from '@/sanity/lib/image'
import type { BandFinderThemeKey } from './bandFinderThemes'

export type BandFinderThemeImage = {
  url: string
  alt: string
  // Optionale CSS object-position fuer die Querformat-Kachel (Variante 1c,
  // ~3,07:1). Nur gesetzt, wenn der Standard-Mittenausschnitt (object-cover,
  // 50% 50%) das Motiv erkennbar schneidet -- siehe Kommentare je Eintrag
  // unten. undefined -> BandExplorer.tsx nutzt 'center'.
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
// Alle vier lokalen Dateien sind bereits im Kachel-Seitenverhaeltnis von
// Variante 1c zugeschnitten (~3,07:1, per sharp aus hoeher aufgeloesten
// Quellen neu geschnitten -- Auftrag "Anlass-Kacheln Variante 1c"). Der
// vertikale Bildausschnitt steckt damit direkt in der Datei; objectPosition
// bleibt als Typ-Unterstuetzung erhalten, falls ein kuenftiges Motiv wieder
// nicht im passenden Seitenverhaeltnis vorliegt.
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
// Bewusst NICHT von STATIC_IMAGES.alle abgeleitet (Fund aus PR #112-Preview:
// dadurch zeigte dieser Fallback zwischenzeitlich faelschlich dasselbe
// Donnaweda-Motiv wie die "Alle Bands"-Kachel, wann immer Sanity kein
// Hochzeit-/Festzelt-Bild lieferte) -- eigener, unabhaengiger Wert wie
// zuvor auf main: Thumbnail der Band 9to5.
const GENERIC_FALLBACK: BandFinderThemeImage = {
  url: 'https://bfyucjjyarvqeftqqihm.supabase.co/storage/v1/object/public/band-media/9to5/thumbnail.webp',
  alt: '',
}

// Zielverhaeltnis der Variante-1c-Kachel (~356x116 im Design-Mockup),
// hier bei doppelter Aufloesung angefordert (2x fuer Retina-Bildschirme
// -- die Kachel selbst bleibt in derselben CSS-Groesse, next/image
// skaliert das groessere Bild lediglich herunter). Sanitys eigener
// hotspot-bewusster Zuschnitt (crop+hotspot sind fuer hochzeit/festzelt
// in Sanity gepflegt) uebernimmt damit direkt die passende
// Bildausrichtung -- kein zusaetzliches CSS object-position noetig
// (siehe BandFinderThemeImage.objectPosition-Kommentar oben).
const SANITY_TILE_WIDTH = 720
const SANITY_TILE_HEIGHT = 236

async function resolveSanityThemeImage(slug: string): Promise<BandFinderThemeImage> {
  const hero = await fetchEventCategoryHero(slug)
  if (!hero) return GENERIC_FALLBACK
  return {
    url: urlFor(hero.heroImage)
      .width(SANITY_TILE_WIDTH)
      .height(SANITY_TILE_HEIGHT)
      .fit('crop')
      .url(),
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
