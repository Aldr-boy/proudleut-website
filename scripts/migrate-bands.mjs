/**
 * migrate-bands.mjs
 *
 * Migriert Kern-Banddaten aller aktiven Bands von Airtable nach Supabase.
 * Standardmäßig sicher: Schreiboperationen nur mit explizitem --execute.
 *
 * Dry Run (liest nur, schreibt nie):
 *   node scripts/migrate-bands.mjs --dry-run
 *   node scripts/migrate-bands.mjs --dry-run --slug=quertreiber
 *   node scripts/migrate-bands.mjs --dry-run --limit=5 --skip=donnaweda
 *
 * Echter Lauf (nur nach expliziter Freigabe):
 *   node scripts/migrate-bands.mjs --execute --slug=quertreiber
 *   node scripts/migrate-bands.mjs --execute --limit=5 --skip=donnaweda
 *   node scripts/migrate-bands.mjs --execute
 *
 * Migriert pro Band:
 *   locations     – UPSERT via UNIQUE(country_code, plz)
 *   bands         – UPSERT via slug
 *   band_profiles – UPSERT via band_id
 *   band_event_types – vorhandene löschen, neu einfügen
 *   band_band_types  – vorhandene löschen, neu einfügen
 *
 * Separater späterer Pass (noch nicht aktiv):
 *   band_relations (ähnliche Bands) – Dry-Run-Analyse vorhanden
 *
 * Nicht migriert (spätere Phase):
 *   videos, social_profiles, reference_events, band_lineups, band_sound_worlds,
 *   band_moods, band_repertoire_styles, band_services, band_contacts
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

// ─── CLI FLAGS ────────────────────────────────────────────────────────────────

const args    = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const EXECUTE  = args.includes('--execute')
const slugArg  = args.find(a => a.startsWith('--slug='))?.split('=')[1] ?? null
const skipRaw  = args.find(a => a.startsWith('--skip='))?.split('=')[1] ?? null
const limitRaw = args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? null
const SKIP_SET = skipRaw ? new Set(skipRaw.split(',').map(s => s.trim().toLowerCase())) : new Set()
const LIMIT    = limitRaw ? parseInt(limitRaw, 10) : null

// --skip-existing-complete: Überspringt Bands, die in Supabase bereits vollständig vorhanden sind.
// Definition "vollständig": bands-Eintrag + band_profiles + home_location_id + ≥1 event_type + ≥1 band_type.
// Bilder zählen bewusst nicht – die gehören zu migrate-band-images.mjs.
// Wirkt auf die Limit-Logik: --limit=N bedeutet N tatsächlich zu bearbeitende Bands nach Skip.
const SKIP_EXISTING_COMPLETE = args.includes('--skip-existing-complete')

// Vorbereitet, aber bewusst deaktiviert: kontrollierte Lookup-Anlage
// Aktivierung erst nach expliziter Freigabe – verhindert unkontrollierte Kategorien
const CREATE_MISSING_LOOKUPS = false // args.includes('--create-missing-lookups')

// Schutz gegen versehentliche Bulk-Executes.
// Ein Bulk-Execute ist: --execute ohne --slug (betrifft mehrere Bands gleichzeitig).
// Für Bulk-Executes muss --confirm-bulk-execute explizit gesetzt werden.
// Einzelband-Executes (--slug=X) sind immer erlaubt – der Scope ist klar begrenzt.
const CONFIRM_BULK_EXECUTE = args.includes('--confirm-bulk-execute')

if (!DRY_RUN && !EXECUTE) {
  console.error(`
✗ Kein Modus angegeben.

Verwendung:
  node scripts/migrate-bands.mjs --dry-run                                     Analyse, kein Schreiben
  node scripts/migrate-bands.mjs --dry-run --slug=quertreiber                  Einzelne Band analysieren
  node scripts/migrate-bands.mjs --dry-run --limit=20 --skip-existing-complete Batch analysieren
  node scripts/migrate-bands.mjs --execute --slug=quertreiber                  Einzelband (immer erlaubt)
  node scripts/migrate-bands.mjs --execute --limit=20 --skip-existing-complete --confirm-bulk-execute  Bulk

Sicherheitsregel: --execute ohne --slug erfordert --confirm-bulk-execute.
`)
  process.exit(1)
}

if (DRY_RUN && EXECUTE) {
  console.error('✗ --dry-run und --execute dürfen nicht kombiniert werden.')
  process.exit(1)
}

// Bulk-Execute-Guard: blockiert --execute ohne --slug, wenn --confirm-bulk-execute fehlt.
if (EXECUTE && !slugArg && !CONFIRM_BULK_EXECUTE) {
  console.error(`
✗ Bulk execute blocked.
  Use --confirm-bulk-execute only after reviewing the dry-run output.

  Dry Run zuerst:
    node scripts/migrate-bands.mjs --dry-run --limit=20 --skip-existing-complete

  Danach Execute mit Bestätigung:
    node scripts/migrate-bands.mjs --execute --limit=20 --skip-existing-complete --confirm-bulk-execute

  Für Einzelband-Execute (kein Confirm nötig):
    node scripts/migrate-bands.mjs --execute --slug=<slug>
`)
  process.exit(1)
}

// ─── ENV VARS ─────────────────────────────────────────────────────────────────

const AIRTABLE_TOKEN = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY       = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY

const missing = []
if (!AIRTABLE_TOKEN) missing.push('AIRTABLE_PERSONAL_ACCESS_TOKEN')
if (!AIRTABLE_BASE)  missing.push('AIRTABLE_BASE_ID')
if (!SUPABASE_URL)   missing.push('NEXT_PUBLIC_SUPABASE_URL')
if (!ANON_KEY)       missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
if (EXECUTE && !SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY (für --execute)')

if (missing.length > 0) {
  console.error(`✗ Fehlende Env-Variablen: ${missing.join(', ')}`)
  process.exit(1)
}

// ─── SUPABASE CLIENTS ─────────────────────────────────────────────────────────

// Lesender Client (anon key) – immer verfügbar
const supabaseRead = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })

// Schreibender Client (service role) – nur bei --execute
const supabaseWrite = (EXECUTE && SERVICE_KEY)
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  : null

// ─── KONSTANTEN ───────────────────────────────────────────────────────────────

const BANDS_TABLE           = 'Bands'
const VERANSTALTUNGEN_TABLE = 'Veranstaltungen'

// Exakte Airtable-Feldnamen aus lib/airtable/normalizeBand.ts
const AIRTABLE_FIELDS = [
  'Bandname',
  'Slug',
  'Webflow Status',
  'Website Link',
  'Short Descripton / Subheadline',         // Tippfehler ist absichtlich – so heißt das Airtable-Feld
  'Main Text',
  'Meta Description',
  'PLZ',
  'plz (from Orte-Master)',
  'orte (from Orte-Master)',
  'landkreise (from Orte-Master)',
  'regierungsbezirk (from Orte-Master)',
  'bundesland (from Orte-Master)',
  'lat (from Orte-Master)',
  'lon (from Orte-Master)',
  'Veranstaltungstypen',
  'Name (Kurzform)',
  'Slug (from Hauptkategorie/Bandart)',
  'similar_1_name',
  'similar_2_name',
  'similar_3_name',
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function str(value) {
  if (value == null) return undefined
  if (Array.isArray(value)) return undefined
  const s = typeof value === 'string' ? value : String(value)
  const trimmed = s.trim()
  // Airtable Record-IDs (rec + 10+ alphanumerische Zeichen) herausfiltern
  if (/^rec[A-Za-z0-9]{10,}$/.test(trimmed)) return undefined
  return trimmed || undefined
}

function firstStr(value) {
  const raw = Array.isArray(value) ? value[0] : value
  return str(raw)
}

function parseCoord(value) {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw == null) return undefined
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.'))
  return isFinite(n) ? n : undefined
}

function normalizeUrl(value) {
  const raw = str(value)
  if (!raw) return undefined
  const withProtocol = raw.startsWith('http') ? raw : `https://${raw}`
  try {
    new URL(withProtocol)
    return withProtocol
  } catch {
    return undefined
  }
}

function cap(s, max) {
  if (!s) return undefined
  const clean = s.trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

function preview(s, max = 70) {
  if (!s) return '(leer)'
  const clean = s.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
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

async function fetchVeranstaltungenMap() {
  // Airtable Veranstaltungen-Tabelle → Map von Record-ID zu { displayName, slug }
  // Wird benötigt, um Veranstaltungstypen-Record-IDs in lesbare Namen aufzulösen
  const map = new Map()
  let offset = undefined

  do {
    const params = {}
    if (offset) params.offset = offset
    const data = await airtableRequest(VERANSTALTUNGEN_TABLE, params)
    for (const record of data.records) {
      const displayName = record.fields['event_canon']?.trim()
      const slug        = record.fields['Slug']?.trim()
      if (displayName) map.set(record.id, { displayName, slug: slug ?? '' })
    }
    offset = data.offset
  } while (offset)

  return map
}

async function fetchActiveBands() {
  // Kein fields[]-Filter: bestimmte Airtable-Feldnamen mit Sonderzeichen (/, Klammern)
  // können in URL-Parametern zu 422-Fehlern führen. Alle Felder laden und
  // clientseitig auswerten – konsistent mit lib/airtable/queries.ts.
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

async function loadSupabaseLookups() {
  const [etRes, btRes, bandsRes] = await Promise.all([
    supabaseRead.from('event_types').select('id, name, slug').eq('status', 'active').order('sort_order'),
    supabaseRead.from('band_types').select('id, name, slug').eq('status', 'active').order('sort_order'),
    // Vollständigkeits-Felder für --skip-existing-complete mitladen
    supabaseRead.from('bands').select(
      'id, name, slug, home_location_id, band_profiles(id), band_event_types(band_id), band_band_types(band_id)'
    ).order('name'),
  ])

  if (etRes.error)    throw new Error(`Supabase event_types: ${etRes.error.message}`)
  if (btRes.error)    throw new Error(`Supabase band_types:  ${btRes.error.message}`)
  if (bandsRes.error) throw new Error(`Supabase bands:       ${bandsRes.error.message}`)

  // Lookup-Maps: lowercase(name) → row
  const eventTypesByName = new Map(etRes.data.map(r => [r.name.toLowerCase(), r]))

  // band_types: zusätzliche Alias-Keys für unterschiedliche Trennzeichen.
  // Airtable verwendet "Blasmusik | Wirtshausmusik" (Pipe),
  // Supabase hat "Blasmusik / Wirtshausmusik" (Schrägstrich).
  // Beide Varianten werden auf denselben Eintrag gemappt.
  const bandTypesByName = new Map()
  for (const r of btRes.data) {
    const key        = r.name.toLowerCase()
    const keyPipe    = key.replace(/\s*\/\s*/g, ' | ')   // / → |
    const keySlash   = key.replace(/\s*\|\s*/g, ' / ')   // | → /
    bandTypesByName.set(key,      r)
    bandTypesByName.set(keyPipe,  r)
    bandTypesByName.set(keySlash, r)
  }

  const bandsBySlug   = new Map(bandsRes.data.map(r => [r.slug, r]))
  const bandsByName   = new Map(bandsRes.data.map(r => [r.name.toLowerCase(), r]))
  const bandTypesCount = btRes.data.length  // echter DB-Count, nicht Map-Size

  // completeSlugSet: Slugs von Bands, die für --skip-existing-complete als vollständig gelten.
  // Kriterien: bands-Eintrag + band_profiles + home_location_id gesetzt + ≥1 event_type + ≥1 band_type.
  const completeSlugSet = new Set()
  for (const band of bandsRes.data) {
    const bp = Array.isArray(band.band_profiles)
      ? band.band_profiles : (band.band_profiles ? [band.band_profiles] : [])
    const hasProfile   = bp.length > 0
    const hasLocation  = band.home_location_id != null
    const hasEventType = (band.band_event_types ?? []).length > 0
    const hasBandType  = (band.band_band_types  ?? []).length > 0
    if (hasProfile && hasLocation && hasEventType && hasBandType) {
      completeSlugSet.add(band.slug)
    }
  }

  return { eventTypesByName, bandTypesByName, bandTypesCount, bandsBySlug, bandsByName, completeSlugSet }
}

