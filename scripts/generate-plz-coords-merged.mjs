/*
 * scripts/generate-plz-coords-merged.mjs
 *
 * Erzeugt public/data/plz-coords.json aus zwei Quellen:
 *
 *   DE: public/data/plz-coords-de.json (fertiges Artefakt, nicht neu generiert)
 *       ~7.500 deutsche PLZ mit je [lat, lon]
 *
 *   AT: PeterTheOne/plz-coord-austria (GitHub)
 *       Bezug: Repo-Tarball via codeload
 *         curl -sL "https://codeload.github.com/PeterTheOne/plz-coord-austria/tar.gz/refs/heads/master" -o /tmp/plz-at.tar.gz
 *         tar -xzf /tmp/plz-at.tar.gz -C /tmp/plz-at-repo --strip-components=1
 *       Datei:  /tmp/plz-at-repo/output_data/plz-coord-austria.json
 *       Filter: nur NamePLZTyp === "PLZ-Adressierung" (keine Postfach-PLZ)
 *       Lizenz: ODbL, © OpenStreetMap contributors
 *
 * Ausgabe: public/data/plz-coords.json
 * Format:  { "92334": [lat, lon], "4224": [lat, lon], ... }
 *          DE PLZ 5-stellig, AT PLZ 4-stellig
 *
 * Ausführen (einmalig, lokal, nach AT-Tarball-Download):
 *   node scripts/generate-plz-coords-merged.mjs
 *
 * Die generierte Datei kann committet werden.
 * .env.local und Tarball dürfen NICHT committet werden.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dir, '..');

const deJson  = resolve(projectRoot, 'public', 'data', 'plz-coords-de.json');
// AT-JSON: muss vorher per Tarball-Download entpackt worden sein (s.o.)
const atJson  = resolve(process.env.AT_PLZ_PATH ?? '/tmp/plz-at-repo/output_data/plz-coord-austria.json');
const outDir  = resolve(projectRoot, 'public', 'data');
const outPath = resolve(outDir, 'plz-coords.json');

// --- 1. DE laden ---
const deData = JSON.parse(readFileSync(deJson, 'utf8'));
const deCount = Object.keys(deData).length;
console.log(`DE: ${deCount} PLZ geladen`);

// --- 2. AT laden + filtern ---
const atRaw = JSON.parse(readFileSync(atJson, 'utf8'));
const atData = {};
let atTotal = 0;
let atPostfach = 0;
let atNoCoords = 0;
let atBadPlz = 0;

for (const [plz, entry] of Object.entries(atRaw)) {
  atTotal++;

  if (entry.NamePLZTyp !== 'PLZ-Adressierung') {
    atPostfach++;
    continue;
  }
  if (!/^\d{4}$/.test(plz)) {
    atBadPlz++;
    continue;
  }
  if (typeof entry.lat !== 'number' || typeof entry.lon !== 'number') {
    atNoCoords++;
    continue;
  }

  atData[plz] = [
    Math.round(entry.lat * 10000) / 10000,
    Math.round(entry.lon * 10000) / 10000,
  ];
}

const atCount = Object.keys(atData).length;
console.log(`AT: ${atTotal} Einträge gesamt`);
console.log(`AT: ${atPostfach} Postfach-PLZ ausgeschlossen`);
console.log(`AT: ${atBadPlz} nicht-4-stellige PLZ übersprungen`);
console.log(`AT: ${atNoCoords} ohne Koordinaten übersprungen`);
console.log(`AT: ${atCount} PLZ übernommen`);

// --- 3. Duplicate-Check ---
const deKeys = new Set(Object.keys(deData));
const duplicates = Object.keys(atData).filter(k => deKeys.has(k));

if (duplicates.length > 0) {
  console.error(`FEHLER: ${duplicates.length} Duplicate-Keys: ${duplicates.slice(0, 10).join(', ')}`);
  console.error('Abbruch – kein Output erzeugt.');
  process.exit(1);
}
console.log(`Duplicate-Check: 0 Überschneidungen ✓`);

// --- 4. Merge (DE zuerst, dann AT) ---
const merged = { ...deData, ...atData };
const mergedCount = Object.keys(merged).length;
if (mergedCount !== deCount + atCount) {
  console.error(`FEHLER: Merge-Summe ${mergedCount} ≠ ${deCount} + ${atCount}`);
  process.exit(1);
}
console.log(`Merge: ${mergedCount} PLZ total (${deCount} DE + ${atCount} AT)`);

// --- 5. Schreiben ---
mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, JSON.stringify(merged));
console.log(`\nGeschrieben: ${outPath}`);

// --- 6. Spot-Checks ---
const checks = [
  ['92334', 'DE Amberg'],
  ['4224',  'AT Wartberg ob der Aist'],
  ['4061',  'AT Pasching'],
  ['2340',  'AT Mödling'],
];
console.log('Spot-Checks:');
for (const [plz, label] of checks) {
  const c = merged[plz];
  console.log(c ? `  ${plz} (${label}): [${c[0]}, ${c[1]}] ✓` : `  ${plz} (${label}): FEHLT ✗`);
}
