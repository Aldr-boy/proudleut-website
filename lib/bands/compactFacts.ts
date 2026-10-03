// Fakten-Anzeige in der kompakten Header-Pille (components/band/CompactPill.tsx)
// als reine Funktion. Eingaben: verfuegbare Breite und die natuerlichen
// Breiten der vorhandenen Fakten (wie getBandFacts sie liefert). Ausgabe: was
// angezeigt wird. Die sichtbare Reihenfolge bleibt Herkunft, Besetzung, Stil;
// die Funktion entscheidet nur, was davon sichtbar ist.
//
// Prioritaet bei Platzmangel:
//   1. Stil entfaellt zuerst.
//   2. Dann wird die Herkunft gekuerzt, bis hoechstens zur Untergrenze (160 px).
//   3. Passt auch das nicht, entfaellt die Herkunft, bevor die Besetzung leidet.
//   4. Die Besetzung wird nie gekuerzt; passt sie allein nicht, entfaellt alles.
// Ein flex-wrap-CSS koennte das nicht abbilden (es bricht in DOM-Reihenfolge um,
// also Stil, dann Besetzung vor der Herkunft).

export const FACT_SEPARATOR = 41; // ml-5 + pl-5 + 1 px Linie
export const HERKUNFT_MIN = 160;

export type FactKey = 'herkunft' | 'besetzung' | 'stil';
export type FactWidths = Partial<Record<FactKey, number>>;

export type CompactFactsLayout = {
  herkunft: 'absent' | 'hidden' | 'full' | 'truncated';
  // Breite der Herkunft in px, wenn sie angezeigt wird (bei 'full' die natuerliche).
  herkunftWidth: number | null;
  besetzung: 'absent' | 'hidden' | 'shown';
  stil: 'absent' | 'hidden' | 'shown';
};

type Options = { separator?: number; herkunftMin?: number };

export function layoutCompactFacts(
  available: number,
  widths: FactWidths,
  { separator = FACT_SEPARATOR, herkunftMin = HERKUNFT_MIN }: Options = {},
): CompactFactsLayout {
  const has = (k: FactKey) => widths[k] !== undefined;
  const w = (k: FactKey) => widths[k] ?? 0;
  // Die Herkunft zaehlt beim Passen-Test mit hoechstens ihrer Untergrenze.
  const hypo = (k: FactKey) => (k === 'herkunft' ? Math.min(w(k), herkunftMin) : w(k));
  const need = (keys: FactKey[]) => {
    const present = keys.filter(has);
    return present.reduce((a, k) => a + hypo(k), 0) + separator * Math.max(0, present.length - 1);
  };
  const base: CompactFactsLayout = {
    herkunft: has('herkunft') ? 'hidden' : 'absent',
    herkunftWidth: null,
    besetzung: has('besetzung') ? 'hidden' : 'absent',
    stil: has('stil') ? 'hidden' : 'absent',
  };
  const withHerkunft = (shown: FactKey[]): Pick<CompactFactsLayout, 'herkunft' | 'herkunftWidth'> => {
    if (!has('herkunft')) return { herkunft: 'absent', herkunftWidth: null };
    const others = shown.filter((k) => k !== 'herkunft' && has(k));
    // Jeder weitere angezeigte Fakt bringt einen Trenner mit (fuehrend, siehe CompactPill).
    const othersWidth = others.reduce((a, k) => a + w(k), 0) + separator * others.length;
    const room = available - othersWidth;
    const natural = w('herkunft');
    return natural > room ? { herkunft: 'truncated', herkunftWidth: Math.max(room, 0) } : { herkunft: 'full', herkunftWidth: natural };
  };

  // 1. alles Vorhandene
  if (need(['herkunft', 'besetzung', 'stil']) <= available) {
    return {
      ...base,
      ...withHerkunft(['herkunft', 'besetzung', 'stil']),
      besetzung: has('besetzung') ? 'shown' : 'absent',
      stil: has('stil') ? 'shown' : 'absent',
    };
  }
  // 2. ohne Stil
  if (has('stil') && (has('herkunft') || has('besetzung')) && need(['herkunft', 'besetzung']) <= available) {
    return {
      ...base,
      ...withHerkunft(['herkunft', 'besetzung']),
      besetzung: has('besetzung') ? 'shown' : 'absent',
    };
  }
  // 3. nur die Besetzung
  if (has('besetzung') && w('besetzung') <= available) {
    return { ...base, besetzung: 'shown' };
  }
  // 4. nichts passt
  return base;
}

// Die sieben Endzustaende (gegenseitig ausschliessend, erste zutreffende zaehlt):
//   1 keine Fakten vorhanden
//   2 vorhanden, aber keiner angezeigt
//   3 nur die Besetzung angezeigt, obwohl mehr vorhanden war
//   4 Stil entfaellt, Herkunft gekuerzt
//   5 Stil entfaellt, Herkunft vollstaendig
//   6 alles Vorhandene angezeigt, Herkunft gekuerzt
//   7 alles Vorhandene vollstaendig angezeigt
export type CompactFactsEndState = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export function endStateOf(layout: CompactFactsLayout): CompactFactsEndState {
  const states = [layout.herkunft, layout.besetzung, layout.stil];
  const present = states.filter((s) => s !== 'absent').length;
  if (present === 0) return 1;
  const shown =
    (layout.herkunft === 'full' || layout.herkunft === 'truncated' ? 1 : 0) +
    (layout.besetzung === 'shown' ? 1 : 0) +
    (layout.stil === 'shown' ? 1 : 0);
  if (shown === 0) return 2;
  if (layout.besetzung === 'shown' && shown === 1 && present > 1) return 3;
  if (layout.stil === 'hidden') return layout.herkunft === 'truncated' ? 4 : 5;
  return layout.herkunft === 'truncated' ? 6 : 7;
}
