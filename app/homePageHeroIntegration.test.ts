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

// Startseiten-Hero-Redesign: neuer, verbindlicher Text (Auftrag
// Abschnitt 3) ersetzt den bisherigen Claim/die Anlass-Pills/den
// "Alle Bands ansehen"-Link vollstaendig.
test('HeroContent zeigt den neuen verbindlichen Text/CTA (Eyebrow, H1, Subtext, einziger primaerer CTA "Bands entdecken")', () => {
  assert.match(heroContentSource, />\s*In und um Bayern\s*</)
  assert.match(heroContentSource, /Livebands für/)
  assert.match(heroContentSource, />euren Moment\.</)
  assert.match(heroContentSource, /Für eure Hochzeit, Firmenfeier oder ein Fest, das in Erinnerung bleibt\./)
  assert.match(heroContentSource, /href="\/bands"/)
  assert.match(heroContentSource, /Bands entdecken/)
})

test('HeroContent laesst die abgeloesten Elemente (Anlass-Pills, "Was hast du vor?", "Alle Bands ansehen", Claim-Zeile) weg', () => {
  for (const removed of ['Was hast du vor', 'Alle Bands ansehen', 'Firmenfeier & Business Event', 'Handverlesen']) {
    assert.doesNotMatch(heroContentSource, new RegExp(removed), `HeroContent darf "${removed}" nicht mehr enthalten`)
  }
})

test('HeroContent implementiert keine eigene Grid-/Slot-/Offset-Logik (reiner Text-/Button-Inhalt)', () => {
  for (const forbidden of ['buildHeroWallTracks', 'TrackSet', 'aspect-[3/4]', 'pl-hero-float']) {
    assert.doesNotMatch(heroContentSource, new RegExp(forbidden.replace(/[[\]/]/g, '\\$&')), `HeroContent darf "${forbidden}" nicht enthalten`)
  }
})
