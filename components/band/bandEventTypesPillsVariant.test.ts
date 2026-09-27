import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer BandEventTypesPills.tsx, ausgelagert
// aus BandTagsSection.tsx (Auftrag "Profil-Demo /fuer-bands an neues
// Bandprofil angleichen") -- variant="light" muss die "Spielt bei"-Pills
// der echten Bandseite unveraendert reproduzieren, variant="dark" ist die
// zusaetzliche Optik fuer die dunkle Profil-Demo-Karte. Kein jsdom im
// Repo -- gleiches Textmuster wie die uebrigen Bandprofil-Tests.
const dir = path.dirname(fileURLToPath(import.meta.url))
const pillsSource = readFileSync(path.join(dir, 'BandEventTypesPills.tsx'), 'utf8')
const tagsSectionSource = readFileSync(path.join(dir, 'BandTagsSection.tsx'), 'utf8')

test('leeres eventTypes-Array -> keine Pills (return null)', () => {
  assert.match(pillsSource, /if \(eventTypes\.length === 0\) return null;/)
})

test('variant="light" ist der Default und reproduziert exakt die bisherige Pill-Optik (border-pl-soft, text-pl-text-muted)', () => {
  assert.match(pillsSource, /variant = 'light'/)
  assert.match(pillsSource, /border-pl-soft/)
  assert.match(pillsSource, /text-pl-text-muted/)
})

test('variant="dark" nutzt andere, dunkle Token (border-white\\/20, text-pl-on-stage-muted, text-pl-accent-light) statt der hellen Werte', () => {
  assert.match(pillsSource, /border-white\/20/)
  assert.match(pillsSource, /text-pl-on-stage-muted/)
  assert.match(pillsSource, /hover:text-pl-accent-light/)
})

test('BandTagsSection.tsx nutzt BandEventTypesPills mit variant="light" statt eigener Pill-Logik (kein doppelter PILL-Code mehr)', () => {
  assert.match(
    tagsSectionSource,
    /<BandEventTypesPills eventTypes=\{band\.eventTypes\} categorySlugs=\{band\.categorySlugs\} variant="light" \/>/
  )
  assert.doesNotMatch(tagsSectionSource, /const PILL =/, 'die alte, lokale PILL-Konstante darf nicht wieder auftauchen')
})

test('Kategorie-Zuordnung weiterhin ausschliesslich ueber findCategoryForEventTypeSlug (keine Namens-/Slug-Heuristik)', () => {
  assert.match(pillsSource, /import \{ findCategoryForEventTypeSlug \} from '\.\/bandTagsCategoryMatch'/)
  assert.match(pillsSource, /findCategoryForEventTypeSlug\(eventTypeSlug\)/)
})
