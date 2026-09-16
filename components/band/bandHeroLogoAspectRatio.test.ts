import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Regressionspruefung fuer den Logo-Seitenverhaeltnis-Fehler in
// BandHero.tsx (Bandlogo-Adaption, Auftrag Abschnitt 3): die vorherige
// Fassung setzte next/image width={200} height={80} und ueberschrieb dann
// per style={{width:'auto', height:'auto'}} beide Werte -- Browser
// berechnen die auto-Box in diesem Fall anhand der width/height-HTML-
// Attribute (also 200:80 = 2.5:1), NICHT anhand der tatsaechlichen
// Bilddatei. Ein breites Logo (z. B. 2048x229px, ~8.9:1) wurde dadurch in
// eine falsch proportionierte Box gezwungen und unnoetig klein gerendert.
// Fix: `fill` in einer Box mit fester CSS-Groesse (keine width/height-
// Props, die die falsche Form vorgeben) + object-contain -- object-fit
// arbeitet dann korrekt mit der echten Bilddatei-Form.
const bandHeroPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'BandHero.tsx'
)
const source = readFileSync(bandHeroPath, 'utf8')

function extractLogoBlock(): string {
  const start = source.indexOf('{band.logo && (')
  assert.ok(start >= 0, 'band.logo-Block nicht gefunden')
  return source.slice(start, start + 1600)
}

test('Logo wird per fill gerendert, nicht per fixer width/height-Props', () => {
  const block = extractLogoBlock()
  assert.match(block, /\bfill\b/, 'fill-Prop erwartet')
  assert.doesNotMatch(block, /width=\{\d+\}/, 'keine feste width-Prop erwartet -- die legt die falsche Seitenverhaeltnis-Box fest')
  assert.doesNotMatch(block, /height=\{\d+\}/, 'keine feste height-Prop erwartet')
})

test('kein width:auto/height:auto-Style mehr auf dem Logo-Image (verursachte die falsche Seitenverhaeltnis-Box)', () => {
  const block = extractLogoBlock()
  assert.doesNotMatch(block, /width: 'auto'/)
  assert.doesNotMatch(block, /height: 'auto'/)
})

test('Logo-Box hat eine feste CSS-Groesse (position: relative-Vorfahre fuer fill) statt einer aus width/height-Attributen abgeleiteten Form', () => {
  const block = extractLogoBlock()
  assert.match(block, /className="relative w-28 h-10 sm:w-32 sm:h-11 md:w-36 md:h-12"/)
})

test('object-contain bleibt erhalten (kein Beschnitt); object-right fuer die rechtsbuendige Platzierung oben im Hero (Redesign, Auftrag Abschnitt 6)', () => {
  const block = extractLogoBlock()
  assert.match(block, /object-contain/)
  assert.match(block, /object-right/)
})
