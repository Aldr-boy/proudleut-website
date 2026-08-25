/**
 * migrate-social-profiles.mjs
 *
 * Social-Erstmigration: Instagram/Facebook/Spotify/YouTube-Profil-Links von
 * Airtable nach public.social_profiles. Insert-only -- bestehende Rows werden
 * niemals per UPDATE/DELETE veraendert (siehe supabase/social_profiles_admin_grant.sql
 * fuer den Schreibrechte-Kontext).
 *
 * Dry Run (liest nur, schreibt nie -- auch der Default ohne jedes Flag):
 *   node scripts/migrate-social-profiles.mjs
 *   node scripts/migrate-social-profiles.mjs --dry-run
 *   node scripts/migrate-social-profiles.mjs --dry-run --slug=quertreiber
 *
 * Echter Lauf (nur nach expliziter Freigabe):
 *   node scripts/migrate-social-profiles.mjs --execute --slug=quertreiber
 *   node scripts/migrate-social-profiles.mjs --execute --confirm-bulk-execute
 *
 * Migriert ausschliesslich:
 *   social_profiles -- band_id, platform, url (INSERT via ON CONFLICT DO NOTHING)
 *
 * Nicht Teil dieses Scripts:
 *   current_followers, current_following, last_checked_at werden nie gesetzt/veraendert.
 *   Bestehende Rows werden nie per UPDATE veraendert und nie geloescht.
 *
 * Quelle: Airtable-Tabelle "Bands", Felder "Social - Facebook/Instagram/Spotify/YouTube".
 * Die Datei /tmp/proudleut-social-audit/social_audit_candidates.csv aus dem vorherigen
 * Audit ist AUSDRUECKLICH KEINE Eingabe fuer dieses Script -- jeder Lauf liest Airtable
 * und Supabase frisch und berechnet die Klassifikation neu.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import {
  SUPPORTED_PLATFORMS,
  PLATFORM_FIELD,
  mapBandBySlug,
  classifySocialRow,
  classifyAfterRace,
} from './socialMigration/classify.mjs'

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
const EXECUTE = args.includes('--execute')
const DRY_RUN = !EXECUTE // Default ohne jedes Flag ist Dry-Run -- kein Write-Gate noetig, um sicher zu sein.
const slugArg = args.find(a => a.startsWith('--slug='))?.split('=')[1] ?? null
const CONFIRM_BULK_EXECUTE = args.includes('--confirm-bulk-execute')

// Bulk-Execute-Guard: identisches Muster wie scripts/migrate-bands.mjs.
if (EXECUTE && !slugArg && !CONFIRM_BULK_EXECUTE) {
  console.error(`
✗ Bulk execute blocked.
  Use --confirm-bulk-execute only after reviewing the dry-run output.

  Dry Run zuerst:
    node scripts/migrate-social-profiles.mjs --dry-run

  Danach Execute mit Bestätigung:
    node scripts/migrate-social-profiles.mjs --execute --confirm-bulk-execute

  Für Einzelband-Execute (kein Confirm nötig):
    node scripts/migrate-social-profiles.mjs --execute --slug=<slug>
`)
  process.exit(1)
}

// ─── ENV VARS ─────────────────────────────────────────────────────────────────

const AIRTABLE_TOKEN = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID
const AIRTABLE_BANDS_TABLE = process.env.AIRTABLE_BANDS_TABLE_NAME || 'Bands'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const missing = []
if (!AIRTABLE_TOKEN) missing.push('AIRTABLE_PERSONAL_ACCESS_TOKEN')
if (!AIRTABLE_BASE) missing.push('AIRTABLE_BASE_ID')
if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL')
if (!ANON_KEY) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
if (EXECUTE && !SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY (für --execute)')

if (missing.length > 0) {
  console.error(`✗ Fehlende Env-Variablen: ${missing.join(', ')}`)
  process.exit(1)
}

// ─── SUPABASE CLIENTS ─────────────────────────────────────────────────────────

const supabaseRead = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
const supabaseWrite = (EXECUTE && SERVICE_KEY)
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  : null

function projectRefFromUrl(url) {
  try { return new URL(url).hostname.split('.')[0] } catch { return '(unbekannt)' }
}

// ─── AIRTABLE (immer vollstaendig, unfiltiert, paginiert) ────────────────────

async function airtableRequest(table, params, attempt = 1) {
  const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(table)}`)
  if (params) {
    for (const [key, val] of Object.entries(params)) url.searchParams.append(key, String(val))
  }
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } })
  if (res.status === 429) {
    const wait = Math.min(2000 * attempt, 16000)
    console.warn(`  ⚠ Airtable Rate Limit – warte ${wait / 1000}s … (Versuch ${attempt}/5)`)
    if (attempt >= 5) throw new Error('Airtable Rate Limit nach 5 Versuchen nicht erholt')
    await new Promise(r => setTimeout(r, wait))
    return airtableRequest(table, params, attempt + 1)
  }
  if (!res.ok) throw new Error(`Airtable API ${res.status}: ${res.statusText}`)
  return res.json()
}

/**
 * Liest die komplette Bands-Tabelle unfiltriert (kein filterByFormula), damit
 * "Records gesamt" und "aktive/relevante Records" zwei unabhaengig beobachtbare
 * Zahlen bleiben (siehe Schritt 4 des Auftrags) -- kein Vertrauen in eine serverseitige
 * Formel, die im Fehlerfall unbemerkt Records verschlucken koennte.
 */
