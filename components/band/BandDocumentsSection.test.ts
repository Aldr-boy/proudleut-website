import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer BandDocumentsSection.tsx (Paket 2A).
// Server Component mit next/image -- in diesem Repo nicht direkt per
// node:test ausfuehrbar (keine React-/Next.js-Rendering-Infrastruktur,
// siehe lib/bands/bandDetailPageDisplay.test.ts fuer das identische,
// bereits etablierte Muster). Echte Quelldatei per readFileSync lesen und
// strukturell pruefen.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const source = readFileSync(path.join(root, 'components', 'band', 'BandDocumentsSection.tsx'), 'utf8')
const pageSource = readFileSync(path.join(root, 'app', 'band', '[slug]', 'page.tsx'), 'utf8')

test('Zustand 0: bei documents.length === 0 wird null zurueckgegeben (Section entfaellt vollstaendig)', () => {
  assert.match(source, /if \(documents\.length === 0\) return null;/)
})

test('Zustand 1 vs. mehrere: verzweigt exakt auf documents.length === 1', () => {
  assert.match(source, /documents\.length === 1 \? \(\s*<SingleDocumentFeature document=\{documents\[0\]\} \/>/)
})

test('CTA-Text bei genau 1 Dokument ist "Präsentation ansehen"', () => {
  assert.match(source, /<DocumentCtaLink document=\{document\} label="Präsentation ansehen"/)
})

test('CTA-Text bei mehreren Dokumenten ist "Ansehen" (kein frei konfigurierbarer CTA-Text)', () => {
  assert.match(source, /<DocumentCtaLink document=\{document\} label="Ansehen"/)
})

test('kein Slider/Carousel/Tabs fuer den Mehrfach-Zustand', () => {
  assert.doesNotMatch(source, /import.*(carousel|slider|swiper)/i)
  assert.doesNotMatch(source, /<(Carousel|Slider|Swiper|Tabs)[\s/>]/)
})

test('keine Donnaweda-spezifische Logik oder Hardcodierung im Component-Quellcode', () => {
  assert.doesNotMatch(source, /donnaweda/i)
})

test('fehlendes thumbnailUrl faellt auf ein generisches Icon zurueck statt kaputtes <Image> zu rendern', () => {
  assert.match(source, /document\.thumbnailUrl \? \(/)
  assert.match(source, /<DocumentIcon/)
})

test('optionale Beschreibung wird nur bei Vorhandensein gerendert, kein Layout-Fehler bei fehlendem Text', () => {
  assert.match(source, /\{document\.description && \(/)
})

test('nutzt die bestehende Farbtoken-/Container-Konvention (pl-container-shell, bg-pl-paper), keine neue Design-Sprache', () => {
  assert.match(source, /pl-container-shell/)
  assert.match(source, /bg-pl-paper/)
})

test('CTA-Button reicht dieselbe Accent-Button-Klasse wie AnfrageButton (keine neue Button-Variante)', () => {
  assert.match(source, /bg-\[var\(--pl-accent\)\]/)
  assert.match(source, /rounded-full/)
})

test('page.tsx: BandDocumentsSection wird nach BandGallery und vor BandWeddingModule eingebunden', () => {
  const galleryIdx = pageSource.indexOf('<BandGallery band={band} />')
  const documentsIdx = pageSource.indexOf('<BandDocumentsSection band={band} />')
  const weddingIdx = pageSource.indexOf('<BandWeddingModule band={band} />')
  assert.ok(galleryIdx !== -1 && documentsIdx !== -1 && weddingIdx !== -1, 'alle drei Sections muessen in page.tsx vorkommen')
  assert.ok(galleryIdx < documentsIdx, 'BandDocumentsSection muss nach BandGallery stehen')
  assert.ok(documentsIdx < weddingIdx, 'BandDocumentsSection muss vor BandWeddingModule stehen')
})
