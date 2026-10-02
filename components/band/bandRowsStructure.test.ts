import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer das Zeilenraster (Prototyp E):
// BandRow.tsx, BandTagsSection.tsx, CollapsiblePills.tsx,
// BandEventTypesPills.tsx und BandGallerySection.tsx (die fruehere dunkle
// Insel und die Live-Zeile sind aufgeloest). Kein React-Test-Harness
// in diesem Repo -- das Verhalten (Aufklappen, Tab-Reihenfolge, Linien) wird
// zusaetzlich per Playwright geprueft.
const dir = path.dirname(fileURLToPath(import.meta.url))
const read = (file: string) => readFileSync(path.join(dir, file), 'utf8')
const rowSource = read('BandRow.tsx')
const tagsSource = read('BandTagsSection.tsx')
const pillsSource = read('BandEventTypesPills.tsx')
const collapsibleSource = read('CollapsiblePills.tsx')
const galleryRaw = read('BandGallery.tsx')
const gallerySectionSource = read('BandGallerySection.tsx')
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

test('Kapitelnummern entfallen, die Ueberschrift des Text-Bereichs bleibt', () => {
  assert.match(descriptionSource, /<BandChapterHeading title="Wer steht hier auf der Bühne\?" divider=\{false\} \/>/)
  assert.doesNotMatch(descriptionSource, /number="0\d"/)
})

test('Ueberschrift "Wer steht hier auf der Buehne?" ohne Linie (optionale Prop divider, Default an); "Klingt nach"-Eintraege 22 px mobil / 28 px ab lg mit Linien dazwischen', () => {
  const heading = readFileSync(path.join(dir, 'BandChapterHeading.tsx'), 'utf8')
  assert.match(heading, /divider\?: boolean;/)
  assert.match(heading, /divider = true/)
  assert.match(heading, /divider \? `pb-4 md:pb-5 border-b /)
  assert.match(descriptionSource, /py-\[10px\] lg:py-3 border-t border-pl-soft text-\[22px\] lg:text-\[28px\] leading-\[1\.12\] tracking-\[-0\.025em\] font-extrabold/)
  assert.doesNotMatch(descriptionSource, /text-\[27px\]|text-\[34px\]/)
})

test('HeroVideoPill: Haptik (Glas, Lichtkante, Schatten), Hover nur ueber hover:, active-Zustand, Bewegung nur unter motion-safe, Fokusring; Groesse, Text, sr-only-Zusatz und aria-haspopup unveraendert', () => {
  const pill = readFileSync(path.join(dir, 'HeroVideoPill.tsx'), 'utf8')
  assert.match(pill, /backdrop-blur-sm/)
  assert.match(pill, /shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.18\),0_2px_8px_rgba\(0,0,0,0\.35\)\]/)
  assert.match(pill, /motion-safe:hover:-translate-y-px/)
  assert.match(pill, /motion-safe:active:translate-y-0 motion-safe:active:scale-\[0\.98\]/)
  assert.match(pill, /motion-safe:group-hover:scale-105/)
  assert.match(pill, /motion-safe:duration-150/)
  assert.match(pill, /focus-visible:outline-\[3px\] focus-visible:outline-offset-2/)
  assert.doesNotMatch(pill.replace(/\/\/.*$/gm, ''), /(?<![\w:-])hover:-translate|(?<![\w:-])active:scale/, 'Bewegung nur mit motion-safe')
  assert.match(pill, /h-12 md:h-\[52px\]/)
  assert.match(pill, /aria-haspopup="dialog"/)
  assert.match(pill, /Live ansehen/)
  assert.match(pill, /<span className="sr-only">– Video von \{bandName\}<\/span>/)
})

test('Keine Live-Zeile mehr: BandTagsSection ohne BandVideoRow und ohne hasVideo, erste Zeile ist "Stil & Einfluesse"; das Video oeffnet nur ueber die Hero-Pille', () => {
  assert.doesNotMatch(tagsSource.replace(/\/\/.*$/gm, ''), /BandVideoRow|hasVideo|VideoPlayer/)
  assert.match(tagsSource, /export function BandTagsSection\(\{ band \}: Props\)/)
  assert.ok(tagsSource.indexOf('<BandRow') === tagsSource.indexOf('<BandRow label="Stil & Einflüsse"'), 'Stil ist die erste Zeile')
})

test('BandRow ohne Anker-Id und ohne labelSrSuffix (nur noch Label, Ton, pillAligned und labelAs)', () => {
  const code = rowSource.replace(/\/\/.*$/gm, '')
  assert.doesNotMatch(code, /labelSrSuffix|id\?: string|scroll-mt|sr-only/)
  assert.match(code, /labelAs\?: 'p' \| 'h2';/)
})

test('Galerie: eigene helle Section (bg-pl-canvas), <h2> "Ein Eindruck von der Buehne", Anzahlhinweis in text-pl-text-muted, helle Fokusfarbe; Komposition, Lightbox und next/image bleiben', () => {
  assert.match(gallerySectionSource, /bg-pl-canvas/)
  assert.match(galleryRaw, /<h2 className="text-2xl font-extrabold tracking-\[-0\.02em\] text-pl-text">Ein Eindruck von der Bühne<\/h2>/)
  assert.match(galleryRaw, /<span className="text-xs text-pl-text-muted">/)
  assert.doesNotMatch(galleryRaw.replace(/\/\/.*$/gm, ''), /pl-on-stage|accent-light/, 'keine dunklen Tokens mehr')
  assert.match(galleryRaw, /<GalleryLightbox/)
  assert.match(galleryRaw, /from 'next\/image'/)
  assert.match(galleryRaw, /desktopGalleryComposition\(images\.length\)/)
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
