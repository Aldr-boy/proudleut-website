/*
 * scripts/generate-plz-coords.mjs
 *
 * Erzeugt public/data/plz-coords-de.json aus der Airtable-Tabelle "AT-PLZ Referenz".
 * Format: { "93155": [49.0453, 11.7641], ... }
 *
 * Ausführen (einmalig, lokal):
 *   node scripts/generate-plz-coords.mjs
 *
 * Die generierte Datei public/data/plz-coords-de.json kann committet werden.
 * .env.local darf NICHT committet werden.
 */

import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

// .env.local ohne dotenv-Paket lesen
function loadEnv() {
  const envPath = resolve(__dir, '..', '.env.local');
  try {
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      // Anführungszeichen um den Wert entfernen (einfach und doppelt)
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    console.error('Fehler: .env.local nicht lesbar – Datei vorhanden?');
    process.exit(1);
  }
}

loadEnv();

const TOKEN = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
const BASE  = process.env.AIRTABLE_BASE_ID;
// AT-PLZ Referenz enthält nur österreichische Daten ohne Koordinaten.
// Orte-Master hat plz, lat, lon für ~7.500 deutsche Orte – korrekte Quelle.
const TABLE = 'Orte-Master';

if (!TOKEN) {
  console.error('Fehler: AIRTABLE_PERSONAL_ACCESS_TOKEN fehlt in .env.local');
  process.exit(1);
}
if (!BASE) {
  console.error('Fehler: AIRTABLE_BASE_ID fehlt in .env.local');
  process.exit(1);
}

function parseCoord(value) {
  if (value == null) return NaN;
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw == null) return NaN;
  return typeof raw === 'number'
    ? raw
    : parseFloat(String(raw).replace(',', '.'));
}

async function fetchPage(offset) {
  const url = new URL(
    `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(TABLE)}`
  );
  url.searchParams.append('fields[]', 'plz');
  url.searchParams.append('fields[]', 'lat');
  url.searchParams.append('fields[]', 'lon');
  url.searchParams.append('fields[]', 'land_code');
  if (offset) url.searchParams.set('offset', offset);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });

  if (!res.ok) {
    throw new Error(`Airtable Fehler: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

const result = {};
let offset;
let pageCount = 0;

console.log(`Lade "${TABLE}" aus Airtable...`);

do {
  const data = await fetchPage(offset);
  pageCount++;

  for (const { fields } of data.records) {
    const plz = String(fields.plz ?? '').trim();
    const lat = parseCoord(fields.lat);
    const lon = parseCoord(fields.lon);

    if (fields.land_code !== 'de') continue;
    if (!/^\d{5}$/.test(plz)) continue;
    if (!isFinite(lat) || !isFinite(lon)) continue;

    result[plz] = [
      Math.round(lat * 10000) / 10000,
      Math.round(lon * 10000) / 10000,
    ];
  }

  offset = data.offset;
  process.stdout.write(`  Seite ${pageCount} – ${Object.keys(result).length} PLZ bisher\r`);
} while (offset);

const count = Object.keys(result).length;
const outDir  = resolve(__dir, '..', 'public', 'data');
const outPath = resolve(outDir, 'plz-coords-de.json');

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, JSON.stringify(result));

console.log(`\nFertig: ${count} PLZ-Einträge`);
console.log(`Pfad:   ${outPath}`);

if ('93155' in result) {
  console.log(`Check:  93155 → [${result['93155'].join(', ')}] ✓`);
} else {
  console.log('Check:  93155 nicht enthalten');
}
