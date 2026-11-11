// Zusaetzliche Bandfotos fuer die Desktop-Bildwand (Auftrag "Mehr Bandfotos
// gleichzeitig im Startseiten-Hero"). Die Dateien liegen verkleinert und
// komprimiert in public/hero-wall/ (max. 1000 px breit, WebP) -- sie sind
// keine Datenbank-Eintraege und aendern den kuratierten Pool (media_assets,
// hero_wall) nicht.
//
// Die Desktop-Wand hat mehr Bildplaetze (HERO_WALL_SLOT_COUNT.desktop) als
// der Pool Bilder. extendHeroWallPool() ordnet Pool und Zusatzfotos auf die
// Plaetze an und fuellt den Rest durch Wiederholung auf -- ohne Platzhalter,
// ohne dass ein Foto neben sich selbst liegt, und mit gleichmaessig ueber die
// Wand verteilten Motiven.
import { HERO_WALL_IMAGES_PER_TRACK, HERO_WALL_TRACK_COUNT } from './heroWallComposition.ts'

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

// Motivgruppen fuer die Durchmischung (Auftrag "Bildwand besser durchmischen").
// Grob nach Motiv sortiert, Schluessel = Bild-ID (media_assets.id bzw. id der
// Zusatzfotos). Unbekannte IDs (z. B. spaeter im Admin neu gewaehlte Bilder)
// zaehlen als 'gruppe' -- die Wand bleibt dann gefuellt, nur nicht
// motivoptimiert, bis sie hier eingetragen werden.
//  publikum -- Publikum / Festzelt / Haende in der Luft
//  buehne   -- Buehne mit Lichtern, Feuer, Scheinwerfer
//  gruppe   -- Band posiert als Gruppe draussen / auf der Strasse
//  studio   -- Band posiert als Gruppe vor einfarbigem/dunklem Hintergrund
//  portrait -- Portrait, Detail, Moment
export type HeroMotifGroup = 'publikum' | 'buehne' | 'gruppe' | 'studio' | 'portrait'

export const HERO_MOTIF_GROUP_BY_ID: Record<string, HeroMotifGroup> = {
  // publikum
  'e97828b4-8627-425b-a4fb-9d779e5ef5a0': 'publikum', // Psyco Dad
  '5a671bde-a840-434e-9a80-759d99b9dbad': 'publikum', // Zruck zu dir (Zelt)
  '7341f362-ee22-4f27-80a4-1500a10adba5': 'publikum', // Die Haumdaucher
  '000e167e-f6f1-45bb-88c6-82133875cada': 'publikum', // Hally Gally (Zelt)
  'extra-kasplattn-rocker': 'publikum',
  'extra-partyband-hob-nou': 'publikum',
  'extra-hf-buch-26': 'publikum',
  // buehne
  'd3985920-eff1-4c05-ad88-6c12d0df917a': 'buehne', // San2 (Buehne, s/w)
  '2d336543-2be4-471c-a005-2d8bdd3192cd': 'buehne', // Muckasaeck
  '8f8d394d-0826-4fd1-8a32-2028aee704a2': 'buehne', // Gentle Band
  '0290ce93-ed6e-4ffc-b019-e3a70da7fb5e': 'buehne', // Donnaweda (Feuer)
  '4cf18045-592f-4ef7-b59c-6b07969ee177': 'buehne', // Bigband Steinbach
  // gruppe
  '8452972d-5782-47c4-bb04-6c9b729c4cdc': 'gruppe', // Saustoimusi
  'd953ee02-3459-4952-af37-f8013c35e1a9': 'gruppe', // Ruescherl Muse
  'fbb4b8ff-b7f5-4038-bafc-314f0e50b0a0': 'studio', // Harmonic Brass
  'ffd7da93-4de4-4d6c-99a8-b961e1eab65a': 'gruppe', // Urner Musi
  'a6057943-fb89-4457-9934-9ec5fa34e72d': 'studio', // Heimatfieber
  '2f109928-b4b1-424a-aa8c-c714fc441903': 'studio', // Zwiadn Band
  'd9e8c8e8-9b71-43ee-a26c-b2ac112fefdc': 'gruppe', // Duanix Musi
  'extra-lpc-unplugged': 'gruppe',
  // portrait
  '56f65522-ac42-4c6c-987b-b4c2f112636d': 'portrait', // San2 Portrait
  'f2cb97be-5abd-4877-ad5e-68ae1f706b8c': 'portrait', // LPC Music
  'fc0a5568-bb6b-4ea8-8e25-0c1ea2e451d5': 'portrait', // May Vibes
  'extra-hulzstoussboum-hochzeit': 'portrait',
}

