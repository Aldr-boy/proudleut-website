import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer app/veranstaltung/[slug]/page.tsx
// (Paket "Finder auf Veranstaltungsseiten wiederverwenden"). Diese
// Testdatei liegt bewusst NICHT neben page.tsx (also nicht unter
// app/veranstaltung/[slug]/): `node --test` interpretiert "[slug]" im
// Dateipfad als Glob-Zeichenklasse (identisches, bereits bestaetigtes
// Verhalten wie bei anderen [slug]-Routen in diesem Repo) -- deshalb wird
// der Quellpfad relativ von hier aus referenziert. Regexes bewusst
// \r?\n-tolerant (CRLF-Checkout in dieser Umgebung, siehe Nachbar-Testdatei
// bandExplorerLockedOccasionStructure.test.ts).
const sourcePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '[slug]', 'page.tsx'
)
const source = readFileSync(sourcePath, 'utf8')

test('BandGrid wird nicht mehr importiert oder verwendet -- ersetzt durch BandExplorer', () => {
  assert.doesNotMatch(source, /BandGrid/)
})

test('BandExplorer wird importiert und mit bands, regions und lockedOccasion gerendert', () => {
  assert.match(source, /import BandExplorer from '@\/components\/bands\/BandExplorer';/)
  assert.match(source, /<BandExplorer[\s\S]{0,120}bands=\{bands\}[\s\S]{0,60}regions=\{regions\}[\s\S]{0,60}lockedOccasion=\{category\.slug\}/)
})

test('BandExplorer wird mit key={category.slug} gerendert (garantierter Remount bei Slug-Wechsel, R4 Source of Truth)', () => {
  assert.match(source, /<BandExplorer key=\{category\.slug\}/)
})

test('BandExplorer ist in Suspense gewrappt, identisches Muster wie app/bands/page.tsx', () => {
  assert.match(source, /<Suspense fallback=\{null\}>\r?\n\s*<BandExplorer/)
})

test('regions wird serverseitig aus der bereits anlassgefilterten Grundmenge (bands) abgeleitet, nicht aus allBands', () => {
  const regionsLineMatch = source.match(/const regions = REGION_ORDER\.filter\(\(r\) => ([a-zA-Z]+)\.some/)
  assert.ok(regionsLineMatch, 'regions-Herleitung nicht gefunden')
  assert.equal(regionsLineMatch![1], 'bands', 'regions muss aus der anlassgefilterten Menge (bands), nicht aus allBands abgeleitet werden')
})

test('redundanter "Im Finder nach Bands filtern"-Link entfaellt (durch direkt eingebundenen Finder ueberfluessig)', () => {
  assert.doesNotMatch(source, /Im Finder nach Bands für/)
})

test('server-Page selbst nimmt keine searchParams entgegen (Props-Typ enthaelt nur params)', () => {
  const propsTypeMatch = source.match(/type Props = \{[\s\S]*?\};/)
  assert.ok(propsTypeMatch, 'Props-Typ nicht gefunden')
  assert.doesNotMatch(propsTypeMatch![0], /searchParams/)
  assert.match(propsTypeMatch![0], /params: Promise<\{ slug: string \}>/)
})

test('generateStaticParams, revalidate und generateMetadata bleiben unveraendert vorhanden', () => {
  assert.match(source, /export async function generateStaticParams\(\)/)
  assert.match(source, /export const revalidate = 300;/)
  assert.match(source, /export async function generateMetadata\(/)
})

test('echte Empty-State-Kopie (0 Bands fuer diesen Anlass) bleibt unveraendert erhalten, keine Vermischung mit BandExplorer', () => {
  assert.match(source, /Aktuell sind keine Bands für diesen Anlass eingetragen\./)
})

test('Hero-Bloecke (Bild, H1, Subtitle, Zurueck-Link) bleiben strukturell unveraendert vorhanden', () => {
  assert.match(source, /<h1 className="text-3xl md:text-4xl font-bold text-white mb-3">\{h1\}<\/h1>/)
  assert.match(source, /← Zurück zur Bandübersicht/)
})
