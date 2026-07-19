// Feier-Cluster-Hinweis (rein redaktionelle UI-Warnung, kein Blocker).
// Slugs wie im Auftrag vorgegeben -- bewusst als Konstante hier, nicht
// aus der DB abgeleitet (der Katalog kennt kein "ist Feier-Cluster"-Feld).

export const FEIER_CLUSTER_SLUGS = new Set([
  'festzeltenergie',
  'party-pur',
  'tanzflaechen-garantie',
  'festlich-ausgelassen',
  'rockig-mitreissend',
])

export const FEIER_CLUSTER_WARNING_THRESHOLD = 2

export function countFeierClusterSlugs(slugs: (string | null | undefined)[]): number {
  return slugs.filter((s): s is string => !!s && FEIER_CLUSTER_SLUGS.has(s)).length
}

export function exceedsFeierClusterThreshold(slugs: (string | null | undefined)[]): boolean {
  return countFeierClusterSlugs(slugs) > FEIER_CLUSTER_WARNING_THRESHOLD
}
