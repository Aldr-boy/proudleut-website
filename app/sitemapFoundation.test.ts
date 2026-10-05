import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Paket 2 (Sitemap): strukturelle Regressionspruefung fuer app/sitemap.ts
// und public/robots.txt. Die eigentliche Bau-/Dedupe-/Sortierlogik wird
// bereits mit echten Ausfuehrungstests gegen Fixtures in
// lib/seo/buildSitemap.test.ts geprueft (kein Netzwerk noetig); hier geht
// es nur um die Verdrahtung: welche bereits bestehenden Read-Pfade
// app/sitemap.ts tatsaechlich verwendet, und dass robots.txt korrekt
// ergaenzt wurde.
const appDir = path.dirname(fileURLToPath(import.meta.url))
const sitemapSource = readFileSync(path.join(appDir, 'sitemap.ts'), 'utf8')
const robotsSource = readFileSync(path.join(appDir, 'robots.ts'), 'utf8')
const bandVorstellenSource = readFileSync(
  path.join(appDir, 'fuer-bands', 'band-vorstellen', 'page.tsx'),
  'utf8'
)

test('app/sitemap.ts nutzt die bestehende, bereits status=active-gefilterte Bandquelle (keine neue parallele Query)', () => {
  assert.match(sitemapSource, /import \{ getAllBandsFromSupabase \} from ['"]@\/lib\/supabase\/queries['"]/)
})

test('app/sitemap.ts nutzt die bestehende RLS-geschuetzte Personen-Listenquelle (keine neue parallele Query)', () => {
  assert.match(sitemapSource, /import \{ getAllPublicPeopleSlugsFromSupabase \} from ['"]@\/lib\/people\/publicQueries['"]/)
})

test('app/sitemap.ts nutzt CATEGORIES als Source of Truth fuer Veranstaltungen, keine hartkodierte Kategorienzahl', () => {
  assert.match(sitemapSource, /import \{ CATEGORIES \} from ['"]@\/lib\/categories['"]/)
  assert.ok(!/CATEGORIES\.slice\(0,\s*8\)/.test(sitemapSource))
  assert.ok(!/\b8\b.*[Kk]ategorie/.test(sitemapSource))
})

test('app/sitemap.ts delegiert den eigentlichen Aufbau an buildSitemapEntries (reine, getestete Logik)', () => {
  assert.match(sitemapSource, /import \{ buildSitemapEntries \} from ['"]@\/lib\/seo\/buildSitemap['"]/)
  assert.match(sitemapSource, /return buildSitemapEntries\(/)
})

test('app/sitemap.ts fasst BandExplorer/useState nicht an (Paket 3 bleibt unangetastet)', () => {
  assert.ok(!sitemapSource.includes('BandExplorer'))
  assert.ok(!sitemapSource.includes('useState'))
})

test('app/robots.ts leitet den Sitemap-Verweis aus SITE_URL ab (https://www.proudleut.com/sitemap.xml)', () => {
  assert.match(robotsSource, /sitemap:\s*`\$\{SITE_URL\}\/sitemap\.xml`/)
})

test('app/robots.ts behaelt die bestehenden Regeln (Allow: /, Disallow: /studio)', () => {
  assert.match(robotsSource, /allow:\s*'\/'/)
  assert.match(robotsSource, /disallow:\s*'\/studio'/)
})

test('/fuer-bands/band-vorstellen bleibt per robots-Metadata von der Indexierung ausgeschlossen (Begruendung fuer den Sitemap-Ausschluss)', () => {
  assert.match(bandVorstellenSource, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/)
})
