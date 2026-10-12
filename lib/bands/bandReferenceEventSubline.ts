// Reine Logik fuer die Unterzeile(n) einer Referenz-Event-Karte
// (BandReferenceEvents.tsx), bewusst ausgelagert fuer deterministische
// Tests. description (ab V1.1) ist eine freie, optionale oeffentliche
// Unterzeile zusaetzlich zum strukturierten year -- year bleibt integer.
//
// Ohne description bleibt das bisherige Verhalten unveraendert: eine
// einzelne Zeile "ort · year" (nur Ort, nur year, oder beides,
// jeweils mit " · " verbunden; leer, wenn beides fehlt).
//
// Mit description: der Ort (falls vorhanden) steht allein in der ersten
// Zeile, year wandert stattdessen in eine zweite Zeile zusammen mit
// description ("description · year", oder nur "description" ohne
// year). So erscheint year nie doppelt, city geht nicht verloren, und
// bestehende Referenzen ohne description behalten ihr bisheriges
// Layout exakt bei.
//
// Location (venue) und Ort (city) bilden zusammen den Ortsteil
// "venue, city"; leere Felder erzeugen weder Luecke noch Komma.
export function referenceEventSublines(ev: {
  venue?: string;
  city?: string;
  year?: number;
  description?: string;
}): string[] {
  const place = [ev.venue, ev.city].filter(Boolean).join(', ');

  if (ev.description) {
    const lines: string[] = [];
    if (place) lines.push(place);
    lines.push([ev.description, ev.year].filter(Boolean).join(' · '));
    return lines;
  }

  const line = [place, ev.year].filter(Boolean).join(' · ');
  return line ? [line] : [];
}