// Fertig berechnete Anordnung fuer den aktuellen Pool (19 Bilder + 5
// Zusatzfotos), erzeugt mit computeHeroWallLayout() (800 Durchlaeufe) --
// damit beim Laden der Seite nichts gerechnet werden muss. Platz = Spur * 5 +
// Position, je 5 Eintraege = eine Spur. Passt der Bildbestand nicht mehr
// genau dazu (z. B. nach einer Aenderung im Admin), rechnet
// extendHeroWallPool() die Anordnung stattdessen selbst (kleiner Durchlauf).
const BAKED_DESKTOP_LAYOUT: readonly string[] = [
  'd3985920-eff1-4c05-ad88-6c12d0df917a', // Spur 0
  'extra-hulzstoussboum-hochzeit',
  'e97828b4-8627-425b-a4fb-9d779e5ef5a0',
  '56f65522-ac42-4c6c-987b-b4c2f112636d',
  '000e167e-f6f1-45bb-88c6-82133875cada',
  'fbb4b8ff-b7f5-4038-bafc-314f0e50b0a0', // Spur 1
  'd953ee02-3459-4952-af37-f8013c35e1a9',
  '2f109928-b4b1-424a-aa8c-c714fc441903',
  '8452972d-5782-47c4-bb04-6c9b729c4cdc',
  'f2cb97be-5abd-4877-ad5e-68ae1f706b8c',
  '5a671bde-a840-434e-9a80-759d99b9dbad', // Spur 2
  'fc0a5568-bb6b-4ea8-8e25-0c1ea2e451d5',
  '0290ce93-ed6e-4ffc-b019-e3a70da7fb5e',
  'ffd7da93-4de4-4d6c-99a8-b961e1eab65a',
  '7341f362-ee22-4f27-80a4-1500a10adba5',
  'f2cb97be-5abd-4877-ad5e-68ae1f706b8c', // Spur 3
  'extra-lpc-unplugged',
  'd9e8c8e8-9b71-43ee-a26c-b2ac112fefdc',
  'a6057943-fb89-4457-9934-9ec5fa34e72d',
  'extra-hulzstoussboum-hochzeit',
  '2d336543-2be4-471c-a005-2d8bdd3192cd', // Spur 4
  '56f65522-ac42-4c6c-987b-b4c2f112636d',
  'extra-hf-buch-26',
  'fbb4b8ff-b7f5-4038-bafc-314f0e50b0a0',
  '8f8d394d-0826-4fd1-8a32-2028aee704a2',
  'ffd7da93-4de4-4d6c-99a8-b961e1eab65a', // Spur 5
  '2f109928-b4b1-424a-aa8c-c714fc441903',
  '8452972d-5782-47c4-bb04-6c9b729c4cdc',
  'd953ee02-3459-4952-af37-f8013c35e1a9',
  'fc0a5568-bb6b-4ea8-8e25-0c1ea2e451d5',
  'extra-kasplattn-rocker', // Spur 6
  'extra-hulzstoussboum-hochzeit',
  '4cf18045-592f-4ef7-b59c-6b07969ee177',
  'f2cb97be-5abd-4877-ad5e-68ae1f706b8c',
  'extra-partyband-hob-nou',
  'fc0a5568-bb6b-4ea8-8e25-0c1ea2e451d5', // Spur 7
  'd9e8c8e8-9b71-43ee-a26c-b2ac112fefdc',
  'a6057943-fb89-4457-9934-9ec5fa34e72d',
  'extra-lpc-unplugged',
  '56f65522-ac42-4c6c-987b-b4c2f112636d',
]

const isHeavy = (g: HeroMotifGroup) => g === 'publikum' || g === 'buehne'