// ─── SUPABASE SCHREIBEN ───────────────────────────────────────────────────────

async function upsertLocation(plz, cityName, extra) {
  if (!supabaseWrite) return null

  const payload = {
    plz,
    city_name: cityName,
    country:      'Deutschland',
    country_code: 'de',
    ...(extra.landkreis          && { landkreis: extra.landkreis }),
    ...(extra.regierungsbezirk   && { regierungsbezirk: extra.regierungsbezirk }),
    ...(extra.bundesland         && { bundesland: extra.bundesland }),
    ...(extra.latitude  != null  && { latitude: extra.latitude }),
    ...(extra.longitude != null  && { longitude: extra.longitude }),
  }

  const { data, error } = await supabaseWrite
    .from('locations')
    .upsert(payload, { onConflict: 'country_code,plz' })
    .select('id')
    .single()

  if (error) throw new Error(`locations upsert: ${error.message} (code: ${error.code})`)
  return data.id
}

async function upsertBand(payload) {
  if (!supabaseWrite) return null

  const { data, error } = await supabaseWrite
    .from('bands')
    .upsert(payload, { onConflict: 'slug' })
    .select('id')
    .single()

  if (error) throw new Error(`bands upsert: ${error.message} (code: ${error.code})`)
  return data.id
}

async function upsertBandProfile(bandId, payload) {
  if (!supabaseWrite || Object.keys(payload).length === 0) return

  const { error } = await supabaseWrite
    .from('band_profiles')
    .upsert({ band_id: bandId, ...payload }, { onConflict: 'band_id' })

  if (error) throw new Error(`band_profiles upsert: ${error.message} (code: ${error.code})`)
}

