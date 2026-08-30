import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer den kompakten Sticky-Zugang
// "Auswahl verfeinern" in BandExplorer (Paket "Kompakter Sticky-Zugang
// zum Band-Finder"). Kein jsdom/RTL in diesem Repo -- identisches,
// bereits etabliertes Muster wie
// bandExplorerLockedOccasionStructure.test.ts: echte Quelldatei per
// readFileSync lesen und strukturell pruefen. Regexes bewusst
// \r?\n-tolerant (CRLF-Checkout-Artefakt in frischen Worktrees dieser
// Umgebung, bereits mehrfach dokumentiert -- B-Fund, kein Blocker).
const sourcePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'BandExplorer.tsx'
)
const source = readFileSync(sourcePath, 'utf8')

test('IntersectionObserver wird verwendet (kein Scroll-Listener) fuer die Sticky-Sichtbarkeit', () => {
  const occurrences = (source.match(/new IntersectionObserver\(/g) ?? []).length
  assert.equal(occurrences, 2, 'erwartet genau 2 IntersectionObserver-Instanzen: Finder-Sentinel + Explorer-Ende-Sentinel')
  assert.doesNotMatch(source, /addEventListener\('scroll'/, 'kein Scroll-Listener fuer die Sticky-Sichtbarkeit erlaubt')
  assert.doesNotMatch(source, /window\.scrollY|document\.documentElement\.scrollTop|onscroll/, 'kein manuelles Scroll-Position-Polling erlaubt')
})

test('zwei dedizierte Sentinel-Refs existieren: Finder-passiert und Explorer-Ende', () => {
  assert.match(source, /const finderSentinelRef = useRef<HTMLDivElement>\(null\);/)
  assert.match(source, /const explorerEndSentinelRef = useRef<HTMLDivElement>\(null\);/)
  assert.match(source, /<div ref=\{finderSentinelRef\} aria-hidden="true" className="h-px" \/>/)
  assert.match(source, /<div ref=\{explorerEndSentinelRef\} aria-hidden="true" className="h-px" \/>/)
})

test('Finder-Sentinel liegt unmittelbar NACH der Finder-Bar (nicht davor)', () => {
  const barCloseIdx = source.indexOf('{/* ── Ende Finder-Bar')
  const sentinelIdx = source.indexOf('ref={finderSentinelRef}')
  assert.ok(barCloseIdx >= 0 && sentinelIdx >= 0)
  assert.ok(sentinelIdx > barCloseIdx, 'Finder-Sentinel muss nach dem Ende-Kommentar der Finder-Bar stehen')
})

test('Explorer-Ende-Sentinel liegt NACH dem Grid-/Weitere-Bands-Bereich', () => {
  const weitereBandsIdx = source.indexOf('Weitere Bands anzeigen')
  const endSentinelIdx = source.indexOf('ref={explorerEndSentinelRef}')
  assert.ok(weitereBandsIdx >= 0 && endSentinelIdx >= 0)
  assert.ok(endSentinelIdx > weitereBandsIdx, 'Explorer-Ende-Sentinel muss nach dem "Weitere Bands anzeigen"-Bereich stehen')
})

test('finderPassed-Observer unterscheidet "noch nicht erreicht" von "bereits passiert" ueber boundingClientRect/rootBounds, nicht naiv ueber !isIntersecting', () => {
  const idx = source.indexOf('const finderObserver = new IntersectionObserver(')
  assert.ok(idx >= 0)
  const body = source.slice(idx, idx + 400)
  assert.match(body, /const boundary = entry\.rootBounds \? entry\.rootBounds\.top : 8;/)
  assert.match(body, /const isAboveBoundary = entry\.boundingClientRect\.top < boundary;/)
  assert.match(body, /setFinderPassed\(!entry\.isIntersecting && isAboveBoundary\);/)
})

test('explorerEndReached-Observer: sichtbar ODER bereits passiert gilt als erreicht', () => {
  const idx = source.indexOf('const endObserver = new IntersectionObserver(')
  assert.ok(idx >= 0)
  const body = source.slice(idx, idx + 400)
  assert.match(body, /const isAboveBoundary = entry\.boundingClientRect\.top < boundary;/)
  assert.match(body, /setExplorerEndReached\(entry\.isIntersecting \|\| isAboveBoundary\);/)
})

test('stickyVisible = shuffled.length > 0 && finderPassed && !explorerEndReached (kein Mount-Flash vor geladener Ergebnismenge)', () => {
  assert.match(source, /const stickyVisible = shuffled\.length > 0 && finderPassed && !explorerEndReached;/)
})

test('Sticky-Text verwendet displayed.length (vollstaendige gefilterte Menge), NICHT visibleCount oder die gerenderte Kartenzahl', () => {
  const idx = source.indexOf('const stickyCount = displayed.length;')
  assert.ok(idx >= 0, 'stickyCount muss displayed.length sein, nicht visibleCount')
  const labelIdx = source.indexOf('const stickyLabel = ')
  assert.ok(labelIdx >= 0)
  const labelLine = source.slice(labelIdx, labelIdx + 200)
  assert.doesNotMatch(labelLine, /visibleCount/, 'Sticky-Label darf nicht auf visibleCount basieren')
  assert.match(labelLine, /Auswahl verfeinern · \$\{stickyCount\} \$\{stickyCount === 1 \? 'Band' : 'Bands'\}/)
})

test('scrollToFinder scrollt zu barRef und respektiert prefers-reduced-motion (kein erzwungenes Smooth-Scrolling)', () => {
  const idx = source.indexOf('function scrollToFinder()')
  assert.ok(idx >= 0)
  const body = source.slice(idx, idx + 400)
  assert.match(body, /matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches/)
  assert.match(body, /barRef\.current\?\.scrollIntoView\(\{ behavior: prefersReducedMotion \? 'auto' : 'smooth', block: 'start' \}\);/)
})

test('Klick-Handler des Sticky-Controls loest ausschliesslich scrollToFinder aus -- kein router.push, kein setQuery/setSelected*, kein Panel-Oeffnen', () => {
  const idx = source.indexOf('onClick={scrollToFinder}')
  assert.ok(idx >= 0, 'Sticky-Button muss onClick={scrollToFinder} verwenden')
})

test('scrollToFinder aendert keine URL und keinen Filter-State (kein router., kein setQuery/setSelected* im Funktionskoerper)', () => {
  const idx = source.indexOf('function scrollToFinder()')
  const body = source.slice(idx, idx + 400)
  assert.doesNotMatch(body, /router\.(push|replace)/)
  assert.doesNotMatch(body, /setQuery|setSelectedCategory|setSelectedRegion|setSelectedBandtyp|setSelectedMood|setOpenPanel/)
})

test('kein Auto-Fokus des Suchfelds durch scrollToFinder (kein .focus()-Aufruf im Sticky-Click-Pfad)', () => {
  const idx = source.indexOf('function scrollToFinder()')
  const body = source.slice(idx, idx + 400)
  assert.doesNotMatch(body, /\.focus\(\)/)
})

test('Hidden State: aria-hidden, pointer-events-none und inert bei unsichtbarem Sticky-Control, kein Tab-Fokus', () => {
  const wrapperIdx = source.indexOf('{...(stickyVisible ? {} : { inert: true })}')
  assert.ok(wrapperIdx >= 0, 'inert-Spread fuer den ausgeblendeten Zustand nicht gefunden')
  const wrapperBody = source.slice(wrapperIdx, wrapperIdx + 600)
  assert.match(wrapperBody, /aria-hidden=\{!stickyVisible\}/)
  assert.match(wrapperBody, /pointer-events-none/)
  assert.match(wrapperBody, /pointer-events-auto/)
  assert.match(wrapperBody, /tabIndex=\{stickyVisible \? 0 : -1\}/)
})

test('Reduced Motion: opacity-/translate-Uebergang steht unter motion-safe (keine erzwungene Animation)', () => {
  const wrapperIdx = source.indexOf('{...(stickyVisible ? {} : { inert: true })}')
  const wrapperBody = source.slice(wrapperIdx, wrapperIdx + 900)
  assert.match(wrapperBody, /motion-safe:transition-all motion-safe:duration-300/)
  assert.match(wrapperBody, /motion-safe:transition-colors/)
})

test('Mobile Safe Area wird ueber env(safe-area-inset-bottom) beruecksichtigt', () => {
  assert.match(source, /bottom-\[calc\(1\.25rem\+env\(safe-area-inset-bottom\)\)\]/)
})

test('scroll-mt nutzt die bestehende --pl-nav-height-CSS-Variable (Header.tsx) statt einer eigenen JS-Navigationshoehenberechnung', () => {
  assert.match(source, /scroll-mt-\[var\(--pl-nav-height\)\]/)
  assert.doesNotMatch(source, /getBoundingClientRect\(\)\.height.*nav|nav.*getBoundingClientRect/i)
})

test('Sticky-Control ist bewusst kompakt -- kein zweiter Finder, keine Panel-/Such-Elemente im Sticky-Markup', () => {
  const idx = source.indexOf('{...(stickyVisible ? {} : { inert: true })}')
  const stickyBlock = source.slice(idx, source.length)
  assert.doesNotMatch(stickyBlock, /role="listbox"/, 'Sticky-Control darf keine Filter-Panels enthalten')
  assert.doesNotMatch(stickyBlock, /type="search"/, 'Sticky-Control darf kein Suchfeld enthalten')
})
