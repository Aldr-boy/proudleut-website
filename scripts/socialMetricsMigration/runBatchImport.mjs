/**
 * runBatchImport.mjs
 *
 * Duenne pg-Orchestrierung um die reine Entscheidungslogik aus
 * batchTransaction.mjs: eine einzige DB-Transaktion prueft alle
 * Zielzeilen per SELECT ... FOR UPDATE (Zeilensperre gegen
 * nebenlaeufige Aenderungen), vergleicht sie mit dem freigegebenen
 * Plan und schreibt entweder ausnahmslos alle oder keine. Die
 * Sicherung (Vorher-/Nachherzustand) wird innerhalb derselben
 * Transaktion, nach der Validierung und vor dem UPDATE, auf die
 * Festplatte geschrieben -- schlaegt das fehl, wird zurueckgerollt.
 */
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { classifyBatchRow, classifyBatch, toEpochMs } from './batchTransaction.mjs'

/**
 * @param {object} params
 * @param {import('pg').Client} params.client - bereits verbunden, keine offene Transaktion
 * @param {Array<{targetProfileId:string, band:{id:string,slug:string}, platform:string, previousValue:number|null, previousCheckedAt:string|null, proposedValue:number, proposedCheckedAt:string}>} params.planRows
 * @param {string} params.backupDir - muss bereits existieren (mkdirSync recursive vorher)
 * @param {string} [params.table] - schemaqualifizierter Tabellenname, Default public.social_profiles.
 *   Nur fuer die Testrehearsal auf eine TEMP TABLE umschaltbar -- kein Nutzereingabewert, immer
 *   eine der beiden festen Konstanten aus diesem Modul/Testcode.
 */
export async function runAtomicImport({ client, planRows, backupDir, table = 'public.social_profiles' }) {
  await client.query('BEGIN')
  try {
    const actualById = new Map()
    for (const row of planRows) {
      const { rows } = await client.query(
        `SELECT id, current_followers, last_checked_at FROM ${table} WHERE id = $1 FOR UPDATE`,
        [row.targetProfileId],
      )
      actualById.set(row.targetProfileId, rows[0] ?? null)
    }

    const classifiedRows = planRows.map((row) => {
      const actualRow = actualById.get(row.targetProfileId)
      const actual = actualRow ? { followers: actualRow.current_followers, checkedAtMs: toEpochMs(actualRow.last_checked_at) } : null
      const expectedPrevious = { followers: row.previousValue, checkedAtMs: toEpochMs(row.previousCheckedAt) }
      const expectedFinal = { followers: row.proposedValue, checkedAtMs: toEpochMs(row.proposedCheckedAt) }
      return { id: row.targetProfileId, classification: classifyBatchRow(expectedPrevious, expectedFinal, actual), row, actual }
    })

    const batch = classifyBatch(classifiedRows.map((r) => ({ id: r.id, classification: r.classification })))

    if (batch.outcome === 'ABORT_MISMATCH' || batch.outcome === 'ABORT_MIXED') {
      await client.query('ROLLBACK')
      const details = classifiedRows.filter((r) => batch.mismatchIds.includes(r.id) || (batch.outcome === 'ABORT_MIXED' && (batch.toApplyIds.includes(r.id) || batch.alreadyAppliedIds.includes(r.id))))
      return { outcome: batch.outcome, appliedCount: 0, details: details.map((d) => ({ profileId: d.id, band: d.row.band, platform: d.row.platform, classification: d.classification, actual: d.actual })) }
    }

    if (batch.outcome === 'ALL_ALREADY_APPLIED') {
      await client.query('COMMIT')
      return { outcome: 'ALL_ALREADY_APPLIED', appliedCount: 0, details: [] }
    }

    // ALL_FRESH_APPLY: Sicherung schreiben (innerhalb der Transaktion validiert,
    // vor dem eigentlichen Schreiben), dann alle Zeilen aktualisieren.
    mkdirSync(backupDir, { recursive: true })
    const before = planRows.map((row) => ({
      profileId: row.targetProfileId,
      band_id: row.band.id,
      platform: row.platform,
      current_followers: row.previousValue,
      last_checked_at: row.previousCheckedAt,
    }))
    const after = planRows.map((row) => ({
      profileId: row.targetProfileId,
      band_id: row.band.id,
      platform: row.platform,
      current_followers: row.proposedValue,
      last_checked_at: row.proposedCheckedAt,
    }))
    writeFileSync(join(backupDir, 'before.json'), JSON.stringify(before, null, 2))
    writeFileSync(join(backupDir, 'after.json'), JSON.stringify(after, null, 2))
    writeFileSync(join(backupDir, 'manifest.json'), JSON.stringify({
      createdAt: new Date().toISOString(),
      rowCount: planRows.length,
      note: 'Vorher-/Nachherzustand fuer die Social-Metrics-CSV-Uebernahme. Enthaelt keine Zugangsdaten.',
    }, null, 2))

    for (const row of planRows) {
      await client.query(
        `UPDATE ${table} SET current_followers = $1, last_checked_at = $2 WHERE id = $3`,
        [row.proposedValue, row.proposedCheckedAt, row.targetProfileId],
      )
    }

    await client.query('COMMIT')
    return { outcome: 'APPLIED', appliedCount: planRows.length, details: [] }
  } catch (err) {
    try { await client.query('ROLLBACK') } catch { /* Verbindung evtl. schon zu -- Rollback bestmoeglich */ }
    throw err
  }
}

/**
 * @param {object} params
 * @param {import('pg').Client} params.client
 * @param {Array<{profileId:string, band_id:string, platform:string, current_followers:number|null, last_checked_at:string|null}>} params.before
 * @param {Array<{profileId:string, band_id:string, platform:string, current_followers:number|null, last_checked_at:string|null}>} params.after
 * @param {string} [params.table] - siehe runAtomicImport, gleiche Begruendung
 */
export async function runAtomicRestore({ client, before, after, table = 'public.social_profiles' }) {
  await client.query('BEGIN')
  try {
    const actualById = new Map()
    for (const row of after) {
      const { rows } = await client.query(
        `SELECT id, current_followers, last_checked_at FROM ${table} WHERE id = $1 FOR UPDATE`,
        [row.profileId],
      )
      actualById.set(row.profileId, rows[0] ?? null)
    }

    const drifted = []
    for (const row of after) {
      const actualRow = actualById.get(row.profileId)
      if (!actualRow) { drifted.push({ profileId: row.profileId, reason: 'NOT_FOUND' }); continue }
      const matches = actualRow.current_followers === row.current_followers && toEpochMs(actualRow.last_checked_at) === toEpochMs(row.last_checked_at)
      if (!matches) drifted.push({ profileId: row.profileId, reason: 'DRIFT', actual: { current_followers: actualRow.current_followers, last_checked_at: actualRow.last_checked_at } })
    }

    if (drifted.length > 0) {
      await client.query('ROLLBACK')
      return { outcome: 'ABORT_DRIFT', restoredCount: 0, drifted }
    }

    const beforeById = new Map(before.map((b) => [b.profileId, b]))
    for (const row of after) {
      const b = beforeById.get(row.profileId)
      await client.query(
        `UPDATE ${table} SET current_followers = $1, last_checked_at = $2 WHERE id = $3`,
        [b.current_followers, b.last_checked_at, row.profileId],
      )
    }

    await client.query('COMMIT')
    return { outcome: 'RESTORED', restoredCount: after.length, drifted: [] }
  } catch (err) {
    try { await client.query('ROLLBACK') } catch { /* bestmoeglich */ }
    throw err
  }
}
