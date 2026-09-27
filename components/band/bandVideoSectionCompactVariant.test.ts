import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer variant="compact" auf
// BandVideoSection.tsx (Auftrag "Profil-Demo /fuer-bands an neues
// Bandprofil angleichen"): die Profil-Demo bettet Video + "Klingt nach" +
// "Stil & Einfluesse" kompakt in eine eigene dunkle Karte ein, OHNE die
// echte Bandseite (variant="default", unveraendert) zu beeinflussen. Kein
// jsdom im Repo -- gleiches Textmuster wie bandContactSectionFollowerCounts.test.ts.
const source = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'BandVideoSection.tsx'),
  'utf8',
)

test('variant-Prop existiert mit "default" als Fallback, aendert den Default-Pfad der echten Bandseite nicht', () => {
  assert.match(source, /variant\?: 'default' \| 'compact'/)
  assert.match(source, /variant = 'default'/)
})

test('compact gibt nur den Kerninhalt zurueck -- kein <section>, keine BandChapterHeading', () => {
  const isCompactIdx = source.indexOf('if (isCompact) return content;')
  assert.ok(isCompactIdx >= 0, 'frueher Return fuer compact nicht gefunden')
  const sectionIdx = source.indexOf('<section id="live"')
  assert.ok(sectionIdx >= 0, 'Section fuer die echte Bandseite fehlt')
  assert.ok(isCompactIdx < sectionIdx, 'compact muss VOR der <section> zurueckkehren, damit sie fuer compact nie gerendert wird')

  const headingIdx = source.indexOf('<BandChapterHeading')
  assert.ok(headingIdx >= 0)
  assert.ok(isCompactIdx < headingIdx, 'BandChapterHeading darf im compact-Pfad nicht erreicht werden')
})

test('Galerie wird in compact nie gerendert (hasGallery ist fest false), auf der echten Bandseite unveraendert', () => {
  assert.match(source, /const hasGallery = !isCompact && band\.gallery\.length > 0;/)
  // <BandGallery band={band} /> muss weiterhin existieren -- nur die
  // Bedingung davor schliesst compact aus (Regression: bandDetailPageDisplay.test.ts
  // prueft bereits, dass der Aufruf selbst vorhanden bleibt).
  assert.match(source, /<BandGallery band=\{band\} \/>/)
})

test('Video- und Klingt-nach/Stil-Grid ist in compact und default identisch (dieselbe JSX-Variable "content")', () => {
  const contentDeclIdx = source.indexOf('const content = (')
  assert.ok(contentDeclIdx >= 0, 'gemeinsamer content-Block fehlt -- compact und default duerfen keine getrennten Kopien des Grids pflegen')
  const gridIdx = source.indexOf("grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8 md:gap-12 items-start")
  assert.ok(gridIdx > contentDeclIdx, 'Video/Klingt-nach-Grid muss Teil des gemeinsamen content-Blocks sein')
})
