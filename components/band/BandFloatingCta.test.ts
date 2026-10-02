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
  assert.match(source, /const next = computeBarVisible\(\{/)
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
  assert.match(source, /useState\(!hasHeroButton\)/)
  assert.match(source, /useRef\(!hasHeroButton\)/)
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
  assert.match(evaluate, /if \(next !== barVisibleRef\.current\) \{/)
  assert.match(source, /import \{ flushSync \} from 'react-dom';/)
})

test('Listener und ResizeObserver werden beim Unmount sauber entfernt', () => {
  const cleanup = source.match(/return \(\) => \{\s*resizeObserver\.disconnect\(\);[\s\S]*?\};\s*\n\s*\}, \[heroButtonId, ctaButtonId, hasHeroButton, merklisteBandsCount\]\)/)?.[0] ?? ''
  assert.match(cleanup, /window\.removeEventListener\('scroll', scheduleEvaluate\)/)
  assert.match(cleanup, /window\.removeEventListener\('resize', scheduleEvaluate\)/)
})

test('beide Leisten sind position:fixed (kein Layout-Sprung) und ausgeblendet inert + visibility:hidden', () => {
  assert.equal((source.match(/fixed inset-x-0/g) ?? []).length, 2)
  assert.ok(!/sticky/.test(source.replace(/\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')), 'keine in den Fluss eingebundene sticky-Leiste')
  assert.equal((source.match(/inert=\{!visible\}/g) ?? []).length, 2)
  assert.match(source, /const hiddenClasses = 'transition-none invisible opacity-0 pointer-events-none';/)
})

test('Ausblenden ist sofort (transition-none nur im ausgeblendeten Zustand), nur das Einblenden laeuft mit der 220-ms-Transition', () => {
  assert.match(source, /const visibleClasses = 'visible opacity-100 translate-y-0 pointer-events-auto';/)
  assert.match(source, /transition-\[opacity,transform\] duration-\[220ms\] ease-out \$\{visibleClasses\}/)
  assert.match(source, /transition-\[opacity,transform,bottom\] duration-\[220ms\] ease-out \$\{visibleClasses\}/)
  assert.ok(!/transition-\[[^\]]*visibility/.test(source), 'visibility darf nicht verzoegert uebergehen (kein Nachleuchten neben einem benutzbaren Button)')
})

test('prefers-reduced-motion: der Slide (translate) steht nur hinter motion-safe:, Ein-/Ausblenden bleibt', () => {
  assert.match(source, /motion-safe:-translate-y-2/)
  assert.match(source, /motion-safe:translate-y-2/)
})

test('Desktop-Faktenleiste klebt unter dem Header (top: var(--pl-nav-height)) und zeigt Fakten, Herz und Anfrage-Button', () => {
  assert.match(source, /top: 'var\(--pl-nav-height\)'/)
  assert.match(source, /facts\.map\(\(f, i\) =>/)
  assert.equal((source.match(/<BandMerkHeart/g) ?? []).length, 2)
})

test('Faktenleiste: Besetzung und Stil schrumpfen nie (shrink-0), nur die Herkunft darf kuerzen (flex-[1_1_10rem] min-w-0 max-w-max, truncate, title)', () => {
  assert.match(source, /isHerkunft \? 'flex-\[1_1_10rem\] min-w-0 max-w-max' : 'shrink-0'/)
  assert.match(source, /title=\{isHerkunft \? f\.value : undefined\}/)
  assert.match(source, /isHerkunft \? 'truncate' : 'whitespace-nowrap'/)
})

test('Faktenleiste: Stil entfaellt vollstaendig statt abgeschnitten zu werden (flex-wrap + feste Zeilenhoehe + overflow-hidden, Zeilenabstand groesser als die Resthoehe)', () => {
  assert.match(source, /<dl className="flex flex-wrap content-start gap-y-4 flex-1 min-w-0 h-11 overflow-hidden">/)
})

test('Faktenleiste: Trennlinien stehen fuehrend (border-l ab dem zweiten Fakt), kein hinteres border-r, das nach einem entfallenen Stil uebrig bliebe', () => {
  assert.match(source, /i > 0 \? 'ml-7 pl-7 border-l border-pl-soft' : ''/)
  assert.ok(!/border-r/.test(source))
})

test('Faktenleiste: Zeilenhoehe h-11 (44 px) bleibt unter den 48-px-Buttons, die Leistenhoehe (74 px) und damit scroll-margin-top der Video-Section aendern sich nicht', () => {
  assert.match(source, /py-3 flex items-center gap-4/)
  assert.match(source, /h-12 px-\[26px\]/)
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
