/**
 * anfragen-pro-woche.mjs
 *
 * NUR LESEN. Zaehlt Anfragen ueber proudleut.com pro Kalenderwoche
 * (Montag 00:00 bis Sonntag 23:59, Zeit Europe/Berlin).
 *
 *   Anfragen        = Zeilen in `anfragen`
 *   angefragte Bands = Zeilen in `anfrage_bands` dieser Anfragen
 *
 * Testanfragen werden NICHT mitgezaehlt, sondern getrennt aufgelistet:
 *   - Absender alexander@proudleut.com / alexander.dressler@proudleut.com
 *   - "test" als eigenes Wort in Vorname, Nachname, Spitzname oder Nachricht
 * Unklare Faelle (z. B. andere @proudleut.com-Adresse, "test" in der
 * E-Mail-Adresse) werden mitgezaehlt und im Bericht gekennzeichnet.
 *
 * Aufruf (aus dem Projektordner, liest .env.local):
 *   node scripts/anfragen-pro-woche.mjs                 # ab 05.10.2026 bis heute
 *   node scripts/anfragen-pro-woche.mjs --bis=2026-11-16 # bis Woche vom 16.11.2026
 *   node scripts/anfragen-pro-woche.mjs --ab=2026-11-16  # nur ab dieser Woche
 *
 * Benoetigt NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY.
 * Schreibt nichts (nur .select()).
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dir = dirname(fileURLToPath(import.meta.url))
const TZ = 'Europe/Berlin'
// Vom Betreiber bestaetigte Testanfragen, fest ueber ihre Kennung (id) ausgeschlossen.
const BESTAETIGTE_TESTS = new Set([
  '2f848e29-41a9-4e5f-bc73-eb9bb7499483', // 08.10.2026
  'e6ed874e-2edf-45c7-af53-0fccd70ccfeb', // 08.10.2026
  '0a51b766-b0c9-42c5-8b4b-ecc4c2b62b04', // 27.10.2026
  '4c75dab2-17de-4ecf-8e84-61a1c872bdfd', // 27.10.2026
  '5beb8505-f715-429a-9abd-a262811b4448', // 27.10.2026
  'd95c9fb6-64ae-42c7-8813-527121a52410', // 27.10.2026
])
const TEST_EMAILS = ['alexander@proudleut.com', 'alexander.dressler@proudleut.com']

function loadEnv() {
  try {
    const text = readFileSync(resolve(__dir, '..', '.env.local'), 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    // keine .env.local: Variablen muessen dann in der Umgebung stehen
  }
}

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : null
}

// Datum (YYYY-MM-DD) und Uhrzeit eines Zeitpunkts in Berliner Zeit
const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})
function berlinParts(date) {
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]))
  return { ymd: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}` }
}

// Montag der Woche zu einem YYYY-MM-DD
function mondayOf(ymd) {
  const d = new Date(`${ymd}T00:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7 // Mo=0
  d.setUTCDate(d.getUTCDate() - dow)
  return d.toISOString().slice(0, 10)
}
function addDays(ymd, n) {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const de = (ymd) => ymd.split('-').reverse().join('.')

function testReason(a) {
  if (BESTAETIGTE_TESTS.has(a.id)) return { kind: 'test', why: 'vom Betreiber als Test bestaetigt' }
  const email = (a.email ?? '').toLowerCase()
  const conf = (a.confirmation_recipient ?? '').toLowerCase()
  if (TEST_EMAILS.includes(email) || TEST_EMAILS.includes(conf)) return { kind: 'test', why: 'eigene E-Mail-Adresse' }
  const wordTest = /(^|[^a-zäöüß])test([^a-zäöüß]|$)/i
  for (const f of ['vorname', 'nachname', 'spitzname', 'nachricht']) {
    if (a[f] && wordTest.test(a[f])) return { kind: 'test', why: `"Test" in ${f}` }
  }
  if (email.endsWith('@proudleut.com') || /test/i.test(email)) {
    return { kind: 'unklar', why: 'E-Mail-Adresse wirkt intern/Test, aber nicht eindeutig' }
  }
  return null
}

async function fetchAll(supabase, table, columns, order) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).order(order).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...data)
    if (data.length < 1000) break
  }
  return rows
}

async function main() {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt (.env.local).')
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const startWeek = mondayOf(arg('ab') ?? '2026-10-05')
  const endWeek = mondayOf(arg('bis') ?? berlinParts(new Date()).ymd)

  const anfragen = await fetchAll(
    supabase, 'anfragen',
    'id, created_at, email, confirmation_recipient, vorname, nachname, spitzname, nachricht',
    'created_at',
  )
  const bands = await fetchAll(supabase, 'anfrage_bands', 'anfrage_id', 'created_at')

  const bandCount = new Map()
  for (const b of bands) bandCount.set(b.anfrage_id, (bandCount.get(b.anfrage_id) ?? 0) + 1)

  const weeks = new Map()
  for (let w = startWeek; w <= endWeek; w = addDays(w, 7)) weeks.set(w, { anfragen: 0, bands: 0, unklar: 0 })
  const tests = []

  for (const a of anfragen) {
    const { ymd, hm } = berlinParts(new Date(a.created_at))
    const week = mondayOf(ymd)
    if (!weeks.has(week)) continue
    const r = testReason(a)
    if (r?.kind === 'test') {
      tests.push({ ymd, hm, why: r.why, bands: bandCount.get(a.id) ?? 0 })
      continue
    }
    const w = weeks.get(week)
    w.anfragen += 1
    w.bands += bandCount.get(a.id) ?? 0
    if (r?.kind === 'unklar') {
      w.unklar += 1
      tests.push({ ymd, hm, why: `UNKLAR, mitgezaehlt: ${r.why}`, bands: bandCount.get(a.id) ?? 0, counted: true })
    }
  }

  console.log(`Anfragen pro Woche (Mo-So, ${TZ}), ohne Testanfragen\n`)
  console.log('Woche ab   | Anfragen | angefragte Bands | davon unklar')
  let sa = 0, sb = 0
  for (const [w, v] of weeks) {
    console.log(`${de(w)} | ${String(v.anfragen).padStart(8)} | ${String(v.bands).padStart(16)} | ${v.unklar}`)
    sa += v.anfragen; sb += v.bands
  }
  console.log(`Summe      | ${String(sa).padStart(8)} | ${String(sb).padStart(16)} |`)

  console.log('\nTestanfragen / unklare Faelle im Zeitraum:')
  if (!tests.length) console.log('  keine')
  for (const t of tests) console.log(`  ${de(t.ymd)} ${t.hm} | ${t.why} | ${t.bands} Band(s)${t.counted ? '' : ' | NICHT mitgezaehlt'}`)
}

main().catch((e) => { console.error('Fehler:', e.message); process.exit(1) })
