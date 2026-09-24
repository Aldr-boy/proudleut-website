import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// EXPERIMENT Variante S ("Media-Query-Preloads"): strukturelle
// Regressionspruefung nach demselben Muster wie HeroWall.test.ts --
// dieses Modul importiert next/images `getImageProps` (Runtime-Code, das
// nur innerhalb des Next.js-Bundlers zuverlaessig aufloest, siehe
// gescheiterter erster Versuch mit einem echten `import`/Ausfuehrung
// dieses Moduls unter plain `node --test`: `Cannot find module
// ".../node_modules/next/image"`). Die Quelldatei wird deshalb wie bei
// HeroWall.test.ts per readFileSync gelesen und strukturell geprueft.
const sourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'heroWallPreloadLinks.ts')
const source = readFileSync(sourcePath, 'utf8')

function extractMediaQueries(src: string): Record<string, string> {
  const start = src.indexOf('export const HERO_WALL_PRELOAD_MEDIA')
  const end = src.indexOf('\n}', start)
  const block = src.slice(start, end)
  const entries: Record<string, string> = {}
  for (const m of block.matchAll(/(\w+):\s*'([^']+)'/g)) {
    entries[m[1]] = m[2]
  }
  return entries
}

function matchesMediaQuery(mediaQuery: string, width: number): boolean {
  const conditions = mediaQuery.split(' and ').map((c) => c.trim())
  return conditions.every((cond) => {
    const min = cond.match(/min-width:\s*([\d.]+)px/)
    const max = cond.match(/max-width:\s*([\d.]+)px/)
    if (min && width < Number(min[1])) return false
    if (max && width > Number(max[1])) return false
    return true
  })
}

test('HERO_WALL_PRELOAD_MEDIA definiert alle vier Breakpoints (mobile/tablet/tabletWide/desktop)', () => {
  const media = extractMediaQueries(source)
  assert.deepEqual(Object.keys(media).sort(), ['desktop', 'mobile', 'tablet', 'tabletWide'].sort())
})

test('Media-Queries sind exklusiv und lueckenlos ueber alle Viewportbreiten (768/1024/1280px-Grenzen, aus Tailwind-Theme abgeleitet)', () => {
  const media = extractMediaQueries(source)
  const probes = [1, 390, 767, 768, 800, 1023, 1024, 1100, 1279, 1280, 1920, 3840]
  for (const width of probes) {
    const matching = Object.entries(media).filter(([, mq]) => matchesMediaQuery(mq, width))
    assert.equal(matching.length, 1, `Breite ${width}px muss genau eine Media-Query treffen, traf: ${matching.map(([bp]) => bp).join(',')}`)
  }
})

test('Media-Query-Grenzen entsprechen exakt den echten Tailwind-v4-Breakpoints (md=768px, lg=1024px, xl=1280px)', () => {
  const media = extractMediaQueries(source)
  assert.match(media.mobile, /max-width:\s*767\.98px/)
  assert.match(media.tablet, /min-width:\s*768px/)
  assert.match(media.tablet, /max-width:\s*1023\.98px/)
  assert.match(media.tabletWide, /min-width:\s*1024px/)
  assert.match(media.tabletWide, /max-width:\s*1279\.98px/)
  assert.match(media.desktop, /min-width:\s*1280px/)
})

test('genau EIN mobiler Preload-Poolindex (keine Messung begruendet eine zweite mobile Kachel) und je zwei fuer tablet/tabletWide/desktop', () => {
  const start = source.indexOf('const EAGER_POOL_INDICES')
  const end = source.indexOf('\n}', start)
  const block = source.slice(start, end)
  const mobileLine = block.match(/mobile:\s*\[([^\]]+)\]/)
  assert.ok(mobileLine, 'mobile-Eintrag nicht gefunden')
  assert.equal(mobileLine![1].split(',').length, 1, 'mobile darf nur genau einen Poolindex haben')
  for (const bp of ['tablet', 'tabletWide', 'desktop']) {
    const line = block.match(new RegExp(`${bp}:\\s*\\[([^\\]]+)\\]`))
    assert.ok(line, `${bp}-Eintrag nicht gefunden`)
    assert.equal(line![1].split(',').length, 2, `${bp} muss genau zwei Poolindizes haben (t=0,p=0 und t=1,p=0)`)
  }
})

test('buildHeroWallPreloadDescriptors nutzt next/images getImageProps, damit Preload und echte Kachel garantiert dasselbe srcSet erzeugen', () => {
  assert.match(source, /import \{ getImageProps \} from 'next\/image'/)
  assert.match(source, /getImageProps\(\{/)
  assert.match(source, /fill:\s*true/, 'muss fill:true verwenden, wie die echte Tile-Kachel (next/image mit fill statt width\\/height)')
  assert.match(source, /imageSrcSet:\s*props\.srcSet/)
})

test('kein Poolplatz wird uebersprungen-ignoriert produziert -- fehlende Bilder (kleiner Pool) werden per continue ausgelassen, kein Crash, kein Platzhalter-Preload', () => {
  const start = source.indexOf('export function buildHeroWallPreloadDescriptors')
  const body = source.slice(start, start + 1200)
  assert.match(body, /if \(!image\) continue/)
  assert.match(body, /if \(!props\.srcSet\) continue/)
})
