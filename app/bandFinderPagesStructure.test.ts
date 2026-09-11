import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die beiden Seiten, die den neuen
// gemeinsamen Bandfinder-Suchkopf einbinden (Auftrag "Bandfinder-
// Redesign"). Testdatei liegt bewusst nicht unter app/veranstaltung/[slug]/
// selbst (node --test interpretiert "[slug]" als Glob-Zeichenklasse, siehe
// app/musiker/musikerPageDisplay.test.ts) -- Quellpfad wird stattdessen
// relativ von hier aus gelesen.
const appDir = path.dirname(fileURLToPath(import.meta.url))
const bandsSource = readFileSync(path.join(appDir, 'bands', 'page.tsx'), 'utf8')
const veranstaltungSource = readFileSync(path.join(appDir, 'veranstaltung', '[slug]', 'page.tsx'), 'utf8')

test('/bands: alter grosser Bild-Hero (BandsHero) ist nicht mehr importiert/gerendert', () => {
  assert.ok(!/import BandsHero from/.test(bandsSource), 'BandsHero darf auf /bands nicht mehr importiert werden')
  assert.ok(!/<BandsHero/.test(bandsSource), 'BandsHero darf auf /bands nicht mehr gerendert werden')
  assert.ok(!bandsSource.includes('fetchBandsPageFeaturedSlider'))
})

for (const [label, source] of [
  ['/bands', bandsSource],
  ['/veranstaltung/[slug]', veranstaltungSource],
] as const) {
  test(`${label}: nutzt den gemeinsamen BandFinderPageHead statt eigenem Hero-Markup`, () => {
    assert.match(source, /import \{ BandFinderPageHead \} from ['"]@\/components\/bands\/BandFinderPageHead['"]/)
    assert.match(source, /<BandFinderPageHead/)
  })

  test(`${label}: loest Themen-Bilder serverseitig ueber getBandFinderThemeImages() auf und reicht sie an BandExplorer durch`, () => {
    assert.match(source, /import \{ getBandFinderThemeImages \} from ['"]@\/lib\/bands\/bandFinderThemeImages['"]/)
    assert.match(source, /getBandFinderThemeImages\(\)/)
    assert.match(source, /themeImages=\{themeImages\}/)
  })

  test(`${label}: H1 bleibt serverseitig gerendert (SEO unveraendert)`, () => {
    assert.match(source, /<BandFinderPageHead[\s\S]*?h1=/)
  })
}

test('/veranstaltung/[slug]: Untertiteltext (heroData.subtitle bzw. category.description) bleibt erhalten, nur das Hintergrundbild entfaellt', () => {
  assert.match(veranstaltungSource, /const subtitleText = heroData\?\.subtitle \?\? category\.description \?\? null;/)
  assert.match(veranstaltungSource, /intro=\{subtitleText\}/)
})

test('/veranstaltung/[slug]: "Zurueck zur Banduebersicht"-Link bleibt erhalten', () => {
  assert.match(veranstaltungSource, /backHref="\/bands"/)
})

test('/veranstaltung/[slug]: generateMetadata (Canonical/OG/Twitter, Paket 1) bleibt unveraendert -- keine Aenderung an der Social-Bild-Logik', () => {
  assert.match(veranstaltungSource, /const heroData = await fetchEventCategoryHero\(slug\);\s*\r?\n\s*const heroImageUrl = heroData/)
})
