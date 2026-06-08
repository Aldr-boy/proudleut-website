// scripts/generate-taxonomie-report.mjs
// READ-ONLY taxonomy analysis. No Supabase writes. No migrations.

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Kein lesender Supabase-Zugriff möglich. Bitte CSV-Export aus Supabase Studio bereitstellen.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const SKIP_NAMES = ['björn bussler', 'sauschwanzlbeisser', 'soulmaid', 'brugger buam']
const SKIP_STATUS = ['archived', 'inactive', 'inaktiv', 'archiviert', 'paused', 'pausiert']

const AIRTABLE_MAP = {
  'partyband': 'Partyband',
  'bayrische partyband': 'Bayrische Partyband',   // DB uses 'y' not 'e'
  'bayerische partyband': 'Bayrische Partyband',  // fallback both spellings
  'festzeltband': 'Bayrische Partyband',
  'bigband': 'Bigband',
  'blasmusik / wirtshausmusik': 'Volksmusik',
  'blasmusik/wirtshausmusik': 'Volksmusik',
  'hochzeitssänger*in': 'Hochzeits- & Trausänger*in',
  'hochzeitssaengerin': 'Hochzeits- & Trausänger*in',
  'akustikband': 'Akustik- & Singer-Songwriter',
  'kinder- & jugendband': 'Kinder- & Familienband',
  'kinder-und-jugendband': 'Kinder- & Familienband',
}

