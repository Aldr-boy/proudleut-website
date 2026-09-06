import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die echte Hero-Bildwand-
// Komponente (Paket 2, Schritt 2A) gegen die eingefrorene Spec
// (docs/spezifikation-hero-bildwand.md, Abschnitt 5 "Next.js-Umsetzung"
// und Abschnitt 9 DoD). Es gibt in diesem Repo keine React-Testing-
// Infrastruktur (kein jsdom, keine @testing-library-Abhaengigkeit) --
// die echte Quelldatei wird per readFileSync gelesen und strukturell
// geprueft, identisches Muster wie die uebrigen *Structure.test.ts-
// Dateien in diesem Repo.
const sourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'HeroWall.tsx')
const source = readFileSync(sourcePath, 'utf8')

test('Section: relative, min-h-[100svh], overflow-hidden, KEINE feste vh-Hoehe', () => {
  const sectionStart = source.indexOf('<section')
  const sectionEnd = source.indexOf('>', sectionStart)
  const sectionTag = source.slice(sectionStart, sectionEnd)
  assert.match(sectionTag, /\brelative\b/)
  assert.match(sectionTag, /min-h-\[100svh\]/)
  assert.match(sectionTag, /overflow-hidden/)
  assert.doesNotMatch(sectionTag, /(?<!min-)h-\[/, 'keine feste Hoehe erlaubt (min-h-[...] ist erlaubt, h-[...] nicht)')
  assert.doesNotMatch(sectionTag, /\bh-screen\b/)
})

test('Content: relative z-20, max-w-[80rem], px-4, py-28 (7rem)', () => {
  const marker = '{/* Content */}'
  const idx = source.indexOf(marker)
  assert.ok(idx >= 0, 'Content-Marker nicht gefunden')
  const divStart = source.indexOf('<div', idx)
  const divEnd = source.indexOf('>', divStart)
  const divTag = source.slice(divStart, divEnd)
  assert.match(divTag, /relative z-20/)
  assert.match(divTag, /max-w-\[80rem\]/)
  assert.match(divTag, /px-4/)
  assert.match(divTag, /py-28/)
})

test('Bildwand-Container: absolute inset-0 z-0 overflow-hidden', () => {
  const marker = '{/* Bildwand */}'
  const idx = source.indexOf(marker)
  assert.ok(idx >= 0, 'Bildwand-Marker nicht gefunden')
  const divStart = source.indexOf('<div', idx)
  const divEnd = source.indexOf('>', divStart)
  const divTag = source.slice(divStart, divEnd)
  assert.match(divTag, /absolute inset-0 z-0 overflow-hidden/)
})

test('Overlay: exakt rgba(32,32,32,0.66), absolute inset-0 z-10, kein Verlauf', () => {
  assert.match(source, /absolute inset-0 z-10 bg-\[rgba\(32,32,32,0\.66\)\]/)
  assert.doesNotMatch(source, /gradient/i)
})

test('Z-Index-Reihenfolge exakt: Bildwand z-0, Overlay z-10, Content z-20', () => {
  const contentZIndex = source.indexOf('relative z-20')
  const overlayZIndex = source.indexOf('z-10 bg-[rgba')
  const bildwandZIndex = source.indexOf('absolute inset-0 z-0')
  assert.ok(contentZIndex >= 0 && overlayZIndex >= 0 && bildwandZIndex >= 0)
})

test('Grid: grid-cols-2 md:grid-cols-3 xl:grid-cols-5, gap-4, px-4', () => {
  assert.match(source, /grid grid-cols-2 gap-4 px-4 md:grid-cols-3 xl:grid-cols-5/)
})

test('COLUMN_META: genau 5 Spalten, exakte Offsets und Sichtbarkeits-Klassen aus Spec Abschnitt 3+4', () => {
  const start = source.indexOf('const COLUMN_META')
  assert.ok(start >= 0, 'COLUMN_META nicht gefunden')
  const arrayStart = source.indexOf('= [', start)
  const end = source.indexOf('\n]', arrayStart)
  const block = source.slice(start, end)
  assert.match(block, /offset: '-mt-\[20%\]', display: 'flex'/)
  assert.match(block, /offset: '-mt-\[50%\]', display: 'flex'/)
  assert.match(block, /offset: 'mt-0', display: 'hidden md:flex'/)
  assert.match(block, /offset: '-mt-\[30%\]', display: 'hidden xl:flex'/)
  assert.match(block, /offset: '-mt-\[20%\]', display: 'hidden xl:flex'/)
  // Nur tatsaechliche Array-Eintraege zaehlen (Wert ist ein String-Literal
  // in Anfuehrungszeichen) -- die Typannotation "{ offset: string; ... }[]"
  // enthaelt denselben Substring "{ offset:" ohne folgendes Anfuehrungszeichen
  // und darf nicht mitgezaehlt werden.
  const entries = block.match(/\{ offset: '/g) ?? []
  assert.equal(entries.length, 5, 'COLUMN_META muss genau 5 Eintraege haben (immer alle 5 Spalten)')
})

// ── Paternoster-Animation (Nachtrag, reale Webflow-Vermessung) ────────

test('COLUMN_META: alternierende Animationsrichtung 1↑ 2↓ 3↑ 4↓ 5↑, reale gemessene Reihenfolge', () => {
  const start = source.indexOf('const COLUMN_META')
  const arrayStart = source.indexOf('= [', start)
  const end = source.indexOf('\n]', arrayStart)
  const block = source.slice(start, end)
  const directions = Array.from(block.matchAll(/animationClass: '(pl-paternoster-(?:up|down))'/g)).map((m) => m[1])
  assert.deepEqual(directions, [
    'pl-paternoster-up',
    'pl-paternoster-down',
    'pl-paternoster-up',
    'pl-paternoster-down',
    'pl-paternoster-up',
  ])
})

test('Animation wirkt ausschliesslich auf die Spalte selbst -- nicht auf Grid, Bilder, List A/B, Content oder Overlay', () => {
  // Die einzige Stelle, an der eine pl-paternoster-*-Klasse tatsaechlich
  // in einem className landet, ist die Spalten-Div-Vorlage selbst.
  const columnDivStart = source.indexOf('className={`${col.display} ${col.offset} ${col.animationClass}')
  assert.ok(columnDivStart >= 0, 'Spalten-Div mit col.animationClass nicht gefunden')

  const contentMarker = source.indexOf('{/* Content */}')
  const contentDivEnd = source.indexOf('>', source.indexOf('<div', contentMarker))
  assert.doesNotMatch(source.slice(contentMarker, contentDivEnd), /paternoster/i)

  const overlayLine = source.match(/absolute inset-0 z-10 bg-\[rgba\(32,32,32,0\.66\)\][^\n]*/)?.[0] ?? ''
  assert.doesNotMatch(overlayLine, /paternoster/i)

  const gridTag = source.slice(source.indexOf('grid grid-cols-2') - 20, source.indexOf('grid grid-cols-2') + 100)
  assert.doesNotMatch(gridTag, /paternoster/i)

  // List A/B-Wrapper-Divs tragen ausschliesslich flex flex-col gap-4, keine eigene Animationsklasse.
  const listWrappers = Array.from(source.matchAll(/className="flex flex-col gap-4"/g))
  assert.equal(listWrappers.length, 2, 'erwartet genau 2 List-Wrapper-Divs (List A, List B) ohne eigene Animationsklasse')
})

test('alle 5 Spalten werden IMMER gerendert -- COLUMN_META.map ohne Slice/Filter/viewportabhaengige Bedingung', () => {
  const mapIdx = source.indexOf('COLUMN_META.map')
  assert.ok(mapIdx >= 0, 'COLUMN_META.map nicht gefunden')
  const mapBody = source.slice(mapIdx, mapIdx + 400)
  // Gezielt nur eine Kuerzung der COLUMN_META-Liste selbst verbieten (das
  // wuerde Spalten aus dem Grid entfernen) -- columns[i].slice(0,4)/(4,8)
  // ist eine legitime Aufteilung der 8 Kacheln EINER Spalte in List A/B
  // und darf nicht mit diesem Verbot kollidieren.
  assert.doesNotMatch(mapBody, /COLUMN_META\.map\([^)]*\)\.slice\(|COLUMN_META\.slice\(/, 'keine Slice-Kuerzung der Spaltenliste selbst erlaubt')
  assert.doesNotMatch(mapBody, /COLUMN_META\.filter\(/, 'keine Filter-Kuerzung der Spaltenliste erlaubt')
  assert.doesNotMatch(mapBody, /window\.innerWidth|matchMedia|useMediaQuery/, 'keine clientseitige Viewport-Ermittlung erlaubt')
})

test('Spalten-Divs sind direkte Kinder des Grids -- kein Wrapper-Div zwischen Grid-Container und Spalte', () => {
  const gridStart = source.indexOf('grid grid-cols-2')
  const gridDivStart = source.lastIndexOf('<div', gridStart)
  const gridDivEnd = source.indexOf('>', gridDivStart)
  const afterGridTag = source.slice(gridDivEnd + 1, gridDivEnd + 200).trimStart()
  assert.match(afterGridTag, /^\{COLUMN_META\.map/, 'direkt nach dem Grid-Div-Tag muss COLUMN_META.map folgen, kein zusaetzlicher Wrapper')
})

test('Slot-Belegung nutzt ausschliesslich die bestehende Paket-1-Logik (buildHeroWallSlots, splitIntoColumns) -- keine zweite Implementierung', () => {
  assert.match(source, /import \{ buildHeroWallSlots, splitIntoColumns \} from '@\/lib\/heroWall\/simulateHeroWallSlots'/)
  assert.match(source, /buildHeroWallSlots\(images\)/)
  assert.match(source, /splitIntoColumns\(slots\)/)
  // Gezielt nach tatsaechlichem Einsatz (Funktionsaufruf/Methode) suchen,
  // nicht nach dem blossen Wort "Shuffle" -- das kommt legitim in
  // erklaerenden Kommentaren vor ("kein Shuffle").
  assert.doesNotMatch(source, /Math\.random\(\)|\.shuffle\(|sort\(\(\) =>/i, 'keine Zufalls-/Shuffle-Logik erlaubt')
})

test('hero_focus: NULL -> center ueber resolveHeroFocus, alle drei Werte auf object-position-Klassen abgebildet', () => {
  assert.match(source, /import \{ resolveHeroFocus \} from '@\/lib\/heroWall\/resolveHeroFocus'/)
  assert.match(source, /resolveHeroFocus\(img\.heroFocus\)/)
  const mapStart = source.indexOf('FOCUS_TO_OBJECT_POSITION_CLASS')
  const mapBlock = source.slice(mapStart, mapStart + 300)
  assert.match(mapBlock, /top: 'object-top'/)
  assert.match(mapBlock, /center: 'object-center'/)
  assert.match(mapBlock, /bottom: 'object-bottom'/)
})

test('Kachel: aspect-[5/6], object-cover, alt="", sizes exakt aus Spec', () => {
  assert.match(source, /aspect-\[5\/6\]/)
  assert.match(source, /object-cover/)
  assert.match(source, /alt=""/)
  assert.match(source, /sizes="\(max-width: 767px\) 50vw, \(max-width: 1279px\) 33vw, 20vw"/)
})

test('priority ausschliesslich fuer Spalte-Index < 2 UND Kachel-Index < 2 (Spalte 1+2, fruehe Slots in List A)', () => {
  assert.match(source, /priority=\{i < 2 && j < 2\}/)
})

test('eager-Ladeverhalten (Nachtrag Pop-in-Fix) nur fuer die immer sichtbaren Spalten 1+2, nie fuer breakpointabhaengig ausgeblendete Spalten', () => {
  assert.match(source, /eager=\{i < 2\}/, 'eager muss an i<2 gekoppelt sein (Spalten ohne jede display:none-Bedingung)')
  const listAStart = source.indexOf('listA.map')
  const listBStart = source.indexOf('listB.map')
  assert.ok(listAStart >= 0 && listBStart >= 0)
  assert.match(source.slice(listAStart, listAStart + 150), /eager=\{i < 2\}/)
  assert.match(source.slice(listBStart, listBStart + 150), /eager=\{i < 2\}/)
  // loading darf nur ueber priority ? undefined : eager ? 'eager' : 'lazy' entschieden werden --
  // kein hartkodiertes loading="eager" fuer alle Kacheln (das wuerde Spalte 3-5 auf
  // Mobile/Tablet trotz display:none Requests ausloesen).
  assert.match(source, /loading=\{priority \? undefined : eager \? 'eager' : 'lazy'\}/)
})

test('List B bekommt niemals priority (globaler Kachel-Index dort immer >= 4)', () => {
  const listBStart = source.indexOf('listB.map')
  assert.ok(listBStart >= 0, 'listB.map nicht gefunden')
  const listBBody = source.slice(listBStart, listBStart + 200)
  assert.match(listBBody, /priority=\{false\}/)
})

test('List A und List B sind je exakt 4 Slots derselben Spalte (erste/zweite Haelfte), keine zweite Slot-Herleitung', () => {
  assert.match(source, /const listA = columns\[i\]\.slice\(0, 4\)/)
  assert.match(source, /const listB = columns\[i\]\.slice\(4, 8\)/)
})

test('kein rounded/border-radius auf den Kacheln', () => {
  const tileStart = source.indexOf('aspect-[5/6]')
  const tileBlock = source.slice(tileStart - 50, tileStart + 400)
  assert.doesNotMatch(tileBlock, /rounded/)
})
