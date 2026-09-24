import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMostFrequentMoods } from './moodFrequency.ts';

function band(...moodSlugs: string[]) {
  return { moods: moodSlugs.map((slug) => ({ slug, name: slug })) };
}

test('sortiert nach Haeufigkeit absteigend', () => {
  const bands = [band('a', 'b'), band('a'), band('a'), band('b')];
  const result = computeMostFrequentMoods(bands, 4);
  assert.deepEqual(result.map((m) => m.slug), ['a', 'b']);
});

test('gibt maximal `count` Moods zurueck', () => {
  const bands = [band('a', 'b', 'c', 'd', 'e')];
  const result = computeMostFrequentMoods(bands, 4);
  assert.equal(result.length, 4);
});

test('weniger unterschiedliche Moods als `count` -> alle vorhandenen werden zurueckgegeben', () => {
  const bands = [band('a'), band('b')];
  const result = computeMostFrequentMoods(bands, 4);
  assert.deepEqual(result.map((m) => m.slug).sort(), ['a', 'b']);
});

test('stabiler Tie-Breaker bei gleicher Haeufigkeit: alphabetisch nach Slug', () => {
  const bands = [band('z'), band('a'), band('m')];
  const result = computeMostFrequentMoods(bands, 3);
  assert.deepEqual(result.map((m) => m.slug), ['a', 'm', 'z']);
});

test('ein Mood-Slug wird pro Band hoechstens einmal gezaehlt, auch bei Duplikat im Datensatz', () => {
  // band('z', 'z') simuliert ein fehlerhaftes Banddaten-Objekt mit
  // doppeltem Mood-Eintrag. Ohne Dedupe pro Band wuerde "z" hier Zaehlung
  // 2 bekommen und faelschlich vor "a" (Zaehlung 1) ranken. Mit korrektem
  // Dedupe zaehlt "z" nur 1x -> Gleichstand mit "a" -> alphabetischer
  // Tie-Breaker entscheidet zugunsten von "a".
  const bandWithDuplicateSlug = band('z', 'z');
  const otherBand = band('a');
  const result = computeMostFrequentMoods([bandWithDuplicateSlug, otherBand], 2);
  assert.deepEqual(result.map((m) => m.slug), ['a', 'z']);
});

test('leerer Bandbestand -> leeres Ergebnis', () => {
  assert.deepEqual(computeMostFrequentMoods([], 4), []);
});
