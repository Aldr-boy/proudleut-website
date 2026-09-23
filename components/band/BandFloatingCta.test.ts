import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer den Fix "fest positionierte Leisten
// ueberdecken den Footer" (Auftrag "Fix fest positionierte Leisten"). Ein
// echter Rendertest ist in diesem Projekt ohne React-Test-Harness nicht
// eingerichtet -- identisches Prinzip wie components/band/
// BandPeopleSection.test.ts. Das eigentliche Scroll-/Observer-Verhalten
// wurde zusaetzlich real im Browser per Playwright verifiziert (siehe
// Abschlussbericht: Vorher/Nachher-Tabelle mit Sprung-Scroll, stufenweisem
// Scroll, Sprung zurueck nach oben und internem Sprunglink).
const sourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'BandFloatingCta.tsx')
const source = readFileSync(sourcePath, 'utf8')

test('heroPassed bleibt unveraendert ueber IntersectionObserver mit rootMargin "-8px 0px 0px 0px" bestimmt', () => {
  assert.match(source, /const heroObserver = new IntersectionObserver\(/)
  assert.match(source, /rootMargin: '-8px 0px 0px 0px'/)
  assert.match(source, /heroObserver\.observe\(heroSentinel\)/)
})

test('finalReached nutzt keinen IntersectionObserver mehr, sondern eine deterministische Geometrie-Pruefung (Fix Scroll-Pfad-Abhaengigkeit)', () => {
  assert.ok(!/const finalObserver = new IntersectionObserver/.test(source), 'der alte finalObserver darf nicht mehr vorkommen')
  assert.match(source, /finalSentinel\.getBoundingClientRect\(\)\.top < window\.innerHeight/)
})

test('Geometrie-Pruefung wird per requestAnimationFrame gedrosselt (kein Layout-Thrashing) und bei Scroll und Resize ausgeloest', () => {
  assert.match(source, /requestAnimationFrame\(evaluateFinalSentinel\)/)
  assert.match(source, /window\.addEventListener\('scroll', scheduleEvaluateFinalSentinel, \{ passive: true \}\)/)
  assert.match(source, /window\.addEventListener\('resize', scheduleEvaluateFinalSentinel\)/)
})

test('initiale Auswertung direkt nach dem Mount (z. B. Reload waehrend die Seite bereits am Ende gescrollt ist)', () => {
  const effectBody = source.match(/useEffect\(\(\) => \{\s*const heroSentinel[\s\S]*?\}, \[heroSentinelId, finalSentinelId\]\)/)?.[0] ?? ''
  assert.match(effectBody, /scheduleEvaluateFinalSentinel\(\);\s*\r?\n\s*window\.addEventListener\('scroll'/)
})

test('Scroll- und Resize-Listener werden beim Unmount sauber entfernt, Hero-Observer disconnected', () => {
  const cleanup = source.match(/return \(\) => \{\s*heroObserver\.disconnect\(\);[\s\S]*?\};\s*\r?\n\s*\}, \[heroSentinelId, finalSentinelId\]\)/)?.[0] ?? ''
  assert.match(cleanup, /window\.removeEventListener\('scroll', scheduleEvaluateFinalSentinel\)/)
  assert.match(cleanup, /window\.removeEventListener\('resize', scheduleEvaluateFinalSentinel\)/)
})

test('stickyVisible bleibt unveraendert aus heroPassed und finalReached abgeleitet (Soll-Regel unveraendert)', () => {
  assert.match(source, /const stickyVisible = heroPassed && !finalReached;/)
})

test('Stacking ueber der Merkliste-Leiste (merklisteBarHeight) bleibt unveraendert', () => {
  assert.match(source, /document\.getElementById\('merkliste-bar'\)/)
  assert.match(source, /setMerklisteBarHeight\(el\?\.offsetHeight \?\? 0\)/)
  assert.match(source, /bottom: `\$\{24 \+ merklisteBarHeight\}px`/)
  assert.match(source, /bottom: `\$\{merklisteBarHeight\}px`/)
})

test('Anfrageziel, Optik und Sprunglink zum Video ("#live") bleiben unveraendert', () => {
  assert.match(source, /href="#live"/)
  assert.match(source, /Unverbindlich anfragen/)
  assert.match(source, /bg-pl-accent text-pl-on-accent/)
})
