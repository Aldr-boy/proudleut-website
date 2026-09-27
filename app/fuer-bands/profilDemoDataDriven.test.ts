import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die Profil-Demo auf /fuer-bands
// (Auftrag "Profil-Demo an neues Bandprofil angleichen"): die Demo laedt
// das echte San2-Profil ueber denselben Weg wie /band/[slug], statt eigene
// Profildaten zu pflegen. Kein jsdom im Repo -- gleiches Textmuster wie die
// uebrigen strukturellen Bandprofil-Tests.
const source = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'page.tsx'),
  'utf8',
)

test('laedt San2 ueber denselben Datenpfad wie die echte Bandseite (getBandFromSupabase + normalizeBandFromSupabase)', () => {
  assert.match(source, /import \{ getBandFromSupabase \} from '@\/lib\/supabase\/queries'/)
  assert.match(source, /import \{ normalizeBandFromSupabase \} from '@\/lib\/supabase\/normalizeBand'/)
  assert.match(source, /getBandFromSupabase\(DEMO_BAND_SLUG\)/)
  assert.match(source, /const DEMO_BAND_SLUG = 'san2-and-his-soul-patrol';/)
})

test('keine hart codierten Profilwerte mehr (SAN2_KLINGT_NACH/SAN2_STIL_EINFLUESSE/SAN2_META/"Blues"-Badge)', () => {
  assert.doesNotMatch(source, /SAN2_KLINGT_NACH/)
  assert.doesNotMatch(source, /SAN2_STIL_EINFLUESSE/)
  assert.doesNotMatch(source, /SAN2_META/)
  assert.doesNotMatch(source, />\s*Blues\s*</)
})

test('Demo-Section entfaellt sauber, wenn die Band nicht gefunden/aktiv ist -- kein ungeschuetzter Zugriff auf demoBand', () => {
  assert.match(source, /\{demoBand && \(/)
  // getBandFromSupabase filtert bereits auf status='active' -- demoBand
  // ist dann null, kein zusaetzlicher eigener Status-Check noetig.
  assert.match(source, /const demoBand = demoBandData \? normalizeBandFromSupabase\(demoBandData\) : null;/)
})

test('kein JSON-LD fuer San2 auf /fuer-bands', () => {
  assert.doesNotMatch(source, /generateBandJsonLd/)
  assert.doesNotMatch(source, /application\/ld\+json/)
})

test('keine Anfrage-/Merklisten-Buttons oder -Logik in der Demo', () => {
  assert.doesNotMatch(source, /<AnfrageButton|<MerkButton|<HeroCTA/)
  assert.doesNotMatch(source, /Band über proudleut anfragen/)
  assert.doesNotMatch(source, /Band merken/)
})

test('kein zusaetzliches <h1> durch die Demo -- weiterhin nur die eine Seiten-H1, keine BandChapterHeading-Nummerierung in der Demo-Karte', () => {
  const h1Matches = source.match(/<h1\b/g) ?? []
  assert.equal(h1Matches.length, 1, 'die Profil-Demo darf keine zusaetzliche <h1> einfuehren')
  assert.doesNotMatch(source, /BandChapterHeading/)
})

test('nutzt BandVideoSection im compact-Modus und BandEventTypesPills im dark-Modus (echte Bandseiten-Komponenten statt Kopien)', () => {
  assert.match(source, /import \{ BandVideoSection \} from '@\/components\/band\/BandVideoSection'/)
  assert.match(source, /<BandVideoSection band=\{demoBand\} embedUrl=\{demoEmbedUrl\} variant="compact" \/>/)
  assert.match(source, /import \{ BandEventTypesPills \} from '@\/components\/band\/BandEventTypesPills'/)
  assert.match(source, /variant="dark"/)
  assert.match(source, /import \{ BandDocumentsSection \} from '@\/components\/band\/BandDocumentsSection'/)
})

test('Zitatsatz kommt aus shortDescriptionExplicit, nie aus dem main_text-gekuerzten shortDescription', () => {
  assert.match(source, /demoBand\.shortDescriptionExplicit/)
  assert.doesNotMatch(source, /demoBand\.shortDescription\b(?!Explicit)/)
})

test('Link am Ende der Demo fuehrt auf das echte Profil', () => {
  assert.match(source, /href=\{`\/band\/\$\{demoBand\.slug\}`\}/)
  assert.match(source, /Ganzes Profil von \{demoBand\.name\} ansehen/)
})

test('Fussnote "Beispielprofil" bleibt erhalten', () => {
  assert.match(source, /Beispielprofil — jedes Profil auf proudleut wird individuell aufgebaut\./)
})
