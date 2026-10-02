import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  USABLE_MIN_FRACTION,
  classifyButton,
  computeBarVisible,
  isUsable,
  usablePointY,
  visibleFraction,
} from './barVisibility.ts'

// Wertetabelle fuer die Entscheidung "Leiste/Bottom-Bar sichtbar". Alle Buttons
// sind 54 px hoch (Hero-Button und CTA-Button der Seite), die Haelfte ist 27 px.
const H = 54
const rect = (top: number) => ({ top, bottom: top + H })
const VH_DESKTOP = 844
const VH_MOBILE = 844

type Scenario = {
  hasHeroButton?: boolean
  heroTop?: number | null
  heroCovered?: boolean
  ctaTop?: number | null
  vh?: number
  merkliste?: number
}

type Case = Scenario & { name: string; expected: boolean }

function run(c: Scenario): boolean {
  return computeBarVisible({
    hasHeroButton: c.hasHeroButton ?? true,
    hero: c.heroTop === null || c.heroTop === undefined ? null : rect(c.heroTop),
    heroCoveredByHeader: c.heroCovered ?? false,
    cta: c.ctaTop === null || c.ctaTop === undefined ? null : rect(c.ctaTop),
    viewportHeight: c.vh ?? VH_DESKTOP,
    merklisteHeight: c.merkliste ?? 0,
  })
}