async function replaceBandEventTypes(bandId, eventTypeIds) {
  if (!supabaseWrite) return

  const { error: delErr } = await supabaseWrite
    .from('band_event_types')
    .delete()
    .eq('band_id', bandId)
  if (delErr) throw new Error(`band_event_types delete: ${delErr.message}`)

  if (eventTypeIds.length === 0) return

  const { error: insErr } = await supabaseWrite
    .from('band_event_types')
    .insert(eventTypeIds.map((id, i) => ({ band_id: bandId, event_type_id: id, sort_order: i })))
  if (insErr) throw new Error(`band_event_types insert: ${insErr.message}`)
}

async function replaceBandBandTypes(bandId, bandTypeIds) {
  if (!supabaseWrite) return

  const { error: delErr } = await supabaseWrite
    .from('band_band_types')
    .delete()
    .eq('band_id', bandId)
  if (delErr) throw new Error(`band_band_types delete: ${delErr.message}`)

  if (bandTypeIds.length === 0) return

  const { error: insErr } = await supabaseWrite
    .from('band_band_types')
    .insert(bandTypeIds.map((id, i) => ({
      band_id:     bandId,
      band_type_id: id,
      is_primary:  i === 0,
      sort_order:  i,
    })))
  if (insErr) throw new Error(`band_band_types insert: ${insErr.message}`)
}

