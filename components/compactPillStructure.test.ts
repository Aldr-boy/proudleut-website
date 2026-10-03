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
  assert.match(code, /h-full bg-pl-paper border border-pl-soft shadow-\[0_8px_30px_rgba\(42,34,38,0\.12\)\] rounded-full pl-6 pr-2 flex items-center gap-3/)
})

test('Ausblenden sofort (invisible, opacity-0, transition-none, inert), Einblenden als Fade nur unter motion-safe', () => {
  assert.match(code, /const visibleClasses = 'visible opacity-100 pointer-events-auto motion-safe:transition-opacity motion-safe:duration-150';/)
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
  assert.match(header, /compact \? 'shadow-none' : 'shadow-\[0_8px_30px_rgba\(42,34,38,0\.12\)\]'/)
})

test('Store: compact-Flag ohne persist/Storage', () => {
  const store = strip(read('stores', 'headerSlotStore.ts'))
  assert.match(store, /compact: boolean;/)
  assert.match(store, /setCompact: \(compact: boolean\) => void;/)
  assert.ok(!/persist|localStorage|sessionStorage|cookie/i.test(store))
})