const table: Case[] = [
  // ---- Hero-Button, Desktop 1280 (Pill deckt den Button nicht ab): Grenze bei bottom = 27 (Anteil 0.5)
  { name: 'Desktop: Hero voll sichtbar -> Leiste aus', heroTop: 300, ctaTop: 3000, expected: false },
  { name: 'Desktop: Hero exakt 50 % sichtbar (bottom 27) -> Button zaehlt, Leiste aus', heroTop: 27 - H, ctaTop: 3000, expected: false },
  { name: 'Desktop: Hero 1 px darunter (bottom 26, Anteil < 0.5) -> Leiste an', heroTop: 26 - H, ctaTop: 3000, expected: true },
  { name: 'Desktop: Hero 1 px darueber (bottom 28) -> Leiste aus', heroTop: 28 - H, ctaTop: 3000, expected: false },
  { name: 'Desktop: Hero ganz oberhalb des Viewports -> Leiste an', heroTop: -200, ctaTop: 3000, expected: true },

  // ---- Hero-Button, Handy (Header-Pill verdeckt den Mittelpunkt des sichtbaren Teils)
  { name: 'Handy: Hero voll sichtbar, nicht verdeckt -> Leiste aus', heroTop: 300, heroCovered: false, ctaTop: 3000, expected: false },
  { name: 'Handy: Hero unter der Pill verdeckt (top 20, Anteil 1.0) -> Leiste an (kein Luecke zwischen Verdeckung und Observer)', heroTop: 20, heroCovered: true, ctaTop: 3000, expected: true },
  { name: 'Handy: Streifen ueber der Pill (top -20, Anteil 0.63, Mittelpunkt verdeckt) -> Leiste bleibt an (monoton, kein Wiederausblenden)', heroTop: -20, heroCovered: true, ctaTop: 3000, expected: true },
  { name: 'Handy: Hero Anteil exakt 0.5 und nicht verdeckt -> Button zaehlt, Leiste aus', heroTop: 27 - H, heroCovered: false, ctaTop: 3000, expected: false },
  { name: 'Handy: Hero Anteil exakt 0.5 aber verdeckt -> Button zaehlt nicht, Leiste an', heroTop: 27 - H, heroCovered: true, ctaTop: 3000, expected: true },

  // ---- CTA-Button, Desktop: Grenze bei top = 844 - 27 = 817 (sichtbarer Anteil 27/54 = 0.5)
  { name: 'Desktop: CTA exakt 50 % sichtbar (top 817) -> Button zaehlt, Leiste aus', heroTop: -500, ctaTop: VH_DESKTOP - 27, expected: false },
  { name: 'Desktop: CTA 1 px weniger sichtbar (top 818) -> Leiste an', heroTop: -500, ctaTop: VH_DESKTOP - 26, expected: true },
  { name: 'Desktop: CTA 1 px mehr sichtbar (top 816) -> Leiste aus', heroTop: -500, ctaTop: VH_DESKTOP - 28, expected: false },
  { name: 'Desktop: CTA noch unterhalb des Viewports -> Leiste an', heroTop: -500, ctaTop: 2000, expected: true },
  { name: 'Desktop: CTA vollstaendig sichtbar -> Leiste aus', heroTop: -500, ctaTop: 300, expected: false },
  { name: 'Desktop: CTA ueber den oberen Rand hinaus gescrollt (hinter der Karte) -> Leiste bleibt aus', heroTop: -900, ctaTop: -40, expected: false },
  { name: 'Desktop: CTA ganz oberhalb des Viewports -> Leiste aus', heroTop: -900, ctaTop: -300, expected: false },

  // ---- CTA-Button, Handy ohne Merkliste (gleiche Grenze)
  { name: 'Handy: CTA exakt 50 % sichtbar (top 817) -> Leiste aus', heroTop: -500, ctaTop: VH_MOBILE - 27, vh: VH_MOBILE, expected: false },
  { name: 'Handy: CTA 1 px darunter (top 818) -> Leiste an', heroTop: -500, ctaTop: VH_MOBILE - 26, vh: VH_MOBILE, expected: true },
  { name: 'Handy: CTA 1 px darueber (top 816) -> Leiste aus', heroTop: -500, ctaTop: VH_MOBILE - 28, vh: VH_MOBILE, expected: false },

  // ---- CTA-Button, Handy mit gefuellter Merkliste (61 px): freier Viewport endet bei 783, Grenze bei top = 783 - 27 = 756
  { name: 'Merkliste: CTA exakt 50 % im freien Bereich (top 756) -> Button zaehlt, Leiste aus', heroTop: -500, ctaTop: 756, merkliste: 61, expected: false },
  { name: 'Merkliste: CTA 1 px darunter (top 757, haelftig verdeckt) -> Leiste an', heroTop: -500, ctaTop: 757, merkliste: 61, expected: true },
  { name: 'Merkliste: CTA 1 px darueber (top 755) -> Leiste aus', heroTop: -500, ctaTop: 755, merkliste: 61, expected: false },
  { name: 'ohne Merkliste: CTA bei top 790 voll sichtbar -> Leiste aus', heroTop: -500, ctaTop: 790, merkliste: 0, expected: false },
  { name: 'Merkliste gefuellt: Hero-Grenze unveraendert (bottom 27 zaehlt)', heroTop: 27 - H, ctaTop: 3000, merkliste: 61, expected: false },

  // ---- Band ohne Hero-Button: Leiste von Anfang an, bis die CTA benutzbar ist
  { name: 'ohne Hero-Button: CTA weit unten -> Leiste an', hasHeroButton: false, heroTop: null, ctaTop: 3000, expected: true },
  { name: 'ohne Hero-Button: CTA benutzbar -> Leiste aus', hasHeroButton: false, heroTop: null, ctaTop: 400, expected: false },
  { name: 'ohne Hero-Button: CTA exakt 50 % -> Leiste aus', hasHeroButton: false, heroTop: null, ctaTop: VH_DESKTOP - 27, expected: false },
  { name: 'ohne Hero-Button: CTA 1 px darunter -> Leiste an', hasHeroButton: false, heroTop: null, ctaTop: VH_DESKTOP - 26, expected: true },
  { name: 'mit Hero-Button, aber Hero-Element fehlt im DOM -> Leiste aus (wie bisher)', hasHeroButton: true, heroTop: null, ctaTop: 3000, expected: false },

  // ---- Sehr niedriger Viewport: Hero-Button unterhalb des Falzes -> Leiste aus
  { name: 'Hero unterhalb des Viewports (niedriges Fenster) -> Leiste aus', heroTop: 900, ctaTop: 3000, expected: false },
  { name: 'ohne CTA im DOM -> nur der Hero-Teil entscheidet', heroTop: -300, ctaTop: null, expected: true },
]

