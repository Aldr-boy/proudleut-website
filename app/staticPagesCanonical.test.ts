import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Auftrag "Fehlende Canonicals vor dem Domain-Cutover beheben": strukturelle
// Regressionspruefung fuer die neu ergaenzten Canonicals auf den bisher
// nicht abgedeckten statischen Routen. Identisches Prinzip wie
// app/seoMetadataFoundation.test.ts -- kein echter Next.js-Metadata-
// Rendertest (ohne Request-Kontext nicht sinnvoll isoliert moeglich),
// stattdessen Quelltext-Assertions auf die tatsaechlich verwendeten
// Pfade/Importe.
const appDir = path.dirname(fileURLToPath(import.meta.url))
const readApp = (...segments: string[]) => readFileSync(path.join(appDir, ...segments), 'utf8')

const homeSource = readApp('page.tsx')
const bandsSource = readApp('bands', 'page.tsx')
const kontaktSource = readApp('kontakt', 'page.tsx')
const fuerBandsLayoutSource = readApp('fuer-bands', 'layout.tsx')
const fuerBandsPageSource = readApp('fuer-bands', 'page.tsx')
const bandVorstellenSource = readApp('fuer-bands', 'band-vorstellen', 'page.tsx')
const ueberMichLayoutSource = readApp('ueber-mich', 'layout.tsx')
const ueberMichPageSource = readApp('ueber-mich', 'page.tsx')
const rootLayoutSource = readApp('layout.tsx')
const nextConfigSource = readFileSync(path.join(appDir, '..', 'next.config.ts'), 'utf8')

for (const [label, source, expectedPath] of [
  ['Startseite (app/page.tsx)', homeSource, "'/'"],
  ['/bands', bandsSource, "'/bands'"],
  ['/kontakt', kontaktSource, "'/kontakt'"],
  ['/fuer-bands (Segment-Layout)', fuerBandsLayoutSource, "'/fuer-bands'"],
  ['/ueber-mich (Segment-Layout)', ueberMichLayoutSource, "'/ueber-mich'"],
  ['/fuer-bands/band-vorstellen (self-referenzierend)', bandVorstellenSource, "'/fuer-bands/band-vorstellen'"],
] as const) {
  test(`${label}: importiert absoluteUrl aus lib/seo/metadata und setzt alternates.canonical darauf`, () => {
    assert.match(source, /import \{[^}]*absoluteUrl[^}]*\} from ['"]@\/lib\/seo\/metadata['"]/)
    assert.match(source, /alternates:\s*\{\s*canonical:\s*absoluteUrl\(/)
  })

  test(`${label}: Canonical-Pfad entspricht exakt dem erwarteten Sitemap-Pfad (${expectedPath})`, () => {
    const re = new RegExp(`alternates:\\s*\\{\\s*canonical:\\s*absoluteUrl\\(${expectedPath}\\)\\s*\\}`)
    assert.match(source, re)
  })
}

test('app/page.tsx: keine Domain im metadata-Objekt hartkodiert (der begleitende Kommentar darf proudleut.com zu Dokumentationszwecken nennen)', () => {
  const metadataBlock = homeSource.match(/export const metadata:[\s\S]*?\n\};/)?.[0] ?? ''
  assert.ok(metadataBlock.length > 0, 'metadata-Objekt nicht gefunden')
  assert.ok(!metadataBlock.includes('proudleut.com'), 'Startseite darf keine Domain im metadata-Objekt hartkodieren')
})

test('app/fuer-bands/page.tsx bleibt unveraendert ohne eigenes alternates (WIP-Datei nicht angefasst)', () => {
  assert.ok(!fuerBandsPageSource.includes('alternates'), 'page.tsx darf kein eigenes alternates setzen, sonst wuerde es das Segment-Layout ueberschreiben')
})

test('app/ueber-mich/page.tsx bleibt unveraendert ohne eigenes alternates (WIP-Datei nicht angefasst)', () => {
  assert.ok(!ueberMichPageSource.includes('alternates'), 'page.tsx darf kein eigenes alternates setzen, sonst wuerde es das Segment-Layout ueberschreiben')
})

test('Segment-Layouts (fuer-bands/ueber-mich) sind reine Passthrough-Layouts ohne zusaetzliches DOM-Element', () => {
  for (const [label, source] of [
    ['fuer-bands', fuerBandsLayoutSource],
    ['ueber-mich', ueberMichLayoutSource],
  ] as const) {
    assert.match(source, /return children;?\s*\}?\s*$/m, `${label}: Layout muss children direkt zurueckgeben (kein Wrapper-Element -> keine sichtbare Layoutaenderung)`)
  }
})

