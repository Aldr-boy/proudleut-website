/**
 * migrate-band-images.mjs
 *
 * Liest Airtable-Attachment-Bilder aller aktiven Bands,
 * lädt sie nach Supabase Storage hoch und erstellt media_assets-Einträge.
 *
 * Ausführung (Dry Run – keine Schreibvorgänge):
 *   node scripts/migrate-band-images.mjs --dry-run --slug=donnaweda
 *   node scripts/migrate-band-images.mjs --dry-run --limit=5
 *
 * Ausführung (echter Lauf):
 *   node scripts/migrate-band-images.mjs --slug=donnaweda
 *   node scripts/migrate-band-images.mjs --limit=5
 *   node scripts/migrate-band-images.mjs
 */

import dotenv from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '..', '.env.local') })

import { createClient } from '@supabase/supabase-js'

// ─── CLI FLAGS ────────────────────────────────────────────────────────────────

const args    = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const slugArg = args.find(a => a.startsWith('--slug='))?.split('=')[1] ?? null
const skipArg = args.find(a => a.startsWith('--skip='))?.split('=')[1] ?? null
const limitRaw = args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? null
const LIMIT   = limitRaw ? parseInt(limitRaw, 10) : null

// ─── ENV VARS ─────────────────────────────────────────────────────────────────

const AIRTABLE_TOKEN = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY       = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY

const missingAlways = []
if (!AIRTABLE_TOKEN) missingAlways.push('AIRTABLE_PERSONAL_ACCESS_TOKEN')
if (!AIRTABLE_BASE)  missingAlways.push('AIRTABLE_BASE_ID')
if (!SUPABASE_URL)   missingAlways.push('NEXT_PUBLIC_SUPABASE_URL')
if (!ANON_KEY)       missingAlways.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if (missingAlways.length > 0) {
  console.error(`Fehlende Env-Variablen: ${missingAlways.join(', ')}`)
  process.exit(1)
}

if (!SERVICE_KEY && !DRY_RUN) {
  console.error('SUPABASE_SERVICE_ROLE_KEY fehlt – im echten Modus erforderlich.')
  console.error('Den Key findest du im Supabase-Dashboard unter Settings → API → service_role.')
  process.exit(1)
}

if (DRY_RUN && !SERVICE_KEY) {
  console.warn('Hinweis: SUPABASE_SERVICE_ROLE_KEY nicht gesetzt – Supabase-Band-Lookup im Dry Run nicht möglich.\n')
}

