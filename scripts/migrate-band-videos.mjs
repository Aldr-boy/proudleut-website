/**
 * migrate-band-videos.mjs
 *
 * DRY-RUN-ONLY Analyse: Airtable "YouTube Video Link" → Supabase "videos" (platform='youtube').
 *
 * Dieses Script schreibt NIEMALS in die Datenbank.
 * Kein --write-Modus vorhanden. Ausschließlich read-only Audit + Plan-Ausgabe.
 *
 * Ausführen:
 *   node scripts/migrate-band-videos.mjs
 *   node scripts/migrate-band-videos.mjs --slug=donnaweda
 *
 * Datenquellen:
 *   Airtable-Feld "YouTube Video Link"  → videos.url  (Embed-Video)
 *   Nicht: "Social - YouTube"           → social_profiles (Kanal-Link, bereits migriert)
 *
 * Geplante spätere Write-Strategie (NICHT in diesem Script):
 *   Kein Upsert (kein bestätigter UNIQUE-Constraint auf videos(band_id, platform)).
 *   Kontrolliertes DELETE + INSERT pro band_id + platform = 'youtube'.
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

const args = process.argv.slice(2)

// Write-Modus ist absichtlich nicht implementiert.
if (args.includes('--write') || args.includes('--execute')) {
  console.error(`
✗ Write mode is intentionally not implemented in this dry-run script.

  Dieses Script ist ausschließlich ein Dry-Run-Analyse-Tool.
  Schreiboperationen werden in einem separaten Schritt nach expliziter
  Freigabe und Dry-Run-Review implementiert.

  Erlaubt:
    node scripts/migrate-band-videos.mjs
    node scripts/migrate-band-videos.mjs --slug=donnaweda
`)
  process.exit(1)
}

// Unbekannte Flags abfangen
const KNOWN_FLAGS = new Set(['--slug'])
const unknownFlags = args.filter(a => {
  if (a.startsWith('--slug=')) return false
  return !KNOWN_FLAGS.has(a)
})
if (unknownFlags.length > 0) {
  console.error(`✗ Unbekannte Flags: ${unknownFlags.join(', ')}`)
  console.error(`  Nur --slug=<slug> ist erlaubt.`)
  process.exit(1)
}

const slugArg = args.find(a => a.startsWith('--slug='))?.split('=')[1] ?? null

// ─── ENV VARS ─────────────────────────────────────────────────────────────────

const AIRTABLE_TOKEN = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY       = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const BANDS_TABLE    = process.env.AIRTABLE_BANDS_TABLE_NAME ?? 'Bands'

const missing = []
if (!AIRTABLE_TOKEN) missing.push('AIRTABLE_PERSONAL_ACCESS_TOKEN')
if (!AIRTABLE_BASE)  missing.push('AIRTABLE_BASE_ID')
if (!SUPABASE_URL)   missing.push('NEXT_PUBLIC_SUPABASE_URL')
if (!ANON_KEY)       missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if (missing.length > 0) {
  console.error(`✗ Fehlende Env-Variablen: ${missing.join(', ')}`)
  process.exit(1)
}

// ─── SUPABASE CLIENT (read-only, anon key) ────────────────────────────────────

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

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

  // Index: band_id → alle youtube-Video-Rows
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

// ─── MAIN ─────────────────────────────────────────────────────────────────────

;(async () => {
  const DLINE = '═'.repeat(66)
  const LINE  = '─'.repeat(66)

  console.log(`\n${DLINE}`)
  console.log(`  migrate-band-videos.mjs  [DRY RUN – read-only]`)
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

  const { bandsBySlug, videosByBandId, totalBands, totalVideos, allVideos } = sbData

  console.log(`  Airtable aktive Bands:          ${airtableRecords.length}`)
  console.log(`  Supabase-Bands gesamt:          ${totalBands}`)
  console.log(`  Supabase videos-Rows gesamt:    ${totalVideos}`)

  // ── Slug-Filter ────────────────────────────────────────────────────────────
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

  // ── Statistiken ────────────────────────────────────────────────────────────
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
    plannedInserts:       [],  // { bandName, slug, url, embedUrl }
    plannedReplaces:      [],  // { bandName, slug, oldUrl, newUrl, embedUrl, isDonnaweda }
    invalidUrls:          [],  // { bandName, slug, url, reason }
    unmatched:            [],  // { airtableName, slug }
    allSbYouTubeRows:     [],  // { bandName, slug, url, isValid }
    cleanupCandidates:    [],  // { bandName, slug, url, reason }
    existingWithoutSrc:   [],  // { bandName, slug, sbUrl }
    donnawedaDetail:      null,
  }

  // ── Supabase youtube-Rows vorauswerten ────────────────────────────────────
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

  // ── Pro-Band-Analyse ───────────────────────────────────────────────────────
  for (const record of records) {
    const f        = record.fields
    const bandName = f['Bandname']?.trim() ?? '(kein Name)'
    const slug     = f['Slug']?.trim()?.toLowerCase() ?? ''

    // ── Slug-Match ─────────────────────────────────────────────────────────
    const supaBand = slug ? bandsBySlug.get(slug) : null
    if (!supaBand) {
      stats.unmatched++
      report.unmatched.push({ airtableName: bandName, slug })
      continue
    }
    stats.matched++

    // ── YouTube Video Link auslesen ────────────────────────────────────────
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

    // ── URL-Validierung (identisch mit Laufzeit-Funktion) ─────────────────
    const embedUrl = getYouTubeEmbedUrl(ytVideoLink)

    if (!embedUrl) {
      stats.airtableInvalidUrl++
      // Extrahiere Klartext-Grund
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

    // ── Bestehende Supabase-YouTube-Row prüfen ────────────────────────────
    const sbVideos   = videosByBandId.get(supaBand.id) ?? []
    const sbYtVideos = sbVideos.filter(v => v.platform === 'youtube')

    const isDonnaweda = slug === 'donnaweda'

    if (sbYtVideos.length === 0) {
      // ── PLANNED INSERT ────────────────────────────────────────────────
      stats.plannedInsert++
      report.plannedInserts.push({ bandName, slug, url: ytVideoLink, embedUrl })
    } else {
      // ── PLANNED REPLACE ───────────────────────────────────────────────
      // Spätere Strategie: DELETE WHERE band_id=X AND platform='youtube', dann INSERT
      stats.plannedReplace++
      const existing = sbYtVideos[0]
      const detail = {
        bandName,
        slug,
        oldUrl:      existing.url,
        newUrl:      ytVideoLink,
        embedUrl,
        isDonnaweda,
        oldIsValid:  getYouTubeEmbedUrl(existing.url) !== null,
        isPlaceholder: isPlaceholderUrl(existing.url),
      }
      report.plannedReplaces.push(detail)

      // Donnaweda-Sonderfall explizit dokumentieren
      if (isDonnaweda) {
        report.donnawedaDetail = {
          supabasePlaceholderUrl: existing.url,
          supabasePlaceholderValid: getYouTubeEmbedUrl(existing.url) !== null,
          airtableSourceUrl: ytVideoLink,
          airtableEmbedUrl:  embedUrl,
          action: 'PLANNED REPLACE – DELETE placeholder, INSERT Airtable-URL',
        }
      }
    }
  }

  // ── ZUSAMMENFASSUNG ───────────────────────────────────────────────────────
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
  console.log(`  PLAN (spätere Write-Strategie: DELETE+INSERT, kein Upsert)`)
  console.log(`    Planned Inserts:                ${stats.plannedInsert}`)
  console.log(`    Planned Replaces:               ${stats.plannedReplace}`)
  console.log(`    Cleanup Candidates:             ${stats.cleanupCandidates}`)
  console.log(`    Existing rows without source:   ${stats.existingWithoutSource}`)

  // ── DETAILREPORTS ─────────────────────────────────────────────────────────

  // Alle bestehenden Supabase-YouTube-Rows
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

  // Donnaweda-Sonderfall
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

  // Planned Inserts (erste 10)
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

  // Planned Replaces (erste 10)
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

  // Ungültige Airtable-URLs (alle)
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

  // Unmatched Bands (alle)
  if (report.unmatched.length > 0) {
    console.log(`\n${LINE}`)
    console.log(`  Kein Supabase-Slug-Match (alle)`)
    console.log(LINE)
    for (const { airtableName, slug } of report.unmatched) {
      console.log(`  ✗ "${airtableName}" (slug: "${slug}")`)
    }
  }

  // Cleanup Candidates (alle)
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

  // Existing rows without Airtable source
  if (report.existingWithoutSrc.length > 0) {
    console.log(`\n${LINE}`)
    console.log(`  Existing Supabase-Rows ohne Airtable-Quelle`)
    console.log(LINE)
    for (const { bandName, slug, sbUrl } of report.existingWithoutSrc) {
      console.log(`  ~ ${bandName} (${slug})`)
      console.log(`    Supabase-URL: ${sbUrl}`)
    }
  }

  // ── ABSCHLUSS ─────────────────────────────────────────────────────────────
  console.log(`\n${DLINE}`)
  console.log(`  DRY RUN abgeschlossen — kein Schreibvorgang ausgeführt.`)
  console.log(``)
  console.log(`  Spätere Write-Strategie: DELETE + INSERT (kein Upsert)`)
  console.log(`  Kein bestätigter UNIQUE-Constraint auf videos(band_id, platform).`)
  console.log(``)
  console.log(`  Nächster Schritt (nach Freigabe):`)
  console.log(`    Ein separates migrate-band-videos-execute.mjs anlegen,`)
  console.log(`    das diese Dry-Run-Ergebnisse als Write-Plan ausführt.`)
  console.log(DLINE)
  console.log(``)
})()
