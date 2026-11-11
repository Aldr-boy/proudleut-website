// Zusaetzliche Bandfotos fuer die Desktop-Bildwand (Auftrag "Mehr Bandfotos
// gleichzeitig im Startseiten-Hero"). Die Dateien liegen verkleinert und
// komprimiert in public/hero-wall/ (max. 1000 px breit, WebP) -- sie sind
// keine Datenbank-Eintraege und aendern den kuratierten Pool (media_assets,
// hero_wall) nicht.
//
// Die Desktop-Wand hat mehr Bildplaetze (HERO_WALL_SLOT_COUNT.desktop) als
// der Pool Bilder. extendHeroWallPool() haengt die Zusatzfotos in den Pool
// ein und fuellt den Rest durch Wiederholung auf -- ohne Platzhalter und
// ohne dass ein Foto neben sich selbst liegt.
export type HeroWallExtraImage = {
  id: string
  url: string
  heroFocus: string | null
  alt: string
}

export const HERO_WALL_EXTRA_IMAGES: HeroWallExtraImage[] = [
  {
    id: 'extra-kasplattn-rocker',
    url: '/hero-wall/kasplattn-rocker.webp',
    heroFocus: null,
    alt: 'Die Kasplattn Rocker spielen im vollen Festzelt, die Menge feiert vor der Bühne.',
  },
  {
    id: 'extra-lpc-unplugged',
    url: '/hero-wall/lpc-unplugged.webp',
    heroFocus: null,
    alt: 'LPC unplugged: Vier Musiker mit Saxofon, Kontrabass, Schlagzeug und Gitarre spielen im Freien.',
  },
  {
    id: 'extra-hulzstoussboum-hochzeit',
    url: '/hero-wall/hulzstoussboum-hochzeit.webp',
    heroFocus: null,
    alt: 'Die Hulzstoussboum ziehen mit Blechbläsern und Ziehharmonika bei einer Hochzeit durch die Gasse, dahinter das Brautpaar.',
  },
  {
    id: 'extra-partyband-hob-nou',
    url: '/hero-wall/partyband-hob-nou.webp',
    heroFocus: null,
    alt: 'Die Partyband Hob Nou auf der Bühne vor jubelndem Publikum im Festzelt.',
  },
  {
    id: 'extra-hf-buch-26',
    url: '/hero-wall/hf-buch-26.webp',
    heroFocus: null,
    alt: 'Eine Band spielt in einer Holzscheune, das Publikum dahinter reißt die Arme hoch.',
  },
]

// Die ersten KEEP_PREFIX Pool-Plaetze bleiben unveraendert, weil kleinere
// Breakpoints (Handy, Tablet) ein Praefix des Pools zeigen und unveraendert
// bleiben sollen (groesster Bedarf davon: 12 Plaetze).
const KEEP_PREFIX = 12

// Baut die Bildliste fuer `slotCount` Bildplaetze:
//  1. Praefix des Pools unveraendert,
//  2. danach Poolbilder und Zusatzfotos abwechselnd gemischt (damit die
//     neuen Fotos ueber die Wand verteilt sind, nicht gebuendelt),
//  3. Rest durch Wiederholung in gleicher Reihenfolge -- Wiederholung hat
//     damit den groesstmoeglichen Abstand (= Laenge der Basisliste).
// Ein Foto liegt dadurch nie direkt neben sich selbst: Nachbarn sind +/-1
// (gleiche Spalte) bzw. +/-perTrack (Nachbarspalte), die Basisliste ist
// laenger als beides.
export function extendHeroWallPool<T extends { id: string }>(
  pool: readonly T[],
  extras: readonly T[],
  slotCount: number
): T[] {
  const head = pool.slice(0, KEEP_PREFIX)
  const rest = pool.slice(KEEP_PREFIX)
  const mixed: T[] = []
  let ri = 0
  let ei = 0
  // Zusatzfoto nach jeweils ~2 Poolbildern einstreuen.
  while (ri < rest.length || ei < extras.length) {
    for (let k = 0; k < 2 && ri < rest.length; k++) mixed.push(rest[ri++])
    if (ei < extras.length) mixed.push(extras[ei++])
  }
  const base = [...head, ...mixed]
  if (base.length === 0) return []
  const out: T[] = []
  for (let i = 0; i < slotCount; i++) out.push(base[i % base.length])
  return out
}
