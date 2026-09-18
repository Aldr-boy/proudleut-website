// Rein darstellungsseitige Gruppierung der Veranstaltungstypen im
// Band-Editor-Checkbox-Formular (app/admin/bands/[id]/page.tsx). Ordnet
// ausschliesslich ueber stabile event_types.slug-Werte zu, niemals ueber
// den veraenderlichen Anzeigenamen -- "Ball & Gala" traegt weiterhin den
// Slug "ball", "Empfang & Dinner" weiterhin "empfang" (Auftrag
// "Konsolidierung der Veranstaltungstypen").
//
// Diese Datei aendert an band_event_types, event_types oder deren
// parent_id nichts -- reine Anzeige-Konfiguration fuer eine bestehende
// flache Checkbox-Liste. Kein neues Datenmodell, keine neue Pflege-
// Oberflaeche.
export type EventTypeGroupDef = {
  title: string;
  slugs: string[];
};

export const EVENT_TYPE_GROUPS: EventTypeGroupDef[] = [
  { title: 'Hochzeit', slugs: ['hochzeit', 'brautentfuehrung'] },
  { title: 'Private Feiern', slugs: ['private-feiern', 'geburtstagsfeier'] },
  { title: 'Firmenveranstaltungen', slugs: ['firmenfeier-business-event', 'messe'] },
  { title: 'Ball, Tanz & Empfang', slugs: ['ball', 'tanzveranstaltung', 'empfang'] },
  {
    title: 'Volksfeste & Festzelt',
    slugs: ['festzelt', 'volksfest', 'dult', 'kirchweih', 'oktoberfest', 'bierfest', 'brauereifest'],
  },
  {
    title: 'Stadt- & Vereinsfeste',
    slugs: ['stadt-und-buergerfest', 'vereinsfest', 'gruendungsfest', 'sportfest'],
  },
  { title: 'Konzerte & Kultur', slugs: ['konzert', 'club', 'festival', 'kultur', 'vernissage'] },
  { title: 'Gastronomie & Wirtshaus', slugs: ['bar', 'biergarten', 'wirtshausmusi', 'fruehschoppen'] },
  {
    title: 'Weitere Anlässe',
    slugs: ['sommerfest', 'weihnachtsfeier', 'fasching', 'jubilaeum', 'kinder-und-familienevent'],
  },
  { title: 'Zeremonien & Gedenken', slugs: ['taufe', 'beerdigung'] },
  { title: 'Veranstaltungsrahmen', slugs: ['open-air'] },
];

// Kein eigenes Formularfeld, keine Checkbox -- rein informativer
// Auffangabschnitt fuer aktive Typen, die (noch) in keiner Gruppe oben
// gelistet sind (z. B. neu angelegte). Bleibt normal aus-/abwaehlbar.
export const UNGROUPED_TITLE = 'Noch nicht eingeordnet';

export type EventTypeGroup<T> = {
  title: string;
  types: T[];
};

// Bucketiert eine gegebene Liste aktiver Event-Types in die oben
// definierten Gruppen -- in der dort festgelegten Gruppen- und
// Innerhalb-Reihenfolge (nicht nach sort_order/Name). Jeder Typ erscheint
// hoechstens einmal, auch falls ein Slug versehentlich in mehreren
// Gruppen stuende. Typen ohne Treffer in EVENT_TYPE_GROUPS landen
// gesammelt unter UNGROUPED_TITLE, in ihrer urspruenglichen
// Eingabereihenfolge. Eine Gruppe ohne Treffer wird nicht zurueckgegeben
// ("leere Gruppen nicht anzeigen").
export function groupEventTypesForAdmin<T extends { slug: string }>(
  types: readonly T[]
): EventTypeGroup<T>[] {
  const bySlug = new Map(types.map((t) => [t.slug, t]));
  const used = new Set<string>();
  const groups: EventTypeGroup<T>[] = [];

  for (const def of EVENT_TYPE_GROUPS) {
    const matched: T[] = [];
    for (const slug of def.slugs) {
      const t = bySlug.get(slug);
      if (t && !used.has(slug)) {
        matched.push(t);
        used.add(slug);
      }
    }
    if (matched.length > 0) groups.push({ title: def.title, types: matched });
  }

  const rest = types.filter((t) => !used.has(t.slug));
  if (rest.length > 0) groups.push({ title: UNGROUPED_TITLE, types: rest });

  return groups;
}
