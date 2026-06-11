/**
 * migrate-wedding-info.mjs
 *
 * Migriert WeddingInfo-Felder aus Airtable nach Supabase.
 * Schreibziele: bands.default_member_count UND band_profiles.wedding_* Spalten.
 * Standardmäßig sicher: Schreiboperationen nur mit explizitem --execute.
 *
 * Dry Run (liest nur, schreibt nie):
 *   node scripts/migrate-wedding-info.mjs
 *   node scripts/migrate-wedding-info.mjs --slug=donnaweda
 *
 * Echter Lauf (nur nach expliziter Freigabe und nach Bestätigung der FEE_RANGE_MAP):
 *   node scripts/migrate-wedding-info.mjs --execute --slug=donnaweda
 *   node scripts/migrate-wedding-info.mjs --execute --confirm-bulk-execute
 *
 * Schreiblogik (additiv – keine bestehenden Werte überschreiben):
 *   Info - Bandgröße              → bands.default_member_count  (integer, nur wenn null)
 *   Info - Konstellation          → band_profiles.wedding_constellation
 *   Info - Brautentführung        → band_profiles.wedding_kidnapping_bride (ja/nein → bool)
 *   Info - Gagenniveau            → band_profiles.wedding_fee_range (normalisiert via FEE_RANGE_MAP)
 *   Info - Moderation             → band_profiles.wedding_moderation (ja/nein → bool)
 *   Info - Mögliche Spieldauer    → band_profiles.wedding_possible_playtimes
 *   Info - So feiern wir Hochzeit → band_profiles.wedding_description
 *
 * ⚠ FEE_RANGE_MAP muss vor --execute vom Betreiber auf Basis des Dry-Run-Reports bestätigt werden.
 * ⚠ Nur UPDATE bestehender band_profiles-Zeilen. Bands ohne Profilzeile werden übersprungen.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dir = dirname(fileURLToPath(import.meta.url))

// ─── FEE RANGE NORMALISIERUNG ─────────────────────────────────────────────────
// ⚠ BESTÄTIGUNG ERFORDERLICH: Diese Mapping-Tabelle vor --execute
//   auf Basis des Dry-Run-Reports ("feeRange Rohwerte + Normalisierungsvorschlag")
//   prüfen, ggf. anpassen und dann freigeben.
//
//   Schlüssel: Rohwert in Kleinschreibung + trim
//   Wert:      Kanonische Zielform (wird so in Supabase gespeichert)
//
//   Nicht gemappte Rohwerte werden in --execute übersprungen (⚠-Warnung im Report).
//   Ergänze fehlende Varianten nach dem Dry-Run-Report und wiederhole den Dry-Run.
const FEE_RANGE_MAP = {
  // Variante "Gage über 2.000 €"
  'gage über 2.000€':    'Gage über 2.000 €',
  'gage über 2.000 €':   'Gage über 2.000 €',
  // Variante "Gage unter 2.000 €"
  'gage unter 2.000€':   'Gage unter 2.000 €',
  'gage unter 2.000 €':  'Gage unter 2.000 €',
  'unter 2.000 €':       'Gage unter 2.000 €',
  'unter 2.000€':        'Gage unter 2.000 €',
  // Variante "Gage unter 3.000 €"
  'gage unter 3.000€':   'Gage unter 3.000 €',
  'gage unter 3.000 €':  'Gage unter 3.000 €',
  'unter 3.000 €':       'Gage unter 3.000 €',
  'unter 3.000€':        'Gage unter 3.000 €',
  // Variante "Gage über 3.000 €"
  'gage über 3.000€':    'Gage über 3.000 €',
  'gage über 3.000 €':   'Gage über 3.000 €',
  'über 3.000 €':        'Gage über 3.000 €',
  'über 3.000€':         'Gage über 3.000 €',
  // Variante "Gage über 4.000 €"
  'gage über 4.000€':    'Gage über 4.000 €',
  'gage über 4.000 €':   'Gage über 4.000 €',
  'über 4.000 €':        'Gage über 4.000 €',
  'über 4.000€':         'Gage über 4.000 €',
  // Variante "Auf Anfrage"
  'auf anfrage':         'Auf Anfrage',
  'auf anfrage ':        'Auf Anfrage',
}

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

const args         = process.argv.slice(2)
const EXECUTE      = args.includes('--execute')
const DRY_RUN      = !EXECUTE
const slugArg      = args.find(a => a.startsWith('--slug='))?.split('=')[1] ?? null
const CONFIRM_BULK = args.includes('--confirm-bulk-execute')

if (EXECUTE && !slugArg && !CONFIRM_BULK) {
  console.error(`
✗ Bulk execute blocked.
  Verwende --confirm-bulk-execute nur nach:
    1. Dry-Run-Report vollständig geprüft
    2. FEE_RANGE_MAP in diesem Script bestätigt/angepasst

  Dry Run:
    node scripts/migrate-wedding-info.mjs

  Einzelband Execute:
    node scripts/migrate-wedding-info.mjs --execute --slug=<slug>

  Bulk Execute (alle Bands):
    node scripts/migrate-wedding-info.mjs --execute --confirm-bulk-execute
`)
  process.exit(1)
}

// ─── ENV VARS ─────────────────────────────────────────────────────────────────

const AIRTABLE_TOKEN = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
const AIRTABLE_BASE  = process.env.AIRTABLE_BASE_ID
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY       = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY
const BANDS_TABLE    = process.env.AIRTABLE_BANDS_TABLE_NAME ?? 'Bands'

const missing = []
if (!AIRTABLE_TOKEN) missing.push('AIRTABLE_PERSONAL_ACCESS_TOKEN')
if (!AIRTABLE_BASE)  missing.push('AIRTABLE_BASE_ID')
if (!SUPABASE_URL)   missing.push('NEXT_PUBLIC_SUPABASE_URL')
if (!ANON_KEY)       missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
if (!SERVICE_KEY)    missing.push('SUPABASE_SERVICE_ROLE_KEY')

if (missing.length > 0) {
  console.error(`✗ Fehlende Env-Variablen: ${missing.join(', ')}`)
  process.exit(1)
}

// ─── SUPABASE CLIENTS ─────────────────────────────────────────────────────────

// Service-Role-Client für alle Operationen (band_profiles-UPDATEs benötigen ihn)
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Schreibender Client – nur im Execute-Modus aktiv (verhindert versehentliche Schreibzugriffe)
const supabaseWrite = EXECUTE ? supabase : null

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function short(val, max = 50) {
  if (val === null || val === undefined) return ''
  const s = String(val)
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

/**
 * Parst "ja"/"nein" zu boolean | null.
 * @returns { value: boolean|null, valid: boolean, raw?: string }
 */