// Baut die Bildliste fuer die Desktop-Wand (TRACKS x PER_TRACK Plaetze,
// Platz = Spur * PER_TRACK + Position):
//  - "Schwere" Motive (publikum, buehne: hell, viele Lichter/Haende) stehen
//    nur auf Plaetzen mit gerader Spur UND gerader Position -- zwei solche
//    Plaetze beruehren sich nie, auch nicht diagonal. Bei 12 schweren Fotos
//    kommt jedes genau einmal vor.
//  - Leichte Motive (gruppe, portrait) fuellen den Rest, gleichmaessig
//    wiederholt.
//  - Platz 0 und Platz PER_TRACK behalten Poolbild 0 bzw. PER_TRACK (die
//    Preload-Links der Startseite zielen auf genau diese Plaetze).
//  - Danach tauscht ein deterministisches Verfahren Bilder innerhalb ihrer
//    Platzart, bis gleiche Fotos und gleiche Motive moeglichst weit
//    auseinander liegen. Ein Foto liegt nie neben sich selbst (auch nicht
//    diagonal).
// Ergebnis ist deterministisch (kein Zufall): Server und Client rendern
// identisch. Pro Eingabe wird nur einmal gerechnet (Zwischenspeicher).
const layoutCache = new Map<string, number[]>()

export function extendHeroWallPool<T extends { id: string }>(
  pool: readonly T[],
  extras: readonly T[],
  slotCount: number
): T[] {
  const tracks = HERO_WALL_TRACK_COUNT.desktop
  const perTrack = HERO_WALL_IMAGES_PER_TRACK.desktop
  const seen = new Set<string>()
  const images = [...pool, ...extras].filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)))
  if (images.length === 0) return []
  if (slotCount !== tracks * perTrack) {
    // Unerwartete Slotzahl: einfache Wiederholung als sicherer Fallback.
    return Array.from({ length: slotCount }, (_, i) => images[i % images.length])
  }
  const byId = new Map(images.map((x) => [x.id, x]))
  const bakedUsable =
    BAKED_DESKTOP_LAYOUT.length === slotCount &&
    byId.size === new Set(BAKED_DESKTOP_LAYOUT).size &&
    BAKED_DESKTOP_LAYOUT.every((id) => byId.has(id)) &&
    pool.length > 0 &&
    pool[0].id === BAKED_DESKTOP_LAYOUT[0] &&
    pool.length > perTrack &&
    pool[perTrack].id === BAKED_DESKTOP_LAYOUT[perTrack]
  if (bakedUsable) return BAKED_DESKTOP_LAYOUT.map((id) => byId.get(id)!)
  const key = `${pool.length}|${images.map((x) => x.id).join(',')}`
  let layout = layoutCache.get(key)
  if (!layout) {
    layout = computeHeroWallLayout(
      images.map((x) => HERO_MOTIF_GROUP_BY_ID[x.id] ?? 'gruppe'),
      pool.length,
      tracks,
      perTrack,
      2
    )
    layoutCache.set(key, layout)
  }
  return layout.map((i) => images[i])
}

