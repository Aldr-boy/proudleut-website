import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturpruefung fuer die Header-Vorbereitung (PR 1 von 2): Menue-Extraktion
// (HeaderMenuLinks.tsx), leerer Slot samt Registry (stores/headerSlotStore.ts)
// und der Vertrag data-nav-footprint am <header>. Kein React-Test-Harness im
// Projekt -- das Verhalten (Menue, Hoehe, Tab-Reihenfolge, Accessibility-Tree)
// wird zusaetzlich per Playwright gegen den Stand vor der Aenderung geprueft.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (...p: string[]) => readFileSync(path.join(root, ...p), 'utf8')
const header = read('components', 'Header.tsx')
const menu = read('components', 'HeaderMenuLinks.tsx')
const store = read('stores', 'headerSlotStore.ts')
const code = (s: string) => s.replace(/\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

test('<header> traegt data-nav-footprint (Vertrag fuer barVisibility: Rechteck der normalen Pille)', () => {
  assert.match(header, /<header\s+ref=\{pillRef as React\.RefObject<HTMLElement>\}\s+data-nav-footprint\s+className="fixed z-50/)
  assert.match(header, /Rechteck dieses <header> ist die feste Geometrie der NORMALEN Pille/)
})

test('Header: leerer, absolut positionierter Slot (data-header-slot) ohne Kinder, als letztes Kind des <header>', () => {
  assert.match(header, /<div ref=\{setSlotEl\} data-header-slot className="pointer-events-none absolute inset-0" \/>\s*<\/header>/)
  assert.match(header, /useHeaderSlotStore\(\(st\) => st\.setSlotEl\)/)
})

test('Registry: zustand ohne persist und ohne Storage, kein Konsument im Header ausser dem Setzen des Slots', () => {
  assert.match(store, /from 'zustand'/)
  const c = code(store)
  assert.ok(!/persist|localStorage|sessionStorage|document\.cookie/.test(c))
  assert.match(c, /export function useHeaderSlot\(\): HTMLElement \| null/)
  assert.ok(!/createPortal/.test(code(header)), 'noch kein Portal in PR 1')
})

test('Handy-Menue liegt in HeaderMenuLinks.tsx: gleiche Id, inert und aria-hidden im geschlossenen Zustand, Grid-Animation, md:hidden', () => {
  assert.match(menu, /id=\{MOBILE_MENU_ID\}/)
  assert.match(menu, /className="md:hidden grid motion-safe:transition-\[grid-template-rows\] motion-safe:duration-300 motion-safe:ease-out"/)
  assert.match(menu, /style=\{\{ gridTemplateRows: menuOpen \? '1fr' : '0fr' \}\}/)
  assert.match(menu, /aria-hidden=\{!menuOpen\}/)
  assert.match(menu, /inert=\{!menuOpen\}/)
  assert.match(menu, /aria-label="Hauptnavigation mobil"/)
  assert.match(menu, /tabIndex=\{menuOpen \? undefined : -1\}/)
  assert.match(header, /<HeaderMenuLinks\s+menuOpen=\{menuOpen\}\s+pathname=\{pathname\}\s+firstLinkRef=\{firstMobileLinkRef\}\s+onNavigate=\{\(\) => setMenuOpen\(false\)\}\s+\/>/)
})

test('Header behaelt Zustand, Escape, Outside-Click und Routenwechsel; das Menue-Markup steht nicht mehr in Header.tsx', () => {
  assert.match(header, /e\.key === 'Escape' && menuOpen/)
  assert.match(header, /document\.addEventListener\('pointerdown', onPointerDown\)/)
  assert.match(header, /if \(pathname !== prevPathname\)/)
  assert.ok(!/aria-label="Hauptnavigation mobil"/.test(header))
  assert.match(header, /aria-label="Hauptnavigation"/)
  assert.match(header, /--pl-nav-height/)
})

test('keine Popover-Teile in PR 1 (kommen in PR 2)', () => {
  assert.ok(!/popover|top-full/i.test(code(menu) + code(header)))
})
