import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer den Homepage-Hero-Cutover (Paket 2,
// SCHRITT 2D): app/page.tsx muss die echte, gemeinsame HeroWall-Komponente
// verwenden (dieselbe wie die Admin-Live-Vorschau), ueber dieselbe
// gemeinsame Datenzugriffsstelle lesen und HeroMosaic nicht mehr aktiv
// einbinden -- HeroMosaic.tsx selbst bleibt dabei unangetastet im Repo
// (siehe heroMosaicChips.test.ts / heroMosaicMobileHeight.test.ts, die
// weiterhin gegen die unveraenderte Datei pruefen).
const dir = path.dirname(fileURLToPath(import.meta.url))
const pageSource = readFileSync(path.join(dir, 'page.tsx'), 'utf8')
const heroContentSource = readFileSync(path.join(dir, '..', 'components', 'homepage', 'HeroContent.tsx'), 'utf8')

test('Homepage verwendet die echte HeroWall-Komponente aus components/hero, keine eigene Kopie', () => {
  assert.match(pageSource, /import \{ HeroWall \} from '@\/components\/hero\/HeroWall'/)
  assert.match(pageSource, /<HeroWall images=\{heroPool\}>/)
})

test('Homepage liest den Hero-Pool ueber die bestehende gemeinsame Datenzugriffsstelle, keine zweite Query-Logik', () => {
  assert.match(pageSource, /import \{ fetchHeroWallPool \} from '@\/lib\/heroWall\/fetchHeroWallPool'/)
  assert.match(pageSource, /fetchHeroWallPool\(\)/)
  assert.doesNotMatch(pageSource, /\.from\('media_assets'\)/, 'keine eigene media_assets-Query auf der Homepage, nur ueber fetchHeroWallPool')
})

test('HeroMosaic ist auf der Homepage nicht mehr aktiv eingebunden', () => {
  assert.doesNotMatch(pageSource, /from ['"]@\/components\/homepage\/HeroMosaic['"]/)
  assert.doesNotMatch(pageSource, /<HeroMosaic/)
})

test('bestehender Hero-Content (Claim/CTA) wird als children in HeroWall eingehaengt, keine neue Wall-Innenstruktur', () => {
  assert.match(pageSource, /<HeroContent \/>/)
  const wallStart = pageSource.indexOf('<HeroWall images={heroPool}>')
  const wallEnd = pageSource.indexOf('</HeroWall>')
  assert.ok(wallStart >= 0 && wallEnd > wallStart, 'HeroWall-Block nicht gefunden')
  const wallBody = pageSource.slice(wallStart, wallEnd)
  assert.match(wallBody, /<HeroContent \/>/)
})

test('HeroContent uebernimmt Text/Claim/CTA unveraendert (H1, Anlass-Pills, Alle-Bands-Link)', () => {
  assert.match(heroContentSource, />\s*Livebands für dein Event\.\s*</)
  assert.match(heroContentSource, /'Hochzeit'/)
  assert.match(heroContentSource, /'Firmenfeier & Business Event'/)
  assert.match(heroContentSource, /'Festzelt'/)
  assert.match(heroContentSource, /href="\/bands"/)
  assert.match(heroContentSource, /Alle Bands ansehen/)
})

test('HeroContent implementiert keine eigene Grid-/Slot-/Offset-Logik (reiner Text-/Button-Inhalt)', () => {
  for (const forbidden of ['buildHeroWallSlots', 'splitIntoColumns', 'grid-cols-5', 'COLUMN_META', 'aspect-[5/6]']) {
    assert.doesNotMatch(heroContentSource, new RegExp(forbidden.replace(/[[\]/]/g, '\\$&')), `HeroContent darf "${forbidden}" nicht enthalten`)
  }
})
