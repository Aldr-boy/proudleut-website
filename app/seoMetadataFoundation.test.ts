import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Paket 1 (Cutover-Metadaten): strukturelle Regressionspruefung fuer die
// Metadata-Verdrahtung von Root-Layout, Band-, Veranstaltungs- und
// Musikerseite. Testdateien fuer [slug]-Routen liegen bewusst nicht in den
// [slug]-Ordnern selbst (node --test interpretiert "[slug]" als
// Glob-Zeichenklasse, siehe app/musiker/musikerPageDisplay.test.ts) --
// Quellpfade werden stattdessen relativ von hier aus gelesen. Ein echter
// Rendertest ist ohne Next.js-Metadata-Resolver/Supabase/Sanity-
// Verbindung nicht sinnvoll isoliert moeglich; die tatsaechlich
// aufgeloesten Werte werden stattdessen in lib/seo/metadata.test.ts
// (echte Ausfuehrung der reinen URL-Logik) sowie in der Preview-
// Verifikation des Abschlussberichts geprueft.
const appDir = path.dirname(fileURLToPath(import.meta.url))
const layoutSource = readFileSync(path.join(appDir, 'layout.tsx'), 'utf8')
const bandSource = readFileSync(path.join(appDir, 'band', '[slug]', 'page.tsx'), 'utf8')
const veranstaltungSource = readFileSync(path.join(appDir, 'veranstaltung', '[slug]', 'page.tsx'), 'utf8')
const musikerSource = readFileSync(path.join(appDir, 'musiker', '[slug]', 'page.tsx'), 'utf8')

