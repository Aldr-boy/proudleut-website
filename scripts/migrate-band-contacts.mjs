/**
 * migrate-band-contacts.mjs
 *
 * Migriert Kontaktinformationen aus Airtable nach Supabase band_contacts.
 * Standardmäßig sicher: Schreiboperationen nur mit explizitem --execute.
 *
 * Dry Run (liest nur, schreibt nie):
 *   node scripts/migrate-band-contacts.mjs
 *   node scripts/migrate-band-contacts.mjs --slug=2-unplugged
 *
 * Echter Lauf (nur nach expliziter Freigabe):
 *   node scripts/migrate-band-contacts.mjs --execute --slug=2-unplugged
 *   node scripts/migrate-band-contacts.mjs --execute --confirm-bulk-execute
 *
 * Rollenlogik:
 *   E-Mail-Domain proudleut.com → contact_role = 'management'
 *   Alle anderen                → contact_role = 'band_direct'
 *
 * Feste Werte für alle migrierten Kontakte:
 *   is_public          = false
 *   is_primary_inquiry = true
 *
 * Bestehende Kontakte werden nicht überschrieben.
 * Bands mit ≥1 vorhandenem Kontakt werden als SKIP_EXISTING_CONTACT ausgewiesen.
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
const EXECUTE = args.includes('--execute')
const DRY_RUN = !EXECUTE  // Default ist immer Dry Run

const slugArg           = args.find(a => a.startsWith('--slug='))?.split('=')[1] ?? null
const CONFIRM_BULK      = args.includes('--confirm-bulk-execute')

if (DRY_RUN && EXECUTE) {
  // Kann strukturell nicht auftreten, aber zur Sicherheit
  console.error('✗ Interner Fehler: widersprüchliche Flags.')
  process.exit(1)
}

// Bulk-Execute-Guard: --execute ohne --slug erfordert --confirm-bulk-execute
if (EXECUTE && !slugArg && !CONFIRM_BULK) {
  console.error(`
✗ Bulk execute blocked.
  Verwende --confirm-bulk-execute nur nach Prüfung des Dry-Run-Reports.

  Dry Run:
    node scripts/migrate-band-contacts.mjs

  Einzelband Execute:
    node scripts/migrate-band-contacts.mjs --execute --slug=<slug>

  Bulk Execute (alle Bands):
    node scripts/migrate-band-contacts.mjs --execute --confirm-bulk-execute
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
// SERVICE_KEY wird auch für Dry Run benötigt: band_contacts ist für den Anon-Key nicht lesbar
// (Kontaktdaten sind bewusst nicht öffentlich zugänglich)
if (!SERVICE_KEY)    missing.push('SUPABASE_SERVICE_ROLE_KEY')

if (missing.length > 0) {
  console.error(`✗ Fehlende Env-Variablen: ${missing.join(', ')}`)
  process.exit(1)
}

// ─── SUPABASE CLIENTS ─────────────────────────────────────────────────────────

// Lesender Client für öffentliche Tabellen (anon key)
const supabaseRead = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Service-Role-Client – wird immer benötigt (auch für Dry Run):
// band_contacts ist für den Anon-Key nicht lesbar (Kontaktdaten sind nicht öffentlich).
// Im Dry Run: nur lesen. Bei --execute: auch schreiben.
const supabaseService = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Schreibender Client – Alias für Klarheit in der Insert-Logik
const supabaseWrite = EXECUTE ? supabaseService : null

// ─── KONSTANTEN ───────────────────────────────────────────────────────────────

const VALID_ROLES         = new Set(['management', 'booking', 'band_direct', 'technik', 'press'])
const PROUDLEUT_DOMAIN    = 'proudleut.com'
const EMAIL_REGEX         = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MULTI_EMAIL_PATTERN = /[,;\n]|@.*@/  // mehr als ein @ oder Trenner

// ─── DATENSCHUTZ-HELPERS ──────────────────────────────────────────────────────

function maskEmail(email) {
  if (!email || typeof email !== 'string') return null
  const trimmed = email.trim()
  if (!trimmed.includes('@')) return null
  const [local, domain] = trimmed.split('@')
  return `${local.slice(0, 2)}***@${domain}`
}

function extractDomain(email) {
  if (!email || typeof email !== 'string') return null
  const trimmed = email.trim()
  const at = trimmed.lastIndexOf('@')
  return at >= 0 ? trimmed.slice(at + 1).toLowerCase() : null
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
  // Alle Felder laden (kein fields[]-Filter wegen Airtable-URL-Eigenheiten bei Sonderzeichen)
  // Analog zu migrate-bands.mjs und lib/airtable/queries.ts
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
  const [bandsRes, existingContactsRes] = await Promise.all([
    supabaseRead
      .from('bands')
      .select('id, name, slug')
      .order('slug'),
    // band_contacts ist nicht öffentlich → Service-Role-Key erforderlich
    supabaseService
      .from('band_contacts')
      .select('band_id, is_primary_inquiry'),
  ])

  if (bandsRes.error)
    throw new Error(`Supabase bands: ${bandsRes.error.message}`)
  if (existingContactsRes.error)
    throw new Error(`Supabase band_contacts: ${existingContactsRes.error.message}`)

  const bandsBySlug = new Map((bandsRes.data ?? []).map(b => [b.slug, b]))

  // Bands, die bereits mindestens einen Kontakt haben
  const bandsWithContacts = new Set(
    (existingContactsRes.data ?? []).map(c => c.band_id)
  )

  return { bandsBySlug, bandsWithContacts }
}

// ─── KONTAKT VALIDIEREN ───────────────────────────────────────────────────────

/**
 * Gibt null zurück wenn valide, oder einen Fehlerstring.
 */
