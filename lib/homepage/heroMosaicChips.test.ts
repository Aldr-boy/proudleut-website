import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die drei Anlass-Pills und den
// zentralen Content im Startseiten-Hero (components/homepage/HeroMosaic.tsx).
// Gleiches Muster wie andere strukturelle Tests in diesem Verzeichnis --
// echte Quelldatei per readFileSync lesen, keine React-Testing-
// Infrastruktur noetig.
//
// Auftrag "Dichtes Mosaik + klarer Einstieg": die fruehere Pointer-Drag-/
// Schwebe-Animations-Mechanik wurde bewusst vollstaendig entfernt
// (Abschnitt 15, "erst die statische Komposition sauber loesen") --
// die zugehoerigen frueheren Tests dieser Datei sind deshalb ersetzt,
// nicht nur angepasst.
const sourcePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'components', 'homepage', 'HeroMosaic.tsx'
)
const source = readFileSync(sourcePath, 'utf8')

test('Hero enthaelt genau die drei festgelegten Anlass-Pills in dieser Reihenfolge, Stadt-/Buergerfest NICHT im Hero', () => {
  const startMarker = 'const ANLASS_PILLS: { label: string; href: string }[] = ['
  const startIndex = source.indexOf(startMarker)
  assert.ok(startIndex >= 0, 'ANLASS_PILLS nicht gefunden')
  const endIndex = source.indexOf('];', startIndex)
  const arrayLiteral = source.slice(startIndex + startMarker.length - 1, endIndex + 1)
  const fn = new Function(`return ${arrayLiteral}`)
  const pills = fn() as { label: string; href: string }[]

  assert.deepEqual(
    pills.map((p) => p.label),
    ['Hochzeit', 'Firmenfeier & Business Event', 'Festzelt']
  )
  assert.deepEqual(
    pills.map((p) => p.href),
    ['/veranstaltung/hochzeit', '/veranstaltung/firmenfeier', '/veranstaltung/festzelt']
  )
  assert.ok(
    !pills.some((p) => /buergerfest/i.test(p.href) || /Bürgerfest/i.test(p.label)),
    'Stadt- & Buergerfest darf laut Auftrag nicht zusaetzlich im Hero auftauchen'
  )
})

test('H1 lautet exakt "Livebands für dein Event." ohne zusaetzliches Akzent-Element', () => {
  assert.match(source, />\s*Livebands für dein Event\.\s*</)
  // Kein separater <span> (z. B. fuer einen violetten Akzentpunkt) direkt
  // im H1-Block -- Ueberschrift ist reiner Text.
  const h1Start = source.indexOf('<h1')
  const h1End = source.indexOf('</h1>', h1Start)
  const h1Block = source.slice(h1Start, h1End)
  assert.doesNotMatch(h1Block, /<span/)
})

test('"Alle Bands ansehen" verlinkt weiterhin auf /bands, jetzt wieder MIT Pfeil (Auftrag "Webflow-Prinzip + Next.js-Einstieg", Abschnitt 11)', () => {
  const idx = source.indexOf('Alle Bands ansehen')
  assert.ok(idx >= 0, '"Alle Bands ansehen"-Link nicht gefunden')
  const before = source.slice(0, idx)
  const hrefIdx = before.lastIndexOf('href="/bands"')
  assert.ok(hrefIdx >= 0 && idx - hrefIdx < 400, 'Link zeigt nicht auf /bands')
  const linkEnd = source.indexOf('</Link>', idx)
  const linkBody = source.slice(idx, linkEnd)
  assert.match(linkBody, /→/, '"Alle Bands ansehen" soll seit Auftrag 11 wieder einen Pfeil enthalten')
})

test('Anlass-Pills enthalten keinen Pfeil mehr', () => {
  const mapStart = source.indexOf('{ANLASS_PILLS.map(')
  const mapEnd = source.indexOf('))}', mapStart)
  assert.ok(mapStart >= 0 && mapEnd > mapStart, 'ANLASS_PILLS.map(...) nicht gefunden')
  const mapBody = source.slice(mapStart, mapEnd)
  assert.doesNotMatch(mapBody, /→/, 'Anlass-Pills duerfen keinen Pfeil mehr enthalten')
})

