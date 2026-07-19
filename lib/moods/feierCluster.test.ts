import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  FEIER_CLUSTER_SLUGS,
  countFeierClusterSlugs,
  exceedsFeierClusterThreshold,
} from './feierCluster.ts'

test('enthaelt exakt die im Auftrag vorgegebenen fuenf Feier-Cluster-Slugs', () => {
  assert.deepEqual(
    [...FEIER_CLUSTER_SLUGS].sort(),
    [
      'festlich-ausgelassen',
      'festzeltenergie',
      'party-pur',
      'rockig-mitreissend',
      'tanzflaechen-garantie',
    ].sort(),
  )
})

test('zaehlt nur Feier-Cluster-Slugs, ignoriert andere Moods', () => {
  const count = countFeierClusterSlugs([
    'festzeltenergie',
    'herzlich-nahbar',
    'party-pur',
    'authentisch-handgemacht',
  ])
  assert.equal(count, 2)
})

test('ignoriert null/undefined-Slots (leere Raenge)', () => {
  const count = countFeierClusterSlugs(['festzeltenergie', null, undefined, 'party-pur'])
  assert.equal(count, 2)
})

test('Schwelle: bei genau zwei Treffern keine Ueberschreitung', () => {
  assert.equal(exceedsFeierClusterThreshold(['festzeltenergie', 'party-pur']), false)
})

test('Schwelle: bei drei Treffern Ueberschreitung, aber nicht blockierend (nur Signal)', () => {
  assert.equal(
    exceedsFeierClusterThreshold(['festzeltenergie', 'party-pur', 'tanzflaechen-garantie']),
    true,
  )
})

test('bei vier Feier-Cluster-Treffern (technisches Maximum) ebenfalls Ueberschreitung', () => {
  assert.equal(
    exceedsFeierClusterThreshold([
      'festzeltenergie',
      'party-pur',
      'tanzflaechen-garantie',
      'festlich-ausgelassen',
    ]),
    true,
  )
})
