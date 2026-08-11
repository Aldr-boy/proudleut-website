import { CATEGORIES } from '../../lib/categories.ts';

// Ordnet einen Supabase event_types.slug einer Kategorie zu -- ausschliesslich
// ueber die explizite CATEGORIES[].supabaseEventTypeSlugs-Zuordnung, niemals
// ueber Namensvergleich/Slugify/Praefix o.ae. Bei keiner oder mehr als einer
// passenden Kategorie bewusst kein Link (kein "erste gefundene Kategorie
// gewinnt").
export function findCategoryForEventTypeSlug(eventTypeSlug: string) {
  const matches = CATEGORIES.filter((c) => c.supabaseEventTypeSlugs?.includes(eventTypeSlug));
  return matches.length === 1 ? matches[0] : undefined;
}
