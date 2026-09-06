import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer fetchHeroWallPool.ts. Ein echter
// Datenbankzugriff kann in diesem Repo nicht getestet werden (kein
// lokales Postgres, keine Live-Verbindung in Tests) -- identisches,
// bereits etabliertes Muster wie die uebrigen *SqlStructure.test.ts-
// Dateien: echte Quelldatei per readFileSync lesen und strukturell
// pruefen.
const sourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fetchHeroWallPool.ts')
const source = readFileSync(sourcePath, 'utf8')

test('verwendet den oeffentlichen Client (lib/supabase/client.ts), NICHT createAdminClient() -- dieselbe Query laeuft auch auf der oeffentlichen Homepage', () => {
  assert.match(source, /import \{ supabase \} from '@\/lib\/supabase\/client'/)
  assert.doesNotMatch(source, /createAdminClient/)
})

test('filtert exakt auf hero_wall = true und sortiert nach hero_wall_position aufsteigend', () => {
  assert.match(source, /\.eq\('hero_wall', true\)/)
  assert.match(source, /\.order\('hero_wall_position', \{ ascending: true \}\)/)
})

test('liefert id, url und heroFocus (aus hero_focus) je Bild', () => {
  assert.match(source, /id: row\.id/)
  assert.match(source, /url: row\.url/)
  assert.match(source, /heroFocus: row\.hero_focus/)
})

test('kein Shuffle/Random/Rotation -- deterministische Reihenfolge ausschliesslich ueber hero_wall_position', () => {
  assert.doesNotMatch(source, /Math\.random|shuffle/i)
})
