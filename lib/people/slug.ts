// Deterministische Slug-Erzeugung fuer neue Personen beim Anlegen, entlang
// derselben Proudleut-Slug-Konvention wie bands.slug/event_types.slug/
// moods.slug/repertoire_styles.slug (DB-Constraint: slug ~ '^[a-z0-9-]+$',
// siehe supabase/people_data_foundation_v1.sql -- people.slug traegt
// denselben Constraint).
//
// Bewusst eigenstaendig statt geteilter Abstraktion mit
// lib/eventTypes/slug.ts -- passend zum bestehenden Projektmuster
// pro-Domain-eigener lib/*-Ordner. Transliteration (ae/oe/ue/ss) ist
// identisch zu den bestehenden Slug-Helfern.
//
// Slug ist nach dem Anlegen eine stabile Identitaet -- diese Funktion wird
// ausschliesslich beim Create verwendet, niemals beim Bearbeiten
// bestehender Personen (siehe app/admin/people/actions.ts).

const UMLAUT_MAP: Record<string, string> = {
  ä: 'ae', ö: 'oe', ü: 'ue',
  Ä: 'ae', Ö: 'oe', Ü: 'ue',
  ß: 'ss',
}

export function slugifyPersonName(name: string): string {
  const transliterated = name
    .split('')
    .map((ch) => UMLAUT_MAP[ch] ?? ch)
    .join('')

  return transliterated
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}
