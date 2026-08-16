// Deterministische, faire Rotation fuer die drei sichtbaren Bandcards je
// Anlass-Tab auf der Startseite ("01 -- Auswahl"). Bewusst KEIN
// Math.random() zur Renderzeit (haette bei jedem Request/Hydration eine
// andere Auswahl ergeben, siehe historisches Verhalten von
// components/homepage/BandGrid.tsx) -- stattdessen ein reiner,
// serverseitig berechneter Algorithmus, der nur von (Pool, Tagesindex)
// abhaengt und daher bei gleichem Tag/Pool immer dieselbe Auswahl liefert.
//
// Fairness-Strategie: der Pool wird in "Zyklen" von jeweils
// ceil(pool.length / count) Tagen eingeteilt. Pro Zyklus wird der Pool
// einmal deterministisch (seed = Poolschluessel + Zyklusindex) gemischt
// und in Fenster der Groesse `count` zerlegt -- ein Tag zeigt genau ein
// Fenster. Dadurch sieht ein vollstaendiger Zyklus jede Band im Pool
// mindestens einmal, bevor der naechste Zyklus (neuer Shuffle) beginnt.

// FNV-1a-Hash: einfache, deterministische String->Zahl-Abbildung fuer den
// Shuffle-Seed. Kein kryptografischer Anspruch, nur Streuung noetig.
function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// mulberry32: kleiner, deterministischer PRNG (32-bit State) -- reicht fuer
// einen fairen Shuffle, keine Krypto-Anforderung.
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return function rand() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  const rand = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Tagesindex (ganze Tage seit Unix-Epoch, UTC) -- stabil unabhaengig von
// Tageszeit/Zeitzone des Requests, aendert sich genau einmal pro Kalendertag.
export function getDayIndex(date: Date): number {
  return Math.floor(date.getTime() / 86_400_000);
}

export function pickRotatingItems<T>(
  pool: T[],
  getKey: (item: T) => string,
  poolKey: string,
  dayIndex: number,
  count: number
): T[] {
  if (pool.length === 0) return [];

  // Pool dedupen (defensiv, ueber getKey) -- eine Band darf nicht doppelt
  // im selben Pool stehen und damit doppelt in einer Auswahl landen.
  const seen = new Set<string>();
  const dedupedPool = pool.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (dedupedPool.length <= count) return dedupedPool;

  const cycleLength = Math.ceil(dedupedPool.length / count);
  const cycleIndex = Math.floor(dayIndex / cycleLength);
  const positionInCycle = ((dayIndex % cycleLength) + cycleLength) % cycleLength;

  const shuffled = seededShuffle(dedupedPool, hashString(`${poolKey}:${cycleIndex}`));
  const start = positionInCycle * count;
  const window = shuffled.slice(start, start + count);

  // Letztes Fenster eines Zyklus kann kuerzer als `count` sein, wenn
  // pool.length nicht durch count teilbar ist -- mit bereits nicht
  // enthaltenen Bands vom Zyklusanfang auffuellen (keine Duplikate
  // innerhalb der Auswahl).
  if (window.length < count) {
    const used = new Set(window.map(getKey));
    for (const item of shuffled) {
      if (window.length >= count) break;
      const key = getKey(item);
      if (!used.has(key)) {
        window.push(item);
        used.add(key);
      }
    }
  }

  return window;
}
