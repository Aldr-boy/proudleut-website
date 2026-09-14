/**
 * migrate-social-metrics.mjs
 *
 * Einmalige CSV-Uebernahme von Social-Media-Kennzahlen
 * ("Social Media Index-Uebersicht.csv") nach public.social_profiles
 * (current_followers, last_checked_at). Reine Anwendung der bestehenden
 * Spalten/Rechte -- kein Schema, keine neuen RPCs, keine neuen
 * oeffentlichen Schreibrechte. Update-only auf bestehende Rows mit
 * gesetzter url; legt nie neue Bands oder Social-Profile an.
 *
 * Dry Run (liest nur, schreibt nie -- auch der Default ohne jedes Flag):
 *   node scripts/migrate-social-metrics.mjs --csv=<Pfad-zur-CSV>
 *   node scripts/migrate-social-metrics.mjs --csv=<Pfad> --out=<Vorschau-JSON-Pfad>
 *
 * Echter Lauf (erst nach Freigabe der Dry-Run-Vorschau; schreibt alle
 * geplanten Zeilen in einer einzigen Transaktion oder keine -- keine
 * Pilotband-Option, siehe Auftrag):
 *   node scripts/migrate-social-metrics.mjs --execute --plan=<Vorschau-JSON-Pfad> --confirm-bulk-execute
 *
 * Rollback eines vorherigen Execute-Laufs:
 *   node scripts/migrate-social-metrics.mjs --restore=<Backup-Verzeichnis>
 *
 * --- Ausfuehrungsmodell fuer --execute (echte DB-Transaktion) ---
 * Verwendet die bereits vorhandene direkte PostgreSQL-Verbindung aus
 * .env.cutover-test.local (PROD_DB_URL_MIGRATION/PROD_DB_PASSWORD, aus
 * dem urspruenglichen Cutover) statt einer neuen RPC/Migration:
 *   1. Eine einzige DB-Transaktion (BEGIN...COMMIT) sperrt alle
 *      betroffenen Zielzeilen per SELECT ... FOR UPDATE, vergleicht sie
 *      mit dem im Plan festgehaltenen Ausgangs- UND Endzustand und
 *      schreibt entweder ausnahmslos alle 100 Zeilen oder keine
 *      einzige (siehe scripts/socialMetricsMigration/runBatchImport.mjs
 *      + batchTransaction.mjs fuer die reine Entscheidungslogik).
 *   2. Die Sicherung (Vorher-/Nachherzustand) wird innerhalb derselben
 *      Transaktion, nach der Validierung und vor dem eigentlichen
 *      Schreiben, nach $HOME/proudleut-backups/social-metrics/<Zeitstempel>/
 *      geschrieben. Schlaegt das fehl, wird zurueckgerollt.
 *   3. `--restore=<Backup-Verzeichnis>` stellt in einer eigenen, ebenso
 *      atomaren Transaktion die Ausgangswerte wieder her -- nur wenn
 *      alle betroffenen Zeilen noch exakt dem importierten Endzustand
 *      entsprechen (sonst Abbruch ohne Teil-Restore).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { homedir } from 'os'
import { Client } from 'pg'
import { createClient } from '@supabase/supabase-js'
import { parseCsvRecords } from './socialMetricsMigration/parseCsv.mjs'
import {
  TARGET_PLATFORMS,
  TARGET_PLATFORM_FIELD,
  mapBandByName,
  parseCsvRow,
  dedupeCsvRows,
  resolvePlatformDecision,
  computePreviewVisibility,
  PLATFORM_DECISION,
} from './socialMetricsMigration/classify.mjs'
import { loadDirectPgConfigs } from './socialMetricsMigration/pgConnection.mjs'
import { runAtomicImport, runAtomicRestore } from './socialMetricsMigration/runBatchImport.mjs'

const __dir = dirname(fileURLToPath(import.meta.url))

// ─── ENV ──────────────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = resolve(__dir, '..', '.env.local')
  try {
    const lines = readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
      if (key && !(key in process.env)) process.env[key] = value
    }
  } catch {
    console.error('✗ .env.local nicht lesbar – Datei vorhanden?')
    process.exit(1)
  }
}
loadEnv()

// ─── CLI FLAGS ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? null

const EXECUTE = args.includes('--execute')
const RESTORE_DIR = flag('restore')
const CSV_PATH = flag('csv')
const OUT_PATH = flag('out')
const PLAN_PATH = flag('plan')
const CONFIRM_BULK_EXECUTE = args.includes('--confirm-bulk-execute')

function backupBaseDir() {
  return join(homedir(), 'proudleut-backups', 'social-metrics')
}

function timestampForBackupDir(now = new Date()) {
  // "2026-09-14T18:30:45.123Z" -> "2026-09-14T183045Z" (Sekunden erhalten, Millisekunden verworfen)
  const iso = now.toISOString()
  return iso.slice(0, 19).replace(/:/g, '') + 'Z'
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('✗ Fehlende Env-Variablen: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Service-Role fuer Lesen UND Schreiben: der Dry-Run muss auch nicht
// veroeffentlichte/nicht-aktive Baender sehen (fuer die Bandstatus-Spalte
// in der Vorschau), RLS mit dem anon-Key wuerde einen Teil der Baender
// unsichtbar machen (live geprueft: anon sah 141 von 142 Baendern).
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

function projectRefFromUrl(url) {
  try { return new URL(url).hostname.split('.')[0] } catch { return '(unbekannt)' }
}

const DLINE = '─'.repeat(88)

// ─── RESTORE-MODUS (atomare Transaktion) ──────────────────────────────────────

async function runRestore() {
  console.log(`\n${DLINE}\n  migrate-social-metrics.mjs --restore\n  Backup-Verzeichnis: ${RESTORE_DIR}\n${DLINE}`)
  const before = JSON.parse(readFileSync(join(RESTORE_DIR, 'before.json'), 'utf8'))
  const after = JSON.parse(readFileSync(join(RESTORE_DIR, 'after.json'), 'utf8'))
  console.log(`  Zeilen im Backup: ${before.length}`)

  const { prod } = loadDirectPgConfigs()
  const client = new Client(prod)
  await client.connect()
  try {
    const result = await runAtomicRestore({ client, before, after })
    if (result.outcome === 'RESTORED') {
      console.log(`\n  ✓ RESTORED -- ${result.restoredCount} Zeilen atomar auf den Ausgangszustand zurueckgesetzt.`)
    } else {
      console.log(`\n  ✗ ABORT_DRIFT -- mindestens eine Zielzeile weicht seit dem Import vom erwarteten Endzustand ab, KEIN Restore ausgefuehrt:`)
      for (const d of result.drifted) console.log(`    - ${d.profileId}: ${d.reason} ${d.actual ? JSON.stringify(d.actual) : ''}`)
      process.exit(1)
    }
  } finally {
    await client.end()
  }
}

// ─── DATEN LADEN ──────────────────────────────────────────────────────────────

async function loadTarget() {
  const [bandsRes, socialRes] = await Promise.all([
    supabase.from('bands').select('id, name, slug, status, is_published'),
    supabase.from('social_profiles').select('id, band_id, platform, url, current_followers, current_following, last_checked_at').in('platform', TARGET_PLATFORMS),
  ])
  if (bandsRes.error) throw new Error(`Supabase bands: ${bandsRes.error.message}`)
  if (socialRes.error) throw new Error(`Supabase social_profiles: ${socialRes.error.message}`)

  const bandsByNormalizedName = new Map()
  const bandsById = new Map()
  for (const b of bandsRes.data) {
    bandsById.set(b.id, b)
    const key = b.name
      .normalize('NFKC')
      .replace(/[’‘]/g, "'")
      .replace(/[–—]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
    if (!bandsByNormalizedName.has(key)) bandsByNormalizedName.set(key, [])
    bandsByNormalizedName.get(key).push(b)
  }

  // Nur Rows mit gesetzter URL sind gueltige Importziele (Auftrag Abschnitt 3).
  const targetByBandPlatform = new Map()
  for (const row of socialRes.data) {
    if (!row.url) continue
    targetByBandPlatform.set(`${row.band_id}::${row.platform}`, row)
  }

  return { bandsByNormalizedName, bandsById, targetByBandPlatform, bandsCount: bandsRes.data.length, socialCount: socialRes.data.length }
}

// ─── PLAN BAUEN (Dry Run) ──────────────────────────────────────────────────────

function buildPlan(csvRecords, target, now) {
  const parsedRows = csvRecords.map(parseCsvRow)
  const columnMismatches = parsedRows.filter((r) => r.columnCountMismatch)
  const nameMismatches = parsedRows.filter((r) => r.nameMismatch)

  const rowsWithMetric = parsedRows.filter((r) => r.hasAnyMetric)
  const rowsWithoutMetric = parsedRows.filter((r) => !r.hasAnyMetric)

  const { resolved, conflicts: duplicateConflicts } = dedupeCsvRows(rowsWithMetric)

  const platformRows = []
  const bandLevelIssues = []

  for (const { normalizedName, chosen, discardedCount } of resolved) {
    const bandMapping = mapBandByName(chosen.bandsName, target.bandsByNormalizedName)
    if (bandMapping.classification !== 'EXACT') {
      bandLevelIssues.push({
        csvBandName: chosen.bandsName,
        classification: bandMapping.classification,
        reason: bandMapping.reason,
        platformsWithMetric: TARGET_PLATFORMS.filter((p) => chosen.platformValues[p].ok && chosen.platformValues[p].value !== null),
      })
      continue
    }

    const band = bandMapping.band
    for (const platform of TARGET_PLATFORMS) {
      const valueResult = chosen.platformValues[platform]
      if (valueResult.ok && valueResult.value === null) continue // leeres Feld -- keine Entscheidung noetig, nicht in der Vorschau auflisten

      const targetRow = target.targetByBandPlatform.get(`${band.id}::${platform}`) ?? null
      const decision = resolvePlatformDecision({ valueResult, dateResult: chosen.dateResult, targetRow })

      // Sichtbarkeit nur fuer den Wert, der nach erfolgreichem Import tatsaechlich
      // besteht: bei SET/UPDATE/Konflikt-mit-Vorschlag der CSV-Vorschlag, bei
      // ALREADY_EQUAL/SKIP_TARGET_NEWER der unveraenderte Zielwert, sonst kein Wert.
      let visibility = null
      if (decision.proposedValue !== undefined) {
        visibility = computePreviewVisibility(decision.proposedValue, decision.proposedCheckedAt, band, now)
      } else if ((decision.decision === PLATFORM_DECISION.ALREADY_EQUAL || decision.decision === PLATFORM_DECISION.SKIP_TARGET_NEWER) && targetRow) {
        visibility = computePreviewVisibility(targetRow.current_followers, targetRow.last_checked_at, band, now)
      }

      platformRows.push({
        csvBandName: chosen.bandsName,
        band: { id: band.id, slug: band.slug, status: band.status, is_published: band.is_published },
        platform,
        targetProfileId: targetRow?.id ?? null,
        previousValue: targetRow?.current_followers ?? null,
        previousCheckedAt: targetRow?.last_checked_at ?? null,
        proposedValue: decision.proposedValue ?? null,
        proposedCheckedAt: decision.proposedCheckedAt ?? null,
        action: decision.decision,
        reason: decision.reason,
        publiclyVisibleAfterImport: visibility?.wouldBeVisible ?? false,
        discardedDuplicateRows: discardedCount,
      })
    }
  }

  return {
    generatedAt: now.toISOString(),
    totalCsvRows: parsedRows.length,
    rowsWithMetric: rowsWithMetric.length,
    rowsWithoutMetric: rowsWithoutMetric.length,
    distinctBandsWithMetricAfterDedupe: resolved.length,
    columnMismatches,
    nameMismatches,
    duplicateConflicts,
    bandLevelIssues,
    platformRows,
  }
}

// ─── AUSGABE ──────────────────────────────────────────────────────────────────

function printPlan(plan) {
  console.log(`\n${DLINE}\n  Bestandspruefung\n${DLINE}`)
  console.log(`  CSV-Zeilen gesamt:                     ${plan.totalCsvRows}`)
  console.log(`  davon mit mind. einer Kennzahl:         ${plan.rowsWithMetric}`)
  console.log(`  davon ohne jede Kennzahl (#ERROR! etc): ${plan.rowsWithoutMetric}`)
  console.log(`  unterschiedliche Baender mit Kennzahl   ${plan.distinctBandsWithMetricAfterDedupe}   (nach Dublettenbereinigung)`)
  console.log(`  Spaltenzahl-Abweichungen:               ${plan.columnMismatches.length}`)
  console.log(`  Name-Spalten weichen voneinander ab:    ${plan.nameMismatches.length}`)

  if (plan.duplicateConflicts.length > 0) {
    console.log(`\n  Widerspruechliche Dubletten (${plan.duplicateConflicts.length}) -- NICHT automatisch aufgeloest:`)
    for (const c of plan.duplicateConflicts) console.log(`    - ${c.normalizedName}: ${c.reason}`)
  }

  if (plan.bandLevelIssues.length > 0) {
    console.log(`\n  Fehlende/mehrdeutige Bandzuordnung (${plan.bandLevelIssues.length}):`)
    for (const i of plan.bandLevelIssues) {
      console.log(`    - "${i.csvBandName}" [${i.classification}] Plattformen mit Kennzahl: ${i.platformsWithMetric.join(', ') || '(keine)'} -- ${i.reason}`)
    }
  }

  const counts = {}
  for (const r of plan.platformRows) counts[r.action] = (counts[r.action] || 0) + 1
  console.log(`\n${DLINE}\n  Plattformwerte nach Aktion\n${DLINE}`)
  for (const [action, n] of Object.entries(counts)) console.log(`  ${action.padEnd(36)} ${n}`)

  console.log(`\n${DLINE}\n  Vollstaendige Vorschau (je Plattformwert)\n${DLINE}`)
  for (const r of plan.platformRows) {
    console.log(`\n  ${r.csvBandName}  →  Band: ${r.band.slug} (${r.band.id})  [status=${r.band.status} published=${r.band.is_published}]`)
    console.log(`    Plattform:        ${r.platform}   Zielprofil-ID: ${r.targetProfileId ?? '(kein Zielprofil)'}`)
    console.log(`    Bisher:           ${r.previousValue ?? '(nicht erfasst)'}  /  ${r.previousCheckedAt ?? '(kein Datum)'}`)
    console.log(`    Vorschlag:        ${r.proposedValue ?? '(keiner)'}  /  ${r.proposedCheckedAt ?? '(kein Datum)'}`)
    console.log(`    Aktion:           ${r.action}`)
    console.log(`    Begruendung:      ${r.reason}`)
    console.log(`    Oeffentlich sichtbar nach Import (heute): ${r.publiclyVisibleAfterImport ? 'ja' : 'nein'}`)
  }

  const visibleCount = plan.platformRows.filter((r) => r.publiclyVisibleAfterImport).length
  const actionable = plan.platformRows.filter((r) => r.action === PLATFORM_DECISION.SET || r.action === PLATFORM_DECISION.UPDATE)
  const conflictRows = plan.platformRows.filter((r) => r.action.startsWith('CONFLICT'))
  const skippedNewer = plan.platformRows.filter((r) => r.action === PLATFORM_DECISION.SKIP_TARGET_NEWER)
  const noTarget = plan.platformRows.filter((r) => r.action === PLATFORM_DECISION.SKIP_NO_TARGET_PROFILE)

  console.log(`\n${DLINE}\n  Zusammenfassung\n${DLINE}`)
  console.log(`  Geplante Schreibvorgaenge (SET+UPDATE):        ${actionable.length}`)
  console.log(`  Geschuetzte neuere Zielwerte (SKIP_TARGET_NEWER): ${skippedNewer.length}`)
  console.log(`  Konflikte (Entscheidung noetig):               ${conflictRows.length}`)
  console.log(`  Fehlende Zielprofile:                          ${noTarget.length}`)
  console.log(`  Fehlende/mehrdeutige Bandzuordnung:             ${plan.bandLevelIssues.length}`)
  console.log(`  Widerspruechliche Dubletten:                    ${plan.duplicateConflicts.length}`)
  console.log(`  Oeffentlich sichtbare Kennzahlen nach Import:   ${visibleCount}  (bezogen auf ${plan.generatedAt.slice(0, 10)})`)
}

// ─── EXECUTE (eine einzige atomare DB-Transaktion, alle oder keine) ──────────

async function runExecute() {
  if (!PLAN_PATH) {
    console.error('✗ --execute erfordert --plan=<Dry-Run-JSON>')
    process.exit(1)
  }
  if (!CONFIRM_BULK_EXECUTE) {
    console.error(`
✗ Execute blocked.
  Erst Dry Run + Freigabe der Vorschau, dann:
    --execute --plan=<Pfad> --confirm-bulk-execute
`)
    process.exit(1)
  }

  const plan = JSON.parse(readFileSync(PLAN_PATH, 'utf8'))
  const planRows = plan.platformRows.filter((r) => r.action === 'SET' || r.action === 'UPDATE')

  const backupDir = join(backupBaseDir(), timestampForBackupDir())

  console.log(`\n${DLINE}\n  migrate-social-metrics.mjs --execute\n  Plan:          ${PLAN_PATH} (erzeugt ${plan.generatedAt})\n  Backup-Ziel:   ${backupDir}\n  Zeilen im Plan (SET+UPDATE): ${planRows.length}\n${DLINE}`)

  mkdirSync(backupDir, { recursive: true })

  const { prod } = loadDirectPgConfigs()
  const client = new Client(prod)
  await client.connect()
  try {
    const result = await runAtomicImport({ client, planRows, backupDir })

    if (result.outcome === 'APPLIED') {
      console.log(`\n  ✓ APPLIED -- ${result.appliedCount} Zeilen atomar geschrieben (eine Transaktion, alle oder keine).`)
      console.log(`  ✓ Wiederherstellungsdaten gesichert unter: ${backupDir}`)
    } else if (result.outcome === 'ALL_ALREADY_APPLIED') {
      console.log(`\n  ℹ ALL_ALREADY_APPLIED -- alle Zielwerte entsprechen bereits exakt dem freigegebenen Endzustand. Kein Schreibvorgang ausgefuehrt.`)
    } else {
      console.log(`\n  ✗ ${result.outcome} -- Import gestoppt, KEINE Zeile geschrieben:`)
      for (const d of result.details) {
        console.log(`    - ${d.band.slug}/${d.platform} [${d.classification}] tatsaechlich: ${JSON.stringify(d.actual)}`)
      }
      process.exit(1)
    }
  } finally {
    await client.end()
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  if (RESTORE_DIR) { await runRestore(); return }
  if (EXECUTE) { await runExecute(); return }

  if (!CSV_PATH || !existsSync(CSV_PATH)) {
    console.error('✗ --csv=<Pfad-zur-CSV> fehlt oder Datei nicht gefunden. Die CSV liegt bewusst ausserhalb des Repos.')
    process.exit(1)
  }

  console.log(`\n${DLINE}\n  migrate-social-metrics.mjs  --dry-run (Default)\n  Supabase Project Ref: ${projectRefFromUrl(SUPABASE_URL)}\n  CSV:                  ${CSV_PATH}\n${DLINE}`)

  const csvText = readFileSync(CSV_PATH, 'utf8')
  const { records } = parseCsvRecords(csvText)
  const target = await loadTarget()
  console.log(`  Supabase Bands:              ${target.bandsCount}`)
  console.log(`  Supabase social_profiles (ig/fb/yt, mit URL): ${target.targetByBandPlatform.size}`)

  const now = new Date()
  const plan = buildPlan(records, target, now)
  printPlan(plan)

  if (OUT_PATH) {
    writeFileSync(OUT_PATH, JSON.stringify(plan, null, 2))
    console.log(`\n  ℹ Vollstaendige Vorschau (JSON) geschrieben nach: ${OUT_PATH}`)
  }

  console.log(`\n  ℹ Dry Run abgeschlossen -- kein Schreibvorgang ausgefuehrt.`)
}

main().catch((err) => {
  console.error('✗ Unerwarteter Fehler:', err.message)
  process.exit(1)
})
