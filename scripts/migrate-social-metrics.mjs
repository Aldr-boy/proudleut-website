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
 * Echter Lauf (erst nach Freigabe der Dry-Run-Vorschau, siehe README unten):
 *   node scripts/migrate-social-metrics.mjs --execute --plan=<Vorschau-JSON-Pfad> \
 *     --journal=<Rollback-Journal-Pfad> --confirm-bulk-execute
 *   node scripts/migrate-social-metrics.mjs --execute --plan=<Pfad> --journal=<Pfad> --band-id=<uuid>
 *
 * Rollback eines vorherigen Execute-Laufs:
 *   node scripts/migrate-social-metrics.mjs --restore=<Rollback-Journal-Pfad>
 *
 * --- Ausfuehrungsmodell fuer --execute (bewusst ohne neue RPC) ---
 * PostgREST/Supabase-JS bieten aus diesem Stack heraus keine
 * Mehrzeilen-Transaktion ohne eigene DB-Funktion. Da keine neue RPC ohne
 * nachgewiesene Notwendigkeit angelegt werden soll, ist "atomar" hier
 * bewusst pro-Zeile verstanden (ein einzelnes UPDATE ist in Postgres
 * atomar) plus:
 *   1. Optimistic-Concurrency-Check unmittelbar vor jedem Schreiben: die
 *      Zielrow wird frisch gelesen und mit dem im Plan festgehaltenen
 *      Ausgangswert (current_followers/last_checked_at zum Dry-Run-
 *      Zeitpunkt) verglichen. Bei Abweichung wird NUR diese Zeile
 *      uebersprungen (SKIPPED_DRIFT) und NICHT geschrieben -- keine
 *      zwischenzeitliche Admin-Pflege wird ueberschrieben.
 *   2. Ein Rollback-Journal (JSON-Lines) haelt zu jeder tatsaechlich
 *      geschriebenen Zeile Vorher-/Nachherzustand fest. `--restore`
 *      liest dieses Journal und stellt exakt die festgehaltenen
 *      Ausgangswerte wieder her -- nur wenn die Zielrow seither
 *      unveraendert dem "Nachher"-Zustand entspricht (sonst Meldung statt
 *      stillem Ueberschreiben).
 *   3. Systemischer-Fehler-Stop wie in scripts/migrate-social-profiles.mjs
 *      (Permission/Schema-Fehler stoppen weitere Schreibvorgaenge sofort).
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
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
const RESTORE_PATH = flag('restore')
const CSV_PATH = flag('csv')
const OUT_PATH = flag('out')
const PLAN_PATH = flag('plan')
const JOURNAL_PATH = flag('journal')
const BAND_ID_SCOPE = flag('band-id')
const CONFIRM_BULK_EXECUTE = args.includes('--confirm-bulk-execute')

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

// ─── RESTORE-MODUS ────────────────────────────────────────────────────────────