function parseJaNein(raw) {
  if (!raw || raw.trim() === '') return { value: null, valid: true }
  const lower = raw.trim().toLowerCase()
  if (lower === 'ja')   return { value: true,  valid: true }
  if (lower === 'nein') return { value: false, valid: true }
  return { value: null, valid: false, raw: raw.trim() }
}

/**
 * Parst Airtable-Bandgröße (String) zu Integer für bands.default_member_count.
 * Nur reine Ganzzahlen im DB-Constraint-Bereich 1–30.
 * @returns { value: number|null, valid: boolean, raw?: string, reason?: string }
 */
function parseBandSize(raw) {
  if (!raw || String(raw).trim() === '') return { value: null, valid: true }
  const s = String(raw).trim()
  if (!/^\d+$/.test(s)) return { value: null, valid: false, raw: s }
  const n = parseInt(s, 10)
  if (n < 1 || n > 30) return { value: null, valid: false, raw: s, reason: `Wert ${n} außerhalb DB-Constraint 1–30` }
  return { value: n, valid: true }
}

/**
 * Normalisiert einen feeRange-Rohwert via FEE_RANGE_MAP.
 * @returns { normalized: string|null, valid: boolean, raw?: string }
 */
function normalizeFeeRange(raw) {
  if (!raw || raw.trim() === '') return { normalized: null, valid: true }
  const key = raw.trim().toLowerCase()
  const normalized = FEE_RANGE_MAP[key]
  if (normalized !== undefined) return { normalized, valid: true }
  return { normalized: null, valid: false, raw: raw.trim() }
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

async function fetchActiveBands() {
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
  const [bandsRes, profilesRes] = await Promise.all([
    supabase
      .from('bands')
      .select('id, slug, default_member_count')
      .order('slug'),
    supabase
      .from('band_profiles')
      .select('id, band_id, wedding_description, wedding_possible_playtimes, wedding_kidnapping_bride, wedding_moderation, wedding_constellation, wedding_fee_range'),
  ])

  if (bandsRes.error)    throw new Error(`Supabase bands: ${bandsRes.error.message}`)
  if (profilesRes.error) throw new Error(`Supabase band_profiles: ${profilesRes.error.message}`)

  const bandsBySlug      = new Map((bandsRes.data ?? []).map(b => [b.slug, b]))
  const profilesByBandId = new Map((profilesRes.data ?? []).map(p => [p.band_id, p]))

  return { bandsBySlug, profilesByBandId }
}

// ─── SUPABASE SCHREIBEN ───────────────────────────────────────────────────────

async function updateBandMemberCount(bandId, value) {
  const { error } = await supabaseWrite
    .from('bands')
    .update({ default_member_count: value })
    .eq('id', bandId)
  if (error) throw new Error(`bands UPDATE: ${error.message} (code: ${error.code ?? '–'})`)
}

async function updateBandProfile(bandId, payload) {
  const { error } = await supabaseWrite
    .from('band_profiles')
    .update(payload)
    .eq('band_id', bandId)
  if (error) throw new Error(`band_profiles UPDATE: ${error.message} (code: ${error.code ?? '–'})`)
}

// ─── POST-EXECUTE VERIFIKATION ────────────────────────────────────────────────

async function postExecuteVerification() {
  const DLINE = '═'.repeat(62)
  console.log(`\n${DLINE}`)
  console.log('  POST-EXECUTE VERIFIKATION')
  console.log(DLINE)

  const [bandsRes, profilesRes] = await Promise.all([
    supabase.from('bands').select('id, default_member_count'),
    supabase.from('band_profiles').select('band_id, wedding_description, wedding_possible_playtimes, wedding_kidnapping_bride, wedding_moderation, wedding_constellation, wedding_fee_range'),
  ])

  if (bandsRes.error || profilesRes.error) {
    console.error(`  ✗ Verifikations-Abfrage fehlgeschlagen`)
    if (bandsRes.error)    console.error(`    bands: ${bandsRes.error.message}`)
    if (profilesRes.error) console.error(`    band_profiles: ${profilesRes.error.message}`)
    return
  }

  const bands    = bandsRes.data ?? []
  const profiles = profilesRes.data ?? []

  console.log(`  bands gesamt:                    ${bands.length}`)
  console.log(`  default_member_count gesetzt:    ${bands.filter(b => b.default_member_count != null).length}`)
  console.log(`  band_profiles gesamt:            ${profiles.length}`)
  console.log(`  wedding_description gesetzt:     ${profiles.filter(p => p.wedding_description     != null).length}`)
  console.log(`  wedding_possible_playtimes:      ${profiles.filter(p => p.wedding_possible_playtimes != null).length}`)
  console.log(`  wedding_kidnapping_bride:        ${profiles.filter(p => p.wedding_kidnapping_bride != null).length}`)
  console.log(`  wedding_moderation:              ${profiles.filter(p => p.wedding_moderation       != null).length}`)
  console.log(`  wedding_constellation:           ${profiles.filter(p => p.wedding_constellation    != null).length}`)
  console.log(`  wedding_fee_range:               ${profiles.filter(p => p.wedding_fee_range        != null).length}`)
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

;(async () => {
  const mode  = DRY_RUN ? '[DRY RUN – kein Schreiben]' : '[EXECUTE – SCHREIBT IN SUPABASE]'
  const DLINE = '═'.repeat(62)
  const LINE  = '─'.repeat(62)

  console.log(`\n${DLINE}`)
  console.log(`  migrate-wedding-info.mjs  ${mode}`)
  if (slugArg) console.log(`  Slug-Filter: ${slugArg}`)
  console.log(DLINE)

  console.log('\nLade Airtable + Supabase-Daten …')
  const [allRecords, { bandsBySlug, profilesByBandId }] = await Promise.all([
    fetchActiveBands(),
    loadSupabaseData(),
  ])

  console.log(`  Airtable aktive Bands:          ${allRecords.length}`)
  console.log(`  Supabase-Bands vorhanden:       ${bandsBySlug.size}`)
  console.log(`  Supabase-Profile vorhanden:     ${profilesByBandId.size}`)

  // Slug-Filter
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

  console.log(`\n→ Verarbeite ${records.length} Band(s)`)

  // ── Statistiken ───────────────────────────────────────────────────────────

  const stats = {
    total:            records.length,
    supabaseMatch:    0,
    noSlugMatch:      0,
    withWeddingField: 0,
    noProfile:        0,
    bandsUpdate:      0,    // Bands mit ≥1 geplanten bands-Update
    profilesUpdate:   0,    // Bands mit ≥1 geplanten band_profiles-Update
    wouldWrite: {
      default_member_count:       0,
      wedding_description:        0,
      wedding_possible_playtimes: 0,
      wedding_kidnapping_bride:   0,
      wedding_moderation:         0,
      wedding_constellation:      0,
      wedding_fee_range:          0,
    },
    skippedExisting: {
      default_member_count:       0,
      wedding_description:        0,
      wedding_possible_playtimes: 0,
      wedding_kidnapping_bride:   0,
      wedding_moderation:         0,
      wedding_constellation:      0,
      wedding_fee_range:          0,
    },
    invalidValues: {
      kidnappingBride:  0,
      moderation:       0,
      bandSize:         0,
      feeRangeUnmapped: 0,
    },
    errors: 0,
  }

  const report = {
    noSlugMatch:      [],  // { airtableName, slug }
    noProfile:        [],  // { bandName, slug }
    invalidBooleans:  [],  // { bandName, field, raw }
    invalidBandSize:  [],  // { bandName, raw, reason? }
    feeRangeUnmapped: [],  // { bandName, raw }
    errors:           [],  // { bandName, error }
  }

  // feeRange-Varianten aus ALLEN Airtable-Datensätzen (unabhängig vom Supabase-Match)
  const feeRangeVariants = new Map()  // raw → count

  // ── Pro-Band-Schleife ─────────────────────────────────────────────────────

  for (const record of records) {
    const f        = record.fields
    const bandName = f['Bandname']?.trim() ?? '(kein Name)'
    const slug     = f['Slug']?.trim()?.toLowerCase() ?? ''

    // feeRange-Varianten immer sammeln, auch ohne Supabase-Match
    const feeRangeRaw = f['Info - Gagenniveau']?.trim() ?? ''
    if (feeRangeRaw) {
      feeRangeVariants.set(feeRangeRaw, (feeRangeVariants.get(feeRangeRaw) ?? 0) + 1)
    }

    console.log(`\n${LINE}`)
    console.log(`  ${bandName}  (${slug || '—'})`)
    console.log(LINE)

    // ── Slug-Match ────────────────────────────────────────────────────────
    const supaBand = slug ? bandsBySlug.get(slug) : null

    if (!supaBand) {
      console.log(`  ✗ Kein Supabase-Match für Slug "${slug}" – übersprungen`)
      stats.noSlugMatch++
      report.noSlugMatch.push({ airtableName: bandName, slug })
      continue
    }

    stats.supabaseMatch++
    console.log(`  Supabase-ID:  ${supaBand.id}`)

    // ── band_profiles-Existenzprüfung ─────────────────────────────────────
    const profile = profilesByBandId.get(supaBand.id) ?? null

    if (!profile) {
      console.log(`  ✗ Kein band_profiles-Eintrag – UPDATE wäre stiller No-op. Übersprungen.`)
      stats.noProfile++
      report.noProfile.push({ bandName, slug })
      continue
    }

    // ── Airtable-Felder lesen ─────────────────────────────────────────────
    const rawBandSize          = f['Info - Bandgröße'] != null ? String(f['Info - Bandgröße']).trim() : ''
    const rawConstellation     = f['Info - Konstellation']?.trim() ?? ''
    const rawKidnapping        = f['Info - Brautentführung']?.trim() ?? ''
    const rawModeration        = f['Info - Moderation']?.trim() ?? ''
    const rawFeeRange          = feeRangeRaw  // bereits oben gelesen
    const rawPossiblePlaytimes = f['Info - Mögliche Spieldauer']?.trim() ?? ''
    const rawDescription       = f['Info - So feiern wir Hochzeit']?.trim() ?? ''

    const hasAnyWedding = rawBandSize || rawConstellation || rawKidnapping ||
                          rawFeeRange || rawModeration || rawPossiblePlaytimes || rawDescription
    if (hasAnyWedding) stats.withWeddingField++

    // ── default_member_count (bands-Tabelle) ──────────────────────────────

    const bandSizeParsed = parseBandSize(rawBandSize)
    let bandsMemberCountUpdate = null  // null = kein Update geplant

    if (!bandSizeParsed.valid) {
      const reason = bandSizeParsed.reason ? ` – ${bandSizeParsed.reason}` : ''
      console.log(`  ⚠ bandSize ungültig: "${short(bandSizeParsed.raw)}"${reason}`)
      stats.invalidValues.bandSize++
      report.invalidBandSize.push({ bandName, raw: bandSizeParsed.raw, reason: bandSizeParsed.reason })
    } else if (bandSizeParsed.value !== null) {
      if (supaBand.default_member_count != null) {
        console.log(`  ~ default_member_count: ${supaBand.default_member_count} (Supabase hat Wert – übersprungen)`)
        stats.skippedExisting.default_member_count++
      } else {
        console.log(`  + default_member_count: ${bandSizeParsed.value}`)
        bandsMemberCountUpdate = bandSizeParsed.value
        stats.wouldWrite.default_member_count++
      }
    }

    // ── wedding_constellation ─────────────────────────────────────────────

    let profileConst = null

    if (rawConstellation) {
      if (profile.wedding_constellation != null) {
        stats.skippedExisting.wedding_constellation++
      } else {
        console.log(`  + wedding_constellation: "${short(rawConstellation, 45)}"`)
        profileConst = rawConstellation
        stats.wouldWrite.wedding_constellation++
      }
    }

    // ── wedding_kidnapping_bride ──────────────────────────────────────────

    const kidnapParsed = parseJaNein(rawKidnapping)
    // undefined = nicht in Payload aufnehmen; true/false = schreiben; null = nur bei leer→skip
    let profileKidnap = undefined

    if (!kidnapParsed.valid) {
      console.log(`  ⚠ Brautentführung: unerwarteter Wert "${short(kidnapParsed.raw)}"`)
      stats.invalidValues.kidnappingBride++
      report.invalidBooleans.push({ bandName, field: 'Info - Brautentführung', raw: kidnapParsed.raw })
    } else if (kidnapParsed.value !== null) {
      if (profile.wedding_kidnapping_bride != null) {
        stats.skippedExisting.wedding_kidnapping_bride++
      } else {
        console.log(`  + wedding_kidnapping_bride: ${kidnapParsed.value}`)
        profileKidnap = kidnapParsed.value
        stats.wouldWrite.wedding_kidnapping_bride++
      }
    }

    // ── wedding_moderation ────────────────────────────────────────────────

    const modParsed = parseJaNein(rawModeration)
    let profileMod = undefined

    if (!modParsed.valid) {
      console.log(`  ⚠ Moderation: unerwarteter Wert "${short(modParsed.raw)}"`)
      stats.invalidValues.moderation++
      report.invalidBooleans.push({ bandName, field: 'Info - Moderation', raw: modParsed.raw })
    } else if (modParsed.value !== null) {
      if (profile.wedding_moderation != null) {
        stats.skippedExisting.wedding_moderation++
      } else {
        console.log(`  + wedding_moderation: ${modParsed.value}`)
        profileMod = modParsed.value
        stats.wouldWrite.wedding_moderation++
      }
    }

    // ── wedding_fee_range ─────────────────────────────────────────────────

    const feeParsed = normalizeFeeRange(rawFeeRange)
    let profileFeeRange = null

    if (rawFeeRange) {
      if (!feeParsed.valid) {
        console.log(`  ⚠ wedding_fee_range: Rohwert "${short(feeParsed.raw)}" nicht in FEE_RANGE_MAP`)
        stats.invalidValues.feeRangeUnmapped++
        report.feeRangeUnmapped.push({ bandName, raw: feeParsed.raw })
      } else if (feeParsed.normalized !== null) {
        if (profile.wedding_fee_range != null) {
          stats.skippedExisting.wedding_fee_range++
        } else {
          if (DRY_RUN) {
            console.log(`  + wedding_fee_range: "${short(rawFeeRange, 30)}" → "${feeParsed.normalized}" (vorgeschlagen)`)
          } else {
            console.log(`  + wedding_fee_range: "${feeParsed.normalized}"`)
          }
          profileFeeRange = feeParsed.normalized
          stats.wouldWrite.wedding_fee_range++
        }
      }
    }

    // ── wedding_possible_playtimes ────────────────────────────────────────

    let profilePlaytimes = null

    if (rawPossiblePlaytimes) {
      if (profile.wedding_possible_playtimes != null) {
        stats.skippedExisting.wedding_possible_playtimes++
      } else {
        console.log(`  + wedding_possible_playtimes: "${short(rawPossiblePlaytimes, 45)}"`)
        profilePlaytimes = rawPossiblePlaytimes
        stats.wouldWrite.wedding_possible_playtimes++
      }
    }

    // ── wedding_description ───────────────────────────────────────────────

    let profileDesc = null

    if (rawDescription) {
      if (profile.wedding_description != null) {
        stats.skippedExisting.wedding_description++
      } else {
        console.log(`  + wedding_description: "${short(rawDescription, 45)}"`)
        profileDesc = rawDescription
        stats.wouldWrite.wedding_description++
      }
    }

    // ── Payload aufbauen und schreiben ────────────────────────────────────

    // bands-Payload
    if (bandsMemberCountUpdate !== null) {
      stats.bandsUpdate++
      if (EXECUTE) {
        try {
          await updateBandMemberCount(supaBand.id, bandsMemberCountUpdate)
          console.log(`  ✓ bands.default_member_count = ${bandsMemberCountUpdate} gesetzt`)
        } catch (err) {
          console.error(`  ✗ ${err.message}`)
          stats.errors++
          report.errors.push({ bandName, error: err.message })
        }
      }
    }

    // band_profiles-Payload (nur Felder mit Wert)
    const profilePayload = {}
    if (profileConst     !== null)      profilePayload.wedding_constellation    = profileConst
    if (profileKidnap    !== undefined) profilePayload.wedding_kidnapping_bride = profileKidnap
    if (profileMod       !== undefined) profilePayload.wedding_moderation       = profileMod
    if (profileFeeRange  !== null)      profilePayload.wedding_fee_range        = profileFeeRange
    if (profilePlaytimes !== null)      profilePayload.wedding_possible_playtimes = profilePlaytimes
    if (profileDesc      !== null)      profilePayload.wedding_description      = profileDesc

    if (Object.keys(profilePayload).length > 0) {
      stats.profilesUpdate++
      if (EXECUTE) {
        try {
          await updateBandProfile(supaBand.id, profilePayload)
          console.log(`  ✓ band_profiles: ${Object.keys(profilePayload).join(', ')}`)
        } catch (err) {
          console.error(`  ✗ ${err.message}`)
          stats.errors++
          report.errors.push({ bandName, error: err.message })
        }
      }
    }

    if (bandsMemberCountUpdate === null && Object.keys(profilePayload).length === 0) {
      console.log(`  ○ Keine Updates für diese Band`)
    }
  }

  // ── ZUSAMMENFASSUNG ───────────────────────────────────────────────────────

  console.log(`\n${DLINE}`)
  console.log(`  Zusammenfassung  ${mode}`)
  console.log(DLINE)
  console.log(`  Airtable-Bands gelesen:                   ${stats.total}`)
  console.log(`  Supabase-Slug-Matches:                    ${stats.supabaseMatch}`)
  console.log(`  Kein Slug-Match:                          ${stats.noSlugMatch}`)
  console.log(`  Ohne band_profiles-Zeile:                 ${stats.noProfile}`)
  console.log(`  Mit ≥1 WeddingInfo-Feld in Airtable:      ${stats.withWeddingField}`)
  console.log(``)
  console.log(`  Bands mit bands-Update (member_count):    ${stats.bandsUpdate}`)
  console.log(`  Bands mit band_profiles-Update:           ${stats.profilesUpdate}`)
  console.log(``)
  console.log(`  ${DRY_RUN ? 'Würde schreiben' : 'Geschrieben'}:`)
  console.log(`    default_member_count:                   ${stats.wouldWrite.default_member_count}`)
  console.log(`    wedding_description:                    ${stats.wouldWrite.wedding_description}`)
  console.log(`    wedding_possible_playtimes:             ${stats.wouldWrite.wedding_possible_playtimes}`)
  console.log(`    wedding_kidnapping_bride:               ${stats.wouldWrite.wedding_kidnapping_bride}`)
  console.log(`    wedding_moderation:                     ${stats.wouldWrite.wedding_moderation}`)
  console.log(`    wedding_constellation:                  ${stats.wouldWrite.wedding_constellation}`)
  console.log(`    wedding_fee_range:                      ${stats.wouldWrite.wedding_fee_range}`)
  console.log(``)
  console.log(`  Übersprungen (Supabase hat bereits Wert):`)
  console.log(`    default_member_count:                   ${stats.skippedExisting.default_member_count}`)
  console.log(`    wedding_description:                    ${stats.skippedExisting.wedding_description}`)
  console.log(`    wedding_possible_playtimes:             ${stats.skippedExisting.wedding_possible_playtimes}`)
  console.log(`    wedding_kidnapping_bride:               ${stats.skippedExisting.wedding_kidnapping_bride}`)
  console.log(`    wedding_moderation:                     ${stats.skippedExisting.wedding_moderation}`)
  console.log(`    wedding_constellation:                  ${stats.skippedExisting.wedding_constellation}`)
  console.log(`    wedding_fee_range:                      ${stats.skippedExisting.wedding_fee_range}`)
  console.log(``)
  console.log(`  Ungültige/unklare Werte:`)
  console.log(`    Brautentführung (unerwartet):           ${stats.invalidValues.kidnappingBride}`)
  console.log(`    Moderation (unerwartet):                ${stats.invalidValues.moderation}`)
  console.log(`    Bandgröße (kein Integer 1–30):          ${stats.invalidValues.bandSize}`)
  console.log(`    feeRange (nicht in FEE_RANGE_MAP):      ${stats.invalidValues.feeRangeUnmapped}`)

  if (!DRY_RUN) {
    console.log(``)
    console.log(`  Fehler beim Schreiben:                  ${stats.errors}`)
  }

  // ── DETAILREPORTS ─────────────────────────────────────────────────────────

  if (report.noProfile.length > 0) {
    console.log(`\n  ✗ Bands ohne band_profiles-Zeile – ÜBERSPRUNGEN (problematisch):`)
    for (const { bandName, slug } of report.noProfile) {
      console.log(`    ✗ "${bandName}" (${slug})`)
    }
  }

  if (report.noSlugMatch.length > 0) {
    console.log(`\n  Kein Supabase-Slug-Match:`)
    for (const { airtableName, slug } of report.noSlugMatch) {
      console.log(`    ✗ "${airtableName}" (Airtable-Slug: "${slug}")`)
    }
  }

  if (report.invalidBooleans.length > 0) {
    console.log(`\n  Ungültige Boolean-Werte (nicht migriert):`)
    for (const { bandName, field, raw } of report.invalidBooleans) {
      console.log(`    ⚠ "${bandName}" – ${field}: "${raw}"`)
    }
  }

  if (report.invalidBandSize.length > 0) {
    console.log(`\n  Ungültige Bandgröße-Werte (nicht migriert):`)
    for (const { bandName, raw, reason } of report.invalidBandSize) {
      console.log(`    ⚠ "${bandName}" – "${raw}"${reason ? ` (${reason})` : ''}`)
    }
  }

  if (report.feeRangeUnmapped.length > 0) {
    console.log(`\n  feeRange-Werte nicht in FEE_RANGE_MAP (nicht migriert):`)
    for (const { bandName, raw } of report.feeRangeUnmapped) {
      console.log(`    ⚠ "${bandName}" – "${raw}"`)
    }
    console.log(`  → FEE_RANGE_MAP in diesem Script ergänzen, dann Dry-Run wiederholen.`)
  }

  if (report.errors.length > 0) {
    console.log(`\n  Fehler beim Schreiben:`)
    for (const { bandName, error } of report.errors) {
      console.log(`    ✗ "${bandName}": ${error}`)
    }
  }

  // ── FEE RANGE VARIANTEN + NORMALISIERUNGSVORSCHLAG ────────────────────────

  console.log(`\n${DLINE}`)
  console.log(`  feeRange Rohwerte + Normalisierungsvorschlag`)
  if (DRY_RUN) {
    console.log(`  ⚠ Bitte bestätigen, bevor --execute ausgeführt wird.`)
    console.log(`    Kanonische Zielform (Präfix, Leerzeichen, Groß-/Kleinschreibung)`)
    console.log(`    ist eine Anzeige-Entscheidung – FEE_RANGE_MAP ggf. anpassen.`)
  }
  console.log(DLINE)

  if (feeRangeVariants.size === 0) {
    console.log(`  (keine feeRange-Werte in Airtable-Datensätzen gefunden)`)
  } else {
    const sorted = [...feeRangeVariants.entries()].sort((a, b) => b[1] - a[1])
    const maxRaw = Math.max(...sorted.map(([r]) => r.length))
    const padTo  = Math.max(maxRaw + 2, 32)

    console.log(`  ${'Rohwert (Anzahl)'.padEnd(padTo + 8)}  Kanonische Zielform (FEE_RANGE_MAP)`)
    console.log(`  ${'-'.repeat(60)}`)

    for (const [raw, count] of sorted) {
      const key    = raw.toLowerCase().trim()
      const mapped = FEE_RANGE_MAP[key]
      const label  = `"${raw}" (${count})`
      const target = mapped ? `"${mapped}"` : '⚠ NICHT GEMAPPT – FEE_RANGE_MAP ergänzen!'
      console.log(`  ${label.padEnd(padTo + 8)}  →  ${target}`)
    }

    const unmapped = sorted.filter(([raw]) => !FEE_RANGE_MAP[raw.toLowerCase().trim()])
    if (unmapped.length > 0) {
      console.log(`\n  ⚠ ${unmapped.length} Rohwert(e) nicht in FEE_RANGE_MAP.`)
      console.log(`    Script anpassen und Dry-Run wiederholen, bevor --execute läuft.`)
    } else {
      console.log(`\n  ✓ Alle feeRange-Rohwerte sind in FEE_RANGE_MAP gemappt.`)
    }
  }

  // ── DRY RUN ABSCHLUSS ─────────────────────────────────────────────────────

  if (DRY_RUN) {
    console.log(`\n${DLINE}`)
    console.log(`  ℹ Dry Run abgeschlossen – kein Schreibvorgang ausgeführt.`)
    console.log(``)
    console.log(`  Nächste Schritte:`)
    console.log(`  1. feeRange Normalisierungsvorschlag oben bestätigen oder anpassen`)
    console.log(`  2. FEE_RANGE_MAP in diesem Script ggf. aktualisieren`)
    console.log(`  3. Einzelband-Test:`)
    console.log(`       node scripts/migrate-wedding-info.mjs --execute --slug=<slug>`)
    console.log(`  4. Bulk Execute (nach Freigabe):`)
    console.log(`       node scripts/migrate-wedding-info.mjs --execute --confirm-bulk-execute`)
    console.log(DLINE)
  }

  // ── POST-EXECUTE VERIFIKATION ─────────────────────────────────────────────

  if (EXECUTE) {
    await postExecuteVerification()
    if (stats.errors > 0) {
      console.log(`\n  ⚠ ${stats.errors} Fehler aufgetreten. Bitte Log oben prüfen.`)
      process.exit(1)
    }
  }
})()
