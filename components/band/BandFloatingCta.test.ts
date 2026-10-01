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

test('heroPassed wird per IntersectionObserver direkt auf den Hero-Anfrage-Button bestimmt (rootMargin = Hoehe von Header/Faktenleiste)', () => {
  assert.match(source, /const heroButton = document\.getElementById\(heroButtonId\)/)
  assert.match(source, /heroObserver = new IntersectionObserver\(/)
  assert.match(source, /rootMargin: `-\$\{navHeight\}px 0px 0px 0px`/)
  assert.match(source, /heroObserver\.observe\(heroButton\)/)
  assert.match(source, /setHeroPassed\(!entry\.isIntersecting && entry\.boundingClientRect\.top < boundary\)/)
})

test('ohne Hero-Button (Band ohne Bandbild) sind die Leisten von Anfang an sichtbar -- heroPassed startet mit !hasHeroButton', () => {
  assert.match(source, /useState\(!hasHeroButton\)/)
})

test('finalReached nutzt keinen IntersectionObserver, sondern eine deterministische Geometrie-Pruefung (Fix Scroll-Pfad-Abhaengigkeit)', () => {
  assert.ok(!/const finalObserver = new IntersectionObserver/.test(source), 'der alte finalObserver darf nicht mehr vorkommen')
  assert.match(source, /finalSentinel\.getBoundingClientRect\(\)\.top < window\.innerHeight/)
})

test('Geometrie-Pruefung wird per requestAnimationFrame gedrosselt (kein Layout-Thrashing) und bei Scroll und Resize ausgeloest', () => {
  assert.match(source, /requestAnimationFrame\(evaluateFinalSentinel\)/)
  assert.match(source, /window\.addEventListener\('scroll', scheduleEvaluateFinalSentinel, \{ passive: true \}\)/)
  assert.match(source, /window\.addEventListener\('resize', scheduleEvaluateFinalSentinel\)/)
})

test('initiale Auswertung direkt nach dem Mount (z. B. Reload waehrend die Seite bereits am Ende gescrollt ist)', () => {
  assert.match(source, /scheduleEvaluateFinalSentinel\(\);\s*\r?\n\s*window\.addEventListener\('scroll'/)
})

test('Scroll- und Resize-Listener werden beim Unmount sauber entfernt, Hero-Observer disconnected', () => {
  const cleanup = source.match(/return \(\) => \{\s*heroObserver\?\.disconnect\(\);[\s\S]*?\};\s*\r?\n\s*\}, \[heroButtonId, hasHeroButton, finalSentinelId\]\)/)?.[0] ?? ''
  assert.match(cleanup, /window\.removeEventListener\('scroll', scheduleEvaluateFinalSentinel\)/)
  assert.match(cleanup, /window\.removeEventListener\('resize', scheduleEvaluateFinalSentinel\)/)
})

test('visible = heroPassed && !finalReached -- nie zwei Anfrage-Buttons gleichzeitig (Hero/Leiste/Anfragebereich)', () => {
  assert.match(source, /const visible = heroPassed && !finalReached;/)
})

test('beide Leisten sind position:fixed (kein Layout-Sprung) und ausgeblendet inert + visibility:hidden', () => {
  assert.equal((source.match(/fixed inset-x-0/g) ?? []).length, 2)
  assert.ok(!/sticky/.test(source.replace(/\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')), 'keine in den Fluss eingebundene sticky-Leiste')
  assert.equal((source.match(/inert=\{!visible\}/g) ?? []).length, 2)
  assert.match(source, /invisible opacity-0 pointer-events-none/)
  assert.match(source, /transition-\[opacity,transform,visibility\]/)
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
