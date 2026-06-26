/**
 * migrate-band-videos.mjs
 *
 * Migrationsscript: Airtable "YouTube Video Link" → Supabase "videos" (platform='youtube').
 *
 * Standard: Dry-Run (kein Schreiben).
 * Write-Modus: erfordert explizit BEIDE Flags gleichzeitig:
 *   --write UND --confirm-delete-insert-video-migration
 *
 * Ausführen:
 *   node scripts/migrate-band-videos.mjs
 *   node scripts/migrate-band-videos.mjs --slug=donnaweda
 *   node scripts/migrate-band-videos.mjs --write --confirm-delete-insert-video-migration
 *
 * Datenquellen:
 *   Airtable-Feld "YouTube Video Link"  → videos.url  (Embed-Video)
 *   Nicht: "Social - YouTube"           → social_profiles (Kanal-Link, bereits migriert)
 *
 * Write-Strategie (nur bei doppeltem Flag + bestandenem Pre-Flight):
 *   Kein Upsert (kein bestätigter UNIQUE-Constraint auf videos(band_id, platform)).
 *   Kontrolliertes DELETE + INSERT pro band_id + platform = 'youtube'.
 *   Kein globaler DELETE. Kein DELETE nur nach platform. Scope: band_id + platform = 'youtube'.
 *   Keine Transaktion über den gesamten Lauf (PostgREST-Limitation) — DELETE+INSERT sequenziell.
 *   Harte Pre-Flight-Re-Count-Prüfung vor erstem Write.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

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
      const key   = trimmed.slice(0, eqIdx).trim()
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
      if (key && !(key in process.env)) process.env[key] = value
    }
  } catch {
    console.error('✗ .env.local nicht lesbar – Datei vorhanden?')
    process.exit(1)
  }
}

loadEnv()

// ─── CLI FLAGS ─────────────────────────────────────────────────────────────────
//
// GATE 1: Doppel-Flag-Prüfung.
//
// Diese Prüfung steht strukturell vor jeder Stelle, an der ein Supabase-Client
// mit Schreibmethoden (.insert, .delete, .update, .upsert) überhaupt erreichbar ist.
// Kein Write-Call kann ohne bestandes Gate 1 + Gate 2 (Pre-Flight) erreicht werden.

const args = process.argv.slice(2)

const HAS_WRITE   = args.includes('--write')
const HAS_CONFIRM = args.includes('--confirm-delete-insert-video-migration')

// Einzelnes Write-Flag ohne das andere → sofort abbrechen, vor jeder Client-Erstellung
if (HAS_WRITE && !HAS_CONFIRM) {
  console.error(`
✗ --write alleine reicht nicht aus. Fehlender zweiter Flag:
  --confirm-delete-insert-video-migration

  Echte DB-Writes erfordern explizit BEIDE Flags gleichzeitig:
    node scripts/migrate-band-videos.mjs --write --confirm-delete-insert-video-migration

  Dry-Run (kein Flag):
    node scripts/migrate-band-videos.mjs
`)
  process.exit(1)
}

if (HAS_CONFIRM && !HAS_WRITE) {
  console.error(`
✗ --confirm-delete-insert-video-migration alleine reicht nicht aus. Fehlender zweiter Flag:
  --write

  Echte DB-Writes erfordern explizit BEIDE Flags gleichzeitig:
    node scripts/migrate-band-videos.mjs --write --confirm-delete-insert-video-migration

  Dry-Run (kein Flag):
    node scripts/migrate-band-videos.mjs
`)
  process.exit(1)
}

// Unbekannte Flags abfangen
const KNOWN_FLAGS = new Set([
  '--slug',
  '--write',
  '--confirm-delete-insert-video-migration',
])
const unknownFlags = args.filter(a => {
  if (a.startsWith('--slug=')) return false
  return !KNOWN_FLAGS.has(a)
})
if (unknownFlags.length > 0) {
  console.error(`✗ Unbekannte Flags: ${unknownFlags.join(', ')}`)
  console.error(`  Erlaubte Flags: --slug=<slug>, --write, --confirm-delete-insert-video-migration`)
  process.exit(1)
}

const slugArg = args.find(a => a.startsWith('--slug='))?.split('=')[1] ?? null

// WRITE_MODE ist nur true, wenn BEIDE Flags gleichzeitig gesetzt sind (Gate 1 bestanden)
const WRITE_MODE = HAS_WRITE && HAS_CONFIRM

// --slug ist im Write-Modus verboten (Pre-Flight würde sowieso fehlschlagen, aber explizit besser)
if (WRITE_MODE && slugArg) {
  console.error(`
✗ --slug ist im Write-Modus nicht erlaubt.

  Der Write-Modus migriert immer alle Bands (Pre-Flight prüft Gesamtzahlen).
  --slug kann nur im Dry-Run verwendet werden.
`)
  process.exit(1)
}

// ─── ENV VARS ─────────────────────────────────────────────────────────────────

const AIRTABLE_TOKEN  = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
const AIRTABLE_BASE   = process.env.AIRTABLE_BASE_ID
const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY        = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY
const BANDS_TABLE     = process.env.AIRTABLE_BANDS_TABLE_NAME ?? 'Bands'

const missing = []
if (!AIRTABLE_TOKEN) missing.push('AIRTABLE_PERSONAL_ACCESS_TOKEN')
if (!AIRTABLE_BASE)  missing.push('AIRTABLE_BASE_ID')
if (!SUPABASE_URL)   missing.push('NEXT_PUBLIC_SUPABASE_URL')
if (!ANON_KEY)       missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
if (WRITE_MODE && !SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY (erforderlich für Write-Modus)')

if (missing.length > 0) {
  console.error(`✗ Fehlende Env-Variablen: ${missing.join(', ')}`)
  process.exit(1)
}

// ─── SUPABASE CLIENTS ─────────────────────────────────────────────────────────
//
// supabase       — anon key, ausschließlich read-only (SELECT)
// supabaseService — service role, nur erstellt wenn WRITE_MODE === true
//                   d.h. nur nach bestandenem Gate 1

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Service-Role-Client: nur instanziiert wenn Write-Modus aktiv (beide Flags bestanden)
const supabaseService = WRITE_MODE
  ? createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

// ─── YOUTUBE-URL-VALIDIERUNG ──────────────────────────────────────────────────
//
// IDENTISCH mit getYouTubeEmbedUrl() in app/band/[slug]/page.tsx, Zeilen 37–58.
// Keine Anpassungen, keine Erweiterungen.
// Gilt als korrekt wenn: Laufzeit rendert genau die URLs, die dieses Script
// als VALID markiert — und rendert nicht, was dieses Script als INVALID markiert.
//
// Validierung identisch mit Laufzeit-Funktion getYouTubeEmbedUrl(),
// Stand Zeile 37 in app/band/[slug]/page.tsx

function getYouTubeEmbedUrl(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    let id = null
    if (u.hostname === 'youtu.be') {
      id = u.pathname.slice(1).split('?')[0]
    } else if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') {
        id = u.searchParams.get('v')
      } else if (u.pathname.startsWith('/embed/')) {
        id = u.pathname.replace('/embed/', '').split('?')[0]
      } else if (u.pathname.startsWith('/shorts/')) {
        id = u.pathname.replace('/shorts/', '').split('?')[0]
      }
    }
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null
    return `https://www.youtube-nocookie.com/embed/${id}`
  } catch {
    return null
  }
}

// ─── PLACEHOLDER-ERKENNUNG ────────────────────────────────────────────────────

// Bekannte Placeholder-URLs aus dem Supabase-Seed (historisch, nicht valide)
const KNOWN_PLACEHOLDERS = new Set([
  'https://www.youtube.com/watch?v=donnaweda-oberkoelitz',
])

function isPlaceholderUrl(url) {
  if (!url) return false
  if (KNOWN_PLACEHOLDERS.has(url)) return true
  // Jede URL, die nicht durch getYouTubeEmbedUrl validiert werden kann,
  // ist funktional ein Placeholder (rendert nie)
  return getYouTubeEmbedUrl(url) === null
}

// ─── AIRTABLE ─────────────────────────────────────────────────────────────────

async function airtableRequest(table, params, attempt = 1) {
  const url = new URL(
    `https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(table)}`
  )
  for (const [key, val] of Object.entries(params)) {
    if (Array.isArray(val)) val.forEach(v => url.searchParams.append(key, v))
    else url.searchParams.append(key, String(val))
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
  })

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

async function fetchAirtableBands() {
  const records = []
  let offset = undefined

  do {
    const params = {
      filterByFormula: `{Webflow Status}='Active'`,
      'sort[0][field]':     'Bandname',
      'sort[0][direction]': 'asc',
    }
    if (offset) params.offset = offset

    const data = await airtableRequest(BANDS_TABLE, params)
    records.push(...data.records)
    offset = data.offset
  } while (offset)

  return records
}

// ─── SUPABASE LESEN ───────────────────────────────────────────────────────────

async function loadSupabaseData() {
  const [bandsRes, videosRes] = await Promise.all([
    supabase
      .from('bands')
      .select('id, name, slug, status, is_published')
      .order('slug'),
    supabase
      .from('videos')
      .select('id, band_id, platform, url, sort_order'),
  ])

  if (bandsRes.error)  throw new Error(`Supabase bands: ${bandsRes.error.message}`)
  if (videosRes.error) throw new Error(`Supabase videos: ${videosRes.error.message}`)

  const bandsBySlug = new Map((bandsRes.data ?? []).map(b => [b.slug, b]))

  // Index: band_id → alle Video-Rows dieser Band
  const videosByBandId = new Map()
  for (const v of (videosRes.data ?? [])) {
    if (!videosByBandId.has(v.band_id)) videosByBandId.set(v.band_id, [])
    videosByBandId.get(v.band_id).push(v)
  }

  return {
    bandsBySlug,
    videosByBandId,
    totalBands:  bandsRes.data?.length  ?? 0,
    totalVideos: videosRes.data?.length ?? 0,
    allVideos:   videosRes.data ?? [],
  }
}

// ─── MIGRATIONSPLAN BERECHNEN ─────────────────────────────────────────────────
//
// Pure function: nimmt geladene Daten, gibt stats + report zurück.
// Wird im Dry-Run und als Pre-Flight-Re-Count im Write-Modus verwendet.

function buildMigrationPlan(records, sbData) {
  const { bandsBySlug, videosByBandId, totalBands, totalVideos, allVideos } = sbData

  const stats = {
    airtableTotal:           records.length,
    airtableWithVideoLink:   0,
    airtableValidUrl:        0,
    airtableInvalidUrl:      0,
    airtableEmptyLink:       0,
    supabaseTotal:           totalBands,
    supabaseVideoTotal:      totalVideos,
    supabaseYouTubeRows:     0,
    supabaseInvalidRows:     0,
    matched:                 0,
    unmatched:               0,
    plannedInsert:           0,
    plannedReplace:          0,
    cleanupCandidates:       0,
    existingWithoutSource:   0,
  }

  const report = {
    plannedInserts:       [],  // { bandName, slug, bandId, url, embedUrl }
    plannedReplaces:      [],  // { bandName, slug, bandId, oldUrl, newUrl, embedUrl, isDonnaweda, isPlaceholder }
    invalidUrls:          [],  // { bandName, slug, url, reason }
    unmatched:            [],  // { airtableName, slug }
    allSbYouTubeRows:     [],  // { bandName, slug, url, isValid }
    cleanupCandidates:    [],  // { bandName, slug, url, reason }
    existingWithoutSrc:   [],  // { bandName, slug, sbUrl }
    donnawedaDetail:      null,
  }

  // Supabase youtube-Rows vorauswerten
  for (const v of allVideos) {
    if (v.platform !== 'youtube') continue
    stats.supabaseYouTubeRows++
    const band = [...bandsBySlug.values()].find(b => b.id === v.band_id)
    const bandName = band?.name ?? `(id: ${v.band_id})`
    const bandSlug = band?.slug ?? ''
    const isValid  = getYouTubeEmbedUrl(v.url) !== null
    if (!isValid) stats.supabaseInvalidRows++
    report.allSbYouTubeRows.push({ bandName, slug: bandSlug, url: v.url, isValid })
  }

  // Pro-Band-Analyse
  for (const record of records) {
    const f        = record.fields
    const bandName = f['Bandname']?.trim() ?? '(kein Name)'
    const slug     = f['Slug']?.trim()?.toLowerCase() ?? ''

    const supaBand = slug ? bandsBySlug.get(slug) : null
    if (!supaBand) {
      stats.unmatched++
      report.unmatched.push({ airtableName: bandName, slug })
      continue
    }
    stats.matched++

    // Ausschließlich "YouTube Video Link" — NICHT "Social - YouTube"
    const ytVideoLink = f['YouTube Video Link']?.trim() ?? ''

    if (!ytVideoLink) {
      stats.airtableEmptyLink++

      // Prüfe ob Supabase bereits eine YouTube-Row hat → existingWithoutSource
      const sbVideos = videosByBandId.get(supaBand.id) ?? []
      const sbYt     = sbVideos.filter(v => v.platform === 'youtube')
      if (sbYt.length > 0) {
        for (const v of sbYt) {
          stats.existingWithoutSource++
          const isValid = getYouTubeEmbedUrl(v.url) !== null
          if (!isValid) {
            stats.cleanupCandidates++
            report.cleanupCandidates.push({
              bandName,
              slug,
              url:    v.url,
              reason: 'Airtable-Quelle leer; bestehende Supabase-Row ist ungültig/Placeholder',
            })
          }
          report.existingWithoutSrc.push({ bandName, slug, sbUrl: v.url })
        }
      }
      continue
    }

    stats.airtableWithVideoLink++

    const embedUrl = getYouTubeEmbedUrl(ytVideoLink)

    if (!embedUrl) {
      stats.airtableInvalidUrl++
      let reason = 'Ungültige YouTube-URL oder Video-ID ≠ 11 Zeichen'
      try {
        const u = new URL(ytVideoLink)
        if (!u.hostname.includes('youtube.com') && u.hostname !== 'youtu.be') {
          reason = `Kein YouTube-Hostname: ${u.hostname}`
        } else {
          reason = 'Kein gültiger Video-ID-Pfad oder ID ≠ 11 Zeichen'
        }
      } catch {
        reason = 'Keine gültige URL (URL-Parse-Fehler)'
      }
      report.invalidUrls.push({ bandName, slug, url: ytVideoLink, reason })
      continue
    }

    stats.airtableValidUrl++

    const sbVideos   = videosByBandId.get(supaBand.id) ?? []
    const sbYtVideos = sbVideos.filter(v => v.platform === 'youtube')

    const isDonnaweda = slug === 'donnaweda'

    if (sbYtVideos.length === 0) {
      stats.plannedInsert++
      report.plannedInserts.push({
        bandName, slug, bandId: supaBand.id, url: ytVideoLink, embedUrl,
      })
    } else {
      stats.plannedReplace++
      const existing = sbYtVideos[0]
      const detail = {
        bandName,
        slug,
        bandId:        supaBand.id,
        oldUrl:        existing.url,
        newUrl:        ytVideoLink,
        embedUrl,
        isDonnaweda,
        oldIsValid:    getYouTubeEmbedUrl(existing.url) !== null,
        isPlaceholder: isPlaceholderUrl(existing.url),
      }
      report.plannedReplaces.push(detail)

      if (isDonnaweda) {
        report.donnawedaDetail = {
          supabasePlaceholderUrl:   existing.url,
          supabasePlaceholderValid: getYouTubeEmbedUrl(existing.url) !== null,
          airtableSourceUrl:        ytVideoLink,
          airtableEmbedUrl:         embedUrl,
          action: 'PLANNED REPLACE – DELETE placeholder, INSERT Airtable-URL',
        }
      }
    }
  }

  return { stats, report }
}

// ─── DRY-RUN-REPORT DRUCKEN ───────────────────────────────────────────────────

function printDryRunReport(stats, report, totalBands, totalVideos, LINE, DLINE) {
  console.log(`\n${DLINE}`)
  console.log(`  Zusammenfassung  [DRY RUN – kein Schreiben]`)
  console.log(DLINE)
  console.log(``)
  console.log(`  AIRTABLE`)
  console.log(`    Bands gesamt (gefiltert):       ${stats.airtableTotal}`)
  console.log(`    Mit YouTube Video Link:         ${stats.airtableWithVideoLink}`)
  console.log(`    Ohne YouTube Video Link:        ${stats.airtableEmptyLink}`)
  console.log(`    Gültige YouTube-URLs:           ${stats.airtableValidUrl}`)
  console.log(`    Ungültige YouTube-URLs:         ${stats.airtableInvalidUrl}`)
  console.log(``)
  console.log(`  SUPABASE`)
  console.log(`    Bands gesamt:                   ${stats.supabaseTotal}`)
  console.log(`    Gematchte Bands:                ${stats.matched}`)
  console.log(`    Kein Slug-Match:                ${stats.unmatched}`)
  console.log(`    Videos-Rows gesamt:             ${stats.supabaseVideoTotal}`)
  console.log(`    YouTube-Rows gesamt:            ${stats.supabaseYouTubeRows}`)
  console.log(`    Ungültige YouTube-Rows:         ${stats.supabaseInvalidRows}`)
  console.log(``)
  console.log(`  PLAN (Write-Strategie: DELETE+INSERT, kein Upsert)`)
  console.log(`    Planned Inserts:                ${stats.plannedInsert}`)
  console.log(`    Planned Replaces:               ${stats.plannedReplace}`)
  console.log(`    Cleanup Candidates:             ${stats.cleanupCandidates}`)
  console.log(`    Existing rows without source:   ${stats.existingWithoutSource}`)

  if (report.allSbYouTubeRows.length > 0) {
    console.log(`\n${LINE}`)
    console.log(`  Bestehende Supabase-YouTube-Rows (gesamt)`)
    console.log(LINE)
    for (const { bandName, slug, url, isValid } of report.allSbYouTubeRows) {
      const mark = isValid ? '✓' : '✗ INVALID'
      console.log(`  ${mark}  ${bandName} (${slug})`)
      console.log(`       URL: ${url}`)
    }
  }

  if (report.donnawedaDetail) {
    console.log(`\n${LINE}`)
    console.log(`  SONDERFALL: Donnaweda (Placeholder-Bereinigung)`)
    console.log(LINE)
    const d = report.donnawedaDetail
    console.log(`  Supabase aktuell (Placeholder): ${d.supabasePlaceholderUrl}`)
    console.log(`  Placeholder gültig?             ${d.supabasePlaceholderValid ? 'ja' : 'nein'}`)
    console.log(`  Airtable-Quelle:                ${d.airtableSourceUrl}`)
    console.log(`  Geplante Embed-URL:             ${d.airtableEmbedUrl}`)
    console.log(`  Geplante Aktion:                ${d.action}`)
  }

  if (report.plannedInserts.length > 0) {
    console.log(`\n${LINE}`)
    console.log(`  Planned Inserts (erste 10 von ${report.plannedInserts.length})`)
    console.log(LINE)
    for (const { bandName, slug, url, embedUrl } of report.plannedInserts.slice(0, 10)) {
      console.log(`  + ${bandName} (${slug})`)
      console.log(`    URL:      ${url}`)
      console.log(`    Embed:    ${embedUrl}`)
    }
    if (report.plannedInserts.length > 10) {
      console.log(`  … und ${report.plannedInserts.length - 10} weitere`)
    }
  }

  if (report.plannedReplaces.length > 0) {
    console.log(`\n${LINE}`)
    console.log(`  Planned Replaces (erste 10 von ${report.plannedReplaces.length})`)
    console.log(LINE)
    for (const { bandName, slug, oldUrl, newUrl, embedUrl, isPlaceholder } of report.plannedReplaces.slice(0, 10)) {
      const tag = isPlaceholder ? ' [Placeholder]' : ''
      console.log(`  ↻ ${bandName} (${slug})${tag}`)
      console.log(`    Alt:      ${oldUrl}`)
      console.log(`    Neu:      ${newUrl}`)
      console.log(`    Embed:    ${embedUrl}`)
    }
    if (report.plannedReplaces.length > 10) {
      console.log(`  … und ${report.plannedReplaces.length - 10} weitere`)
    }
  }

  if (report.invalidUrls.length > 0) {
    console.log(`\n${LINE}`)
    console.log(`  Ungültige Airtable-URLs (nicht migrierbar)`)
    console.log(LINE)
    for (const { bandName, slug, url, reason } of report.invalidUrls) {
      console.log(`  ✗ ${bandName} (${slug})`)
      console.log(`    URL:    ${url}`)
      console.log(`    Grund:  ${reason}`)
    }
  }

  if (report.unmatched.length > 0) {
    console.log(`\n${LINE}`)
    console.log(`  Kein Supabase-Slug-Match (alle)`)
    console.log(LINE)
    for (const { airtableName, slug } of report.unmatched) {
      console.log(`  ✗ "${airtableName}" (slug: "${slug}")`)
    }
  }

  if (report.cleanupCandidates.length > 0) {
    console.log(`\n${LINE}`)
    console.log(`  Cleanup Candidates (Supabase-Row ungültig, Airtable-Quelle leer)`)
    console.log(LINE)
    for (const { bandName, slug, url, reason } of report.cleanupCandidates) {
      console.log(`  ⚠ ${bandName} (${slug})`)
      console.log(`    URL:   ${url}`)
      console.log(`    Grund: ${reason}`)
    }
  }

  if (report.existingWithoutSrc.length > 0) {
    console.log(`\n${LINE}`)
    console.log(`  Existing Supabase-Rows ohne Airtable-Quelle`)
    console.log(LINE)
    for (const { bandName, slug, sbUrl } of report.existingWithoutSrc) {
      console.log(`  ~ ${bandName} (${slug})`)
      console.log(`    Supabase-URL: ${sbUrl}`)
    }
  }

  console.log(`\n${DLINE}`)
  console.log(`  DRY RUN abgeschlossen — kein Schreibvorgang ausgeführt.`)
  console.log(``)
  console.log(`  Write-Strategie: DELETE + INSERT (kein Upsert)`)
  console.log(`  Kein bestätigter UNIQUE-Constraint auf videos(band_id, platform).`)
  console.log(`  Keine Transaktion über den Gesamtlauf (PostgREST-Limitation).`)
  console.log(``)
  console.log(`  Write-Modus (nach Freigabe):`)
  console.log(`    node scripts/migrate-band-videos.mjs --write --confirm-delete-insert-video-migration`)
  console.log(DLINE)
  console.log(``)
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

;(async () => {
  const DLINE = '═'.repeat(66)
  const LINE  = '─'.repeat(66)

  const modeLabel = WRITE_MODE ? 'WRITE – DB-Schreibzugriffe aktiv' : 'DRY RUN – read-only'
  console.log(`\n${DLINE}`)
  console.log(`  migrate-band-videos.mjs  [${modeLabel}]`)
  if (slugArg) console.log(`  Slug-Filter: ${slugArg}`)
  console.log(`  Validierung identisch mit Laufzeit-Funktion getYouTubeEmbedUrl(),`)
  console.log(`  Stand Zeile 37 in app/band/[slug]/page.tsx`)
  console.log(DLINE)

  // ── Daten laden ────────────────────────────────────────────────────────────
  console.log('\nLade Airtable + Supabase-Daten …')

  const [airtableRecords, sbData] = await Promise.all([
    fetchAirtableBands(),
    loadSupabaseData(),
  ])

  const { totalBands, totalVideos } = sbData

  console.log(`  Airtable aktive Bands:          ${airtableRecords.length}`)
  console.log(`  Supabase-Bands gesamt:          ${totalBands}`)
  console.log(`  Supabase videos-Rows gesamt:    ${totalVideos}`)

  // ── Slug-Filter (nur Dry-Run) ───────────────────────────────────────────────
  let records = airtableRecords
  if (slugArg) {
    records = records.filter(r =>
      r.fields['Slug']?.trim()?.toLowerCase() === slugArg.toLowerCase()
    )
    if (records.length === 0) {
      console.error(`\n✗ Keine aktive Band mit Slug "${slugArg}" in Airtable gefunden`)
      process.exit(1)
    }
  }

  // ── Migrationsplan berechnen ────────────────────────────────────────────────
  const { stats, report } = buildMigrationPlan(records, sbData)

  // ══════════════════════════════════════════════════════════════════════════════
  // DRY-RUN-PFAD: kein Write-Code erreichbar ab hier
  // ══════════════════════════════════════════════════════════════════════════════
  if (!WRITE_MODE) {
    printDryRunReport(stats, report, totalBands, totalVideos, LINE, DLINE)
    return
    // ← Script endet hier im Dry-Run. Kein Supabase-Write-Code wird jemals erreicht.
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // WRITE-PFAD
  //
  // Nur erreichbar wenn WRITE_MODE === true
  // = Gate 1 bestanden (beide Flags: --write + --confirm-delete-insert-video-migration)
  //
  // GATE 2: Pre-Flight-Re-Count
  // Harte Prüfung der Migrationszahlen unmittelbar vor dem ersten Write.
  // Bei jeder Abweichung: sofort abbrechen, nichts schreiben.
  // ══════════════════════════════════════════════════════════════════════════════

  console.log(`\n${LINE}`)
  console.log(`  PRE-FLIGHT RE-COUNT (Gate 2) – Prüfe Migrationszahlen vor erstem Write …`)
  console.log(LINE)

  // Erwartete Zahlen (fixiert durch Dry-Run-Freigabe)
  const EXPECTED = {
    airtableTotal:         142,
    airtableWithVideoLink: 101,
    airtableValidUrl:       98,
    airtableInvalidUrl:      3,
    matched:               142,
    unmatched:               0,
    plannedInsert:          97,
    plannedReplace:          1,
  }
  const EXPECTED_REPLACE_SLUG    = 'donnaweda'
  const EXPECTED_REPLACE_OLD_URL = 'https://www.youtube.com/watch?v=donnaweda-oberkoelitz'
  const EXPECTED_REPLACE_NEW_URL = 'https://www.youtube.com/watch?v=Kb4G0sWa68Y'

  const deviations = []

  for (const [key, expected] of Object.entries(EXPECTED)) {
    const actual = stats[key]
    if (actual !== expected) {
      deviations.push(`  ✗ ${key}: erwartet ${expected}, ist ${actual}`)
    }
  }

  // Planned Replace muss Donnaweda sein
  const replace0 = report.plannedReplaces[0]
  if (!replace0 || replace0.slug !== EXPECTED_REPLACE_SLUG) {
    deviations.push(
      `  ✗ plannedReplaces[0].slug: erwartet "${EXPECTED_REPLACE_SLUG}", ist "${replace0?.slug ?? 'undefined'}"`
    )
  }
  if (!replace0 || replace0.oldUrl !== EXPECTED_REPLACE_OLD_URL) {
    deviations.push(
      `  ✗ plannedReplaces[0].oldUrl: erwartet "${EXPECTED_REPLACE_OLD_URL}", ist "${replace0?.oldUrl ?? 'undefined'}"`
    )
  }
  if (!replace0 || replace0.newUrl !== EXPECTED_REPLACE_NEW_URL) {
    deviations.push(
      `  ✗ plannedReplaces[0].newUrl: erwartet "${EXPECTED_REPLACE_NEW_URL}", ist "${replace0?.newUrl ?? 'undefined'}"`
    )
  }

  if (deviations.length > 0) {
    console.error(`\n✗ PRE-FLIGHT FEHLGESCHLAGEN – ${deviations.length} Abweichung(en) von erwarteten Zahlen:`)
    console.error(deviations.join('\n'))
    console.error(`\n  Keine DB-Writes wurden ausgeführt. Bitte Abweichung prüfen.`)
    console.error(`  Ursache kann z.B. ein zwischenzeitliches Airtable-Edit sein.`)
    process.exit(1)
  }

  console.log(`  ✓ Alle 10 Pre-Flight-Checks bestanden:`)
  console.log(`    airtableTotal=142, airtableWithVideoLink=101, airtableValidUrl=98`)
  console.log(`    airtableInvalidUrl=3, matched=142, unmatched=0`)
  console.log(`    plannedInsert=97, plannedReplace=1, Replace=Donnaweda ✓`)

  // ── Sicherheitsausgabe vor erstem Write ────────────────────────────────────
  console.log(`\n${DLINE}`)
  console.log(`  WRITE-MODUS – ACHTUNG: Echte DB-Schreibzugriffe folgen`)
  console.log(DLINE)
  console.log(``)
  console.log(`  Gate 1 (Doppel-Flag):    ✓ --write + --confirm-delete-insert-video-migration`)
  console.log(`  Gate 2 (Pre-Flight):      ✓ alle Zahlen stimmen`)
  console.log(``)
  console.log(`  Geplante Operationen:`)
  console.log(`    Planned Inserts:         ${stats.plannedInsert}   (neue videos-Rows)`)
  console.log(`    Planned Replaces:        ${stats.plannedReplace}   (DELETE alt + INSERT neu)`)
  console.log(`    Ungültige URLs:          ${stats.airtableInvalidUrl}   (werden übersprungen)`)
  console.log(``)
  console.log(`  Scope der DELETEs:`)
  console.log(`    Tabelle:   videos`)
  console.log(`    Filter:    band_id = <konkrete ID> AND platform = 'youtube'`)
  console.log(`    Kein globaler DELETE. Kein DELETE nur nach platform.`)
  console.log(`    Kein DELETE für andere Plattformen, media_assets oder social_profiles.`)
  console.log(``)
  console.log(`  Strategie: DELETE + INSERT sequenziell pro Band (kein Upsert, keine Transaktion).`)
  console.log(`  PostgREST bietet keine Transaktion über den Gesamtlauf.`)
  console.log(`  Pre-Flight-Prüfung reduziert Risiko, ersetzt aber keine Transaktion.`)
  console.log(``)
  console.log(`  Donnaweda-Sonderfall:`)
  console.log(`    DELETE: https://www.youtube.com/watch?v=donnaweda-oberkoelitz`)
  console.log(`    INSERT: https://www.youtube.com/watch?v=Kb4G0sWa68Y`)
  console.log(DLINE)

  // ── Write-Schleife ─────────────────────────────────────────────────────────
  //
  // Reihenfolge: Replaces zuerst (Donnaweda), dann Inserts.
  // Ungültige URLs sind nicht in den Listen — werden niemals geschrieben.
  //
  // Jeder Schreibzugriff auf supabaseService erst hier — nach Gate 1 + Gate 2.

  const allOps = [
    ...report.plannedReplaces,  // 1 (Donnaweda)
    ...report.plannedInserts,   // 97
  ]

  let successCount  = 0
  let skippedCount  = 0

  console.log(`\nStarte Migration (${allOps.length} Operationen) …\n`)

  for (const op of allOps) {
    const { bandName, slug, bandId, newUrl, url, isPlaceholder } = op
    const writeUrl = newUrl ?? url  // Replace hat newUrl, Insert hat url

    // Doppelcheck: nur gültige URLs schreiben (redundant, aber defensiv)
    if (!getYouTubeEmbedUrl(writeUrl)) {
      console.warn(`  ⚠ ÜBERSPRUNGEN (ungültige URL): ${bandName} (${slug}) – ${writeUrl}`)
      skippedCount++
      continue
    }

    const isReplace = Boolean(newUrl)
    const opLabel   = isReplace ? `REPLACE${isPlaceholder ? ' [Placeholder]' : ''}` : 'INSERT'

    // 1. DELETE – ausschließlich band_id + platform = 'youtube'
    if (isReplace) {
      console.log(`  ↻ ${opLabel}: ${bandName} (${slug})`)
      console.log(`    DELETE WHERE band_id=${bandId} AND platform='youtube' …`)

      const { error: delErr } = await supabaseService
        .from('videos')
        .delete()
        .eq('band_id', bandId)
        .eq('platform', 'youtube')

      if (delErr) {
        console.error(`\n✗ FEHLER bei DELETE – ${bandName} (${slug})`)
        console.error(`  Fehler: ${delErr.message}`)
        console.error(`  Bisher erfolgreich: ${successCount} von ${allOps.length}`)
        console.error(`  Offene Bänder: ${allOps.length - successCount - 1}`)
        console.error(`  DELETE fehlgeschlagen, INSERT nicht ausgeführt.`)
        console.error(`  Keine weiteren Writes. Bitte Datenbank-Zustand prüfen.`)
        process.exit(1)
      }

      console.log(`    ✓ DELETE ok`)
    } else {
      console.log(`  + ${opLabel}: ${bandName} (${slug})`)
    }

    // 2. INSERT – eine Row: band_id, platform = 'youtube', url, sort_order = 1
    console.log(`    INSERT band_id=${bandId}, platform='youtube', sort_order=1 …`)

    const { error: insErr } = await supabaseService
      .from('videos')
      .insert({
        band_id:    bandId,
        platform:   'youtube',
        url:        writeUrl,
        sort_order: 1,
      })

    if (insErr) {
      const deleteStatus = isReplace
        ? 'DELETE bereits ausgeführt (alte Row entfernt)'
        : 'Kein vorheriges DELETE (war Insert-Only-Operation)'
      console.error(`\n✗ FEHLER bei INSERT – ${bandName} (${slug})`)
      console.error(`  Fehler: ${insErr.message}`)
      console.error(`  ${deleteStatus}`)
      console.error(`  Bisher erfolgreich: ${successCount} von ${allOps.length}`)
      console.error(`  Offene Bänder: ${allOps.length - successCount - 1}`)
      console.error(`  Keine weiteren Writes. Bitte Datenbank-Zustand prüfen.`)
      process.exit(1)
    }

    console.log(`    ✓ INSERT ok`)
    successCount++
  }

  // ── Abschluss-Report ───────────────────────────────────────────────────────
  console.log(`\n${DLINE}`)
  console.log(`  WRITE-MIGRATION ABGESCHLOSSEN`)
  console.log(DLINE)
  console.log(``)
  console.log(`  Erfolgreich:    ${successCount} von ${allOps.length} Operationen`)
  console.log(`  Übersprungen:   ${skippedCount} (ungültige URLs)`)
  console.log(`  Ungültige URLs (nicht migriert): ${stats.airtableInvalidUrl}`)
  console.log(`    - 5toBeat, des Brassd scho!, Die Lausbuba`)
  console.log(``)
  console.log(`  Strategie: DELETE + INSERT sequenziell (kein Upsert, keine Transaktion)`)
  console.log(`  Scope: Tabelle videos, platform = 'youtube', je band_id`)
  console.log(DLINE)
  console.log(``)
})()