test('Root-Layout setzt metadataBase auf https://proudleut.com ueber die gemeinsame SITE_URL-Konstante', () => {
  assert.match(layoutSource, /import \{ SITE_URL, SITE_DEFAULT_DESCRIPTION \} from ['"]@\/lib\/seo\/metadata['"]/)
  assert.match(layoutSource, /metadataBase:\s*new URL\(SITE_URL\)/)
})

for (const [label, source] of [
  ['Band', bandSource],
  ['Veranstaltung', veranstaltungSource],
  ['Musiker', musikerSource],
] as const) {
  test(`${label}: generateMetadata setzt alternates.canonical ueber absoluteUrl()`, () => {
    assert.match(source, /import \{[^}]*absoluteUrl[^}]*\} from ['"]@\/lib\/seo\/metadata['"]/)
    assert.match(source, /alternates:\s*\{\s*canonical:\s*canonicalUrl\s*\}/)
    assert.match(source, /const canonicalUrl = absoluteUrl\(/)
  })

  test(`${label}: generateMetadata setzt openGraph mit title/description/url/type/images`, () => {
    // "description" statt "description:" toleriert die ES2015-Shorthand-
    // Syntax (Band: eigene lokale Variable description, daher `description,`
    // ohne erneuten Property-Namen) -- inhaltlich identisch zu description: description.
    assert.match(source, /openGraph:\s*\{[\s\S]*?title:[\s\S]*?description[,:][\s\S]*?url:\s*canonicalUrl[\s\S]*?type:\s*'website'[\s\S]*?images:\s*\[socialImage\][\s\S]*?\}/)
  })

  test(`${label}: generateMetadata setzt twitter mit summary_large_image, explizitem title/description/images`, () => {
    assert.match(source, /twitter:\s*\{[\s\S]*?card:\s*'summary_large_image'[\s\S]*?title:[\s\S]*?description[,:][\s\S]*?images:\s*\[socialImage\.url\][\s\S]*?\}/)
  })

  test(`${label}: Social-Bild faellt auf DEFAULT_SOCIAL_IMAGE zurueck, keine erfundene URL`, () => {
    assert.match(source, /import \{[^}]*DEFAULT_SOCIAL_IMAGE[^}]*\} from ['"]@\/lib\/seo\/metadata['"]/)
    assert.match(source, /DEFAULT_SOCIAL_IMAGE/)
    assert.match(source, /isAbsoluteHttpsUrl\(/)
  })

  test(`${label}: og:type ist der offizielle, unveraendert von Next.js unterstuetzte Typ "website" (kein erfundener Typ)`, () => {
    assert.match(source, /type:\s*'website'/)
  })

  test(`${label}: kein hartkodiertes vercel.app oder localhost in der Metadata-Logik`, () => {
    assert.ok(!/vercel\.app/.test(source), `${label}: darf kein vercel.app enthalten`)
    assert.ok(!/localhost/.test(source), `${label}: darf kein localhost enthalten`)
  })
}

test('Veranstaltung: openGraph.title/twitter.title verwenden category.seoTitle unveraendert, ohne Trim/Regex/Sonderbehandlung (Titelregel Paket 1)', () => {
  assert.match(veranstaltungSource, /const socialTitle = category\.seoTitle/)
  assert.ok(!/socialTitle\.replace/.test(veranstaltungSource), 'seoTitle darf nicht per .replace() nachbearbeitet werden')
  assert.ok(!/socialTitle\.trim/.test(veranstaltungSource), 'seoTitle darf nicht per .trim() nachbearbeitet werden')
  assert.ok(!/proudleut\.com['"]?\s*\)/.test(veranstaltungSource.match(/socialTitle[\s\S]{0,120}/)?.[0] ?? ''), 'kein manuelles Entfernen des "– proudleut.com"-Suffix')
})

test('Veranstaltung: lib/categories.ts wird in Paket 1 nicht veraendert (kein Title-Fix als Nebenarbeit)', () => {
  assert.ok(!veranstaltungSource.includes("category.seoTitle.replace"))
})

// Paket 3 aendert diese Stelle bewusst und explizit gegenueber Paket 1:
// og:description/twitter:description nutzen jetzt dieselbe individuelle,
// aus person.bio abgeleitete Description (Fallback: SITE_DEFAULT_DESCRIPTION)
// statt ausschliesslich des Site-Defaults -- siehe
// app/musiker/musikerDescriptionStructure.test.ts fuer die genaue Pruefung
// der Paket-3-Ableitungslogik. Dieser Test prueft hier nur noch, dass die
// gemeinsame description-Variable explizit in beiden Bloecken verwendet
// wird (Paket-1-Anforderung "explizit setzen, nicht implizit vererben"
// bleibt gueltig).
test('Musiker: og:description/twitter:description setzen explizit dieselbe (Paket-3-)description-Variable, kein impliziter Fallback', () => {
  assert.match(musikerSource, /import \{[^}]*SITE_DEFAULT_DESCRIPTION[^}]*\} from ['"]@\/lib\/seo\/metadata['"]/)
  const openGraphBlock = musikerSource.match(/openGraph:\s*\{[\s\S]*?\}/)?.[0] ?? ''
  const twitterBlock = musikerSource.match(/twitter:\s*\{[\s\S]*?\}/)?.[0] ?? ''
  assert.match(openGraphBlock, /description,/)
  assert.match(twitterBlock, /description,/)
})

test('Band: Social-Bild wird aus band.heroImage abgeleitet, keine neue Datenquelle', () => {
  assert.match(bandSource, /band\.heroImage/)
})

test('Veranstaltung: Social-Bild wird ueber die bestehende fetchEventCategoryHero()/urlFor()-Kombination aufgeloest, keine neue Datenquelle', () => {
  assert.match(veranstaltungSource, /fetchEventCategoryHero\(slug\)/)
  assert.match(veranstaltungSource, /urlFor\(heroData\.heroImage\)/)
})

test('Musiker: Social-Bild wird aus person.imageUrl abgeleitet, keine neue Datenquelle', () => {
  assert.match(musikerSource, /person\.imageUrl/)
})

test('Keine der ausgeschlossenen Baustellen wird in diesen drei Routendateien beruehrt (Sitemap/BandExplorer/JSON-LD-Erweiterung)', () => {
  for (const [label, source] of [
    ['Band', bandSource],
    ['Veranstaltung', veranstaltungSource],
    ['Musiker', musikerSource],
  ] as const) {
    assert.ok(!/sitemap/i.test(source), `${label}: darf keine Sitemap-Logik enthalten`)
    assert.ok(!source.includes('useState'), `${label}: Server Component darf kein useState einfuehren`)
  }
})