function validateContactData(name, email, phone) {
  if (!name && !email) return 'Weder Name noch E-Mail vorhanden'
  if (!name)           return 'Kontaktname fehlt'
  if (!email)          return 'E-Mail fehlt'

  // Grob-Plausibilität
  if (!EMAIL_REGEX.test(email.trim())) return `E-Mail nicht plausibel: ${maskEmail(email) ?? email.slice(0, 8) + '…'}`

  // Mehrfach-E-Mails in einem Feld
  if (MULTI_EMAIL_PATTERN.test(email) || (email.match(/@/g) ?? []).length > 1) {
    return 'Mehrfach-E-Mails in einem Feld – bitte manuell prüfen'
  }

  // Mehrfachpersonen-Heuristik: Komma im Namen + beide Teile haben Großbuchstaben
  if (name.includes(',') || (name.includes(' und ') && name.length > 30)) {
    return `Möglicherweise mehrere Personen im Namensfeld: "${name.slice(0, 40)}"`
  }

  return null
}

// ─── SUPABASE SCHREIBEN ───────────────────────────────────────────────────────

async function insertContact(payload) {
  if (!supabaseWrite) return

  const { error } = await supabaseWrite
    .from('band_contacts')
    .insert(payload)

  if (error) {
    if (error.code === '23505') {
      if (error.message.includes('idx_band_contacts_one_primary_per_band'))
        throw new Error('PRIMARY_CONFLICT: Band hat bereits einen is_primary_inquiry=true Kontakt')
      if (error.message.includes('idx_band_contacts_unique_role'))
        throw new Error('DUPLICATE_ROLE: Band hat bereits einen Kontakt mit dieser Rolle')
      throw new Error(`DUPLICATE: ${error.message}`)
    }
    if (error.code === '23514')
      throw new Error(`CHECK_FAILED: ${error.message} – Wert verletzt DB-Constraint`)
    throw new Error(`DB_ERROR: ${error.message} (code: ${error.code})`)
  }
}

async function checkServicePermissions() {
  if (!supabaseWrite) return true

  const { error } = await supabaseWrite
    .from('band_contacts')
    .select('id')
    .limit(1)

  if (error) {
    console.error(`\n✗ Berechtigung fehlt: service_role kann band_contacts nicht lesen/schreiben`)
    console.error(`  ${error.message} (code: ${error.code})`)
    return false
  }

  console.log('  ✓ Schreibberechtigung für band_contacts vorhanden')
  return true
}

// ─── POST-EXECUTE-VERIFIKATION ────────────────────────────────────────────────

