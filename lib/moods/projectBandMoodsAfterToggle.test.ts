import { test } from 'node:test'
import assert from 'node:assert/strict'
import { projectBandMoodsAfterToggle } from './projectBandMoodsAfterToggle.ts'

test('2/4 -> Ziel-Mood entfernen -> 1/4, unter Zielkorridor', () => {
  const result = projectBandMoodsAfterToggle({
    currentMoodSlugs: ['festzeltenergie', 'party-pur'],
    targetMoodSlug: 'festzeltenergie',
    willBeAssigned: false,
  })
  assert.equal(result.moodCount, 1)
  assert.equal(result.isUnderTargetCorridor, true)
})

test('1/4 -> Ziel-Mood entfernen -> 0/4, unter Zielkorridor', () => {
  const result = projectBandMoodsAfterToggle({
    currentMoodSlugs: ['festzeltenergie'],
    targetMoodSlug: 'festzeltenergie',
    willBeAssigned: false,
  })
  assert.equal(result.moodCount, 0)
  assert.equal(result.isUnderTargetCorridor, true)
})

test('0/4 -> Ziel-Mood hinzufuegen -> 1/4, weiterhin unter Zielkorridor', () => {
  const result = projectBandMoodsAfterToggle({
    currentMoodSlugs: [],
    targetMoodSlug: 'festzeltenergie',
    willBeAssigned: true,
  })
  assert.equal(result.moodCount, 1)
  assert.equal(result.isUnderTargetCorridor, true)
})

test('2/4 -> Ziel-Mood hinzufuegen -> 3/4, kein Warnhinweis mehr', () => {
  const result = projectBandMoodsAfterToggle({
    currentMoodSlugs: ['bayerisch-frech', 'mitsing-faktor'],
    targetMoodSlug: 'festzeltenergie',
    willBeAssigned: true,
  })
  assert.equal(result.moodCount, 3)
  assert.equal(result.isUnderTargetCorridor, false)
})

test('Feier-Cluster: 2 bestehende Cluster-Moods + Ziel-Mood aus Cluster -> ueberschreitet Schwelle', () => {
  const result = projectBandMoodsAfterToggle({
    currentMoodSlugs: ['party-pur', 'tanzflaechen-garantie'],
    targetMoodSlug: 'festzeltenergie',
    willBeAssigned: true,
  })
  assert.equal(result.exceedsFeierCluster, true)
})

test('Feier-Cluster: Entfernen reduziert Cluster-Anzahl und loest Warnung wieder auf', () => {
  const result = projectBandMoodsAfterToggle({
    currentMoodSlugs: ['festzeltenergie', 'party-pur', 'tanzflaechen-garantie'],
    targetMoodSlug: 'festzeltenergie',
    willBeAssigned: false,
  })
  assert.equal(result.exceedsFeierCluster, false)
})

test('Ziel-Mood bereits in currentMoodSlugs enthalten und willBeAssigned=true -> keine Verdopplung in der Projektion', () => {
  const result = projectBandMoodsAfterToggle({
    currentMoodSlugs: ['festzeltenergie', 'party-pur'],
    targetMoodSlug: 'festzeltenergie',
    willBeAssigned: true,
  })
  assert.equal(result.moodCount, 2)
})