async function fetchAllBandRecords() {
  const records = []
  let offset = undefined
  let pages = 0
  do {
    const params = {}
    if (offset) params.offset = offset
    const data = await airtableRequest(AIRTABLE_BANDS_TABLE, params)
    pages++
    records.push(...data.records)
    offset = data.offset
  } while (offset)
  return { records, pages }
}

// ─── SUPABASE LESEN ───────────────────────────────────────────────────────────

async function loadSupabaseTarget() {
  const [bandsRes, socialRes] = await Promise.all([
    supabaseRead.from('bands').select('id, slug, status'),
    supabaseRead.from('social_profiles').select('band_id, platform, url, current_followers, current_following, last_checked_at').in('platform', SUPPORTED_PLATFORMS),
  ])
  if (bandsRes.error) throw new Error(`Supabase bands: ${bandsRes.error.message}`)
  if (socialRes.error) throw new Error(`Supabase social_profiles: ${socialRes.error.message}`)

  const bandsBySlug = new Map()
  for (const b of bandsRes.data) {
    if (!b.slug) continue
    if (!bandsBySlug.has(b.slug)) bandsBySlug.set(b.slug, [])
    bandsBySlug.get(b.slug).push(b)
  }

  const socialByBandPlatform = new Map()
  for (const row of socialRes.data) {
    socialByBandPlatform.set(`${row.band_id}::${row.platform}`, row)
  }

  return { bandsBySlug, socialByBandPlatform, bandsCount: bandsRes.data.length, socialCount: socialRes.data.length }
}

// ─── KLASSIFIKATION ALLER RELEVANTEN KOMBINATIONEN ────────────────────────────

function buildPlan(airtableRecords, target, slugFilter) {
  const relevant = airtableRecords.filter(r => r.fields['Webflow Status'] === 'Active')
  const scoped = slugFilter ? relevant.filter(r => (r.fields['Slug'] ?? '').trim() === slugFilter) : relevant

  const rows = []
  for (const r of scoped) {
    const airtableSlug = r.fields['Slug'] ?? null
    const bandMapping = mapBandBySlug(airtableSlug, target.bandsBySlug)

    for (const platform of SUPPORTED_PLATFORMS) {
      const sourceValue = r.fields[PLATFORM_FIELD[platform]]
      const targetRow = bandMapping.band
        ? target.socialByBandPlatform.get(`${bandMapping.band.id}::${platform}`)
        : undefined

      const result = classifySocialRow({ platform, sourceValue, bandMapping, targetRow })

      rows.push({
        airtable_record_id: r.id,
        source_band_name: r.fields['Bandname'] ?? '(kein Name)',
        airtable_slug: airtableSlug,
        supabase_band_id: bandMapping.band?.id ?? null,
        supabase_slug: bandMapping.band?.slug ?? null,
        platform,
        source_value: sourceValue ?? '',
        normalized_candidate: result.normalizedCandidate,
        target_value: targetRow?.url ?? null,
        dry_run_class: result.dryRunClass,
        reason: result.reason,
      })
    }
  }

  return { relevantCount: relevant.length, scopedCount: scoped.length, rows }
}

