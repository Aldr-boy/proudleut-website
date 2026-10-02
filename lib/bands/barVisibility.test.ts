import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  USABLE_MIN_FRACTION,
  classifyButton,
  computeBarVisible,
  isCoveredByPill,
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

// Geometrie (gemessen mit Playwright auf /band/donnaweda, Border-Box des
// <header> mit data-nav-footprint und Hero-Button #hero-anfrage-btn):
// Pille je Breite und x-Grenzen des Hero-Buttons.
const PILLS = {
  390: { left: 12, right: 378, top: 12, bottom: 70 },
  768: { left: 20.8, right: 747.2, top: 24, bottom: 90 },
  900: { left: 86.8, right: 813.2, top: 24, bottom: 90 },
  1024: { left: 148.8, right: 875.2, top: 24, bottom: 90 },
  1280: { left: 276.8, right: 1003.2, top: 24, bottom: 90 },
} as const
const HERO_X = {
  390: { left: 16, right: 310 }, // Mitte 163
  768: { left: 24, right: 282.8 }, // Mitte 153.4
  900: { left: 24, right: 282.8 },
  1024: { left: 24, right: 282.8 },
  1280: { left: 94, right: 352.8 }, // Mitte 223.4
} as const
type Width = keyof typeof PILLS
const heroAt = (top: number, w: Width) => ({ top, bottom: top + H, ...HERO_X[w] })

type Scenario = {
  hasHeroButton?: boolean
  heroTop?: number | null
  // true: Geometrie wie bei 390 px (Pille deckt die volle Breite ab); sonst wie
  // bei 1280 px (Hero-Button links neben der Pille, nie verdeckt).
  heroCovered?: boolean
  ctaTop?: number | null
  vh?: number
  merkliste?: number
}

type Case = Scenario & { name: string; expected: boolean }

function run(c: Scenario): boolean {
  const w: Width = c.heroCovered ? 390 : 1280
  return computeBarVisible({
    hasHeroButton: c.hasHeroButton ?? true,
    hero: c.heroTop === null || c.heroTop === undefined ? null : heroAt(c.heroTop, w),
    pill: PILLS[w],
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
        const w: Width = covered ? 390 : 1280
        const hero = classifyButton(rect(heroTop), 844, 0, isCoveredByPill(heroAt(heroTop, w), PILLS[w], 844, 0))
        const cta = classifyButton(rect(ctaTop), 844, 0, false)
        if (bar) {
          assert.equal(hero, 'above', `Leiste an bei Hero ${hero} (heroTop ${heroTop})`)
          assert.equal(cta, 'below', `Leiste an bei CTA ${cta} (ctaTop ${ctaTop})`)
        }
      }
    }
  }
})

