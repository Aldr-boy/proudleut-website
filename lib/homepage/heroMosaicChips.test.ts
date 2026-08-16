import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die drei Anlass-Pills im
// Startseiten-Hero (components/homepage/HeroMosaic.tsx). Gleiches Muster
// wie andere strukturelle Tests in diesem Verzeichnis -- echte Quelldatei
// per readFileSync lesen, keine React-Testing-Infrastruktur noetig, da nur
// auf statische href-/Label-Werte geprueft wird.
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

test('H1 lautet exakt "Livebands für dein Event."', () => {
  assert.match(source, />\s*Livebands für dein Event\.\s*</)
})

test('"Alle Bands ansehen" verlinkt weiterhin auf /bands', () => {
  const idx = source.indexOf('Alle Bands ansehen')
  assert.ok(idx >= 0, '"Alle Bands ansehen"-Link nicht gefunden')
  const before = source.slice(0, idx)
  const hrefIdx = before.lastIndexOf('href="/bands"')
  assert.ok(hrefIdx >= 0 && idx - hrefIdx < 400, 'Link zeigt nicht auf /bands')
})

// Regressionsschutz: das fruehere "Hover auf Anlass-Pill hebt zugehoerige
// Fotos hervor"-Verhalten (wirkte wie Zittern) darf nicht zurueckkehren --
// die Pills duerfen keine onMouseEnter/onFocus-Handler mehr auf Fotos
// ausloesen. Stattdessen: echtes Pointer-Drag je Foto.
test('Anlass-Pills loesen keine Hover-/Focus-Handler auf den Hero-Fotos mehr aus', () => {
  assert.doesNotMatch(source, /onMouseEnter=\{?\(?\)?\s*=>\s*onEnterZone/)
  assert.doesNotMatch(source, /onEnterZone|onLeaveZone|activeZone/)
})

test('Hero-Fotos sind per Pointer-Events verschiebbar (grab/grabbing)', () => {
  assert.match(source, /onPointerDown=/)
  assert.match(source, /onPointerMove=/)
  assert.match(source, /onPointerUp=/)
  assert.match(source, /cursor-grab/)
  assert.match(source, /cursor-grabbing/)
})

// Nachschaerfung: die Drag-Grenze ist der gesamte Hero-Container, nicht ein
// kleiner Radius um die jeweilige Ausgangsposition. Kein per-Bild
// dragConstraints-Konstrukt mehr, stattdessen ein gegen containerRect
// geclamptes Ziel (containerRect.width/height fliessen in die Rechnung ein).
test('Drag-Begrenzung bezieht sich auf den gesamten Hero-Container, nicht auf einen Radius um die Startposition', () => {
  assert.doesNotMatch(source, /DRAG_LIMIT_PX/)
  assert.match(source, /containerRect\.width/)
  assert.match(source, /containerRect\.height/)
  assert.match(source, /OVERFLOW_RATIO/)
})

// Ebenen: Fotos (10/20 waehrend Drag) muessen unter dem Hero-Content (30)
// liegen -- Navigation ist eine eigene, feste Komponente und bleibt
// unangetastet (eigener Stacking-Context, hoeher als alles hier).
test('Z-Index-Ebenen: Fotos bleiben unter dem zentralen Hero-Content', () => {
  assert.match(source, /zIndex:\s*isDragging\s*\?\s*20\s*:\s*10/)
  assert.match(source, /className="absolute inset-0 z-30/)
})

// Schutz der zentralen Flaeche erfolgt ueber Pointer-Events-Layering, nicht
// ueber eine raeumliche Kollisionsgrenze: der volle Hero-Content-Wrapper
// blockt keine Pointer-Events (Fotos dahinter bleiben greifbar), nur der
// tatsaechliche Text-/Button-Block selbst ist interaktiv.
test('Zentraler Hero-Content bleibt bedienbar, blockiert aber keine Pointer-Events ausserhalb von Text/Buttons', () => {
  assert.match(source, /pointer-events-none/)
  assert.match(source, /pointer-events-auto/)
})

// Nachschaerfung "Ausgangspositionen naeher an die Mitte": die vier
// vormals am staerksten an den absoluten Bildschirmrand gepinnten Fotos
// (feste negative Pixelwerte bzw. eine an calc(50% - 720px) gekoppelte
// Viewport-Rand-Formel) duerfen nicht zurueckkehren -- Positionen muessen
// prozentual und damit containerbreiten-relativ verankert sein.
test('Fotopositionen sind prozentual verankert, nicht mehr an feste Pixel-Randwerte oder eine Viewport-Rand-Formel gepinnt', () => {
  const arrayStart = source.indexOf('const FRAMING_IMAGES: FramingImage[] = [')
  assert.ok(arrayStart >= 0, 'FRAMING_IMAGES nicht gefunden')
  const arrayEnd = source.indexOf('\n];', arrayStart)
  const arrayLiteral = source.slice(arrayStart, arrayEnd)

  assert.doesNotMatch(arrayLiteral, /calc\(50%/, 'alte Viewport-Rand-Formel darf nicht zurueckkehren')
  assert.doesNotMatch(
    arrayLiteral,
    /(left|right):\s*'-\d+px'/,
    'Fotos duerfen nicht mehr per festem negativem Pixelwert an den absoluten Rand gepinnt sein'
  )
})

// Nachschaerfung "fluessigeres Dragging": die eigentliche Bewegung waehrend
// des Ziehens darf keinen React-Re-Render pro pointermove mehr ausloesen
// (das war das Ruckeln) -- stattdessen rAF-gedrosseltes, direktes
// DOM-Update per ref, translate3d fuer Compositing, will-change waehrend
// der aktiven Geste, keine CSS-Transition auf transform.
test('Live-Bewegung waehrend des Ziehens ist von React-State entkoppelt (rAF + direktes DOM-Update per ref)', () => {
  const moveStart = source.indexOf('function handlePointerMove(')
  const moveEnd = source.indexOf('function endDrag(', moveStart)
  assert.ok(moveStart >= 0 && moveEnd > moveStart, 'handlePointerMove nicht gefunden')
  const moveBody = source.slice(moveStart, moveEnd)

  assert.doesNotMatch(moveBody, /setOffsets\(/, 'handlePointerMove darf pro pointermove kein setOffsets() mehr aufrufen')
  assert.match(moveBody, /requestAnimationFrame\(/)

  assert.match(source, /translate3d\(/)
  assert.match(source, /willChange\s*=\s*'transform'/)
  assert.doesNotMatch(source, /transition-\[filter,transform\]|transition-transform/, 'keine CSS-Transition auf transform')
})
