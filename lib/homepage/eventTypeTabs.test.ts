import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// eventTypeTabs.ts importiert CATEGORIES/getFinderOccasionBySlug ueber den
// "@/"-Alias (echte Werte, nicht nur Typen) -- das laesst sich unter
// plain `node --test` nicht direkt importieren (kein tsconfig-paths-
// Resolver, siehe lib/homepage/bandRotation.test.ts fuer den Kontrast: dort
// hat die Quelldatei ausschliesslich relative/typisierte Imports). Gleiches,
// bereits etabliertes Muster wie lib/bands/bandExplorerMoodUrlState.test.ts:
// Quelldatei per readFileSync lesen, strukturell pruefen, reine Funktionen
// gezielt extrahieren und per `new Function` tatsaechlich ausfuehren.
const sourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'eventTypeTabs.ts');
const source = readFileSync(sourcePath, 'utf8');

test('genau 4 Anlass-Tabs im EVENT_TYPE_TABS-Array', () => {
  const matches = source.match(/key:\s*'(hochzeit|firmenfeier|festzelt|stadt-buergerfest)'/g) ?? [];
  assert.equal(matches.length, 4);
});

const EXPECTED_MOODS: Record<string, string[]> = {
  hochzeit: ['emotional-beruehrend', 'tanzflaechen-garantie', 'herzlich-nahbar', 'mitsing-faktor'],
  firmenfeier: ['konzertant-hochwertig', 'tanzflaechen-garantie', 'rockig-mitreissend', 'authentisch-handgemacht'],
  festzelt: ['bayerisch-frech', 'mitsing-faktor', 'tanzflaechen-garantie', 'rockig-mitreissend'],
  'stadt-buergerfest': ['generationenverbindend', 'bayerisch-frech', 'rockig-mitreissend', 'authentisch-handgemacht'],
};

function extractMoodsBlock(tabKey: string): string {
  const tabStart = source.indexOf(`key: '${tabKey}'`);
  assert.ok(tabStart >= 0, `Tab "${tabKey}" nicht gefunden`);
  const moodsStart = source.indexOf('moods: [', tabStart);
  const moodsEnd = source.indexOf('],', moodsStart);
  return source.slice(moodsStart, moodsEnd);
}

for (const [tabKey, expectedSlugs] of Object.entries(EXPECTED_MOODS)) {
  test(`Tab "${tabKey}": genau die 4 kuratierten Mood-Slugs in vorgegebener Reihenfolge`, () => {
    const block = extractMoodsBlock(tabKey);
    const actualSlugs = [...block.matchAll(/slug:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
    assert.deepEqual(actualSlugs, expectedSlugs);
  });
}

test('Festzeltenergie und Party pur werden bewusst nicht als Homepage-Chip verwendet', () => {
  const moodsSection = source.slice(source.indexOf('export const EVENT_TYPE_TABS'));
  assert.doesNotMatch(moodsSection, /slug:\s*'festzeltenergie'/);
  assert.doesNotMatch(moodsSection, /slug:\s*'party-pur'/);
});

// buildAuswahlStateKey ist eine reine Funktion ohne "@/"-Imports -- extrahieren
// und real ausfuehren statt nur strukturell zu pruefen (gleiches Muster wie
// buildUrlViaSource in lib/bands/bandExplorerMoodUrlState.test.ts).
function buildAuswahlStateKeyViaSource(tabKey: string, moodSlug: string | null): string {
  const startMarker = 'export function buildAuswahlStateKey(tabKey: string, moodSlug: string | null): string {';
  const startIndex = source.indexOf(startMarker);
  assert.ok(startIndex >= 0, 'buildAuswahlStateKey nicht gefunden');
  const bodyOpen = source.indexOf('{', startIndex + startMarker.length - 1);
  const bodyClose = source.indexOf('\n}', bodyOpen);
  const fnBody = source.slice(bodyOpen + 1, bodyClose);
  const fn = new Function('tabKey', 'moodSlug', fnBody) as (tabKey: string, moodSlug: string | null) => string;
  return fn(tabKey, moodSlug);
}

test('buildAuswahlStateKey: ohne Mood ergibt sich der reine Tab-Schluessel', () => {
  assert.equal(buildAuswahlStateKeyViaSource('hochzeit', null), 'hochzeit');
});

test('buildAuswahlStateKey: mit Mood wird "::" als Trenner verwendet', () => {
  assert.equal(buildAuswahlStateKeyViaSource('hochzeit', 'mitsing-faktor'), 'hochzeit::mitsing-faktor');
});

test('buildAuswahlStateKey: unterschiedliche Moods im selben Tab ergeben unterschiedliche Schluessel', () => {
  const a = buildAuswahlStateKeyViaSource('festzelt', 'bayerisch-frech');
  const b = buildAuswahlStateKeyViaSource('festzelt', 'rockig-mitreissend');
  assert.notEqual(a, b);
});