async function runRestore() {
  console.log(`\n${DLINE}\n  migrate-social-metrics.mjs --restore\n  Journal: ${RESTORE_PATH}\n${DLINE}`)
  const lines = readFileSync(RESTORE_PATH, 'utf8').split('\n').filter((l) => l.trim())
  const entries = lines.map((l) => JSON.parse(l))
  console.log(`  Journal-Eintraege: ${entries.length}`)

  let restored = 0, skippedDrift = 0, failed = 0
  for (const entry of entries) {
    const { data: current, error } = await supabase
      .from('social_profiles')
      .select('id, current_followers, last_checked_at')
      .eq('id', entry.profileId)
      .single()
    if (error || !current) {
      console.log(`  ✗ FAILED    id=${entry.profileId} -- Zielrow nicht lesbar: ${error?.message}`)
      failed++
      continue
    }
    const matchesAfter = current.current_followers === entry.after.current_followers && current.last_checked_at === entry.after.after_last_checked_at_iso
    if (!matchesAfter) {
      console.log(`  ⚠ SKIPPED_DRIFT  id=${entry.profileId} -- Zielrow wurde seit dem Schreiben veraendert, kein Restore (aktuell: ${current.current_followers}/${current.last_checked_at})`)
      skippedDrift++
      continue
    }
    const { error: updErr } = await supabase
      .from('social_profiles')
      .update({ current_followers: entry.before.current_followers, last_checked_at: entry.before.last_checked_at })
      .eq('id', entry.profileId)
    if (updErr) {
      console.log(`  ✗ FAILED    id=${entry.profileId} -- Restore-Update fehlgeschlagen: ${updErr.message}`)
      failed++
      continue
    }
    console.log(`  ✓ RESTORED  id=${entry.profileId} -> ${entry.before.current_followers}/${entry.before.last_checked_at}`)
    restored++
  }
  console.log(`\n  restored=${restored} skipped_drift=${skippedDrift} failed=${failed}`)
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

// ─── EXECUTE (nur SET/UPDATE, mit Drift-Check + Rollback-Journal) ─────────────

async function runExecute() {
  if (!PLAN_PATH || !JOURNAL_PATH) {
    console.error('✗ --execute erfordert --plan=<Dry-Run-JSON> und --journal=<Rollback-Journal-Pfad>')
    process.exit(1)
  }
  if (!BAND_ID_SCOPE && !CONFIRM_BULK_EXECUTE) {
    console.error(`
✗ Bulk execute blocked.
  Erst Dry Run + Freigabe der Vorschau, dann:
    --execute --plan=<Pfad> --journal=<Pfad> --confirm-bulk-execute
  oder auf eine Band begrenzt:
    --execute --plan=<Pfad> --journal=<Pfad> --band-id=<uuid>
`)
    process.exit(1)
  }

  const plan = JSON.parse(readFileSync(PLAN_PATH, 'utf8'))
  let writable = plan.platformRows.filter((r) => r.action === 'SET' || r.action === 'UPDATE')
  if (BAND_ID_SCOPE) writable = writable.filter((r) => r.band.id === BAND_ID_SCOPE)

  console.log(`\n${DLINE}\n  migrate-social-metrics.mjs --execute\n  Plan:    ${PLAN_PATH} (erzeugt ${plan.generatedAt})\n  Journal: ${JOURNAL_PATH}\n  Geplante Schreibvorgaenge: ${writable.length}\n${DLINE}`)

  let written = 0, skippedDrift = 0, failed = 0
  let systemicFailure = null

  for (const row of writable) {
    if (systemicFailure) { console.log(`  ⏭ uebersprungen nach systemischem Fehler: ${row.csvBandName}/${row.platform}`); continue }

    const { data: current, error: readErr } = await supabase
      .from('social_profiles')
      .select('id, current_followers, last_checked_at')
      .eq('id', row.targetProfileId)
      .single()
    if (readErr || !current) {
      console.log(`  ✗ FAILED  ${row.csvBandName}/${row.platform} -- Zielrow nicht lesbar: ${readErr?.message}`)
      failed++
      continue
    }
    const driftedFollowers = current.current_followers !== row.previousValue
    const driftedDate = (current.last_checked_at ?? null) !== (row.previousCheckedAt ?? null)
    if (driftedFollowers || driftedDate) {
      console.log(`  ⚠ SKIPPED_DRIFT  ${row.csvBandName}/${row.platform} -- Zielwert hat sich seit dem Dry-Run geaendert (jetzt: ${current.current_followers}/${current.last_checked_at}), NICHT geschrieben`)
      skippedDrift++
      continue
    }

    const { error: updErr } = await supabase
      .from('social_profiles')
      .update({ current_followers: row.proposedValue, last_checked_at: row.proposedCheckedAt })
      .eq('id', row.targetProfileId)

    if (updErr) {
      const code = updErr.code || ''
      const isSystemic = code === '42501' || code === '42P01' || code === '42703' || /permission denied|does not exist/i.test(updErr.message || '')
      console.log(`  ✗ FAILED  ${row.csvBandName}/${row.platform} -- ${code} ${updErr.message}`)
      failed++
      if (isSystemic) systemicFailure = { code, message: updErr.message }
      continue
    }

    appendFileSync(JOURNAL_PATH, JSON.stringify({
      profileId: row.targetProfileId,
      band_id: row.band.id,
      platform: row.platform,
      before: { current_followers: row.previousValue, last_checked_at: row.previousCheckedAt },
      after: { current_followers: row.proposedValue, after_last_checked_at_iso: row.proposedCheckedAt },
      writtenAt: new Date().toISOString(),
    }) + '\n')

    console.log(`  ✓ WRITTEN  ${row.csvBandName}/${row.platform}  ${row.previousValue ?? '(leer)'} → ${row.proposedValue}`)
    written++
  }

  console.log(`\n  written=${written} skipped_drift=${skippedDrift} failed=${failed}`)
  if (systemicFailure) {
    console.error(`\n  ✗ Systemischer Fehler: ${systemicFailure.code} ${systemicFailure.message} -- weiterer Lauf gestoppt.`)
    process.exit(1)
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  if (RESTORE_PATH) { await runRestore(); return }
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
