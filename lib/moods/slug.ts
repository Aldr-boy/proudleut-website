// Deterministische Slug-Erzeugung fuer neue Moods, entlang der
// bestehenden Proudleut-Slug-Konvention (DB-Constraint auf bands.slug
// und moods.slug: slug ~ '^[a-z0-9-]+$', identisch fuer beide Tabellen).
//
// Es existiert im Repository kein wiederverwendbarer Slug-Generator
// (Bestandspruefung: grep ueber *.ts/*.tsx ergab keine toSlug/slugify/
// generateSlug-Funktion -- Band-Slugs werden im Admin manuell
// eingegeben, Mood-Slugs wurden bislang per SQL-Migration gesetzt).
// Diese Funktion ist bewusst neu, aber ausschliesslich fuer Moods
// gedacht -- keine allgemeine Taxonomie-Utility.
//
// Die Transliteration (ae/oe/ue/ss) wurde nicht erfunden, sondern aus
// den bereits bestehenden, kuratierten Mood-Slugs abgeleitet, z. B.:
//   "Emotional & berührend"  -> emotional-beruehrend
//   "Rockig & mitreißend"    -> rockig-mitreissend
//   "Bayerisch & frech"      -> bayerisch-frech
// Neue Slugs folgen exakt demselben Muster.

const UMLAUT_MAP: Record<string, string> = {
  ä: 'ae', ö: 'oe', ü: 'ue',
  Ä: 'ae', Ö: 'oe', Ü: 'ue',
  ß: 'ss',
}

export function slugifyMoodName(name: string): string {
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
