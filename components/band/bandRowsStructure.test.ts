import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer das Zeilenraster (Prototyp E):
// BandRow.tsx, BandTagsSection.tsx, CollapsiblePills.tsx,
// BandEventTypesPills.tsx und BandVideoSection.tsx. Kein React-Test-Harness
// in diesem Repo -- das Verhalten (Aufklappen, Tab-Reihenfolge, Linien) wird
// zusaetzlich per Playwright geprueft.
const dir = path.dirname(fileURLToPath(import.meta.url))
const read = (file: string) => readFileSync(path.join(dir, file), 'utf8')
const rowSource = read('BandRow.tsx')
const tagsSource = read('BandTagsSection.tsx')
const pillsSource = read('BandEventTypesPills.tsx')
const collapsibleSource = read('CollapsiblePills.tsx')
const videoSource = read('BandVideoSection.tsx')
const descriptionSource = read('BandDescription.tsx')

test('BandRow: erste Zeile ohne Linie und Oberabstand, letzte ohne Unterabstand -- keine Luecke, wenn Zeilen entfallen', () => {
  assert.match(rowSource, /border-t border-pl-soft first:border-t-0 first:pt-0 last:pb-0/)
  assert.match(rowSource, /md:grid-cols-\[200px_1fr\]/)
})

test('BandTagsSection: Zeilenreihenfolge Stil, Spielt bei, Hochzeit, Referenz-Events, Unterlagen; ohne Ueberschrift und Kapitelnummer', () => {
  const idx = (needle: string) => tagsSource.indexOf(needle)
  const order = [
    idx('label="Stil & Einflüsse"'),
    idx('label="Spielt bei"'),
    idx('<BandWeddingModule band={band} />'),
    idx('<BandReferenceEvents band={band} />'),
    idx('<BandDocumentsSection band={band} />'),
  ]
  assert.ok(order.every((i) => i >= 0), 'eine Zeile fehlt')
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'Reihenfolge weicht von E ab')
  assert.doesNotMatch(tagsSource, /BandChapterHeading/)
  assert.match(tagsSource, /bg-pl-canvas/)
})

test('BandTagsSection: jede Zeile rendert nur mit Inhalt, die Section entfaellt ohne jede Zeile', () => {
  assert.match(tagsSource, /\{hasStil && \(/)
  assert.match(tagsSource, /\{hasEventTypes && \(/)
  assert.match(tagsSource, /\{hasWedding && <BandWeddingModule/)
  assert.match(tagsSource, /\{hasReferenceEvents && <BandReferenceEvents/)
  assert.match(tagsSource, /\{hasDocuments && <BandDocumentsSection/)
  assert.match(tagsSource, /if \(!hasStil && !hasEventTypes && !hasWedding && !hasReferenceEvents && !hasDocuments\) return null;/)
})

test('Hochzeit-Zeile erscheint nur, wenn auch BandWeddingModule rendert (hasWeddingContent) -- keine leere Zeile', () => {
  assert.match(tagsSource, /hasWeddingContent\(band\) && \(/)
})

test('Kapitelnummern entfallen in 01 und 02, die Ueberschriften bleiben', () => {
  assert.match(descriptionSource, /<BandChapterHeading title="Wer steht hier auf der Bühne\?" \/>/)
  assert.match(videoSource, /<BandChapterHeading title="Wie klingt die Band live\?" variant="dark" \/>/)
  assert.doesNotMatch(descriptionSource + videoSource, /number="0\d"/)
})

test('Insel (BandVideoSection): nur Video-Tile und Galerie, entfaellt ohne beides; ohne Video keine Trennlinie ueber der Galerie', () => {
  assert.match(videoSource, /if \(!hasVideo && !hasGallery\) return null;/)
  assert.doesNotMatch(videoSource, /band\.musikalischVerortet|Stil &amp;/)
  assert.match(videoSource, /hasVideo \? 'mt-10 pt-10 border-t border-white\/10' : ''/)
  assert.match(videoSource, /id="live"/)
  assert.match(videoSource, /md:scroll-mt-\[calc\(var\(--pl-nav-height\)\+5rem\)\]/)
})

test('Spielt bei: mobile Kuerzung ist Opt-in, verborgene Pills tragen display:none (max-md:group-data-[expanded=false]:hidden) und bleiben im HTML', () => {
  assert.match(pillsSource, /collapseOnMobile\?: number/)
  assert.match(pillsSource, /'max-md:group-data-\[expanded=false\]:hidden'/)
  assert.match(pillsSource, /const limit = collapseOnMobile \?\? Infinity;/)
  assert.match(pillsSource, /hiddenCount=\{eventTypes\.length - limit\}/)
  assert.match(pillsSource, /findCategoryForEventTypeSlug/)
})

test('Spielt bei: gekuerzt wird erst, wenn mindestens 3 Pills verborgen wuerden (bei Limit 6: ab 9 Pills); bei 8 oder weniger gibt es keinen Knopf', () => {
  assert.match(pillsSource, /const MIN_HIDDEN_ON_MOBILE = 3;/)
  assert.match(pillsSource, /const collapsible = eventTypes\.length - limit >= MIN_HIDDEN_ON_MOBILE;/)
  // Rechenprobe der Bedingung fuer 6..12 Pills bei Limit 6
  const collapsible = (count: number, limit = 6, min = 3) => count - limit >= min
  assert.deepEqual([6, 7, 8].map((n) => collapsible(n)), [false, false, false])
  assert.deepEqual([9, 10, 12].map((n) => collapsible(n)), [true, true, true])
  assert.equal(9 - 6, 3, '9 Pills: "+3 weitere"')
  assert.equal(collapsible(5, Infinity), false, 'ohne Opt-in (Limit unendlich) wird nie gekuerzt')
  assert.match(pillsSource, /findCategoryForEventTypeSlug/)
})

test('CollapsiblePills: <button> mit aria-expanded und aria-controls, nur mobil (md:hidden), Zustand per data-expanded, Beschriftung "+N weitere" / "weniger anzeigen"', () => {
  assert.match(collapsibleSource, /<button\s+type="button"\s+aria-expanded=\{expanded\}\s+aria-controls=\{listId\}/)
  assert.match(collapsibleSource, /className="md:hidden /)
  assert.match(collapsibleSource, /data-expanded=\{expanded\}/)
  assert.match(collapsibleSource, /`\+\$\{hiddenCount\} weitere`/)
  assert.match(collapsibleSource, /'weniger anzeigen'/)
})

test('keine Persistenz fuer den Aufklapp-Zustand (kein localStorage/sessionStorage/Cookie)', () => {
  assert.doesNotMatch(collapsibleSource, /localStorage|sessionStorage|document\.cookie/)
})
