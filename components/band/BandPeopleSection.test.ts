import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer BandPeopleSection.tsx (Auftrag
// "Bandseiten: Musikerprofile auf den Personenkarten verlinken"). Ein
// echter Rendertest ist in diesem Projekt ohne React-Test-Harness nicht
// eingerichtet -- identisches Prinzip wie components/band/
// bandHeroLogoAspectRatio.test.ts und lib/bands/bandDetailPageDisplay.test.ts.
const componentPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'BandPeopleSection.tsx',
)
const source = readFileSync(componentPath, 'utf8')

test('kein Klickbereich ueber die gesamte Karte -- die Kartenhuelle ist kein <Link> mehr', () => {
  assert.match(source, /<div className="flex items-center gap-4 rounded-xl border border-pl-soft bg-white p-4">/)
})

test('Name verlinkt auf /musiker/[slug], wenn ein Profil existiert', () => {
  assert.match(source, /hasProfile \? \(\s*<Link\s+href=\{`\/musiker\/\$\{person\.slug\}`\}/)
})

test('separater "Mehr über [Name]"-Textlink verweist ebenfalls auf /musiker/[slug] (identischer Wortlaut wie auf /musiker)', () => {
  assert.match(source, /Mehr über \{person\.name\}/)
  assert.ok(!source.includes('Musikerprofil ansehen'), 'der alte Linktext darf nicht mehr vorkommen')
  const linkBlocks = [...source.matchAll(/<Link\s+href=\{`\/musiker\/\$\{person\.slug\}`\}[^]*?<\/Link>/g)]
  assert.equal(linkBlocks.length, 2, 'Name und "Mehr über [Name]" muessen zwei eigenstaendige Links sein')
})

test('Pfeil ist rein dekorativ (aria-hidden), kein zusaetzliches aria-label auf den Personenkarten-Links', () => {
  assert.match(source, /<span aria-hidden="true">→<\/span>/)
  assert.ok(!source.includes('aria-label'), 'keine identischen Screenreader-Texte durch unnoetige aria-labels')
})

test('sichtbarer Tastaturfokus bleibt erhalten (focus-visible-Ring auf beiden Links)', () => {
  assert.match(source, /FOCUS_RING/)
  assert.match(source, /focus-visible:outline-2/)
})

test('Referenzzeile nutzt die deterministische, bestehende Formatierung (kein neuer Ranking-Code)', () => {
  assert.match(source, /import \{ formatBandPersonCreditsLine \} from ['"]@\/lib\/bands\/bandPersonCreditsLine['"]/)
  assert.match(source, /formatBandPersonCreditsLine\(person\.credits\)/)
})

test('keine leere Referenzzeile ohne Credits -- bedingtes Rendering', () => {
  assert.match(source, /\{creditsLine && \(/)
})

test('Person ohne Musikerprofil (hasProfile=false) bleibt unverlinkt -- Fallback auf einfachen Text', () => {
  assert.match(source, /<p className="font-semibold text-pl-text truncate">\{person\.name\}<\/p>/)
})

test('"Mehr über [Name]"-Link wird nur bei vorhandenem Profil gerendert', () => {
  assert.match(source, /\{hasProfile && \(\s*<Link/)
})