test('Eyebrow "In und um Bayern" wieder in Grossbuchstaben mit moderatem Tracking (Auftrag "Webflow-Prinzip + Next.js-Einstieg", Abschnitt 10), Label "Was hast du vor?" bleibt normale Schreibweise', () => {
  assert.match(source, />\s*In und um Bayern\s*</)
  assert.match(source, />\s*Was hast du vor\?\s*</)

  const eyebrowIdx = source.indexOf('In und um Bayern')
  const eyebrowTagStart = source.lastIndexOf('<p', eyebrowIdx)
  const eyebrowTagEnd = source.indexOf('>', eyebrowTagStart)
  const eyebrowClass = source.slice(eyebrowTagStart, eyebrowTagEnd)
  assert.match(eyebrowClass, /uppercase/, 'Eyebrow soll seit Auftrag 10 wieder uppercase sein')
  // Nur normales bis leicht erhoehtes Tracking -- keine extreme
  // Buchstabensperrung (kein tracking-widest, kein grosser Arbitrary-Value).
  assert.doesNotMatch(eyebrowClass, /tracking-widest/)
  assert.doesNotMatch(eyebrowClass, /tracking-\[0\.(1|2|3|4|5|6|7|8|9)/)

  const labelIdx = source.indexOf('Was hast du vor?')
  const labelTagStart = source.lastIndexOf('<p', labelIdx)
  const labelTagEnd = source.indexOf('>', labelTagStart)
  const labelClass = source.slice(labelTagStart, labelTagEnd)
  assert.doesNotMatch(labelClass, /uppercase/)
  assert.doesNotMatch(labelClass, /tracking-\[/)

  // Beide Labels sollen sich nicht exakt dasselbe typografische Muster
  // teilen (Auftrag 9 der vorherigen Runde: "nicht mehrfach direkt
  // untereinander verwenden") -- gilt unveraendert weiter.
  assert.notEqual(eyebrowClass, labelClass)
})

test('keine Pointer-Drag-Mechanik mehr vorhanden (statische Komposition)', () => {
  assert.doesNotMatch(source, /onPointerDown=|onPointerMove=|onPointerUp=|cursor-grab/)
})

test('keine automatische Schwebe-/Mosaik-Animation mehr vorhanden', () => {
  assert.doesNotMatch(source, /pl-hero-float/)
  assert.doesNotMatch(source, /animationPlayState|animationDuration|animationDelay/)
})

test('kein Slider/Carousel/Parallax/Hover-Zoom auf einzelnen Hero-Fotos', () => {
  assert.doesNotMatch(source, /useSwipeable|Swiper|Carousel|IntersectionObserver/)
  assert.doesNotMatch(source, /hover:scale|group-hover:scale/)
})

test('Mosaik-Bilder sind rein dekorativ (leeres alt), kein Screenreader-Laerm durch zwoelf Bildbeschreibungen', () => {
  // Alle Bilderwand-Spalten (Desktop wie Mobil) rendern ueber eine einzige
  // gemeinsame <Image>-Stelle in der MosaicColumns-Hilfskomponente -- ein
  // einziges alt="" dort deckt saemtliche Bilder ab, keine zwoelf
  // einzelnen alt=""-Vorkommen mehr noetig.
  const imageStart = source.indexOf('<Image')
  const imageEnd = source.indexOf('/>', imageStart)
  const imageTag = source.slice(imageStart, imageEnd)
  assert.match(imageTag, /alt=""/, 'Mosaik-<Image> muss dekorativ sein (alt="")')
  assert.equal((source.match(/<Image/g) ?? []).length, 1, 'erwartet genau eine gemeinsame <Image>-Stelle fuer alle Mosaik-Kacheln (kein Duplikat pro Bild)')
})
