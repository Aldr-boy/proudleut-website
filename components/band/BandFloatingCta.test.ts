import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer BandFloatingCta (urspruenglich Fix
// "fest positionierte Leisten ueberdecken den Footer", seit Prototyp E:
// Faktenleiste am Desktop + untere Anfrageleiste am Handy, eingeblendet
// erst wenn der Anfrage-Button im Hero aus dem Bild ist). Ein echter
// Rendertest ist in diesem Projekt ohne React-Test-Harness nicht
// eingerichtet -- identisches Prinzip wie components/band/
// BandPeopleSection.test.ts. Das eigentliche Scroll-/Observer-Verhalten
// muss zusaetzlich im Browser geprueft werden.
const sourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'BandFloatingCta.tsx')
const source = readFileSync(sourcePath, 'utf8')

test('die Entscheidung kommt aus der reinen Funktion computeBarVisible (lib/bands/barVisibility.ts), die Komponente ruft sie nur auf', () => {
  assert.match(source, /import \{ computeBarVisible \} from '@\/lib\/bands\/barVisibility'/)
  assert.match(source, /const barOn = computeBarVisible\(\{/)
  assert.ok(!/IntersectionObserver/.test(source.replace(/\/\/.*$/gm, '')), 'kein IntersectionObserver mehr: weder Hero-Observer noch Sentinel')
  assert.ok(!/finalSentinel|final-cta-sentinel|finalReached|heroPassed/.test(source.replace(/\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')), 'alte Sentinel-/Observer-Zustaende duerfen nicht zurueckkehren')
})

test('gemessen wird die Geometrie des Hero-Buttons und des Buttons der CTA-Karte (ctaButtonId), mit Rects, innerHeight und Hoehe der MerklisteBar', () => {
  assert.match(source, /document\.getElementById\(heroButtonId\)/)
  assert.match(source, /document\.getElementById\(ctaButtonId\)/)
  assert.match(source, /getBoundingClientRect\(\)/)
  assert.match(source, /window\.innerHeight/)
  assert.match(source, /document\.getElementById\('merkliste-bar'\)\?\.offsetHeight \?\? 0/)
})

test('Verdeckung des Hero-Buttons: rein geometrisch gegen das Rechteck des Elements mit data-nav-footprint (kein elementFromPoint); fehlt das Element, gilt "nicht verdeckt"', () => {
  const code = source.replace(/\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  assert.match(code, /document\.querySelector\('\[data-nav-footprint\]'\)\?\.getBoundingClientRect\(\) \?\? null/)
  assert.match(code, /pill: pillRect,/)
  assert.match(code, /hero: heroRect,/)
  assert.ok(!/elementFromPoint/.test(code), 'kein elementFromPoint mehr')
  assert.ok(!/heroCoveredByHeader/.test(code), 'kein Boolean heroCoveredByHeader mehr')
  assert.ok(!/closest\('header'\)/.test(code))
})

test('ohne Hero-Button (Band ohne Bandbild) sind die Leisten von Anfang an sichtbar; mit Hero-Button zunaechst ausgeblendet (Start-Zustand wie bisher)', () => {
  assert.match(source, /useState\(\{ compact: false, bottom: !hasHeroButton \}\)/)
  assert.match(source, /useRef\(mode\)/)
})

test('Auswertung per requestAnimationFrame gedrosselt, bei Scroll (passive), Resize und Layoutaenderungen (ResizeObserver auf body), initial direkt nach dem Mount', () => {
  assert.match(source, /requestAnimationFrame\(evaluate\)/)
  assert.match(source, /window\.addEventListener\('scroll', scheduleEvaluate, \{ passive: true \}\)/)
  assert.match(source, /window\.addEventListener\('resize', scheduleEvaluate\)/)
  assert.match(source, /new ResizeObserver\(scheduleEvaluate\)/)
  assert.match(source, /resizeObserver\.observe\(document\.body\)/)
  assert.match(source, /scheduleEvaluate\(\);\s*\n\s*window\.addEventListener\('scroll'/)
})

test('erst lesen, dann ein einziger Schreibvorgang: setState nur ueber flushSync am Ende von evaluate (noch vor dem Zeichnen des Frames), nur bei Aenderung', () => {
  const evaluate = source.slice(source.indexOf('const evaluate = () => {'), source.indexOf('const scheduleEvaluate'))
  assert.ok(evaluate.indexOf('computeBarVisible') < evaluate.indexOf('flushSync'), 'zuerst berechnen, dann schreiben')
  assert.equal((evaluate.match(/flushSync\(/g) ?? []).length, 1)
  assert.match(evaluate, /if \(next\.compact !== modeRef\.current\.compact \|\| next\.bottom !== modeRef\.current\.bottom\) \{/)
  assert.match(evaluate, /setMode\(next\);\s*useHeaderSlotStore\.getState\(\)\.setCompact\(next\.compact\);/)
  assert.match(source, /import \{ createPortal, flushSync \} from 'react-dom';/)
})

test('Listener und ResizeObserver werden beim Unmount sauber entfernt', () => {
  const cleanup = source.match(/return \(\) => \{\s*resizeObserver\.disconnect\(\);[\s\S]*?\};\s*\n\s*\}, \[heroButtonId, ctaButtonId, hasHeroButton, merklisteBandsCount\]\)/)?.[0] ?? ''
  assert.match(cleanup, /window\.removeEventListener\('scroll', scheduleEvaluate\)/)
  assert.match(cleanup, /window\.removeEventListener\('resize', scheduleEvaluate\)/)
  assert.match(cleanup, /wideQuery\.removeEventListener\('change', scheduleEvaluate\)/)
})

test('die Bottom-Bar ist position:fixed (kein Layout-Sprung), ausgeblendet inert + visibility:hidden; die Desktop-Faktenleiste gibt es nicht mehr', () => {
  assert.equal((source.match(/fixed inset-x-0/g) ?? []).length, 1)
  assert.ok(!/sticky/.test(source.replace(/\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')), 'keine in den Fluss eingebundene sticky-Leiste')
  assert.equal((source.match(/inert=\{!visible\}/g) ?? []).length, 1)
  assert.ok(!/hidden lg:block fixed|top: 'var\(--pl-nav-height\)'/.test(source), 'keine Desktop-Leiste unter der Pille')
  assert.match(source, /const hiddenClasses = 'transition-none invisible opacity-0 pointer-events-none';/)
})

test('Ausblenden ist sofort (transition-none nur im ausgeblendeten Zustand), nur das Einblenden laeuft mit der 220-ms-Transition', () => {
  assert.match(source, /const visibleClasses = 'visible opacity-100 translate-y-0 pointer-events-auto';/)
  assert.match(source, /transition-\[opacity,transform,bottom\] duration-\[220ms\] ease-out \$\{visibleClasses\}/)
  assert.ok(!/transition-\[[^\]]*visibility/.test(source), 'visibility darf nicht verzoegert uebergehen (kein Nachleuchten neben einem benutzbaren Button)')
})

test('prefers-reduced-motion: der Slide (translate) der Bottom-Bar steht nur hinter motion-safe:, Ein-/Ausblenden bleibt', () => {
  assert.match(source, /motion-safe:translate-y-2/)
})

test('Stacking der mobilen Leiste ueber der Merkliste-Leiste (merklisteBarHeight) und safe-area bleiben erhalten', () => {
  assert.match(source, /document\.getElementById\('merkliste-bar'\)/)
  assert.match(source, /setMerklisteBarHeight\(el\?\.offsetHeight \?\? 0\)/)
  assert.match(source, /bottom: `\$\{merklisteBarHeight\}px`/)
  assert.match(source, /env\(safe-area-inset-bottom\)/)
})

test('Anfrageziel (AnfrageModal) und Optik der Buttons bleiben; kein Video-Link mehr in den Leisten (die Hero-Pille oeffnet das Modal)', () => {
  assert.match(source, /<AnfrageModal/)
  assert.match(source, /Unverbindlich anfragen/)
  assert.match(source, /bg-pl-accent text-pl-on-accent/)
  assert.ok(!/href="#live"/.test(source))
})

test('Breakpoint 1024 px: untere Anfrageleiste bis 1023 px (lg:hidden) mit Inhalt ab md zentriert in hoechstens 640 px; Steckbrief bis 1023 px (lg:hidden, ab md auf 640 px begrenzt); Seitenabstand pb-24 bis 1023 px', () => {
  const dir = path.dirname(sourcePath)
  const hero = readFileSync(path.join(dir, 'BandHero.tsx'), 'utf8')
  const page = readFileSync(path.join(dir, '..', '..', 'app', 'band', '[slug]', 'page.tsx'), 'utf8')
  assert.match(source, /className=\{`lg:hidden fixed inset-x-0 z-40 bg-pl-elevated\/95/)
  assert.match(source, /<div className="flex items-center gap-2 md:max-w-\[640px\] md:mx-auto">/)
  assert.ok(!/hidden md:block fixed|md:hidden fixed/.test(source), 'keine md-Grenze mehr an der Bottom-Bar')
  assert.match(hero, /<dl className="lg:hidden md:max-w-\[640px\] bg-pl-canvas px-5 md:px-6 pt-4 pb-2">/)
  assert.match(page, /<article className="bg-pl-canvas pb-24 lg:pb-0">/)
})

test('Kompakte Pille: per createPortal in den Header-Slot (useHeaderSlot), gleicher Modal-Zustand (setModalOpen), Desktop-Leiste entfernt', () => {
  assert.match(source, /import \{ createPortal, flushSync \} from 'react-dom';/)
  assert.match(source, /const slotEl = useHeaderSlot\(\);/)
  assert.match(source, /slotEl &&\s*createPortal\(\s*<CompactPill/)
  assert.match(source, /onRequest=\{\(\) => setModalOpen\(true\)\}/)
  assert.equal((source.match(/<AnfrageModal/g) ?? []).length, 1, 'ein einziges Modal')
  assert.equal((source.match(/<BandMerkHeart/g) ?? []).length, 1, 'Herz der Bottom-Bar; das der kompakten Pille steht in CompactPill.tsx')
})

test('Flaechenwahl: matchMedia(min-width: 1024px), compactPillActive/bottomBarActive aus lib/bands/compactPillActive, Kopf (h1) nur ohne Hero-Button, barVisibility unveraendert aufgerufen', () => {
  const code = source.replace(/\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  assert.match(code, /window\.matchMedia\('\(min-width: 1024px\)'\)\.matches/)
  assert.match(code, /compactPillActive\(\{ barVisible: barOn, wide, hasHeroButton, headPassed \}\)/)
  assert.match(code, /bottomBarActive\(\{ barVisible: barOn, wide \}\)/)
  assert.match(code, /document\.querySelector\('h1'\)\?\.getBoundingClientRect\(\)\.bottom/)
  assert.match(code, /const wideQuery = window\.matchMedia\('\(min-width: 1024px\)'\);/)
})

test('ResizeObserver beobachtet zusaetzlich das <header> (data-nav-footprint) und loest nur eine Auswertung aus', () => {
  assert.match(source, /const footprint = document\.querySelector\('\[data-nav-footprint\]'\);/)
  assert.match(source, /if \(footprint\) resizeObserver\.observe\(footprint\);/)
})

test('Fokus beim Wechsel der Pille: moveFocusOnSwitch nur bei verschwindendem Element, Logo-Fallback, nie body', () => {
  const fn = source.slice(source.indexOf('function moveFocusOnSwitch'), source.indexOf('export function BandFloatingCta'))
  assert.match(fn, /if \(!previous \|\| previous === document\.body\) return;/)
  assert.match(fn, /normalRoot\?\.contains\(previous\)/)
  assert.match(fn, /compactRoot\?\.contains\(previous\)/)
  assert.match(fn, /find\(compactRoot, 'nav button\[aria-controls\]'\)/)
  assert.match(fn, /if \(!usable\(target\)\) target = find\(normalRoot, logoSelector\);/)
  assert.match(source, /if \(compactChanged\) moveFocusOnSwitch\(previousFocus, next\.compact, heroButtonId\);/)
})

test('beim Verlassen der Bandseite wird das compact-Flag im Header zurueckgesetzt', () => {
  assert.match(source, /return \(\) => useHeaderSlotStore\.getState\(\)\.setCompact\(false\);/)
})
