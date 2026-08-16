// Reine Logik fuer die Unterzeile(n) einer Referenz-Event-Karte
// (BandReferenceEvents.tsx), bewusst ausgelagert fuer deterministische
// Tests. description (ab V1.1) ist eine freie, optionale oeffentliche
// Unterzeile zusaetzlich zum strukturierten year -- year bleibt integer.
//
// Ohne description bleibt das bisherige Verhalten unveraendert: eine
// einzelne Zeile "city · year" (nur city, nur year, oder beides,
// jeweils mit " · " verbunden; leer, wenn beides fehlt).
//
// Mit description: city (falls vorhanden) steht allein in der ersten
// Zeile, year wandert stattdessen in eine zweite Zeile zusammen mit
// description ("description · year", oder nur "description" ohne
// year). So erscheint year nie doppelt, city geht nicht verloren, und
// bestehende Referenzen ohne description behalten ihr bisheriges
// Layout exakt bei.
export function referenceEventSublines(ev: {
  city?: string;
  year?: number;
  description?: string;
}): string[] {
  if (ev.description) {
    const lines: string[] = [];
    if (ev.city) lines.push(ev.city);
    lines.push([ev.description, ev.year].filter(Boolean).join(' · '));
    return lines;
  }

  const line = [ev.city, ev.year].filter(Boolean).join(' · ');
  return line ? [line] : [];
}
