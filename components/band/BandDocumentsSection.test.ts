import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer BandDocumentsSection.tsx.
// Server Component mit next/image -- in diesem Repo nicht direkt per
// node:test ausfuehrbar (keine React-/Next.js-Rendering-Infrastruktur,
// siehe lib/bands/bandDetailPageDisplay.test.ts fuer das identische,
// bereits etablierte Muster). Echte Quelldatei per readFileSync lesen und
// strukturell pruefen.
//
// Bandseiten-Finalisierung: die Komponente ist jetzt eine kompakte dunkle
// Kartenzeile (bg-pl-stage, wie die bestehende Anfrage-Karte in
// BandContactSection.tsx), eingebettet in die rechte Spalte von
// "03 Die Band fuer euer Event?" (siehe BandTagsSection.tsx) statt einer
// eigenen hellen Vollbreiten-Section. 1 und mehrere Dokumente werden
// dadurch bewusst gleich behandelt (keine Sonderbehandlung nach Anzahl).
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const source = readFileSync(path.join(root, 'components', 'band', 'BandDocumentsSection.tsx'), 'utf8')
const tagsSectionSource = readFileSync(path.join(root, 'components', 'band', 'BandTagsSection.tsx'), 'utf8')

test('Zustand 0: bei documents.length === 0 wird null zurueckgegeben (entfaellt vollstaendig, kein Platzhalter)', () => {
  assert.match(source, /if \(documents\.length === 0\) return null;/)
})

test('jedes Dokument (1 oder mehrere) wird durch dieselbe Kartenkomponente gerendert -- keine Sonderbehandlung nach Anzahl', () => {
  assert.match(source, /documents\.map\(\(document\) => \(\s*<DocumentCard key=\{document\.id\} document=\{document\} \/>/)
})

test('kein Slider/Carousel/Tabs', () => {
  assert.doesNotMatch(source, /import.*(carousel|slider|swiper)/i)
  assert.doesNotMatch(source, /<(Carousel|Slider|Swiper|Tabs)[\s/>]/)
})

test('keine bandspezifische Logik oder Hardcodierung im Component-Quellcode', () => {
  assert.doesNotMatch(source, /donnaweda|blechstreet/i)
})

test('fehlendes thumbnailUrl faellt auf ein generisches Icon zurueck statt kaputtes <Image> zu rendern', () => {
  assert.match(source, /document\.thumbnailUrl \? \(/)
  assert.match(source, /<DocumentIcon/)
})

test('Vorschau nutzt object-contain (kein Beschnitt des Dokumentformats)', () => {
  assert.match(source, /object-contain/)
})

test('optionale Beschreibung wird nur bei Vorhandensein gerendert, kein Layout-Fehler bei fehlendem Text', () => {
  assert.match(source, /\{document\.description && \(/)
})

test('nutzt die bestehende dunkle Karten-Konvention (bg-pl-stage), keine neue Design-Sprache', () => {
  assert.match(source, /bg-pl-stage/)
})

test('CTA verlinkt document.fileUrl, oeffnet in neuem Tab mit rel-Attribut (echter Dokumentlink, kein simulierter Button)', () => {
  assert.match(source, /href=\{document\.fileUrl\}/)
  assert.match(source, /target="_blank"/)
  assert.match(source, /rel="noopener noreferrer"/)
})

test('BandTagsSection.tsx: BandDocumentsSection wird in der rechten Spalte von "03" eingebunden (nicht mehr als eigene Section in page.tsx)', () => {
  assert.match(tagsSectionSource, /<BandDocumentsSection band=\{band\} \/>/)
})