// ---- Verdeckung durch die Pille: Wertetabelle je Breite (halboffenes Rechteck)
// Hero-Button 54 px hoch; "Mitte y" ist die Mitte des sichtbaren Teils (usablePointY).
type CoverCase = { name: string; w: Width; heroTop: number; heroX?: { left: number; right: number }; covered: boolean }
const coverTable: CoverCase[] = [
  // 390: Pille 12..70 hoch, 12..378 breit; Hero-Mitte x = 163
  { name: '390: Mitte y 47 (Button top 20) -> verdeckt', w: 390, heroTop: 20, covered: true },
  { name: '390: Mitte y genau an der Oberkante (12, Button bottom 24) -> verdeckt (top <= y)', w: 390, heroTop: 24 - H, covered: true },
  { name: '390: Mitte y 11.9 (knapp ueber der Oberkante) -> nicht verdeckt', w: 390, heroTop: 23.8 - H, covered: false },
  { name: '390: Button top 5 (sichtbarer Teil 5..59, Mitte 32) -> verdeckt', w: 390, heroTop: 5, covered: true },
  { name: '390: Mitte y genau auf der Unterkante (70) -> nicht verdeckt (halboffen)', w: 390, heroTop: 70 - 27, covered: false },
  { name: '390: Mitte y 1 px ueber der Unterkante (69) -> verdeckt', w: 390, heroTop: 69 - 27, covered: true },
  { name: '390: Button voll sichtbar darunter (top 300) -> nicht verdeckt', w: 390, heroTop: 300, covered: false },
  // 768 / 900: Pille 24..90, Hero-Mitte x = 153.4 liegt in der Pille
  { name: '768: Mitte y 50 -> verdeckt', w: 768, heroTop: 23, covered: true },
  { name: '768: Mitte y genau auf der Unterkante (90) -> nicht verdeckt', w: 768, heroTop: 90 - 27, covered: false },
  { name: '900: Mitte y 50 -> verdeckt', w: 900, heroTop: 23, covered: true },
  { name: '900: Streifen ueber der Pille (Mitte y 7) -> nicht verdeckt', w: 900, heroTop: -47, covered: false },
  // 1024: Hero-Mitte x 153.4, linke Pillenkante 148.8 (4.6 px Abstand)
  { name: '1024: Mitte x 153.4 liegt 4.6 px rechts der linken Kante -> verdeckt', w: 1024, heroTop: 23, covered: true },
  { name: '1024: Hero-Mitte x 148.7 (knapp links der Kante 148.8) -> nicht verdeckt', w: 1024, heroTop: 23, heroX: { left: 24, right: 273.4 }, covered: false },
  { name: '1024: Hero-Mitte x genau auf der linken Kante (148.8) -> verdeckt (left <= x)', w: 1024, heroTop: 23, heroX: { left: 24, right: 273.6 }, covered: true },
  // 1280: Hero-Mitte x 223.4 liegt links neben der Pille (276.8..1003.2)
  { name: '1280: Mitte y 50, Button links neben der Pille -> nicht verdeckt', w: 1280, heroTop: 23, covered: false },
  { name: '1280: Hero-Mitte x genau auf der linken Kante (276.8) -> verdeckt', w: 1280, heroTop: 23, heroX: { left: 94, right: 459.6 }, covered: true },
  { name: '1280: Hero-Mitte x genau auf der rechten Kante (1003.2) -> nicht verdeckt (halboffen)', w: 1280, heroTop: 23, heroX: { left: 1003.2, right: 1003.2 }, covered: false },
  { name: '1280: Hero-Mitte x 1003.1 (knapp links der rechten Kante) -> verdeckt', w: 1280, heroTop: 23, heroX: { left: 1003.1, right: 1003.1 }, covered: true },
]

for (const c of coverTable) {
  test(`Verdeckung durch die Pille: ${c.name}`, () => {
    const hero = { top: c.heroTop, bottom: c.heroTop + H, ...(c.heroX ?? HERO_X[c.w]) }
    assert.equal(isCoveredByPill(hero, PILLS[c.w], 844, 0), c.covered)
  })
}

test('Verdeckung: ohne Pillenrechteck (kein data-nav-footprint) gilt der Hero-Button als nicht verdeckt', () => {
  assert.equal(isCoveredByPill(heroAt(20, 390), null, 844, 0), false)
})

test('Verdeckung: ganz ausserhalb des Viewports (kein sichtbarer Teil) -> nicht verdeckt', () => {
  assert.equal(isCoveredByPill(heroAt(-300, 390), PILLS[390], 844, 0), false)
  assert.equal(isCoveredByPill(heroAt(900, 390), PILLS[390], 844, 0), false)
})

test('Verdeckung: Mitte des sichtbaren Teils zaehlt, auch mit Merkliste am unteren Rand', () => {
  // Merkliste 61 px: freier Viewport endet bei 783; Hero unten angeschnitten, Mitte weit unter der Pille
  assert.equal(isCoveredByPill(heroAt(760, 390), PILLS[390], 844, 61), false)
})

test('Verdeckung bestimmt die Leiste: 50-%-Grenze und Pillenstreifen zusammen (390 px und 1280 px)', () => {
  const bar = (w: Width, heroTop: number) =>
    computeBarVisible({ hasHeroButton: true, hero: heroAt(heroTop, w), pill: PILLS[w], cta: rect(3000), viewportHeight: 844, merklisteHeight: 0 })
  // 390: exakt 50 % sichtbar (bottom 27, Mitte y 13.5) liegt im Streifen -> verdeckt -> Leiste an
  assert.equal(bar(390, 27 - H), true)
  // 1280: exakt 50 % sichtbar, nicht verdeckt -> Button zaehlt -> Leiste aus
  assert.equal(bar(1280, 27 - H), false)
  // 1280: 1 px weniger -> Leiste an
  assert.equal(bar(1280, 26 - H), true)
  // 390: Button voll sichtbar unter dem Streifen -> aus
  assert.equal(bar(390, 300), false)
  // 768/900/1024: im Streifen verdeckt -> an
  for (const w of [768, 900, 1024] as const) assert.equal(bar(w, 23), true)
})
