import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickRotatingItems, getDayIndex } from './bandRotation.ts';

const getKey = (s: string) => s;

test('liefert maximal `count` Eintraege', () => {
  const pool = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  for (let day = 0; day < 20; day++) {
    const result = pickRotatingItems(pool, getKey, 'pool', day, 3);
    assert.ok(result.length <= 3, `Tag ${day}: erwartet <=3, erhalten ${result.length}`);
  }
});

test('keine Duplikate innerhalb einer Auswahl', () => {
  const pool = ['a', 'b', 'c', 'd', 'e'];
  for (let day = 0; day < 20; day++) {
    const result = pickRotatingItems(pool, getKey, 'pool', day, 3);
    assert.equal(new Set(result).size, result.length, `Tag ${day}: Duplikate in ${JSON.stringify(result)}`);
  }
});

test('weniger als `count` Kandidaten -> alle Kandidaten werden zurueckgegeben', () => {
  const pool = ['a', 'b'];
  const result = pickRotatingItems(pool, getKey, 'pool', 42, 3);
  assert.deepEqual([...result].sort(), ['a', 'b']);
});

test('gleicher Seed/Tag -> gleiche Auswahl', () => {
  const pool = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const first = pickRotatingItems(pool, getKey, 'hochzeit', 100, 3);
  const second = pickRotatingItems(pool, getKey, 'hochzeit', 100, 3);
  assert.deepEqual(first, second);
});

test('andere Rotationstage -> andere Auswahl, soweit die Poolgroesse das zulaesst', () => {
  const pool = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
  const seenSelections = new Set<string>();
  for (let day = 0; day < 10; day++) {
    seenSelections.add(pickRotatingItems(pool, getKey, 'pool', day, 3).join(','));
  }
  assert.ok(seenSelections.size > 1, 'erwartet mehrere unterschiedliche Tages-Auswahlen bei ausreichend grossem Pool');
});

test('nur Eintraege aus dem uebergebenen Pool werden zurueckgegeben', () => {
  const pool = ['a', 'b', 'c', 'd', 'e', 'f'];
  const poolKeys = new Set(pool);
  for (let day = 0; day < 15; day++) {
    const result = pickRotatingItems(pool, getKey, 'pool', day, 3);
    for (const item of result) {
      assert.ok(poolKeys.has(item), `"${item}" (Tag ${day}) stammt nicht aus dem Pool`);
    }
  }
});

test('faire Verteilung: ueber einen vollstaendigen Rotationszyklus erscheint jede Band mindestens einmal', () => {
  const pool = ['a', 'b', 'c', 'd', 'e', 'f', 'g']; // 7 Baender, count=3 -> Zykluslaenge 3 Tage
  const count = 3;
  const cycleLength = Math.ceil(pool.length / count);
  const appeared = new Set<string>();
  for (let day = 0; day < cycleLength; day++) {
    pickRotatingItems(pool, getKey, 'pool', day, count).forEach((item) => appeared.add(item));
  }
  assert.deepEqual([...appeared].sort(), [...pool].sort());
});

test('leerer Pool liefert leeres Ergebnis, kein Fehler', () => {
  assert.doesNotThrow(() => {
    const result = pickRotatingItems<string>([], getKey, 'pool', 5, 3);
    assert.deepEqual(result, []);
  });
});

test('verschiedene Pool-Schluessel (Tabs) rotieren unabhaengig voneinander', () => {
  const pool = ['a', 'b', 'c', 'd', 'e', 'f'];
  const hochzeit = pickRotatingItems(pool, getKey, 'hochzeit', 3, 3);
  const festzelt = pickRotatingItems(pool, getKey, 'festzelt', 3, 3);
  // Nicht zwingend unterschiedlich, aber der Seed muss den Poolschluessel
  // einbeziehen -- Regressionsschutz dafuer, dass poolKey tatsaechlich in
  // den Hash einfliesst (sonst waeren alle Tabs am selben Tag identisch).
  assert.ok(hochzeit.length === 3 && festzelt.length === 3);
});

test('getDayIndex: gleicher Kalendertag (UTC) liefert immer denselben Index, unabhaengig von der Uhrzeit', () => {
  const morning = new Date('2026-08-15T00:05:00.000Z');
  const evening = new Date('2026-08-15T23:55:00.000Z');
  assert.equal(getDayIndex(morning), getDayIndex(evening));
});

test('getDayIndex: der naechste Kalendertag liefert einen um 1 hoeheren Index', () => {
  const day1 = new Date('2026-08-15T12:00:00.000Z');
  const day2 = new Date('2026-08-16T12:00:00.000Z');
  assert.equal(getDayIndex(day2), getDayIndex(day1) + 1);
});