test('/fuer-bands/band-vorstellen: eigener Canonical unterscheidet sich vom Segment-Canonical (kein faelschlich geerbter Wert)', () => {
  assert.match(bandVorstellenSource, /absoluteUrl\('\/fuer-bands\/band-vorstellen'\)/)
  assert.ok(!/absoluteUrl\('\/fuer-bands'\)/.test(bandVorstellenSource), 'band-vorstellen darf nicht den Eltern-Canonical uebernehmen')
})

test('/fuer-bands/band-vorstellen: robots noindex/nofollow bleibt unveraendert erhalten', () => {
  assert.match(bandVorstellenSource, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/)
})

test('Root-Layout setzt weiterhin KEIN pauschales alternates fuer alle Seiten (nur metadataBase)', () => {
  assert.ok(!rootLayoutSource.includes('alternates'), 'Root-Layout darf kein globales alternates setzen -- jede Route bestimmt ihren eigenen Canonical')
})

test('next.config.ts: die Vercel-Host-spezifische X-Robots-Tag-Regel bleibt unveraendert (Canonical-Aenderung beeinflusst sie nicht)', () => {
  assert.match(nextConfigSource, /type:\s*'host',\s*\r?\n\s*value:\s*'\.\*\\\\\.vercel\\\\\.app'/)
  assert.match(nextConfigSource, /key:\s*'X-Robots-Tag',\s*\r?\n\s*value:\s*'noindex, nofollow, noarchive'/)
})

test('Bereits korrekte Canonicals (Musikerprofile/Band/Veranstaltung/Impressum/Datenschutz) werden von diesem Auftrag nicht beruehrt', () => {
  const musikerSource = readApp('musiker', '[slug]', 'page.tsx')
  const bandSource = readApp('band', '[slug]', 'page.tsx')
  const veranstaltungSource = readApp('veranstaltung', '[slug]', 'page.tsx')
  const impressumSource = readApp('impressum', 'page.tsx')
  const datenschutzSource = readApp('datenschutz', 'page.tsx')

  assert.match(musikerSource, /alternates:\s*\{\s*canonical:\s*canonicalUrl\s*\}/)
  assert.match(bandSource, /alternates:\s*\{\s*canonical:\s*canonicalUrl\s*\}/)
  assert.match(veranstaltungSource, /alternates:\s*\{\s*canonical:\s*canonicalUrl\s*\}/)
  assert.match(impressumSource, /alternates:\s*\{\s*canonical:\s*'\/impressum',?\s*\}/)
  assert.match(datenschutzSource, /alternates:\s*\{\s*canonical:\s*'\/datenschutz',?\s*\}/)
})

test('/admin und /studio erhalten weiterhin keine eigenen Layout-/Page-Canonicals aus diesem Auftrag', () => {
  assert.ok(!existsSync(path.join(appDir, 'admin', 'layout.canonical.tsx')))
  const adminLayoutSource = readApp('admin', 'layout.tsx')
  const studioPageSource = readApp('studio', '[[...tool]]', 'page.tsx')
  assert.ok(!adminLayoutSource.includes('absoluteUrl'), '/admin darf keinen neuen Canonical bekommen')
  assert.ok(!studioPageSource.includes('absoluteUrl'), '/studio darf keinen neuen Canonical bekommen')
})