async function postExecuteVerification() {
  if (!supabaseWrite) return

  const DLINE = '═'.repeat(62)
  console.log(`\n${DLINE}`)
  console.log('  POST-EXECUTE VERIFIKATION')
  console.log(DLINE)

  const { data, error } = await supabaseWrite
    .from('band_contacts')
    .select('band_id, contact_role, is_primary_inquiry, is_public')

  if (error) {
    console.error(`  ✗ Verifikations-Abfrage fehlgeschlagen: ${error.message}`)
    return
  }

  const total          = data.length
  const isPrimaryCount = data.filter(c => c.is_primary_inquiry).length
  const isPublicCount  = data.filter(c => c.is_public).length
  const mgmtCount      = data.filter(c => c.contact_role === 'management').length
  const directCount    = data.filter(c => c.contact_role === 'band_direct').length
  const uniqueBands    = new Set(data.map(c => c.band_id)).size

  console.log(`  Kontakte gesamt in band_contacts:   ${total}`)
  console.log(`  Bands mit ≥1 Kontakt:               ${uniqueBands}`)
  console.log(`  is_primary_inquiry = true:          ${isPrimaryCount}`)
  console.log(`  is_public = true:                   ${isPublicCount}  ← Erwartung: 0`)
  console.log(`  contact_role = 'management':        ${mgmtCount}`)
  console.log(`  contact_role = 'band_direct':       ${directCount}`)

  if (isPublicCount !== 0) {
    console.error(`\n  ✗ WARNUNG: is_public = true bei ${isPublicCount} Kontakt(en) — Erwartung war 0!`)
  } else {
    console.log(`\n  ✓ is_public = false für alle Kontakte – korrekt`)
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

;(async () => {
  const mode  = DRY_RUN ? '[DRY RUN – kein Schreiben]' : '[EXECUTE – SCHREIBT IN SUPABASE]'
  const DLINE = '═'.repeat(62)
  const LINE  = '─'.repeat(62)

  console.log(`\n${DLINE}`)
  console.log(`  migrate-band-contacts.mjs  ${mode}`)
  if (slugArg) console.log(`  Slug-Filter: ${slugArg}`)
  console.log(DLINE)

  if (EXECUTE) {
    console.log('\nPrüfe Schreibberechtigungen …')
    const ok = await checkServicePermissions()
    if (!ok) process.exit(1)
  }

  console.log('\nLade Airtable + Supabase-Daten …')
  const [allRecords, { bandsBySlug, bandsWithContacts }] = await Promise.all([
    fetchActiveBands(),
    loadSupabaseData(),
  ])

  console.log(`  Airtable aktive Bands:      ${allRecords.length}`)
  console.log(`  Supabase-Bands vorhanden:   ${bandsBySlug.size}`)
  console.log(`  Bands mit Kontakt (vorher): ${bandsWithContacts.size}`)

  // ── Slug-Filter ───────────────────────────────────────────────────────────
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
    total:          records.length,
    supabaseMatch:  0,
    noSlugMatch:    0,
    skipExisting:   0,
    wouldInsert:    0,
    inserted:       0,
    invalid:        0,
    errors:         0,
    noPhone:        0,
    roleManagement: 0,
    roleBandDirect: 0,
  }

  const report = {
    managementBands:  [],  // { bandName, maskedEmail }
    skipExisting:     [],  // { bandName }
    invalid:          [],  // { bandName, reason }
    noPhone:          [],  // bandName
    noSlugMatch:      [],  // { airtableName, slug }
    errors:           [],  // { bandName, error }
  }

  // ── Pro-Band-Schleife ─────────────────────────────────────────────────────
  for (const record of records) {
    const f        = record.fields
    const bandName = f['Bandname']?.trim() ?? '(kein Name)'
    const slug     = f['Slug']?.trim()?.toLowerCase() ?? ''

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

    console.log(`  Supabase-ID:  ${supaBand.id}`)
    stats.supabaseMatch++

    // ── Bestehende Kontakte prüfen ────────────────────────────────────────
    if (bandsWithContacts.has(supaBand.id)) {
      console.log(`  ~ SKIP_EXISTING_CONTACT – Band hat bereits ≥1 Kontakt in Supabase`)
      stats.skipExisting++
      report.skipExisting.push({ bandName })
      continue
    }

    // ── Airtable-Kontaktfelder lesen ──────────────────────────────────────
    const rawName  = f['Ansprechpartner - Name']?.trim() ?? ''
    const rawEmail = f['Ansprechpartner - E-Mail']?.trim() ?? ''
    const rawPhone = f['Ansprechpartner - Telefon']?.trim() ?? ''

    const hasPhone = rawPhone.length > 0
    if (!hasPhone) {
      stats.noPhone++
      report.noPhone.push(bandName)
    }

    console.log(`  Kontaktname:  ${rawName || '(leer)'}`)
    console.log(`  E-Mail:       ${maskEmail(rawEmail) ?? '(leer)'}`)
    console.log(`  Telefon:      ${hasPhone ? 'vorhanden' : '(fehlt – wird als null gesetzt)'}`)

    // ── Validierung ───────────────────────────────────────────────────────
    const validationError = validateContactData(rawName, rawEmail, rawPhone)
    if (validationError) {
      console.log(`  ✗ Ungültig: ${validationError}`)
      stats.invalid++
      report.invalid.push({ bandName, reason: validationError })
      continue
    }

    // ── Rollenlogik ───────────────────────────────────────────────────────
    const domain      = extractDomain(rawEmail) ?? ''
    const contactRole = domain === PROUDLEUT_DOMAIN ? 'management' : 'band_direct'

    console.log(`  Domain:       ${domain}`)
    console.log(`  contact_role: ${contactRole}`)

    if (contactRole === 'management') {
      stats.roleManagement++
      report.managementBands.push({ bandName, maskedEmail: maskEmail(rawEmail) })
    } else {
      stats.roleBandDirect++
    }

    // ── Payload ───────────────────────────────────────────────────────────
    const payload = {
      band_id:            supaBand.id,
      contact_name:       rawName || null,
      email:              rawEmail || null,
      phone:              hasPhone ? rawPhone : null,
      contact_role:       contactRole,
      is_public:          false,
      is_primary_inquiry: true,
    }

    if (DRY_RUN) {
      console.log(`  → würde einfügen: contact_role=${contactRole}, is_public=false, is_primary_inquiry=true`)
      stats.wouldInsert++
    } else {
      // ── ECHTER INSERT ──────────────────────────────────────────────────
      try {
        await insertContact(payload)
        console.log(`  ✓ Kontakt eingefügt`)
        stats.inserted++
      } catch (err) {
        console.error(`  ✗ Fehler: ${err.message}`)
        stats.errors++
        report.errors.push({ bandName, error: err.message })
      }
    }
  }

  // ── ZUSAMMENFASSUNG ───────────────────────────────────────────────────────
  console.log(`\n${DLINE}`)
  console.log(`  Zusammenfassung  ${mode}`)
  console.log(DLINE)
  console.log(`  Airtable-Bands gelesen:         ${stats.total}`)
  console.log(`  Supabase-Matches:               ${stats.supabaseMatch}`)
  console.log(`  Kein Slug-Match:                ${stats.noSlugMatch}`)
  console.log(`  SKIP_EXISTING_CONTACT:          ${stats.skipExisting}`)
  console.log(`  Ungültig/unklar:                ${stats.invalid}`)
  console.log(`  Fehlende Telefonnummer:         ${stats.noPhone}`)
  console.log(`  contact_role 'management':      ${stats.roleManagement}`)
  console.log(`  contact_role 'band_direct':     ${stats.roleBandDirect}`)

  if (DRY_RUN) {
    console.log(`  Würde einfügen:                 ${stats.wouldInsert}`)
    console.log(`\n  ℹ Dry Run – kein Schreibvorgang ausgeführt.`)
    console.log(`\n  Echter Lauf (Einzelband):`)
    console.log(`    node scripts/migrate-band-contacts.mjs --execute --slug=<slug>`)
    console.log(`\n  Echter Lauf (alle Bands):`)
    console.log(`    node scripts/migrate-band-contacts.mjs --execute --confirm-bulk-execute`)
  } else {
    console.log(`  Erfolgreich eingefügt:          ${stats.inserted}`)
    console.log(`  Fehler:                         ${stats.errors}`)
  }

  // ── DETAILREPORTS ─────────────────────────────────────────────────────────

  if (report.managementBands.length > 0) {
    console.log(`\n  Management-Kontakte (proudleut.com-Domain):`)
    for (const { bandName, maskedEmail } of report.managementBands) {
      console.log(`    • ${bandName}: ${maskedEmail}`)
    }
  }

  if (report.skipExisting.length > 0) {
    console.log(`\n  SKIP_EXISTING_CONTACT – Bands mit vorhandenem Kontakt:`)
    for (const { bandName } of report.skipExisting) {
      console.log(`    ~ ${bandName}`)
    }
  }

  if (report.noPhone.length > 0 && report.noPhone.length <= 20) {
    console.log(`\n  Bands ohne Telefonnummer (phone = null):`)
    for (const bandName of report.noPhone) {
      console.log(`    ⚠ ${bandName}`)
    }
  }

  if (report.invalid.length > 0) {
    console.log(`\n  Ungültige/unklare Fälle – nicht migriert:`)
    for (const { bandName, reason } of report.invalid) {
      console.log(`    ✗ ${bandName}: ${reason}`)
    }
  }

  if (report.noSlugMatch.length > 0) {
    console.log(`\n  Kein Supabase-Slug-Match:`)
    for (const { airtableName, slug } of report.noSlugMatch) {
      console.log(`    ✗ "${airtableName}" (slug: "${slug}")`)
    }
  }

  if (report.errors.length > 0) {
    console.log(`\n  Fehler beim Einfügen:`)
    for (const { bandName, error } of report.errors) {
      console.log(`    ✗ ${bandName}: ${error}`)
    }
  }

  // ── POST-EXECUTE VERIFIKATION ─────────────────────────────────────────────
  if (EXECUTE) {
    await postExecuteVerification()
  }

  if (EXECUTE && stats.errors > 0) {
    console.log(`\n  ⚠ ${stats.errors} Fehler aufgetreten. Bitte Log prüfen.`)
    process.exit(1)
  }
})()