// Startup-Debug (keine Secrets)
{
  let supabaseHost = '(unbekannt)'
  try { supabaseHost = new URL(SUPABASE_URL).hostname } catch {}
  const svcPresent   = !!SERVICE_KEY
  const svcPlausible = svcPresent && SERVICE_KEY.startsWith('eyJ') && SERVICE_KEY.length > 100
  console.log(`Supabase:          ${supabaseHost}`)
  console.log(`Anon Key:          ${ANON_KEY ? 'vorhanden' : 'fehlt'} (Lese-Lookup)`)
  console.log(`Service Key:       ${svcPresent ? 'vorhanden' : 'fehlt'}, Format plausibel: ${svcPlausible ? 'ja' : 'nein'} (Schreibvorgänge)`)
  console.log()
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const BUCKET         = 'band-media'
const AIRTABLE_TABLE = process.env.AIRTABLE_BANDS_TABLE_NAME ?? 'Bands'
const MAX_BYTES      = 10 * 1024 * 1024 // 10 MB

/** Reihenfolge: singular zuerst, gallery zuletzt */
const ROLE_FIELDS = [
  { field: 'Main IMG - Hero',      role: 'hero',      singular: true  },
  { field: 'Main IMG - Thumbnail', role: 'thumbnail', singular: true  },
  { field: 'Bandlogo',             role: 'logo',      singular: true  },
  { field: 'Gallery',              role: 'gallery',   singular: false },
]

const AIRTABLE_FIELDS = [
  'Bandname', 'Slug',
  'Main IMG - Hero', 'Main IMG - Thumbnail', 'Gallery', 'Bandlogo',
  'Main IMG Alt-Text',
]

// ─── SUPABASE CLIENTS ────────────────────────────────────────────────────────

// Lesen (Band-Lookup): Anon Key hat SELECT auf bands — service_role hat es nicht
const supabaseRead = ANON_KEY
  ? createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
  : null

// Schreiben (Storage + media_assets): Service Role Key erforderlich
const supabase = SERVICE_KEY
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  : null

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function extFrom(att) {
  if (att.type) {
    const mime = att.type.toLowerCase().split(';')[0].trim()
    const map  = {
      'image/jpeg': 'jpg', 'image/jpg': 'jpg',
      'image/png':  'png', 'image/webp': 'webp', 'image/gif': 'gif',
    }
    if (map[mime]) return map[mime]
  }
  if (att.filename) {
    const parts = att.filename.split('.')
    if (parts.length > 1) return parts[parts.length - 1].toLowerCase()
  }
  return 'jpg'
}

function fmtBytes(b) {
  if (!b) return '?'
  if (b < 1024)    return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

function altFor(role, bandName, sharedAlt) {
  if (role === 'logo') return `${bandName} Logo`
  const fallback = {
    hero:      `${bandName} live`,
    thumbnail: `${bandName} Bandfoto`,
    gallery:   `${bandName} auf der Bühne`,
  }
  return sharedAlt || fallback[role] || `${bandName} Foto`
}

function buildPublicUrl(storagePath) {
  if (supabase) return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`
}

// ─── AIRTABLE ────────────────────────────────────────────────────────────────

async function airtableRequest(params, attempt = 1) {
  const url = new URL(
    `https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(AIRTABLE_TABLE)}`
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
    console.warn(`  ⚠ Airtable Rate Limit (429) – warte ${wait / 1000}s … (Versuch ${attempt}/5)`)
    if (attempt >= 5) throw new Error('Airtable Rate Limit nach 5 Versuchen nicht erholt')
    await new Promise(r => setTimeout(r, wait))
    return airtableRequest(params, attempt + 1)
  }

  if (!res.ok) throw new Error(`Airtable API ${res.status}: ${res.statusText}`)
  return res.json()
}

async function fetchActiveBands() {
  const records = []
  let offset = undefined

  do {
    const params = {
      filterByFormula: `{Webflow Status}='Active'`,
      'fields[]': AIRTABLE_FIELDS,
    }
    if (offset) params.offset = offset

    const data = await airtableRequest(params)
    records.push(...data.records)
    offset = data.offset
  } while (offset)

  return records
}

// ─── SUPABASE ────────────────────────────────────────────────────────────────

async function findBandId(slug) {
  if (!supabaseRead) return null

  const { data, error } = await supabaseRead
    .from('bands')
    .select('id, name, slug, status')
    .eq('slug', slug)
    .limit(2)

  if (error) {
    console.warn(`  ⚠ Supabase-Lookup Fehler: ${error.message} (code: ${error.code})`)
    return null
  }
  if (!data || data.length === 0) {
    console.warn(`  ⚠ Supabase-Lookup: kein Datensatz mit slug="${slug}"`)
    return null
  }
  if (data.length > 1) {
    console.warn(`  ⚠ Supabase-Lookup: ${data.length} Treffer für slug="${slug}" – verwende ersten`)
  }
  return data[0].id
}

async function checkServicePermissions() {
  if (!supabase) return true // kein Service-Client = Dry Run, kein Check nötig

  // SELECT-Recht prüfen
  const { error: selErr } = await supabase.from('media_assets').select('id').limit(1)
  if (selErr) {
    console.error(`\n✗ BERECHTIGUNG FEHLT: service_role kann media_assets nicht lesen`)
    console.error(`  Fehler: ${selErr.message} (code: ${selErr.code})`)
    console.error(`\n  Bitte im Supabase SQL-Editor ausführen:`)
    console.error(`  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.media_assets TO service_role;`)
    return false
  }

  // DELETE-Recht prüfen (mit nicht-existierender ID – löscht nichts)
  const { error: delErr } = await supabase
    .from('media_assets')
    .delete()
    .eq('band_id', '00000000-0000-0000-0000-000000000000')
  if (delErr) {
    console.error(`\n✗ BERECHTIGUNG FEHLT: service_role kann media_assets nicht löschen`)
    console.error(`  Fehler: ${delErr.message} (code: ${delErr.code})`)
    console.error(`\n  Bitte im Supabase SQL-Editor ausführen:`)
    console.error(`  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.media_assets TO service_role;`)
    return false
  }

  console.log('  ✓ media_assets: SELECT + DELETE Rechte vorhanden')
  return true
}

async function deleteAssets(bandId, role) {
  const { error } = await supabase.from('media_assets').delete().eq('band_id', bandId).eq('role', role)
  return error
}

async function insertAsset({ bandId, url, role, altText, sortOrder }) {
  const { error } = await supabase.from('media_assets').insert({
    band_id:         bandId,
    url,
    role,
    alt_text:        altText,
    source_provider: 'supabase_storage',
    sort_order:      sortOrder,
  })
  return error
}

// ─── BUILD IMAGE JOBS ────────────────────────────────────────────────────────

function buildJobs(fields, bandName) {
  const sharedAlt = fields['Main IMG Alt-Text']?.trim() ?? ''
  const jobs = []

  for (const { field, role, singular } of ROLE_FIELDS) {
    const atts = fields[field]
    if (!atts?.length) {
      if (role === 'hero' || role === 'thumbnail') {
        console.warn(`  ⚠ ${role}: kein Bild vorhanden`)
      }
      continue
    }

    if (singular) {
      const att = atts[0]
      jobs.push({
        att,
        role,
        fileName:  `${role}.${extFrom(att)}`,
        altText:   altFor(role, bandName, sharedAlt),
        sortOrder: 0,
      })
    } else {
      atts.forEach((att, i) => {
        const num = String(i + 1).padStart(2, '0')
        jobs.push({
          att,
          role,
          fileName:  `gallery-${num}.${extFrom(att)}`,
          altText:   altFor(role, bandName, sharedAlt),
          sortOrder: i + 1,
        })
      })
    }
  }

  return jobs
}

// ─── PROCESS BAND ────────────────────────────────────────────────────────────

async function processBand(record) {
  const f        = record.fields
  const name     = f['Bandname']?.trim() ?? '(kein Name)'
  const slug     = f['Slug']?.trim() ?? ''

  console.log(`\n── ${name} (${slug || '—'})`)

  if (!slug) {
    console.log('  ✗ Kein Slug – übersprungen')
    return { skipped: true, reason: 'no_slug' }
  }

  const bandId = await findBandId(slug)
  console.log(`  Supabase-Band: ${bandId ? `✓ gefunden (${bandId})` : '✗ nicht in Supabase'}`)

  if (!DRY_RUN && !bandId) {
    console.log('  → übersprungen (Band nicht in Supabase)')
    return { skipped: true, reason: 'not_in_supabase' }
  }

  const jobs = buildJobs(f, name)

  if (jobs.length === 0) {
    console.log('  – keine Bilder vorhanden')
    return { skipped: false, planned: 0, uploaded: 0, skippedImages: 0, manualReview: 0, errors: 0, totalBytes: 0, missingSize: 0 }
  }

  const stats = {
    planned:      jobs.length,
    uploaded:     0,
    skippedImages: 0,
    manualReview: 0,
    errors:       0,
    totalBytes:   0,
    missingSize:  0,
  }

  // ── DRY RUN ──────────────────────────────────────────────────────────────
  if (DRY_RUN) {
    for (const { att, role, fileName, altText, sortOrder } of jobs) {
      const storagePath = `${slug}/${fileName}`
      const url         = buildPublicUrl(storagePath)
      const sizeStr     = fmtBytes(att.size)
      const largeFlag   = att.size && att.size > MAX_BYTES ? '  ⚠ >10 MB – needs manual review' : ''

      console.log(`  [DRY] ${role.padEnd(12)} ${fileName.padEnd(24)} ${sizeStr}${largeFlag}`)
      console.log(`        Storage:      ${storagePath}`)
      console.log(`        URL:          ${url}`)
      console.log(`        alt:          "${altText}"`)
      console.log(`        media_assets: role="${role}", sort_order=${sortOrder}, source_provider="supabase_storage"`)

      if (att.size) stats.totalBytes += att.size
      else stats.missingSize++
    }
    return { skipped: false, bandId, ...stats }
  }

  // ── ECHTER LAUF ───────────────────────────────────────────────────────────

  const singularJobs = jobs.filter(j => j.role !== 'gallery')
  const galleryJobs  = jobs.filter(j => j.role === 'gallery')

  // Singular-Rollen (hero, thumbnail, logo): pro Bild upload → delete old → insert
  for (const { att, role, fileName, altText, sortOrder } of singularJobs) {
    const storagePath = `${slug}/${fileName}`

    if (!att.url || !att.filename) {
      console.log(`  – ${fileName}: fehlendes Attachment-Feld – übersprungen`)
      stats.skippedImages++
      continue
    }
    if (att.size && att.size > MAX_BYTES) {
      console.warn(`  ⚠ ${fileName}: ${fmtBytes(att.size)} > 10 MB – übersprungen (needs manual review)`)
      stats.manualReview++
      continue
    }

    let buffer
    try {
      const imgRes = await fetch(att.url)
      if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`)
      buffer = Buffer.from(await imgRes.arrayBuffer())
    } catch (err) {
      console.error(`  ✗ ${fileName}: Download fehlgeschlagen – ${err.message}`)
      stats.errors++
      continue
    }

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: att.type ?? 'image/jpeg', upsert: true })
    if (upErr) {
      console.error(`  ✗ ${fileName}: Upload fehlgeschlagen – ${upErr.message}`)
      stats.errors++
      continue
    }

    const assetUrl = buildPublicUrl(storagePath)
    const delErr = await deleteAssets(bandId, role)
    if (delErr) console.warn(`  ⚠ ${fileName}: Fehler beim Löschen alter ${role}-Records: ${delErr.message}`)

    const insErr = await insertAsset({ bandId, url: assetUrl, role, altText, sortOrder })
    if (insErr) {
      console.error(`  ✗ ${fileName}: media_assets-Insert fehlgeschlagen – ${insErr.message}`)
      stats.errors++
    } else {
      console.log(`  ✓ ${role.padEnd(12)} ${fileName}`)
      stats.uploaded++
    }
  }

  // Gallery: erst alle hochladen, dann erst alte Records löschen und neue einfügen
  // → alte Records bleiben erhalten, solange kein Upload erfolgreich war
  const galleryUploaded = []
  for (const { att, fileName, altText, sortOrder } of galleryJobs) {
    const storagePath = `${slug}/${fileName}`

    if (!att.url || !att.filename) {
      console.log(`  – ${fileName}: fehlendes Attachment-Feld – übersprungen`)
      stats.skippedImages++
      continue
    }
    if (att.size && att.size > MAX_BYTES) {
      console.warn(`  ⚠ ${fileName}: ${fmtBytes(att.size)} > 10 MB – übersprungen (needs manual review)`)
      stats.manualReview++
      continue
    }

    let buffer
    try {
      const imgRes = await fetch(att.url)
      if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`)
      buffer = Buffer.from(await imgRes.arrayBuffer())
    } catch (err) {
      console.error(`  ✗ ${fileName}: Download fehlgeschlagen – ${err.message}`)
      stats.errors++
      continue
    }

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: att.type ?? 'image/jpeg', upsert: true })
    if (upErr) {
      console.error(`  ✗ ${fileName}: Upload fehlgeschlagen – ${upErr.message}`)
      stats.errors++
      continue
    }

    galleryUploaded.push({ assetUrl: buildPublicUrl(storagePath), altText, sortOrder, fileName })
  }

  if (galleryJobs.length > 0 && galleryUploaded.length > 0) {
    // Alle Uploads done → alte Gallery-Records löschen, neue einfügen
    const delErr = await deleteAssets(bandId, 'gallery')
    if (delErr) console.warn(`  ⚠ Fehler beim Löschen alter Gallery-Records: ${delErr.message}`)

    for (const { assetUrl, altText, sortOrder, fileName } of galleryUploaded) {
      const insErr = await insertAsset({ bandId, url: assetUrl, role: 'gallery', altText, sortOrder })
      if (insErr) {
        console.error(`  ✗ ${fileName}: media_assets-Insert fehlgeschlagen – ${insErr.message}`)
        stats.errors++
      } else {
        console.log(`  ✓ gallery       ${fileName}`)
        stats.uploaded++
      }
    }
    if (galleryUploaded.length < galleryJobs.length) {
      console.warn(`  ⚠ Gallery nur teilweise migriert: ${galleryUploaded.length}/${galleryJobs.length} Bilder hochgeladen`)
    }
  }

  return { skipped: false, ...stats }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== migrate-band-images.mjs ===')
  console.log(`Modus:  ${DRY_RUN ? 'DRY RUN – keine Schreibvorgänge' : 'ECHTER LAUF'}`)
  if (slugArg) console.log(`Filter: --slug=${slugArg}`)
  if (skipArg) console.log(`Skip:   --skip=${skipArg}`)
  if (LIMIT)   console.log(`Limit:  --limit=${LIMIT}`)
  console.log()

  if (!DRY_RUN) {
    console.log('Prüfe Supabase-Schreibrechte …')
    const hasPermissions = await checkServicePermissions()
    if (!hasPermissions) process.exit(1)
    console.log()
  }

  console.log('Lade aktive Bands aus Airtable …')
  let records = await fetchActiveBands()
  console.log(`→ ${records.length} aktive Band(s) in Airtable`)

  // Filter anwenden
  if (slugArg) {
    records = records.filter(r => r.fields['Slug']?.trim() === slugArg)
    if (!records.length) {
      console.error(`\nKeine aktive Band mit Slug "${slugArg}" gefunden.`)
      process.exit(1)
    }
  }
  if (skipArg) records = records.filter(r => r.fields['Slug']?.trim() !== skipArg)
  if (LIMIT)   records = records.slice(0, LIMIT)

  console.log(`Verarbeite ${records.length} Band(s) …`)

  const total = {
    bandsOk:      0,
    bandsSkipped: 0,
    planned:      0,
    uploaded:     0,
    skippedImages: 0,
    manualReview: 0,
    errors:       0,
    totalBytes:   0,
    missingSize:  0,
  }

  for (const record of records) {
    try {
      const r = await processBand(record)
      if (r.skipped) {
        total.bandsSkipped++
      } else {
        total.bandsOk++
        total.planned       += r.planned       ?? 0
        total.uploaded      += r.uploaded      ?? 0
        total.skippedImages += r.skippedImages ?? 0
        total.manualReview  += r.manualReview  ?? 0
        total.errors        += r.errors        ?? 0
        total.totalBytes    += r.totalBytes    ?? 0
        total.missingSize   += r.missingSize   ?? 0
      }
    } catch (err) {
      console.error(`  ✗ Unerwarteter Fehler: ${err.message}`)
      total.bandsSkipped++
      total.errors++
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50))
  console.log('ZUSAMMENFASSUNG')
  console.log('═'.repeat(50))
  console.log(`Bands verarbeitet:    ${total.bandsOk}`)
  console.log(`Bands übersprungen:   ${total.bandsSkipped}`)
  console.log(`Bilder geplant:       ${total.planned}`)

  if (DRY_RUN) {
    const mb      = (total.totalBytes / 1048576).toFixed(1)
    const volNote = total.missingSize > 0
      ? `ca. ${mb} MB (+ ${total.missingSize} Bild(er) ohne Größenangabe)`
      : `ca. ${mb} MB`
    const estSec  = total.planned * 3
    console.log('\n── Schätzung für echten Lauf ──────────────────')
    console.log(`  Bilder gesamt:       ${total.planned}`)
    console.log(`  Datenvolumen:        ${volNote}`)
    console.log(`  Geschätzte Laufzeit: ca. ${estSec}–${estSec * 2}s`)
    console.log(`  (${total.planned} Bild(er) × 3–6s je Download + Upload)`)
    console.log('\n✓ Kein Schreibvorgang wurde ausgeführt.')
  } else {
    console.log(`Bilder hochgeladen:   ${total.uploaded}`)
    console.log(`Bilder übersprungen:  ${total.skippedImages}`)
    console.log(`Manual review:        ${total.manualReview}`)
    console.log(`Fehler:               ${total.errors}`)
  }
}

main().catch(err => {
  console.error(`\nUnerwarteter Fehler: ${err.message}`)
  process.exit(1)
})
