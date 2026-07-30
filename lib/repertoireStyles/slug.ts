// Deterministische Slug-Erzeugung fuer neue Repertoire-Styles, entlang
// derselben Proudleut-Slug-Konvention wie bands.slug und moods.slug
// (DB-Constraint: slug ~ '^[a-z0-9-]+$', identisch fuer alle drei
// Tabellen).
//
// Bewusst eigenstaendig statt geteilter Abstraktion mit
// lib/moods/slug.ts -- passend zum bestehenden Projektmuster
// pro-Domain-eigener lib/*-Ordner (lib/moods/*, lib/repertoireStyles/*,
// lib/bandImages/*), keine verfruehte Cross-Domain-Abstraktion.
//
// Die Transliteration (ae/oe/ue/ss) ist identisch zu lib/moods/slug.ts
// und wurde gegen einen bereits bestehenden, per Production-Import
// kuratierten Repertoire-Style-Slug verifiziert:
//   "Charts-Decades & Tanzstandards" -> charts-decades-tanzstandards
//   (exakt der Slug aus supabase/musikalisch_verortet_import_v2.sql)

const UMLAUT_MAP: Record<string, string> = {
  ä: 'ae', ö: 'oe', ü: 'ue',
  Ä: 'ae', Ö: 'oe', Ü: 'ue',
  ß: 'ss',
}

export function slugifyRepertoireStyleName(name: string): string {
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
