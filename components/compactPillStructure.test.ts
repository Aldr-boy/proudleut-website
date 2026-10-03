import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturpruefung fuer die kompakte Header-Pille (components/band/CompactPill.tsx)
// und ihre Anbindung. Kein React-Test-Harness im Projekt -- das Verhalten (Fokus,
// Popover, Landmarks, Ueberblendung) wird per Playwright gegen den Production-
// Build geprueft.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (...p: string[]) => readFileSync(path.join(root, ...p), 'utf8')
const pill = read('components', 'band', 'CompactPill.tsx')
const strip = (s: string) => s.replace(/\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const code = strip(pill)

test('Huelle: absolut im Slot, 66 px = Hoehe des <header> (h-full), Breite min(Viewport - 2rem, 1140 px), mittig, opak (bg-pl-paper)', () => {
  assert.match(code, /data-compact-pill/)
  // z-20: ueber den positionierten Links (z-10) der normalen Pille, die darunter im Fluss bleibt
  assert.match(code, /absolute z-20 top-0 left-1\/2 -translate-x-1\/2 h-full w-\[min\(calc\(100vw-2rem\),1140px\)\]/)
  // Schatten als eigene, nicht beschnittene Ebene; Beschnittebene mit Hintergrund und Rand; Inhalt darin
  assert.match(code, /pointer-events-none absolute inset-y-0 left-1\/2 -translate-x-1\/2 w-full rounded-full shadow-\[0_8px_30px_rgba\(42,34,38,0\.12\)\]/)
  assert.match(code, /className="relative h-full bg-pl-paper border border-pl-soft rounded-full"/)
  assert.match(code, /className="h-full pl-6 pr-2 flex items-center gap-3"/)
})

test('Ausblenden sofort (invisible, opacity-0, transition-none, inert); das Einblenden ist die Animation in CompactPill (nur ohne prefers-reduced-motion), kein Fade der Huelle mehr', () => {
  assert.match(code, /const visibleClasses = 'visible opacity-100 pointer-events-auto';/)
  assert.match(code, /const hiddenClasses = 'invisible opacity-0 pointer-events-none transition-none';/)
  assert.match(code, /inert=\{!active\}/)
  assert.ok(!/transition-\[[^\]]*visibility/.test(code))
})

test('Landmark: genau ein <nav aria-label="Hauptnavigation"> nur um den Menue-Cluster (Knopf + Popover); das Logo steht ausserhalb', () => {
  assert.equal((code.match(/<nav\b/g) ?? []).length, 1)
  assert.match(code, /<nav ref=\{navRef\} aria-label="Hauptnavigation" className="shrink-0">/)
  const navBlock = code.slice(code.indexOf('<nav '), code.indexOf('</nav>'))
  assert.ok(!/Zur Startseite/.test(navBlock), 'Logo nicht im nav')
  assert.ok(code.indexOf('Zur Startseite') < code.indexOf('<nav '))
})

test('Menue-Knopf: aria-expanded, aria-controls, wechselndes aria-label, 48 px (w-12 h-12) Touch-Ziel; Popover absolut unter der Pille, hidden wenn zu', () => {
  assert.match(code, /aria-label=\{open \? 'Menü schließen' : 'Menü öffnen'\}/)
  assert.match(code, /aria-expanded=\{open\}/)
  assert.match(code, /aria-controls=\{POPOVER_ID\}/)
  assert.match(code, /w-12 h-12 inline-flex items-center justify-center rounded-full bg-pl-accent/)
  assert.match(code, /id=\{POPOVER_ID\}\s*hidden=\{!open\}\s*className="absolute right-2 top-\[calc\(100%\+8px\)\] w-72/)
})

test('Popover: Escape schliesst und gibt den Fokus an den Knopf zurueck, ausser ein Modal (dialog[open]) ist offen; Aussenklick und Routenwechsel schliessen; Fokus auf den ersten Link beim Oeffnen', () => {
  assert.match(code, /if \(e\.key !== 'Escape'\) return;/)
  assert.match(code, /if \(document\.querySelector\('dialog\[open\]'\)\) return;/)
  assert.match(code, /menuButtonRef\.current\?\.focus\(\);/)
  assert.match(code, /document\.addEventListener\('pointerdown', onPointerDown\)/)
  assert.match(code, /if \(!current \|\| current === document\.body\) menuButtonRef\.current\?\.focus\(\{ preventScroll: true \}\);/)
  assert.match(code, /if \(pathname !== prevPathname\)/)
  assert.match(code, /if \(!active && menuOpen\) setMenuOpen\(false\);/)
  assert.match(code, /if \(open\) firstLinkRef\.current\?\.focus\(\);/)
})

test('Inhalt: Logo-Link, Fakten (dl), Herz, "Unverbindlich anfragen" (unveraenderter Text), Menue; Fakten-Auswahl ueber layoutCompactFacts', () => {
  assert.match(code, /aria-label="Zur Startseite"/)
  assert.match(code, /<BandMerkHeart/)
  assert.match(code, /Unverbindlich anfragen\s*<\/Button>/)
  assert.match(code, /layoutCompactFacts\(available, measured\)/)
  assert.match(code, /h-12 px-\[26px\] rounded-full text-base font-bold/)
})

test('Fakten: gemessen im ResizeObserver-Callback und nach document.fonts.ready (kein synchrones setState im Effekt), verstecktes Messelement aria-hidden', () => {
  assert.match(code, /new ResizeObserver\(measure\)/)
  assert.match(code, /document\.fonts\?\.ready\.then\(measure\)/)
  assert.match(code, /ref=\{measureRef\}\s*aria-hidden="true"/)
})

test('Header-Ebenen: normale Pille bleibt im Fluss (kein display:none/visibility:hidden), nur inert + aria-hidden + Schatten weicht', () => {
  const header = strip(read('components', 'Header.tsx'))
  assert.ok(!/compact \? '(invisible|hidden)/.test(header))
  // Schatten der normalen Pille blendet in 200 ms aus (nur unter motion-safe), kommt beim Rueckwechsel sofort zurueck
  assert.match(header, /compact\s*\?\s*'shadow-none motion-safe:transition-shadow motion-safe:duration-200'\s*:\s*'shadow-\[0_8px_30px_rgba\(42,34,38,0\.12\)\]'/)
})

test('Store: compact-Flag ohne persist/Storage', () => {
  const store = strip(read('stores', 'headerSlotStore.ts'))
  assert.match(store, /compact: boolean;/)
  assert.match(store, /setCompact: \(compact: boolean\) => void;/)
  assert.ok(!/persist|localStorage|sessionStorage|cookie/i.test(store))
})

test('Einblenden: Beschnitt oeffnet sich aus der Breite der normalen Pille (280 ms, auslaufend), Inhalt verzoegert, Schatten 200 ms; Web Animations API im Layout-Effekt, nichts bleibt stehen', () => {
  assert.match(code, /useLayoutEffect\(\(\) => \{\s*if \(!active\) return;/)
  assert.match(code, /document\.querySelector\('\[data-nav-footprint\]'\)/)
  assert.match(code, /const sideInset = \(full - normal\) \/ 2;/)
  assert.match(code, /const easing = 'cubic-bezier\(0\.22, 1, 0\.36, 1\)';/)
  assert.match(code, /clipPath: 'inset\(0px 0px round 33px\)'/)
  assert.match(code, /\{ duration: 280, easing \}/)
  assert.match(code, /\{ duration: 200, easing: 'linear' \}/)
  assert.match(code, /\[\{ opacity: 0 \}, \{ opacity: 0, offset: 0\.36 \}, \{ opacity: 1 \}\]/)
  assert.match(code, /return \(\) => animations\.forEach\(\(a\) => a\.cancel\(\)\);/)
  // nur Animationen, keine dauerhaft gesetzten Inline-Stile fuer clip-path
  assert.ok(!/style=\{\{[^}]*clipPath/.test(code))
})

test('prefers-reduced-motion: keine Animation (matchMedia-Abfrage vor jedem animate), das Ausblenden bleibt sofort', () => {
  assert.match(code, /if \(window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches\) return;/)
  assert.ok(code.indexOf("prefers-reduced-motion: reduce") < code.indexOf('.animate('))
  assert.match(code, /const hiddenClasses = 'invisible opacity-0 pointer-events-none transition-none';/)
})
