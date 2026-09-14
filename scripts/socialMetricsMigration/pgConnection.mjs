/**
 * pgConnection.mjs
 *
 * Laedt die direkten PostgreSQL-Verbindungsdaten aus .env.cutover-test.local
 * (bereits vorhanden aus dem urspruenglichen Airtable->Supabase-Cutover,
 * siehe migration-notes.md) und baut daraus pg-Client-Konfigurationen.
 * Bewusst getrennt von der .env.local-Ladefunktion in
 * migrate-social-metrics.mjs, da diese Datei zusaetzliche, sensible
 * Direkt-DB-Zugangsdaten (Passwoerter) enthaelt, die nur die
 * Transaktionsskripte brauchen.
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

function loadDotEnvFile(relPath) {
  const path = resolve(__dir, '..', '..', relPath)
  const out = {}
  const lines = readFileSync(path, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (key) out[key] = value
  }
  return out
}

/**
 * Baut aus einer URL ohne eingebettetes Passwort (postgresql://user@host:port/db)
 * plus separatem Passwort eine explizite pg-ClientConfig -- pg.Client
 * uebernimmt bei gleichzeitig gesetztem `connectionString` und `password`
 * das separate Feld nicht zuverlaessig, daher explizite Felder statt
 * connectionString.
 */
function buildClientConfig(urlWithoutPassword, password) {
  const u = new URL(urlWithoutPassword)
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 5432,
    database: u.pathname.replace(/^\//, '') || 'postgres',
    user: decodeURIComponent(u.username || 'postgres'),
    password,
    ssl: { rejectUnauthorized: false },
  }
}

/** @returns {{ prod: import('pg').ClientConfig, test: import('pg').ClientConfig }} */
export function loadDirectPgConfigs() {
  const env = loadDotEnvFile('.env.cutover-test.local')
  const required = ['PROD_DB_URL_MIGRATION', 'PROD_DB_PASSWORD', 'TEST_DB_URL', 'TEST_DB_PASSWORD']
  const missing = required.filter((k) => !env[k])
  if (missing.length > 0) throw new Error(`.env.cutover-test.local fehlt: ${missing.join(', ')}`)

  return {
    prod: buildClientConfig(env.PROD_DB_URL_MIGRATION, env.PROD_DB_PASSWORD),
    test: buildClientConfig(env.TEST_DB_URL, env.TEST_DB_PASSWORD),
  }
}