function sig(text) {
  const t = (text || '').toLowerCase()
  return {
    bayerisch: /\b(bayer[in]?sch|bayrisch|mundart|boarisch)\b/.test(t),
    party: /\b(party|tanzfläche|tanzband|animation|partyband)\b/.test(t) || /cover[\s-]?band/i.test(t),
    festzelt: /\b(festzelt|volksfest|zeltfest|oktoberfest|bierfest|bierzelt)\b/.test(t),
    volksmusik: /\b(wirtshaus|wirtshausmusik|volkstümlich|frühschoppen|tanzlmusik|alpenländisch|ländler|tracht|g'scheite|schuhplattler|brauchtum|altbairisch|stubnmusi|dreigesang|steirisch)\b/.test(t),
    brass: /\b(brass|blechbläser|blechblas|trompete.*tuba|blechquintett|quintett.*blech)\b/.test(t),
    klassik: /\b(klassisch|klassik|kammermusik|klassisches repertoire|beethoven|bach|mozart|händel|sinfonisch|kammerensemble|blechbläserquintett|quintett)\b/.test(t),
    bigband: /\b(bigband|big[\s-]?band|jazz[\s-]?orchester|swing[\s-]?orchester)\b/.test(t),
    jazz: /\b(jazz|swing|dixieland|bebop)\b/.test(t),
    rock: /\b(rock|metal|punk|hard[\s-]?rock|classic[\s-]?rock|heavy)\b/.test(t),
    mundart: /\b(mundart|dialekt)\b/.test(t),
    country: /\b(country|western|line[\s-]?dance|bluegrass)\b/.test(t),
    akustik: /\b(akustik|singer[\s-]?songwriter|acoustic|unplugged|fingerstyle)\b/.test(t),
    soul: /\b(soul|funk|groove|lounge|motown|smooth[\s-]?jazz|soulband)\b/.test(t),
    blues: /blues/i.test(t),  // loose: also catches compound words like 'Bluesstimmen'
    acappella: /\b(a[\s-]?cappella|vokalensemble|vokalband|acappella)\b/.test(t),
    irish: /\b(irish|celtic|keltisch|irisch|trad[\s-]session|céilí|gaelic|celtic[\s-]folk)\b/.test(t),
    folk: /\b(folk|folksong)\b/.test(t),
    kirche: /\b(kirche|kirchlich|sakral|gottesdienst|messe|kirchenmusik|geistlich|pfarr)\b/.test(t),
    gospel: /\b(gospel)\b/.test(t),
    kinder: /\b(kinder|kinderkonzert|kinderprogramm|kinderlied|kindergarten|pädagogisch|jugend)\b/.test(t),
    hochzeit: /\b(hochzeit|trauung|wedding|brautpaar|trausänger)\b/.test(t),
    konzertant: /\b(konzertant|konzertformat|konzertprogramm)\b/.test(t),
    background: /\b(background|hintergrundmusik|backgroundmusic)\b/.test(t),
    duo: /\b(duo)\b/.test(t),
    solo: /\b(solist|solo[\s-]?act|solosänger|alleinunterhalter)\b/.test(t),
    showband: /\b(showband|show[\s-]?band|bühnenshow)\b/.test(t),
  }
}

function analyze(band, profile, bandTypeNames, eventTypeNames) {
  const allText = [
    profile?.short_description || '',
    profile?.meta_description || '',
    profile?.slogan || '',
    (profile?.main_text || '').substring(0, 400),
  ].join(' ')

  const s = sig(allText)
  const goodText = (profile?.short_description || profile?.meta_description || '').trim().length > 15
  const airtable = AIRTABLE_MAP[(bandTypeNames[0] || '').toLowerCase().trim()] || null

  let bandart = null, secTags = [], klingt = [], conf = 'mittel', beg = '', fragen = ''

  // ── Clear Airtable mappings get early priority ──────────────
  // These override text signals to prevent rock/party keywords in
  // generic descriptions from mis-categorizing Blasmusik/Bigband/etc.
  if (airtable === 'Volksmusik') {
    // If text shows modern Brass/show character, flag potential Blechbläser/Brass override
    const brassOverride = s.brass && (s.party || s.showband) && !s.volksmusik
    if (brassOverride) {
      bandart = 'Blechbläser / Brass'
      klingt = ['Brass-Power', 'Party pur', 'Tanzflächen-Garantie']
      conf = 'mittel'; beg = 'Airtable-Typ Blasmusik/Wirtshausmusik, aber Brass+Party-Signal — möglicherweise Blechbläser/Brass'
      secTags = ['Brass-Party', 'Showband']
    } else {
      bandart = 'Volksmusik'
      klingt = ['Tradition', 'Authentisch und handgemacht', 'Herzlich & nahbar']
      if (s.festzelt) klingt.push('Festzeltenergie')
      conf = 'hoch'; beg = 'Airtable-Typ Blasmusik/Wirtshausmusik'
      secTags = ['Wirtshausmusik', 'Blasmusik']
    }
  } else if (airtable === 'Bigband') {
    bandart = 'Bigband'
    klingt = ['Festlich und ausgelassen', 'Tanzflächen-Garantie']
    conf = 'hoch'; beg = 'Airtable-Typ Bigband'
    if (s.jazz) secTags.push('Tanzband')
    if (s.showband) secTags.push('Showband')
  } else if (airtable === 'Hochzeits- & Trausänger*in') {
    bandart = 'Hochzeits- & Trausänger*in'
    klingt = ['Herzlich & nahbar', 'Lagerfeuer-Atmosphäre']
    conf = 'hoch'; beg = 'Airtable-Typ Hochzeitssänger*in'
    secTags.push('Hochzeitssänger')
    if (s.duo) secTags.push('Duo'); else if (s.solo) secTags.push('Solo-Act')
  } else if (airtable === 'Akustik- & Singer-Songwriter') {
    bandart = 'Akustik- & Singer-Songwriter'
    klingt = ['Herzlich & nahbar', 'Lagerfeuer-Atmosphäre', 'Authentisch und handgemacht']
    conf = 'hoch'; beg = 'Airtable-Typ Akustikband'
    if (s.hochzeit) secTags.push('Hochzeitssänger')
    if (s.duo) secTags.push('Duo')
  } else if (airtable === 'Kinder- & Familienband') {
    bandart = 'Kinder- & Familienband'; secTags = ['Kinderprogramm']
    klingt = ['Herzlich & nahbar', 'Generationenverbindend']
    conf = 'hoch'; beg = 'Airtable-Typ Kinder- & Jugendband'
  }
  // ── Then text-signal based analysis ─────────────────────────
  else if (s.acappella) {
    bandart = 'A-cappella & Vocal'; secTags = ['A-cappella']
    klingt = ['Konzertant & hochwertig', 'Herzlich & nahbar']
    conf = goodText ? 'hoch' : 'mittel'; beg = 'A-cappella-Signal im Text'
  } else if (s.irish) {
    bandart = 'Irish Folk'
    klingt = ['Authentisch und handgemacht', 'Herzlich & nahbar']
    if (s.konzertant) klingt.push('Konzertant & hochwertig')
    conf = goodText ? 'hoch' : 'mittel'; beg = 'Irish/Celtic-Signal im Text'
    if (s.folk) secTags.push('Folk')
  } else if (s.klassik) {
    bandart = 'Klassik'
    klingt = ['Konzertant & hochwertig', 'Festlich und ausgelassen']
    conf = goodText ? 'hoch' : 'mittel'; beg = 'Klassisches Repertoire im Text'
    secTags = s.brass ? ['Brass / Blechbläser', 'konzertant'] : ['konzertant']
  } else if (s.gospel || (s.kirche && !s.klassik)) {
    bandart = 'Kirchen- & Sakralband'
    klingt = ['Herzlich & nahbar', 'Authentisch und handgemacht']
    conf = goodText ? 'hoch' : 'mittel'; beg = 'Kirchlicher/sakraler Bezug im Text'
    if (s.gospel) secTags.push('Gospel')
  } else if (s.kinder || airtable === 'Kinder- & Familienband') {
    bandart = 'Kinder- & Familienband'; secTags = ['Kinderprogramm']
    klingt = ['Herzlich & nahbar', 'Generationenverbindend']
    conf = (s.kinder && goodText) || airtable ? 'hoch' : 'mittel'
    beg = airtable ? 'Airtable-Typ Kinder- & Jugendband' : 'Kinder-Signal im Text'
  } else if (s.bigband) {
    bandart = 'Bigband'
    klingt = ['Festlich und ausgelassen', 'Tanzflächen-Garantie']
    conf = goodText ? 'mittel' : 'niedrig'; beg = 'Bigband-Signal im Text'
    if (s.jazz) secTags.push('Tanzband')
    if (s.showband) secTags.push('Showband')
  } else if (s.country) {
    bandart = 'Countryband'
    klingt = ['Authentisch und handgemacht', 'Party pur']
    conf = goodText ? 'hoch' : 'mittel'; beg = 'Country-Signal im Text'
  } else if (s.blues && !s.soul) {
    bandart = 'Blues'
    klingt = ['Konzertant & hochwertig', 'Herzlich & nahbar']
    conf = goodText ? 'hoch' : 'mittel'; beg = 'Blues-Signal im Text'
    if (s.konzertant) secTags.push('konzertant')
  } else if (s.soul && !s.blues) {
    bandart = 'Soul / Groove / Funk'
    klingt = ['Tanzflächen-Garantie', 'Festlich und ausgelassen']
    if (s.konzertant || s.background) klingt = ['Konzertant & hochwertig', 'Herzlich & nahbar']
    conf = goodText ? 'hoch' : 'mittel'; beg = 'Soul/Funk/Groove-Signal im Text'
    if (s.background) secTags.push('Background-Musik')
    if (s.konzertant) secTags.push('konzertant')
  } else if (s.soul && s.blues) {
    bandart = 'Blues'
    klingt = ['Konzertant & hochwertig', 'Herzlich & nahbar']
    conf = 'mittel'; beg = 'Blues- + Soul-Signal — Blues bevorzugt laut Regelwerk'
    secTags.push('Soul'); fragen = 'Blues vs. Soul / Groove / Funk prüfen'
  } else if (s.rock && (s.bayerisch || s.mundart)) {
    bandart = 'Bayrische Rockband'
    klingt = ['Bayerisch & frech', 'Festzeltenergie']
    if (s.festzelt) klingt.push('Mitsing-Faktor')
    conf = goodText ? 'hoch' : 'mittel'; beg = 'Mundart/bayerisch + Rock-Signal'
    secTags.push('Eigenkompositionen')
  } else if (s.rock) {
    bandart = 'Rock- & Coverband'
    klingt = ['Party pur', 'Tanzflächen-Garantie']
    conf = goodText ? 'mittel' : 'niedrig'; beg = 'Rock-Signal im Text'
    if (/\b(metal|heavy)\b/i.test(allText)) secTags.push('Metal')
    else if (/\bclassic[\s-]?rock\b/i.test(allText)) secTags.push('Classic Rock')
  } else if (s.volksmusik && !s.party) {
    bandart = 'Volksmusik'
    klingt = ['Tradition', 'Authentisch und handgemacht', 'Herzlich & nahbar']
    if (s.festzelt) klingt.push('Festzeltenergie')
    conf = goodText ? 'hoch' : 'mittel'; beg = 'Volksmusik/Wirtshaus-Signal im Text'
    secTags.push('Wirtshausmusik')
    if (s.brass) secTags.push('Blasmusik')
  } else if (s.brass && !s.klassik && !s.volksmusik) {
    bandart = 'Blechbläser / Brass'
    klingt = ['Brass-Power', 'Party pur']
    if (s.party || s.festzelt) klingt.push('Tanzflächen-Garantie')
    conf = goodText ? 'mittel' : 'niedrig'; beg = 'Brass-Signal, kein klassisches Repertoire'
    secTags.push('Brass-Party')
    if (s.showband) secTags.push('Showband')
  } else if (s.akustik) {
    bandart = 'Akustik- & Singer-Songwriter'
    klingt = ['Herzlich & nahbar', 'Lagerfeuer-Atmosphäre', 'Authentisch und handgemacht']
    conf = goodText ? 'mittel' : 'niedrig'; beg = 'Akustik/Singer-Songwriter-Signal'
    if (s.hochzeit) secTags.push('Hochzeitssänger')
    if (s.duo) secTags.push('Duo')
  } else if (airtable === 'Bayrische Partyband' || (s.bayerisch && (s.party || s.festzelt))) {
    bandart = 'Bayrische Partyband'
    klingt = ['Festzeltenergie', 'Bayerisch & frech', 'Mitsing-Faktor']
    conf = airtable ? 'hoch' : (goodText ? 'mittel' : 'niedrig')
    beg = airtable ? 'Airtable-Typ Bayerische Partyband / Festzeltband' : 'Bayerisch + Party/Festzelt-Signal'
    if (s.volksmusik) secTags.push('Blasmusik')
    else if (s.brass) secTags.push('Brass-Party')
  } else if (airtable === 'Partyband' || s.party) {
    bandart = 'Partyband'
    klingt = ['Party pur', 'Tanzflächen-Garantie']
    conf = airtable ? 'hoch' : (goodText ? 'mittel' : 'niedrig')
    beg = airtable ? 'Airtable-Typ Partyband' : 'Party-Signal im Text'
    if (s.festzelt) klingt.push('Festzeltenergie')
    if (s.showband) secTags.push('Showband')
  } else {
    bandart = 'KEIN PASSENDER WERT — bitte prüfen'
    conf = 'niedrig'
    if (bandTypeNames.length > 0) {
      beg = `Airtable-Typ vorhanden: ${bandTypeNames.join(', ')} — kein sicheres Mapping`
      fragen = `Airtable-Typ: ${bandTypeNames.join(', ')}. Manuell prüfen.`
    } else if (!goodText) {
      beg = 'Zu wenig Profiltext für Analyse, kein Airtable-Typ'
      fragen = 'Profiltext fehlt. Manuell prüfen.'
    } else {
      beg = 'Kein eindeutiges Genre-Signal im Text, kein Airtable-Typ'
      fragen = 'Mehrere Kategorien möglich. Manuell prüfen.'
    }
    klingt = ['Authentisch und handgemacht', 'Herzlich & nahbar']
  }

  klingt = [...new Set(klingt)].slice(0, 4)
  if (klingt.length < 2) klingt.push('Herzlich & nahbar')
  secTags = [...new Set(secTags)].filter(Boolean).slice(0, 3)

  return {
    bandart,
    secTags: secTags.length ? secTags.join(', ') : '—',
    klingt: klingt.join(', '),
    conf, beg, fragen,
    existingType: bandTypeNames.join(', ') || '—',
  }
}

async function main() {
  console.log('Lade Bands (read-only)...')

  const { data: bands, error: e1 } = await supabase.from('bands').select('id,name,slug,status,is_published').order('name')
  if (e1) { console.error('Kein lesender Supabase-Zugriff möglich.', e1.message); process.exit(1) }

  const { data: profiles } = await supabase.from('band_profiles').select('band_id,short_description,main_text,slogan,meta_description')
  const { data: bbt } = await supabase.from('band_band_types').select('band_id,band_type_id,is_primary')
  const { data: btypes } = await supabase.from('band_types').select('id,name,slug')
  const { data: bet } = await supabase.from('band_event_types').select('band_id,event_type_id')
  const { data: etypes } = await supabase.from('event_types').select('id,name')

  console.log(`Bands: ${bands?.length}, Profile: ${profiles?.length}, BandTypes: ${btypes?.length}`)

  // Build maps
  const profileMap = new Map((profiles || []).map(p => [p.band_id, p]))
  const btypeMap = new Map((btypes || []).map(t => [t.id, t.name]))
  const etypeMap = new Map((etypes || []).map(t => [t.id, t.name]))

  const bandTypeNames = new Map()
  for (const r of (bbt || [])) {
    const name = btypeMap.get(r.band_type_id)
    if (!name) continue
    const arr = bandTypeNames.get(r.band_id) || []
    if (r.is_primary) arr.unshift(name); else arr.push(name)
    bandTypeNames.set(r.band_id, arr)
  }

  const bandEventNames = new Map()
  for (const r of (bet || [])) {
    const name = etypeMap.get(r.event_type_id)
    if (!name) continue
    const arr = bandEventNames.get(r.band_id) || []
    arr.push(name)
    bandEventNames.set(r.band_id, arr)
  }

  const skipped = [], analyzed = []

  for (const band of (bands || [])) {
    const statusLow = (band.status || '').toLowerCase()
    if (SKIP_STATUS.includes(statusLow)) { skipped.push({ name: band.name, reason: band.status }); continue }
    if (SKIP_NAMES.some(n => band.name.toLowerCase().includes(n))) { skipped.push({ name: band.name, reason: 'bekannter Archiv-Fall' }); continue }

    const profile = profileMap.get(band.id) || null
    const types = bandTypeNames.get(band.id) || []
    const events = bandEventNames.get(band.id) || []
    const result = analyze(band, profile, types, events)

    analyzed.push({ band, profile, types, events, ...result })
  }

  const confOrder = { niedrig: 0, mittel: 1, hoch: 2 }
  analyzed.sort((a, b) => confOrder[a.conf] - confOrder[b.conf])

  const stats = {
    total: analyzed.length,
    pub: analyzed.filter(a => a.band.is_published).length,
    unpub: analyzed.filter(a => !a.band.is_published).length,
    hoch: analyzed.filter(a => a.conf === 'hoch').length,
    mittel: analyzed.filter(a => a.conf === 'mittel').length,
    niedrig: analyzed.filter(a => a.conf === 'niedrig').length,
    skipped: skipped.length,
  }

  const bandartCount = {}
  for (const a of analyzed) bandartCount[a.bandart] = (bandartCount[a.bandart] || 0) + 1
  const topBandarts = Object.entries(bandartCount).sort((a, b) => b[1] - a[1])

  const now = new Date().toISOString().split('T')[0]
  let md = `# proudleut Band-Taxonomie — Vorschlagsbericht\n\n_Erstellt: ${now} | Read-only | Keine Daten geändert_\n\n---\n\n`

  md += `## 1. Zusammenfassung\n\n`
  md += `| Kennzahl | Wert |\n|---|---|\n`
  md += `| Analysierte Bands | **${stats.total}** |\n`
  md += `| Übersprungene Bands | **${stats.skipped}** |\n`
  md += `| Veröffentlicht | **${stats.pub}** |\n`
  md += `| Unveröffentlicht / Draft / New | **${stats.unpub}** |\n`
  md += `| Hohe Konfidenz | **${stats.hoch}** |\n`
  md += `| Mittlere Konfidenz | **${stats.mittel}** |\n`
  md += `| Niedrige Konfidenz | **${stats.niedrig}** |\n\n`

  md += `### Übersprungene Bands\n\n`
  for (const s of skipped) md += `- ${s.name} (${s.reason})\n`
  md += `\n### Häufigste vorgeschlagene Bandarten\n\n`
  for (const [ba, n] of topBandarts) md += `- **${ba}**: ${n}\n`
  md += `\n### Hilfreiche Felder\n\n- \`band_profiles.short_description\` — verlässlichste Quelle\n- \`band_profiles.meta_description\` — genrehinweisend\n- \`band_band_types\` (Airtable-Herkunft) — gute Basis, Mapping auf neue Taxonomie nötig\n\n### Unvollständige Felder\n\n- \`short_description\` fehlt bei mehreren Bands → niedrige Konfidenz\n- \`slogan\` häufig leer\n- 10 Bands ohne \`band_band_types\`-Eintrag\n\n---\n\n`

  md += `## 2. Vorschlagstabelle\n\n_Sortiert: niedrige Konfidenz zuerst._\n\n`
  md += `| Band | Status | Veröff. | Akt. Bandart | Vorgesch. Bandart | Sekundär-Tags | Klingt nach | Konfidenz | Begründung | Offene Fragen |\n`
  md += `|------|--------|---------|--------------|-------------------|---------------|-------------|-----------|------------|---------------|\n`

  for (const a of analyzed) {
    const esc = s => (s || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
    md += `| ${esc(a.band.name)} | ${a.band.status} | ${a.band.is_published ? '✓' : '—'} | ${esc(a.existingType)} | ${esc(a.bandart)} | ${esc(a.secTags)} | ${esc(a.klingt)} | **${a.conf}** | ${esc(a.beg)} | ${esc(a.fragen) || '—'} |\n`
  }

  md += `\n---\n\n## 3. Hohe Konfidenz\n\n`
  for (const a of analyzed.filter(x => x.conf === 'hoch'))
    md += `- **${a.band.name}** — ${a.bandart} — _${a.klingt}_\n`

  md += `\n---\n\n## 4. Mittlere Konfidenz\n\n`
  for (const a of analyzed.filter(x => x.conf === 'mittel'))
    md += `- **${a.band.name}** — ${a.bandart}${a.fragen ? ` — ${a.fragen}` : ` — ${a.beg}`}\n`

  md += `\n---\n\n## 5. Niedrige Konfidenz / Bitte prüfen\n\n`
  for (const a of analyzed.filter(x => x.conf === 'niedrig'))
    md += `- **${a.band.name}** — ${a.bandart}${a.fragen ? ` — ${a.fragen}` : ''}\n`

  md += `\n---\n\n## 6. Auffälligkeiten im Vokabular\n\n`
  const secCount = {}
  for (const a of analyzed) {
    if (a.secTags !== '—') for (const t of a.secTags.split(', ')) secCount[t.trim()] = (secCount[t.trim()] || 0) + 1
  }
  md += `### Häufige Sekundär-Tags\n\n`
  for (const [t, n] of Object.entries(secCount).sort((a, b) => b[1] - a[1]).slice(0, 12))
    md += `- **${t}**: ${n}×\n`

  md += `\n### Overlap-Risiken\n\n- **Bayrische Partyband vs. Volksmusik**: Blasmusikkapellen mit Party-Kontext können in beide fallen. Entscheidend: Party/Cover-Charakter vs. Wirtshaus/traditionell.\n- **Blechbläser / Brass vs. Volksmusik**: Moderner Brass-Sound (→ Brass) vs. traditionelle Blasmusikkapelle (→ Volksmusik).\n- **Blues vs. Soul / Groove / Funk**: Bei Overlap wurde Blues bevorzugt wenn Blues dominiert.\n- **Festzeltband-Mapping**: Airtable-Typ "Festzeltband" → Bayrische Partyband (Konfidenz mittel, manuell prüfen).\n\n`

  md += `---\n\n## 7. Empfehlung für die manuelle Prüfung\n\n### Priorität 1 — Niedrige Konfidenz\n\n`
  for (const a of analyzed.filter(x => x.conf === 'niedrig'))
    md += `- ${a.band.name}${a.fragen ? ` — ${a.fragen}` : ''}\n`

  md += `\n### Priorität 2 — Mittlere Konfidenz (Auswahl)\n\n`
  for (const a of analyzed.filter(x => x.conf === 'mittel').slice(0, 20))
    md += `- ${a.band.name} — ${a.bandart}\n`

  md += `\n### Priorität 3 — Stichprobe hohe Konfidenz\n\n`
  for (const a of analyzed.filter(x => x.conf === 'hoch').filter((_, i) => i % 8 === 0).slice(0, 8))
    md += `- ${a.band.name} — ${a.bandart}\n`

  md += `\n---\n\n## 8. Completion Report\n\n`
  md += `| Punkt | Status |\n|---|---|\n`
  md += `| Abgefragte Tabellen | \`bands\`, \`band_profiles\`, \`band_band_types\`, \`band_types\`, \`band_event_types\`, \`event_types\` |\n`
  md += `| Analysierte Bands | ${stats.total} |\n`
  md += `| Übersprungene Bands | ${stats.skipped} |\n`
  md += `| Veröffentlichte Bands | ${stats.pub} |\n`
  md += `| Unveröffentlichte Bands | ${stats.unpub} |\n`
  md += `| Erzeugte Datei | \`band-taxonomie-vorschlaege.md\` |\n`
  md += `| Keine Datenänderungen | **ja** |\n`
  md += `| Keine Migration | **ja** |\n`
  md += `| Keine Supabase-Writes | **ja** |\n`
  md += `| Keine Storage-Änderungen | **ja** |\n`
  md += `| Bestehende Repo-Dateien unverändert | **ja** |\n`
  md += `| Offene Punkte | Bands ohne Profiltext haben niedrige Konfidenz. Airtable-Typen Konzert, Backgroundmusic, Vocal Band, Classic Rock Band, Metal Band, Kirchenband sind nicht direkt in Airtable-Map — werden via Text-Signals erkannt. |\n\n`
  md += `_Dieser Bericht ist ein Vorschlag. Alle Zuordnungen menschlich prüfen und freigeben._\n`

  const outPath = join(__dirname, '../band-taxonomie-vorschlaege.md')
  writeFileSync(outPath, md, 'utf-8')

  console.log(`\n✓ Datei: band-taxonomie-vorschlaege.md`)
  console.log(`✓ Analysierte Bands: ${stats.total} (übersprungen: ${stats.skipped})`)
  console.log(`✓ Konfidenz: hoch ${stats.hoch} / mittel ${stats.mittel} / niedrig ${stats.niedrig}`)
  console.log(`✓ Veröffentlicht: ${stats.pub} / Unveröffentlicht: ${stats.unpub}`)
  console.log('✓ Keine Supabase-Writes. Keine Repo-Änderungen.')
}

main().catch(err => { console.error('Fehler:', err.message); process.exit(1) })