// Liefert fuer jeden Platz den Index in `images`.
export function computeHeroWallLayout(
  groups: HeroMotifGroup[],
  poolLength: number,
  tracks: number,
  perTrack: number,
  restarts: number
): number[] {
  const n = tracks * perTrack
  const count = groups.length
  const heavyImg = groups.map(isHeavy)
  const groupIdx = groups.map((g) => ['publikum', 'buehne', 'gruppe', 'studio', 'portrait'].indexOf(g))

  const T = (s: number) => Math.floor(s / perTrack)
  const P = (s: number) => s % perTrack
  const allSlots = Array.from({ length: n }, (_, s) => s)
  const isHeavySlot = (s: number) => T(s) % 2 === 0 && P(s) % 2 === 0
  const heavySlots = allSlots.filter(isHeavySlot)
  const lightSlots = allSlots.filter((s) => !isHeavySlot(s))

  // Abstandstabelle
  const D: number[][] = allSlots.map((a) => allSlots.map((b) => Math.hypot(T(a) - T(b), P(a) - P(b))))

  const out: number[] = new Array(n).fill(-1)
  const fixed = new Set<number>()
  const fixSlot = (s: number, idx: number) => {
    if (idx < poolLength && idx < count) {
      out[s] = idx
      fixed.add(s)
    }
  }
  fixSlot(0, 0)
  fixSlot(perTrack, perTrack)
  const placed = new Set<number>([...fixed].map((s) => out[s]))

  // Startbelegung
  const idxs = Array.from({ length: count }, (_, i) => i)
  const a = idxs.filter((i) => groups[i] === 'publikum' && !placed.has(i))
  const b = idxs.filter((i) => groups[i] === 'buehne' && !placed.has(i))
  const heavyOrder: number[] = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i < a.length) heavyOrder.push(a[i])
    if (i < b.length) heavyOrder.push(b[i])
  }
  // Leichte Fotos: Portraits zuerst -- sie bekommen bei ungleicher Verteilung
  // die zusaetzliche Kopie.
  const lightIdx = idxs.filter((i) => !heavyImg[i]).sort((x, y) => Number(groups[y] === 'portrait') - Number(groups[x] === 'portrait'))
  const filler = lightIdx.length > 0 ? lightIdx : idxs
  const freeLight = lightSlots.filter((s) => !fixed.has(s))
  const copies = new Map<number, number>()
  filler.forEach((x, i) => {
    const total = Math.floor(lightSlots.length / filler.length) + (i < lightSlots.length % filler.length ? 1 : 0)
    const already = [...fixed].filter((s) => lightSlots.includes(s) && out[s] === x).length
    copies.set(x, Math.max(0, total - already))
  })
  const lightSeq: number[] = []
  for (let round = 0; lightSeq.length < freeLight.length && round < n; round++) {
    for (const x of filler) if ((copies.get(x) ?? 0) > round) lightSeq.push(x)
  }
  let hi = 0
  for (const s of heavySlots) {
    if (fixed.has(s)) continue
    out[s] = hi < heavyOrder.length ? heavyOrder[hi++] : filler[s % filler.length]
  }
  freeLight.forEach((s, i) => {
    out[s] = lightSeq[i % lightSeq.length]
  })

  // Energie eines Platzpaars: je kleiner, desto besser verteilt.
  const pairEnergy = (s1: number, s2: number): number => {
    const x = out[s1]
    const y = out[s2]
    const d = D[s1][s2]
    const near = d < 1.5 // direkte und diagonale Nachbarn
    if (x === y) return near ? 1000 : 600 / (d * d * d) + (d < 4.1 ? 1500 * (4.1 - d) : 0)
    const gx = groupIdx[x]
    const gy = groupIdx[y]
    if (gx === gy) return (heavyImg[x] ? 6 : 1) / (d * d) + (near ? (heavyImg[x] ? 200 : 40) : 0)
    if (heavyImg[x] && heavyImg[y]) return (near ? 100 : 0) + 2 / (d * d)
    return 0
  }
  const slotEnergy = (s: number): number => {
    let e = 0
    for (let o = 0; o < n; o++) if (o !== s) e += pairEnergy(s, o)
    return e
  }
  const improve = (slots: number[]) => {
    const movable = slots.filter((s) => !fixed.has(s))
    for (let sweep = 0; sweep < 40; sweep++) {
      let changed = false
      for (let i = 0; i < movable.length; i++) {
        for (let j = i + 1; j < movable.length; j++) {
          const s1 = movable[i]
          const s2 = movable[j]
          if (out[s1] === out[s2]) continue
          const before = slotEnergy(s1) + slotEnergy(s2) - pairEnergy(s1, s2)
          ;[out[s1], out[s2]] = [out[s2], out[s1]]
          const after = slotEnergy(s1) + slotEnergy(s2) - pairEnergy(s1, s2)
          if (after < before - 1e-9) changed = true
          else [out[s1], out[s2]] = [out[s2], out[s1]]
        }
      }
      if (!changed) break
    }
  }
  const totalEnergy = () => {
    let e = 0
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) e += pairEnergy(i, j)
    return e
  }

  // Mehrere Starts mit festem Pseudozufall: das einfache Tauschverfahren
  // bleibt sonst leicht in einer mittelmaessigen Anordnung haengen.
  const movableHeavy = heavySlots.filter((x) => !fixed.has(x))
  const movableLight = lightSlots.filter((x) => !fixed.has(x))
  const shuffleSlots = (slots: number[], rnd: () => number) => {
    const vals = slots.map((x) => out[x])
    for (let i = vals.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      ;[vals[i], vals[j]] = [vals[j], vals[i]]
    }
    slots.forEach((x, i) => {
      out[x] = vals[i]
    })
  }
  let best = [...out]
  let bestEnergy = Infinity
  for (let r = 0; r < restarts; r++) {
    if (r > 0) {
      const rnd = mulberry32(r * 7919)
      shuffleSlots(movableHeavy, rnd)
      shuffleSlots(movableLight, rnd)
    }
    improve(heavySlots)
    improve(lightSlots)
    const e = totalEnergy()
    if (e < bestEnergy) {
      bestEnergy = e
      best = [...out]
    }
  }
  return best
}


// Kleiner deterministischer Pseudozufallsgenerator (mulberry32).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
