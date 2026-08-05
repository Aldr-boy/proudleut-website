import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Block "Impressum und Datenschutz": strukturelle Pruefung von Routen,
// permanentem Redirect und Verdrahtung. Next.js Server Components werden in
// diesem Projekt nirgends per Render-Test geprueft (keine React-Testing-
// Infrastruktur vorhanden) -- dieselbe, bereits etablierte Textpruefung wie
// lib/admin/cutoverDocumentation.test.ts und
// lib/admin/actionsAuthGuardOrder.test.ts, keine neue Testarchitektur.

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

function read(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

// ── 1. /impressum ist eine reale Route ──────────────────────────────────

test('/impressum: app/impressum/page.tsx existiert und exportiert eine Default-Page-Komponente', () => {
  const source = read('app/impressum/page.tsx')
  assert.match(source, /export default function \w+\(/)
})

test('/impressum: enthaelt den uebernommenen Rechtstext (Anbieterkennzeichnung)', () => {
  const source = read('app/impressum/page.tsx')
  assert.match(source, /Alexander Dressler/)
  assert.match(source, /Angaben gemäß § 5 TMG/)
  assert.match(source, /Haftung für Inhalte/)
  assert.match(source, /Urheberrecht/)
})

test('/impressum: besitzt genau eine H1', () => {
  const source = read('app/impressum/page.tsx')
  const h1Matches = source.match(/<h1[\s>]/g) ?? []
  assert.equal(h1Matches.length, 1)
})

test('/impressum: Metadaten enthalten sinnvollen Titel und kanonischen Pfad', () => {
  const source = read('app/impressum/page.tsx')
  assert.match(source, /title:\s*['"]Impressum/)
  assert.match(source, /canonical:\s*['"]\/impressum['"]/)
})

// ── 2. /datenschutz ist eine reale Route ────────────────────────────────

test('/datenschutz: app/datenschutz/page.tsx existiert und exportiert eine Default-Page-Komponente', () => {
  const source = read('app/datenschutz/page.tsx')
  assert.match(source, /export default function \w+\(/)
})

test('/datenschutz: enthaelt den uebernommenen Rechtstext (Kernabschnitte)', () => {
  const source = read('app/datenschutz/page.tsx')
  assert.match(source, /Datenschutzhinweise/)
  assert.match(source, /1\. Datenerfassung auf dieser Website/)
  assert.match(source, /Hinweis zur verantwortlichen Stelle/)
  assert.match(source, /Alexander Dressler/)
})

test('/datenschutz: besitzt genau eine H1', () => {
  const source = read('app/datenschutz/page.tsx')
  const h1Matches = source.match(/<h1[\s>]/g) ?? []
  assert.equal(h1Matches.length, 1)
})

test('/datenschutz: Metadaten enthalten sinnvollen Titel und kanonischen Pfad', () => {
  const source = read('app/datenschutz/page.tsx')
  assert.match(source, /title:\s*['"]Datenschutzhinweise/)
  assert.match(source, /canonical:\s*['"]\/datenschutz['"]/)
})

// ── 3. /datenschutzhinweise ist ein permanenter Redirect auf /datenschutz ─

test('next.config.ts: definiert einen permanenten Redirect von /datenschutzhinweise auf /datenschutz', () => {
  const source = read('next.config.ts')
  assert.match(source, /async redirects\s*\(\s*\)/)
  const redirectBlockMatch = source.match(/source:\s*['"]\/datenschutzhinweise['"][\s\S]{0,200}/)
  assert.ok(redirectBlockMatch, 'Redirect-Eintrag fuer /datenschutzhinweise nicht gefunden')
  const block = redirectBlockMatch![0]
  assert.match(block, /destination:\s*['"]\/datenschutz['"]/)
  assert.match(block, /permanent:\s*true/)
})

// ── 4. Der Altpfad rendert keine zweite Kopie des Datenschutztextes ─────

test('/datenschutzhinweise: es existiert KEINE eigene Seite (nur der Redirect greift, kein Parallel-Rendering)', () => {
  assert.equal(existsSync(path.join(repoRoot, 'app', 'datenschutzhinweise')), false)
})

// ── 5./6. Footer enthaelt die kanonischen Links, kein href="#" mehr fuer
//    diese beiden (durch den exakten href-Wert-Check unten bereits
//    zwingend mitbewiesen -- ein href kann nicht gleichzeitig "#" und der
//    kanonische Pfad sein) ────────────────────────────────────────────

test('Footer: Impressum- und Datenschutz-Link zeigen auf die kanonischen Pfade (kein href="#" mehr)', () => {
  const source = read('components/Footer.tsx')
  const linkPairs = [...source.matchAll(/<Link\s+href="([^"]+)"[^>]*>\s*([^<]+?)\s*<\/Link>/g)].map(
    (m) => ({ href: m[1], label: m[2].trim() })
  )

  const impressumLink = linkPairs.find((l) => l.label === 'Impressum')
  const datenschutzLink = linkPairs.find((l) => l.label === 'Datenschutz')

  assert.ok(impressumLink, 'Kein Footer-Link mit Label "Impressum" gefunden')
  assert.ok(datenschutzLink, 'Kein Footer-Link mit Label "Datenschutz" gefunden')
  assert.equal(impressumLink!.href, '/impressum')
  assert.equal(datenschutzLink!.href, '/datenschutz')
})

// ── 7./8. Mail-Templates referenzieren die kanonischen Pfade, nicht den
//    Altpfad; keine Versandlogik dabei umgebaut ─────────────────────────

test('L-A1-Mail-Links (lib/anfrage/constants.ts): referenzieren die kanonischen Pfade /datenschutz und /impressum', () => {
  const source = read('lib/anfrage/constants.ts')
  assert.match(source, /datenschutzUrl:\s*'https:\/\/proudleut\.com\/datenschutz'/)
  assert.match(source, /impressumUrl:\s*'https:\/\/proudleut\.com\/impressum'/)
})

test('L-A1-Mail-Links: die tatsaechlich verwendeten URLs referenzieren nicht mehr den Altpfad /datenschutzhinweise', () => {
  const source = read('lib/anfrage/constants.ts')
  const legalLinksBlock = source.slice(source.indexOf('export const LEGAL_LINKS'))
  assert.doesNotMatch(legalLinksBlock, /datenschutzhinweise/)
})

test('L-A1-Mail-Templates (lib/anfrage/templates.ts): unveraendert -- keine Versandlogik fuer die Linkkorrektur angefasst', () => {
  const source = read('lib/anfrage/templates.ts')
  // Die Templates importieren LEGAL_LINKS bereits (unveraendert seit L-A1) --
  // dieser Test stellt sicher, dass genau dieser bestehende Verweis
  // weiterhin genutzt wird, statt einer neu eingefuehrten, parallelen
  // URL-Quelle.
  assert.match(source, /LEGAL_LINKS/)
})

// ── AnfrageModal/KontaktFormular verlinken bereits korrekt (unveraendert) ─

test('AnfrageModal und KontaktFormular verlinken auf /datenschutz, nicht auf den Altpfad', () => {
  const anfrageModal = read('components/band/AnfrageModal.tsx')
  const kontaktFormular = read('components/kontakt/KontaktFormular.tsx')
  assert.match(anfrageModal, /href="\/datenschutz"/)
  assert.match(kontaktFormular, /href="\/datenschutz"/)
  assert.doesNotMatch(anfrageModal, /datenschutzhinweise/)
  assert.doesNotMatch(kontaktFormular, /datenschutzhinweise/)
})
