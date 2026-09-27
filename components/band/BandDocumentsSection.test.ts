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
// Bandseiten-Nachschaerfung (Abschnitt 3): die Komponente ist eine flache,
// helle Kartenzeile (dezente Kontur statt der frueheren dominanten
// bg-pl-stage-Karte), eingebettet als dritte, volle Breite nutzende Ebene
// in "03 Die Band fuer euer Event?" (siehe BandTagsSection.tsx). 1 und
// mehrere Dokumente werden bewusst gleich behandelt (keine
// Sonderbehandlung nach Anzahl).
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

test('helle, dezent umrandete Karte statt der frueheren dominanten dunklen Karte', () => {
  assert.match(source, /bg-pl-elevated border border-pl-soft/)
  assert.doesNotMatch(source, /bg-pl-stage/)
})

test('Beschreibung ist nicht beschnitten (kein line-clamp)', () => {
  assert.doesNotMatch(source, /line-clamp/)
})

test('CTA ist eindeutig als "PDF ansehen" beschriftet', () => {
  assert.match(source, />\s*PDF ansehen\s*</)
})

test('CTA verlinkt document.fileUrl, oeffnet in neuem Tab mit rel-Attribut (echter Dokumentlink, kein simulierter Button)', () => {
  assert.match(source, /href=\{document\.fileUrl\}/)
  assert.match(source, /target="_blank"/)
  assert.match(source, /rel="noopener noreferrer"/)
})

test('BandTagsSection.tsx: BandDocumentsSection wird als eigene, volle Breite nutzende Ebene von "03" eingebunden (nicht mehr als eigene Section in page.tsx)', () => {
  assert.match(tagsSectionSource, /<BandDocumentsSection band=\{band\} \/>/)
})
