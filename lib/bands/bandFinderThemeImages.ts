import { fetchEventCategoryHero } from '@/sanity/lib/fetchEventCategoryHero'
import { urlFor } from '@/sanity/lib/image'
import type { BandFinderThemeKey } from './bandFinderThemes'

export type BandFinderThemeImage = { url: string; alt: string }

// Vorlaeufige, zentral austauschbare Motive pro Themenkasten (Auftrag
// "Bandfinder-Redesign", Abschnitt 4 "Themenbilder und Zustaende").
//
// Hochzeit/Festzelt nutzen unten das bereits bestehende, real gepflegte
// Sanity-eventCategoryHero-Bild -- identische Quelle, die zuvor den
// grossen Veranstaltungsseiten-Hero speiste (sanity/lib/fetchEventCategoryHero.ts).
//
// Fuer die uebrigen vier Themen existiert aktuell kein eigenes Sanity-
// Motiv (read-only gegen das Sanity-Dataset geprueft: nur "hochzeit" und
// "festzelt" haben einen eventCategoryHero-Datensatz). Deshalb hier je ein
// real vorhandenes Bandfoto (Supabase Storage band-media, dieselbe
// Bildquelle wie jede Bandkarte) einer Band, die dem jeweiligen Anlass
// tatsaechlich zugeordnet ist (read-only gegen Produktion ermittelt):
//   - Firmenfeier: 5toBeat (event_type firmenfeier-business-event)
//   - Stadt- & Buergerfest: 2 unplugged (event_type stadt-und-buergerfest)
//   - Konzert, Club & Festival: A96 Musikanten (event_type festival)
//   - Alle Bands: 9to5 (alphabetisch erste aktive Band, neutrale Wahl)
// Der Betreiber waehlt die finalen Motive spaeter aus -- bis dahin an
// dieser einen Stelle zentral austauschbar. Die Bilder sind rein
// dekorativ (Label daneben traegt die Bedeutung) -- alt bewusst leer.
const SUPABASE_BAND_MEDIA = 'https://bfyucjjyarvqeftqqihm.supabase.co/storage/v1/object/public/band-media'

const STATIC_IMAGES: Record<
  Exclude<BandFinderThemeKey, 'hochzeit' | 'festzelt'>,
  BandFinderThemeImage
> = {
  alle: { url: `${SUPABASE_BAND_MEDIA}/9to5/thumbnail.webp`, alt: '' },
  firmenfeier: { url: `${SUPABASE_BAND_MEDIA}/5tobeat/thumbnail.webp`, alt: '' },
  'stadt-und-buergerfest': { url: `${SUPABASE_BAND_MEDIA}/2-unplugged/thumbnail.webp`, alt: '' },
  'konzert-club-festival': { url: `${SUPABASE_BAND_MEDIA}/a96-musikanten/thumbnail.webp`, alt: '' },
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
