import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Pruefung fuer "Merkliste mobil verbessern und messen":
// Leiste, Hinweis beim ersten Merken, Trefferflaeche, Vorauswahl, Fathom.
const dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(dir, '..', '..')
const read = (...p: string[]) => readFileSync(path.join(root, ...p), 'utf8')
const bar = read('components', 'band', 'MerklisteBar.tsx')
const flow = read('components', 'band', 'MerklisteFlow.tsx')
const heart = read('components', 'band', 'MerkHeartButton.tsx')
const store = read('stores', 'anfrageStore.ts')
const events = read('lib', 'analytics', 'wishlistEvents.ts')

test('Fathom-Ereignisnamen sind starr und enthalten keine Bandnamen', () => {
  assert.match(events, /WISHLIST_BAND_ADDED = 'wishlist_band_added'/)
  assert.match(events, /MULTI_BAND_INQUIRY_STARTED = 'multi_band_inquiry_started'/)
})

test('wishlist_band_added feuert nur bei tatsaechlich neu hinzugefuegter Band, nicht in removeBand', () => {
  const start = store.indexOf('addBand: (band) => {')
  const end = store.indexOf('removeBand:', start)
  const add = store.slice(start, end)
  assert.match(add, /if \(get\(\)\.bands\.some\(\(b\) => b\.slug === band\.slug\)\) return;/)
  assert.ok(add.indexOf('return;') < add.indexOf('trackWishlistEvent(WISHLIST_BAND_ADDED)'))
  const rest = store.slice(end)
  assert.ok(!rest.includes('trackWishlistEvent'))
})

test('multi_band_inquiry_started: erst wenn das Formular offen ist, >= 2 Baender, einmal pro Oeffnung (Ref)', () => {
  assert.match(flow, /const formOpenWithMultiple = showForm && isOpen && selectedBands\.length >= 2;/)
  assert.match(flow, /startedTrackedRef\.current = false;/)
  assert.match(flow, /if \(formOpenWithMultiple && !startedTrackedRef\.current\) \{\s*\r?\n\s*startedTrackedRef\.current = true;\s*\r?\n\s*trackWishlistEvent\(MULTI_BAND_INQUIRY_STARTED\);/)
  const cont = flow.slice(flow.indexOf('onContinue={'), flow.indexOf('onContinue={') + 60)
  assert.ok(!cont.includes('track'), 'nicht schon beim Klick auf den Knopf')
})

test('Ereignisse senden keine Bandnamen oder Personendaten', () => {
  assert.match(events, /trackEvent\(eventName\)/)
  assert.ok(!/trackWishlistEvent\([^)]*(name|slug|email)/i.test(store + flow))
})

test('Vorauswahl beim Oeffnen: alle gemerkten Baender, aber nur bis zur Anfragegrenze (sonst keine)', () => {
  assert.match(flow, /\} else if \(bands\.length <= MAX_BANDS_PER_ANFRAGE\) \{[\s\S]*setSelectedSlugs\(bands\.map\(\(b\) => b\.slug\)\);/)
})

test('Hinweis beim ersten Merken: nur Arbeitsspeicher, kein Cookie/Storage, Text wie vorgegeben', () => {
  assert.match(bar, /Du kannst mehrere Bands merken und gemeinsam anfragen\./)
  assert.match(store, /let firstAddHintShown = false;/)
  assert.ok(!/localStorage|sessionStorage|document\.cookie/.test(bar + store + events))
})

test('Leiste: Platz links fuer das Datenschutz-Symbol, Zahl bleibt auf dem Handy sichtbar', () => {
  assert.match(bar, /pl-\[76px\]/)
  assert.match(bar, /hidden sm:inline/)
  assert.match(bar, /bands\.length === 1 \? '1 Band gemerkt'/)
})

test('Leiste Handy: Musiksymbol nur ab sm, kuerzerer Knopftext "Merkliste", Knopf mind. 44 px hoch, Desktop-Text unveraendert', () => {
  assert.match(bar, /<span className="hidden sm:inline mr-1\.5" aria-hidden="true">🎵<\/span>/)
  assert.match(bar, /<span className="sm:hidden">Merkliste<\/span>/)
  assert.match(bar, /<span className="hidden sm:inline">Merkliste ansehen<\/span>/)
  assert.match(bar, /min-h-11 sm:min-h-0/)
})

test('Hinweis steht als eigene Zeile oberhalb der Leiste (vor der Zeile mit Zahl und Knopf), ohne Einzug fuer das Datenschutz-Symbol', () => {
  const hintAt = bar.indexOf('role="status"')
  const rowAt = bar.indexOf('pl-[76px] pr-4 sm:pr-6 xl:pl-6 py-3 flex')
  assert.ok(hintAt > 0 && rowAt > hintAt, 'Hinweis muss vor der Zeile mit Zahl und Knopf stehen')
  const hintTag = bar.slice(hintAt, hintAt + 200)
  assert.ok(!/pl-\[76px\]/.test(hintTag))
})

test('Herz: Trefferflaeche um 4 px je Seite erweitert (36 -> 44 px), Herz selbst bleibt w-9 h-9', () => {
  assert.match(heart, /w-9 h-9/)
  assert.match(heart, /after:-inset-1/)
})
