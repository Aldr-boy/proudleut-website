import { exceedsFeierClusterThreshold } from './feierCluster.ts'

// Projiziert, welchen Mood-Zustand eine Band HAETTE, wenn der aktuell in
// /admin/moods/[slug]/bands betrachtete Mood staged hinzugefuegt oder
// entfernt wird -- reine Vorschau fuer Row-/Save-Bereich-Warnungen, kein
// DB-Zugriff. Nutzt bewusst denselben zentralen Feier-Cluster-Helper wie
// der bestehende Band-Mood-Editor (lib/moods/feierCluster.ts), statt die
// Cluster-Liste hier ein zweites Mal zu pflegen.
export type BandMoodProjection = {
  moodCount: number
  isUnderTargetCorridor: boolean // < 2 Moods, gemaess bestehender 2-4-Zielkorridor-Semantik nur ein Hinweis, kein Blocker
  exceedsFeierCluster: boolean
}

export function projectBandMoodsAfterToggle(params: {
  // ALLE aktuell zugeordneten Mood-Slugs dieser Band, inkl. des hier
  // betrachteten Ziel-Moods, falls bereits zugeordnet.
  currentMoodSlugs: string[]
  targetMoodSlug: string
  willBeAssigned: boolean
}): BandMoodProjection {
  const withoutTarget = params.currentMoodSlugs.filter((slug) => slug !== params.targetMoodSlug)
  const projected = params.willBeAssigned ? [...withoutTarget, params.targetMoodSlug] : withoutTarget

  return {
    moodCount: projected.length,
    isUnderTargetCorridor: projected.length < 2,
    exceedsFeierCluster: exceedsFeierClusterThreshold(projected),
  }
}
