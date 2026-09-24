import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shuffleBands, selectAllBandsCards } from './allBandsSelection.ts';

function band(slug: string, ...moodSlugs: string[]) {
  return { slug, moods: moodSlugs.map((s) => ({ slug: s })) };
}

test('shuffleBands enthaelt exakt dieselben Elemente, nur in anderer Reihenfolge (kein Verlust/keine Duplikate)', () => {
  const pool = [band('a'), band('b'), band('c'), band('d'), band('e')];
  const shuffled = shuffleBands(pool);
  assert.equal(shuffled.length, pool.length);
  assert.deepEqual(
    [...shuffled].map((b) => b.slug).sort(),
    [...pool].map((b) => b.slug).sort()
  );
});

test('shuffleBands veraendert nicht das Original-Array', () => {
  const pool = [band('a'), band('b'), band('c')];
  const original = [...pool];
  shuffleBands(pool);
  assert.deepEqual(pool, original);
});

test('selectAllBandsCards ohne Mood-Filter liefert `count` verschiedene Baender', () => {
  const pool = [band('a'), band('b'), band('c'), band('d'), band('e')];
  const result = selectAllBandsCards(pool, null, 3);
  assert.equal(result.length, 3);
  assert.equal(new Set(result.map((b) => b.slug)).size, 3, 'die drei Baender muessen verschieden sein');
});

test('selectAllBandsCards mit weniger Baendern als `count` liefert alle verfuegbaren, ohne Duplikate', () => {
  const pool = [band('a'), band('b')];
  const result = selectAllBandsCards(pool, null, 3);
  assert.equal(result.length, 2);
  assert.deepEqual(result.map((b) => b.slug).sort(), ['a', 'b']);
});

test('selectAllBandsCards filtert korrekt nach Mood-Slug im gemischten Pool', () => {
  const pool = [
    band('a', 'rockig'),
    band('b'),
    band('c', 'rockig'),
    band('d'),
    band('e', 'rockig'),
  ];
  const result = selectAllBandsCards(pool, 'rockig', 3);
  assert.deepEqual(
    result.map((b) => b.slug).sort(),
    ['a', 'c', 'e']
  );
});

test('selectAllBandsCards ohne Mood-Auswahl (null) laesst alle Baender durch', () => {
  const pool = [band('a', 'rockig'), band('b')];
  const result = selectAllBandsCards(pool, null, 2);
  assert.equal(result.length, 2);
});

test('selectAllBandsCards mit Mood-Slug, den kein Band traegt -> leeres Ergebnis', () => {
  const pool = [band('a'), band('b')];
  const result = selectAllBandsCards(pool, 'unbekannt', 3);
  assert.deepEqual(result, []);
});