async function checkServicePermissions() {
  if (!supabaseWrite) return true

  // band_event_types und band_band_types haben keine 'id'-Spalte (composite PK).
  // Für diese Tabellen wird 'band_id' selektiert statt 'id'.
  const tableChecks = [
    { table: 'bands',            col: 'id' },
    { table: 'band_profiles',    col: 'id' },
    { table: 'locations',        col: 'id' },
    { table: 'band_event_types', col: 'band_id' },
    { table: 'band_band_types',  col: 'band_id' },
  ]

  for (const { table, col } of tableChecks) {
    const { error } = await supabaseWrite.from(table).select(col).limit(1)
    if (error) {
      console.error(`\n✗ Berechtigung fehlt: service_role kann ${table} nicht lesen/schreiben`)
      console.error(`  ${error.message} (code: ${error.code})`)
      console.error(`\n  Bitte im Supabase SQL-Editor prüfen:`)
      console.error(`  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.${table} TO service_role;`)
      return false
    }
  }
  console.log('  ✓ Schreibberechtigungen für alle Zieltabellen vorhanden')
  return true
}

// ─── BAND VERARBEITEN ─────────────────────────────────────────────────────────

async function processBand(record, lookups, veranstaltungenMap, stats) {
  const f    = record.fields
  const name = f['Bandname']?.trim() ?? '(kein Name)'
  const slug = f['Slug']?.trim()?.toLowerCase() ?? ''

  const LINE = '─'.repeat(62)
  console.log(`\n${LINE}`)
  console.log(`  ${name}  (${slug || '—'})`)
  console.log(LINE)

  // ── Slug-Validierung ──────────────────────────────────────────────────────
  if (!slug) {
    console.log('  ✗ Kein Slug – übersprungen')
    stats.skipped++
    return
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    console.log(`  ✗ Ungültiger Slug "${slug}" (nur a-z, 0-9, Bindestrich erlaubt) – übersprungen`)
    stats.skipped++
    return
  }

  // ── Supabase-Status ───────────────────────────────────────────────────────
  const existing = lookups.bandsBySlug.get(slug)
  console.log(`  Supabase-Status:   ${existing
    ? `✓ bereits vorhanden (${existing.id})`
    : '– neu (wird angelegt)'}`)

  // ── Location ──────────────────────────────────────────────────────────────
  const plz      = firstStr(f['plz (from Orte-Master)']) ?? str(f['PLZ'])
  const city     = f['orte (from Orte-Master)']?.[0]?.trim()
  const district = f['landkreise (from Orte-Master)']?.[0]?.trim()
  const adminReg = f['regierungsbezirk (from Orte-Master)']?.[0]?.trim()
  const state    = f['bundesland (from Orte-Master)']?.[0]?.trim()
  const lat      = parseCoord(f['lat (from Orte-Master)'])
  const lon      = parseCoord(f['lon (from Orte-Master)'])
  const hasFullLocation = !!(plz && city)

  console.log(`  Location:`)
  if (hasFullLocation) {
    console.log(`    PLZ:             ${plz}`)
    console.log(`    Stadt:           ${city}`)
    if (district) console.log(`    Landkreis:       ${district}`)
    if (adminReg) console.log(`    Regierungsbez.:  ${adminReg}`)
    if (state)    console.log(`    Bundesland:      ${state}`)
    console.log(`    Koordinaten:     ${lat != null && lon != null ? `${lat}, ${lon}` : '(fehlen)'}`)
  } else {
    console.log(`    ⚠ Unvollständig (PLZ: ${plz ?? 'fehlt'}, Stadt: ${city ?? 'fehlt'})`)
    console.log(`    → home_location_id wird nicht gesetzt`)
  }

  // ── bands payload ─────────────────────────────────────────────────────────
  const websiteUrl = normalizeUrl(f['Website Link'])
  console.log(`  bands (UPSERT via slug):`)
  console.log(`    name:            ${name}`)
  console.log(`    slug:            ${slug}`)
  console.log(`    status:          active / is_published: true`)
  console.log(`    website_url:     ${websiteUrl ?? '(kein)'}`)

  // ── band_profiles payload ─────────────────────────────────────────────────
  const shortDescRaw = str(f['Short Descripton / Subheadline'])
  const mainTextRaw  = str(f['Main Text'])
  const metaDescRaw  = str(f['Meta Description'])
  // Schema-Constraints berücksichtigen
  const shortDesc = cap(shortDescRaw, 300)
  const mainText  = mainTextRaw?.trim() || undefined
  const metaDesc  = cap(metaDescRaw, 160)

  console.log(`  band_profiles (UPSERT via band_id):`)
  console.log(`    short_description: ${shortDesc
    ? `${preview(shortDesc, 60)} (${shortDesc.length} Z.)`
    : '⚠ fehlt'}`)
  console.log(`    main_text:         ${mainText
    ? `vorhanden (${mainText.length} Z.)`
    : '⚠ fehlt'}`)
  console.log(`    meta_description:  ${metaDesc
    ? `${preview(metaDesc, 55)} (${metaDesc.length} Z.)`
    : '(kein)'}`)

  // ── event_types ───────────────────────────────────────────────────────────
  const rawEventIds = Array.isArray(f['Veranstaltungstypen']) ? f['Veranstaltungstypen'] : []
  const matchedEventTypeIds    = []
  const missingEventTypeNames  = []

  // Airtable-Veranstaltungstypen können mehrfach auf dieselbe Supabase-ID zeigen
  // (z. B. "Festzelt" über verschiedene Veranstaltungen-Record-IDs).
  // Deduplizierung verhindert PRIMARY-KEY-Verletzung in band_event_types.
  const seenEventTypeIds  = new Set()
  const seenMissingNames  = new Set()

  console.log(`  event_types (${rawEventIds.length} Airtable-Referenzen):`)
  for (const recId of rawEventIds) {
    const entry = veranstaltungenMap.get(recId)
    if (!entry) {
      console.log(`    ? Unbekannte Record-ID ${recId} – übersprungen`)
      continue
    }
    const match = lookups.eventTypesByName.get(entry.displayName.toLowerCase())
    if (match) {
      if (seenEventTypeIds.has(match.id)) {
        console.log(`    ~ "${entry.displayName}" → doppelt, wird dedupliziert`)
      } else {
        console.log(`    ✓ "${entry.displayName}" → slug: ${match.slug}`)
        matchedEventTypeIds.push(match.id)
        seenEventTypeIds.add(match.id)
      }
    } else {
      if (!seenMissingNames.has(entry.displayName)) {
        console.log(`    ✗ "${entry.displayName}" → NICHT in Supabase event_types!`)
        missingEventTypeNames.push(entry.displayName)
        stats.missingLookups.eventTypes.add(entry.displayName)
        seenMissingNames.add(entry.displayName)
      }
    }
  }

  // ── band_types ────────────────────────────────────────────────────────────
  const rawBandTypeField = f['Name (Kurzform)']
  const rawBandTypeNames = Array.isArray(rawBandTypeField)
    ? rawBandTypeField.map(n => String(n).trim()).filter(Boolean)
    : rawBandTypeField ? [String(rawBandTypeField).trim()] : []
  const matchedBandTypeIds   = []
  const missingBandTypeNames = []

  console.log(`  band_types (${rawBandTypeNames.length} Airtable-Werte):`)
  for (let i = 0; i < rawBandTypeNames.length; i++) {
    const btName = rawBandTypeNames[i]
    const match  = lookups.bandTypesByName.get(btName.toLowerCase())
    if (match) {
      const primaryLabel = i === 0 ? ' (is_primary: true)' : ''
      console.log(`    ✓ "${btName}" → slug: ${match.slug}${primaryLabel}`)
      matchedBandTypeIds.push(match.id)
    } else {
      console.log(`    ✗ "${btName}" → NICHT in Supabase band_types!`)
      missingBandTypeNames.push(btName)
      stats.missingLookups.bandTypes.add(btName)
    }
  }

  // ── similar bands (Dry-Run-Analyse, wird nicht geschrieben) ───────────────
  const simNames = [
    firstStr(f['similar_1_name']),
    firstStr(f['similar_2_name']),
    firstStr(f['similar_3_name']),
  ].filter(Boolean)

  if (simNames.length > 0) {
    console.log(`  similar_bands (Analyse – band_relations werden separat migriert):`)
    for (const simName of simNames) {
      const match = lookups.bandsByName.get(simName.toLowerCase())
      console.log(`    ${match ? '✓' : '?'} "${simName}" ${match
        ? `→ slug: ${match.slug} ✓ in Supabase`
        : '→ noch nicht in Supabase (nach vollständiger Migration prüfen)'}`)
    }
  }

  // ── Render-Fähigkeit ──────────────────────────────────────────────────────
  const isRenderable  = !!(slug && name)
  const hasContent    = !!(shortDesc || mainText)
  const hasEventTypes = matchedEventTypeIds.length > 0
  const hasBandType   = matchedBandTypeIds.length > 0

  console.log(`  Render-Fähigkeit /band/${slug}:`)
  console.log(`    ${isRenderable  ? '✓' : '✗'} name + slug vorhanden`)
  console.log(`    ${hasContent    ? '✓' : '⚠'} Beschreibungstext: ${hasContent ? 'vorhanden' : 'fehlt – leere Sektion'}`)
  console.log(`    ${hasFullLocation ? '✓' : '⚠'} Location:   ${hasFullLocation ? `${city}, PLZ ${plz}` : 'nicht gesetzt'}`)
  console.log(`    ${hasEventTypes ? '✓' : '⚠'} Event-Types: ${matchedEventTypeIds.length}/${rawEventIds.length} gematcht`)
  console.log(`    ${hasBandType   ? '✓' : '⚠'} Band-Type:   ${matchedBandTypeIds.length}/${rawBandTypeNames.length} gematcht`)
  console.log(`    ℹ  Bilder: nach Migration → node scripts/migrate-band-images.mjs --slug=${slug}`)

  const warnings = []
  if (!hasContent)    warnings.push('keine Beschreibung')
  if (!hasFullLocation) warnings.push('keine Location')
  if (!hasEventTypes) warnings.push('keine Event-Types')
  if (!hasBandType)   warnings.push('kein Band-Type')

  const verdict = isRenderable
    ? `✓ RENDERFÄHIG${warnings.length ? ` (Hinweise: ${warnings.join(', ')})` : ''}`
    : '✗ NICHT RENDERFÄHIG – slug oder name fehlt'
  console.log(`\n  → ${verdict}`)

  stats.processed++
  if (!isRenderable) stats.notRenderable++

  if (DRY_RUN) return

  // ── ECHTER LAUF (nur mit --execute) ───────────────────────────────────────
  try {
    let locationId = null
    if (hasFullLocation) {
      locationId = await upsertLocation(plz, city, {
        landkreis: district, regierungsbezirk: adminReg,
        bundesland: state, latitude: lat, longitude: lon,
      })
      console.log(`  ✓ location upsert  (id: ${locationId})`)
    }

    const bandPayload = {
      name,
      slug,
      status:       'active',
      is_published: true,
      ...(websiteUrl  && { website_url: websiteUrl }),
      ...(locationId  && { home_location_id: locationId }),
    }
    const bandId = await upsertBand(bandPayload)
    console.log(`  ✓ bands upsert     (id: ${bandId})`)

    const profilePayload = {
      ...(shortDesc && { short_description: shortDesc }),
      ...(mainText  && { main_text: mainText }),
      ...(metaDesc  && { meta_description: metaDesc }),
    }
    await upsertBandProfile(bandId, profilePayload)
    console.log(`  ✓ band_profiles upsert`)

    await replaceBandEventTypes(bandId, matchedEventTypeIds)
    console.log(`  ✓ band_event_types  (${matchedEventTypeIds.length} Relationen)`)

    await replaceBandBandTypes(bandId, matchedBandTypeIds)
    console.log(`  ✓ band_band_types   (${matchedBandTypeIds.length} Relationen)`)

    stats.migrated++
  } catch (err) {
    console.error(`  ✗ Fehler: ${err.message}`)
    stats.errors++
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

;(async () => {
  const mode = DRY_RUN ? '[DRY RUN – kein Schreiben]' : '[EXECUTE – SCHREIBT IN SUPABASE]'
  const DLINE = '═'.repeat(62)

  console.log(`\n${DLINE}`)
  console.log(`  migrate-bands.mjs  ${mode}`)
  if (slugArg)                console.log(`  Slug-Filter:           ${slugArg}`)
  if (SKIP_SET.size > 0)      console.log(`  Überspringen (manual): ${[...SKIP_SET].join(', ')}`)
  if (SKIP_EXISTING_COMPLETE) console.log(`  --skip-existing-complete: aktiv`)
  if (LIMIT)                  console.log(`  Limit:                 ${LIMIT} zu bearbeitende Bands`)
  console.log(DLINE)

  if (EXECUTE) {
    console.log('\nPrüfe Schreibberechtigungen …')
    const ok = await checkServicePermissions()
    if (!ok) process.exit(1)
  }

  console.log('\nLade Airtable + Supabase-Daten …')
  const [veranstaltungenMap, lookups, allRecords] = await Promise.all([
    fetchVeranstaltungenMap(),
    loadSupabaseLookups(),
    fetchActiveBands(),
  ])

  console.log(`  Airtable aktive Bands:     ${allRecords.length}`)
  console.log(`  Veranstaltungen-Map:       ${veranstaltungenMap.size} Einträge`)
  console.log(`  Supabase event_types:      ${lookups.eventTypesByName.size} aktive`)
  console.log(`  Supabase band_types:       ${lookups.bandTypesCount} aktive`)
  console.log(`  Supabase Bands vorhanden:  ${lookups.bandsBySlug.size}`)
  console.log(`  Davon existing complete:   ${lookups.completeSlugSet.size}`)

  // ── Filtern ───────────────────────────────────────────────────────────────
  let records = allRecords

  if (slugArg) {
    records = records.filter(r =>
      r.fields['Slug']?.trim()?.toLowerCase() === slugArg.toLowerCase()
    )
    if (records.length === 0) {
      console.error(`\n✗ Keine aktive Band mit Slug "${slugArg}" in Airtable gefunden`)
      process.exit(1)
    }
  }

  if (SKIP_SET.size > 0) {
    records = records.filter(r => !SKIP_SET.has(r.fields['Slug']?.trim()?.toLowerCase()))
  }

  // ── --skip-existing-complete + Limit-Logik ────────────────────────────────
  // Mit --skip-existing-complete bedeutet --limit=N: N tatsächlich zu bearbeitende Bands,
  // nicht N Bands aus der Gesamtliste. Vollständige Supabase-Bands werden übersprungen
  // und zählen nicht zum Limit.
  let skippedCompleteNames = []
  let processRecords

  if (SKIP_EXISTING_COMPLETE) {
    processRecords = []
    for (const record of records) {
      const slug = record.fields['Slug']?.trim()?.toLowerCase() ?? ''
      if (lookups.completeSlugSet.has(slug)) {
        skippedCompleteNames.push(record.fields['Bandname']?.trim() ?? slug)
        continue
      }
      processRecords.push(record)
      if (LIMIT && processRecords.length >= LIMIT) break
    }
  } else {
    processRecords = LIMIT ? records.slice(0, LIMIT) : records
  }

  if (skippedCompleteNames.length > 0) {
    console.log(`\n  Übersprungen (existing complete): ${skippedCompleteNames.length} Band(s)`)
    for (const n of skippedCompleteNames) console.log(`    ~ ${n}`)
  }

  console.log(`\n→ Verarbeite ${processRecords.length} Band(s)`)

  // ── Statistiken ───────────────────────────────────────────────────────────
  const stats = {
    processed:      0,
    migrated:       0,
    skipped:        0,
    skippedComplete: skippedCompleteNames.length,
    errors:         0,
    notRenderable:  0,
    missingLookups: {
      eventTypes: new Set(),
      bandTypes:  new Set(),
    },
  }

  for (const record of processRecords) {
    await processBand(record, lookups, veranstaltungenMap, stats)
  }

  // ── Zusammenfassung ───────────────────────────────────────────────────────
  console.log(`\n${DLINE}`)
  console.log(`  Zusammenfassung  ${mode}`)
  console.log(DLINE)
  console.log(`  Verarbeitet:                ${stats.processed}`)
  if (EXECUTE) {
    console.log(`  Erfolgreich mig.:           ${stats.migrated}`)
    console.log(`  Fehler:                     ${stats.errors}`)
  }
  if (stats.skippedComplete > 0)
    console.log(`  Überspr. (existing compl.): ${stats.skippedComplete}`)
  console.log(`  Übersprungen (invalid):     ${stats.skipped}`)
  console.log(`  Nicht renderfähig:          ${stats.notRenderable}`)

  if (stats.missingLookups.eventTypes.size > 0) {
    console.log(`\n  ⚠ Fehlende event_types in Supabase (${stats.missingLookups.eventTypes.size}):`)
    for (const n of [...stats.missingLookups.eventTypes].sort())
      console.log(`    – "${n}"`)
    console.log(`    → Relationen wurden übersprungen.`)
    console.log(`    → Bitte Werte in Supabase event_types ergänzen,`)
    console.log(`      dann Bands erneut migrieren.`)
  }

  if (stats.missingLookups.bandTypes.size > 0) {
    console.log(`\n  ⚠ Fehlende band_types in Supabase (${stats.missingLookups.bandTypes.size}):`)
    for (const n of [...stats.missingLookups.bandTypes].sort())
      console.log(`    – "${n}"`)
    console.log(`    → Relationen wurden übersprungen.`)
  }

  if (stats.missingLookups.eventTypes.size === 0 && stats.missingLookups.bandTypes.size === 0) {
    console.log('\n  ✓ Alle Lookup-Werte gefunden – keine fehlenden Relationen')
  }

  if (DRY_RUN) {
    console.log(`\n  ℹ Dry Run abgeschlossen – kein Schreibvorgang ausgeführt.`)
    console.log(`  ℹ Echter Lauf: node scripts/migrate-bands.mjs --execute --slug=<slug>`)
  }

  if (EXECUTE && stats.errors > 0) {
    console.log(`\n  ⚠ ${stats.errors} Fehler aufgetreten. Bitte Log prüfen.`)
    process.exit(1)
  }
})()
