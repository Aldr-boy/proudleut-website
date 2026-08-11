// Deterministische Slug-Erzeugung fuer neue Veranstaltungstypen beim
// Anlegen, entlang derselben Proudleut-Slug-Konvention wie bands.slug,
// moods.slug und repertoire_styles.slug (DB-Constraint: slug ~
// '^[a-z0-9-]+$', identisch fuer alle vier Tabellen, siehe
// supabase/proudleut-schema.sql).
//
// Bewusst eigenstaendig statt geteilter Abstraktion mit lib/moods/slug.ts
// bzw. lib/repertoireStyles/slug.ts -- passend zum bestehenden
// Projektmuster pro-Domain-eigener lib/*-Ordner, keine verfruehte
// Cross-Domain-Abstraktion.
//
// Die Transliteration (ae/oe/ue/ss) ist identisch zu lib/moods/slug.ts
// und lib/repertoireStyles/slug.ts und wurde gegen real bestehende,
// kuratierte Production-Slugs verifiziert, z. B.:
//   "Stadt- und Bürgerfest"        -> stadt-und-buergerfest
//   "Kinder- & Familienevent"      -> kinder-familienevent (Hinweis: der
//     real vorhandene Production-Slug lautet "kinder-und-familienevent" --
//     abweichend von dieser rein mechanischen Transliteration, da er
//     historisch/redaktionell mit ausgeschriebenem "und" vergeben wurde.
//     Bestehende Slugs werden durch dieses Paket nicht veraendert; die
//     Funktion hier gilt ausschliesslich fuer NEU angelegte Typen.)
//
// Slug ist nach dem Anlegen eine stabile Identitaet -- diese Funktion wird
// ausschliesslich beim Create verwendet, niemals beim Bearbeiten
// bestehender Veranstaltungstypen (siehe app/admin/event-types/actions.ts).

const UMLAUT_MAP: Record<string, string> = {
  ä: 'ae', ö: 'oe', ü: 'ue',
  Ä: 'ae', Ö: 'oe', Ü: 'ue',
  ß: 'ss',
}

export function slugifyEventTypeName(name: string): string {
  const transliterated = name
    .split('')
    .map((ch) => UMLAUT_MAP[ch] ?? ch)
    .join('')

  return transliterated
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // alles, was kein a-z0-9 ist, wird Trenner
    .replace(/-+/g, '-')        // mehrfache Trenner zusammenfassen
    .replace(/^-+|-+$/g, '')    // fuehrende/abschliessende Trenner entfernen
}
