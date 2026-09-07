import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer Paket 3 (individuelle Musiker-
// Description). Testdatei liegt bewusst NICHT unter app/musiker/[slug]/
// selbst (node --test interpretiert "[slug]" als Glob-Zeichenklasse, siehe
// app/musiker/musikerPageDisplay.test.ts) -- Quellpfad wird stattdessen
// relativ von hier aus gelesen.
const pagePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '[slug]', 'page.tsx',
)
const source = readFileSync(pagePath, 'utf8')

test('generateMetadata leitet die Description ueber deriveDescriptionFromText aus person.bio ab', () => {
  assert.match(source, /import \{ deriveDescriptionFromText \} from ['"]@\/lib\/seo\/deriveDescription['"]/)
  assert.match(source, /const description = deriveDescriptionFromText\(person\.bio\) \?\? SITE_DEFAULT_DESCRIPTION/)
})

test('dieselbe description wird fuer normale Meta-Description UND og:description/twitter:description verwendet (keine getrennte Kopie)', () => {
  assert.match(source, /return \{\s*\r?\n\s*title: person\.name,\s*\r?\n\s*description,/)
  const openGraphBlock = source.match(/openGraph:\s*\{[\s\S]*?\}/)?.[0] ?? ''
  const twitterBlock = source.match(/twitter:\s*\{[\s\S]*?\}/)?.[0] ?? ''
  assert.match(openGraphBlock, /description,/)
  assert.match(twitterBlock, /description,/)
})

test('SITE_DEFAULT_DESCRIPTION bleibt als Fallback fuer Personen ohne Bio erhalten (kein erzwungener leerer Description-Fall)', () => {
  assert.match(source, /import \{[^}]*SITE_DEFAULT_DESCRIPTION[^}]*\} from ['"]@\/lib\/seo\/metadata['"]/)
})

test('kein neuer individueller Fliesstext wird im Code formuliert -- description ist ausschliesslich ein Ausdruck (deriveDescriptionFromText(...) ?? SITE_DEFAULT_DESCRIPTION), keine literale Ersatz-Copy', () => {
  const descriptionAssignment = source.match(/const description = .+;/)?.[0] ?? ''
  assert.equal(
    descriptionAssignment,
    "const description = deriveDescriptionFromText(person.bio) ?? SITE_DEFAULT_DESCRIPTION;"
  )
})