for (const c of table) {
  test(c.name, () => {
    assert.equal(run(c), c.expected)
  })
}

test('USABLE_MIN_FRACTION ist 0.5 und die einzige Schwelle: isUsable zaehlt exakt 0.5, nicht 0.5 - epsilon, und nie bei Verdeckung', () => {
  assert.equal(USABLE_MIN_FRACTION, 0.5)
  assert.equal(isUsable(0.5, false), true)
  assert.equal(isUsable(0.5 - 1e-9, false), false)
  assert.equal(isUsable(1, true), false)
})

test('visibleFraction / usablePointY: Teilsichtbarkeit oben, unten und mit Merkliste', () => {
  assert.equal(visibleFraction(rect(100), 844, 0), 1)
  assert.equal(visibleFraction(rect(-27), 844, 0), 0.5)
  assert.equal(visibleFraction(rect(817), 844, 0), 0.5)
  assert.equal(visibleFraction(rect(756), 844, 61), 0.5)
  assert.equal(visibleFraction(rect(900), 844, 0), 0)
  assert.equal(usablePointY(rect(-27), 844, 0), 13.5)
  assert.equal(usablePointY(rect(900), 844, 0), null)
})

test('beide Scrollrichtungen: Hero-Uebergang schaltet bei derselben Position (kein Hysterese, genau ein Wechsel)', () => {
  const heroTops = Array.from({ length: 121 }, (_, i) => 60 - i) // von 60 (sichtbar) bis -60
  const down = heroTops.map((top) => run({ heroTop: top, ctaTop: 3000 }))
  const up = [...heroTops].reverse().map((top) => run({ heroTop: top, ctaTop: 3000 }))
  assert.deepEqual(up, [...down].reverse(), 'Hoch- und Runterscrollen muessen dieselbe Entscheidung je Position liefern')
  const switches = down.filter((v, i) => i > 0 && v !== down[i - 1]).length
  assert.equal(switches, 1, 'genau ein Wechsel aus -> an')
})

test('beide Scrollrichtungen: CTA-Uebergang schaltet bei derselben Position (mit und ohne Merkliste), genau ein Wechsel', () => {
  for (const merkliste of [0, 61]) {
    const ctaTops = Array.from({ length: 201 }, (_, i) => 1000 - i * 2) // von 1000 (unten) bis 600
    const down = ctaTops.map((top) => run({ heroTop: -500, ctaTop: top, merkliste }))
    const up = [...ctaTops].reverse().map((top) => run({ heroTop: -500, ctaTop: top, merkliste }))
    assert.deepEqual(up, [...down].reverse())
    assert.equal(down.filter((v, i) => i > 0 && v !== down[i - 1]).length, 1)
  }
})

test('es gibt keinen Zustand, in dem Hero und CTA gleichzeitig benutzbar sind und die Leiste trotzdem an ist (Wertebereich durchlaufen)', () => {
  for (let heroTop = -200; heroTop <= 900; heroTop += 3) {
    for (let ctaTop = -200; ctaTop <= 1000; ctaTop += 7) {
      for (const covered of [false, true]) {
        const bar = run({ heroTop, heroCovered: covered, ctaTop })
        const hero = classifyButton(rect(heroTop), 844, 0, covered)
        const cta = classifyButton(rect(ctaTop), 844, 0, false)
        if (bar) {
          assert.equal(hero, 'above', `Leiste an bei Hero ${hero} (heroTop ${heroTop})`)
          assert.equal(cta, 'below', `Leiste an bei CTA ${cta} (ctaTop ${ctaTop})`)
        }
      }
    }
  }
})