// ─── EXECUTE (insert-only, ON CONFLICT DO NOTHING) ────────────────────────────

async function executeInserts(insertRows) {
  const results = []
  let systemicFailure = null

  for (const row of insertRows) {
    if (systemicFailure) {
      results.push({ ...row, result: 'FAILED', detail: 'übersprungen nach systemischem Fehler' })
      continue
    }

    const { data, error } = await supabaseWrite
      .from('social_profiles')
      .upsert(
        [{ band_id: row.supabase_band_id, platform: row.platform, url: row.normalized_candidate }],
        { onConflict: 'band_id,platform', ignoreDuplicates: true }
      )
      .select('id, band_id, platform, url')

    if (error) {
      const code = error.code || ''
      const isSystemic = code === '42501' || code === '42P01' || code === '42703' || /permission denied|does not exist/i.test(error.message || '')
      if (isSystemic) {
        systemicFailure = { code, message: error.message }
        results.push({ ...row, result: 'FAILED', detail: `SYSTEMISCH: ${code} ${error.message}` })
        continue
      }
      results.push({ ...row, result: 'FAILED', detail: `${code} ${error.message}` })
      continue
    }

    if (data && data.length === 1) {
      results.push({ ...row, result: 'INSERTED', detail: `id=${data[0].id}` })
      continue
    }

    // Conflict wurde durch ON CONFLICT DO NOTHING ignoriert -- Zielrow erneut lesen,
    // niemals per Update reagieren.
    const { data: reread, error: rereadError } = await supabaseWrite
      .from('social_profiles')
      .select('id, url, current_followers, current_following, last_checked_at, updated_at')
      .eq('band_id', row.supabase_band_id)
      .eq('platform', row.platform)
      .single()

    if (rereadError || !reread) {
      results.push({ ...row, result: 'FAILED', detail: `Conflict, aber Reread fehlgeschlagen: ${rereadError?.message}` })
      continue
    }

    const raceClass = classifyAfterRace(row.normalized_candidate, reread)
    results.push({ ...row, result: raceClass, detail: `id=${reread.id} url=${reread.url}` })
  }

  return { results, systemicFailure }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

const DLINE = '─'.repeat(78)

async function main() {
  const mode = EXECUTE ? '--execute' : '--dry-run (Default)'
  console.log(`\n${DLINE}`)
  console.log(`  migrate-social-profiles.mjs  ${mode}`)
  console.log(`  Airtable Base:         ${AIRTABLE_BASE ? AIRTABLE_BASE.slice(0, 6) + '…' : '(fehlt)'}`)
  console.log(`  Supabase Project Ref:  ${projectRefFromUrl(SUPABASE_URL)}`)
  console.log(`  Mode:                  ${EXECUTE ? 'EXECUTE (schreibt!)' : 'DRY RUN (liest nur)'}`)
  console.log(`  Slug Scope:            ${slugArg ?? '(alle relevanten Bands)'}`)
  console.log(DLINE)

  console.log('\nLade Airtable (vollständig, paginiert) + Supabase-Zielzustand …')
  const [{ records: airtableRecords, pages }, target] = await Promise.all([
    fetchAllBandRecords(),
    loadSupabaseTarget(),
  ])

  const plan = buildPlan(airtableRecords, target, slugArg)

  console.log(`  Airtable pages read:          ${pages}`)
  console.log(`  Airtable records total:       ${airtableRecords.length}`)
  console.log(`  Airtable relevant (active):   ${plan.relevantCount}`)
  if (slugArg) console.log(`  Davon im Slug-Scope:          ${plan.scopedCount}`)
  console.log(`  Supabase Bands:               ${target.bandsCount}`)
  console.log(`  Supabase social_profiles:     ${target.socialCount}`)

  const counts = {}
  for (const row of plan.rows) counts[row.dry_run_class] = (counts[row.dry_run_class] || 0) + 1
  const ALL_CLASSES = ['INSERT', 'ALREADY_EQUAL', 'TARGET_ONLY', 'TARGET_CONFLICT', 'SKIP_EMPTY', 'INVALID_SOURCE', 'MISSING_TARGET_BAND', 'AMBIGUOUS_BAND', 'PLATFORM_MISMATCH', 'UNSUPPORTED_FORMAT']

  console.log(`\n${DLINE}`)
  console.log(`  Klassifikation`)
  console.log(DLINE)
  for (const c of ALL_CLASSES) console.log(`  ${c.padEnd(22)} ${counts[c] ?? 0}`)

  const conflicts = plan.rows.filter(r => r.dry_run_class === 'TARGET_CONFLICT')
  if (conflicts.length > 0) {
    console.log(`\n  TARGET_CONFLICT Details:`)
    for (const c of conflicts) {
      console.log(`    Band: ${c.source_band_name}  Slug: ${c.supabase_slug}  Plattform: ${c.platform}`)
      console.log(`      Source: ${c.normalized_candidate}`)
      console.log(`      Target: ${c.target_value}`)
    }
  }

  const insertRows = plan.rows.filter(r => r.dry_run_class === 'INSERT')

  if (!EXECUTE) {
    console.log(`\n  ℹ Dry Run abgeschlossen – kein Schreibvorgang ausgeführt.`)
    console.log(`  ℹ Geplante INSERT-Kandidaten: ${insertRows.length}`)
    console.log(`  ℹ Echter Lauf: node scripts/migrate-social-profiles.mjs --execute --slug=<slug>`)
    return
  }

  console.log(`\n${DLINE}`)
  console.log(`  EXECUTE — Insert-only, ON CONFLICT DO NOTHING`)
  console.log(DLINE)
  console.log(`  Geplant: ${insertRows.length}`)

  const { results, systemicFailure } = await executeInserts(insertRows)

  const tally = { INSERTED: 0, ALREADY_EQUAL_AFTER_RACE: 0, TARGET_CONFLICT_AFTER_RACE: 0, FAILED: 0 }
  for (const r of results) tally[r.result] = (tally[r.result] || 0) + 1

  for (const r of results) {
    console.log(`    ${r.result.padEnd(28)} ${r.source_band_name} / ${r.platform}  (${r.supabase_band_id})  ${r.detail}`)
  }

  console.log(`\n${DLINE}`)
  console.log(`  Execute-Zusammenfassung`)
  console.log(DLINE)
  console.log(`  planned:                     ${insertRows.length}`)
  console.log(`  inserted:                    ${tally.INSERTED}`)
  console.log(`  already_equal_after_race:    ${tally.ALREADY_EQUAL_AFTER_RACE}`)
  console.log(`  target_conflict_after_race:  ${tally.TARGET_CONFLICT_AFTER_RACE}`)
  console.log(`  failed:                      ${tally.FAILED}`)
  const sum = tally.INSERTED + tally.ALREADY_EQUAL_AFTER_RACE + tally.TARGET_CONFLICT_AFTER_RACE + tally.FAILED
  console.log(`  Konsistenz planned=sum:      ${insertRows.length === sum ? 'OK' : 'ABWEICHUNG!'}`)

  if (systemicFailure) {
    console.error(`\n  ✗ Systemischer Fehler erkannt: ${systemicFailure.code} ${systemicFailure.message}`)
    console.error(`  ✗ Weiterer Write-Lauf gestoppt. Verbleibende Rows als FAILED markiert.`)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('✗ Unerwarteter Fehler:', err.message)
  process.exit(1)
})
