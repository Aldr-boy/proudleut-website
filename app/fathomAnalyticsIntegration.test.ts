import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die Fathom-Analytics-Integration
// (Auftrag "Fathom Analytics in proudleut einbauen"): fathom-client statt
// rohem Script-Tag (App-Router-Navigation ohne Reload muss als Pageview
// zaehlen, siehe Fathom-Doku docs/integrations/next), Gating ausschliesslich
// serverseitig in app/layout.tsx (Produktion + echte Domain + nicht
// /admin//studio), keine Events/Goals in diesem PR. Kein jsdom im Repo --
// gleiches Textmuster wie die uebrigen strukturellen Tests.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const layoutSource = readFileSync(path.join(root, 'app', 'layout.tsx'), 'utf8')
const fathomSource = readFileSync(path.join(root, 'components', 'analytics', 'Fathom.tsx'), 'utf8')

test('layout.tsx: Fathom wird nur gerendert, wenn VERCEL_ENV production UND Host der Hauptdomain (SITE_URL) ist', () => {
  assert.match(layoutSource, /process\.env\.VERCEL_ENV === "production"/)
  assert.match(layoutSource, /host === new URL\(SITE_URL\)\.host/)
  assert.match(layoutSource, /shouldTrackFathom &&\s*<Fathom siteId=\{fathomSiteId!\}\s*\/>/)
})

test('layout.tsx: Site-ID kommt aus NEXT_PUBLIC_FATHOM_SITE_ID, nicht hartcodiert', () => {
  assert.match(layoutSource, /process\.env\.NEXT_PUBLIC_FATHOM_SITE_ID/)
  assert.doesNotMatch(layoutSource, /KBGDPBWL/)
})

test('layout.tsx: fehlende Site-ID verhindert das Tracking (kein Crash, kein Fehler)', () => {
  assert.match(layoutSource, /!!fathomSiteId/)
})

test('layout.tsx: /admin/* und /studio/* sind von shouldTrackFathom ausgeschlossen', () => {
  const idx = layoutSource.indexOf('shouldTrackFathom =')
  assert.ok(idx >= 0)
  const block = layoutSource.slice(idx, idx + 250)
  assert.match(block, /!isStudio/)
  assert.match(block, /!isAdmin/)
})

test('Fathom.tsx: nutzt fathom-client (load/trackPageview), keinen next/script-Tag zu cdn.usefathom.com', () => {
  assert.match(fathomSource, /import \{ load, trackPageview \} from 'fathom-client'/)
  assert.doesNotMatch(fathomSource, /cdn\.usefathom\.com/)
  assert.doesNotMatch(fathomSource, /next\/script/)
})

test('Fathom.tsx: load() mit auto:false, damit trackPageview() jeden Wechsel (inkl. initialem Mount) genau einmal zaehlt -- keine Doppelzaehlung', () => {
  assert.match(fathomSource, /load\(siteId, \{ auto: false \}\)/)
  assert.match(fathomSource, /trackPageview\(\{/)
  assert.match(fathomSource, /\}, \[pathname, searchParams\]\)/)
})

test('Fathom.tsx: useSearchParams() liegt in einer eigenen Suspense-Grenze (Next.js-Vorgabe)', () => {
  assert.match(fathomSource, /import \{ Suspense, useEffect \} from 'react'/)
  assert.match(fathomSource, /<Suspense fallback=\{null\}>/)
})

test('Fathom.tsx: keine Events/Goals in diesem PR -- nur load/trackPageview, kein trackGoal', () => {
  assert.doesNotMatch(fathomSource, /trackGoal/)
})

test('app/datenschutz/page.tsx bleibt unangetastet (wird separat ersetzt)', () => {
  const datenschutzSource = readFileSync(path.join(root, 'app', 'datenschutz', 'page.tsx'), 'utf8')
  assert.doesNotMatch(datenschutzSource, /fathom-client|NEXT_PUBLIC_FATHOM_SITE_ID/i)
})
