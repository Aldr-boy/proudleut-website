import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Konsistenzpruefung ueber drei Dateien hinweg: jeder in
// supabase/fn_event_types_catalog_admin.sql definierte ET-Fehlercode muss
// in app/admin/event-types/actions.ts auf einen stabilen Slug UND in
// app/admin/event-types/page.tsx auf eine Nutzertextmeldung abgebildet
// sein -- sonst wuerde ein RPC-Fehler entweder als rohes ERRCODE oder als
// "Unbekannter Fehler" enden, obwohl die RPC ihn bewusst und benannt
// wirft. Kein Aequivalent-Test existiert fuer moods/repertoire_styles in
// diesem Repo -- diese Datei deckt beide Vorbilder retroactiv nicht ab,
// prueft aber zumindest den neuen Event-Types-Katalog vollstaendig.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const sqlSource = readFileSync(path.join(root, 'supabase', 'fn_event_types_catalog_admin.sql'), 'utf8')
const actionsSource = readFileSync(path.join(root, 'app', 'admin', 'event-types', 'actions.ts'), 'utf8')
const pageSource = readFileSync(path.join(root, 'app', 'admin', 'event-types', 'page.tsx'), 'utf8')

function extractSqlErrorSlugs(): string[] {
  // Erwartetes Muster in der SQL-Datei: raise exception 'event_types_x_y'
  const matches = [...sqlSource.matchAll(/raise exception '(event_types_[a-z_]+)'/g)]
  const slugs = matches.map((m) => m[1])
  // Korrektur "Archive-/Reactivate-Verhalten": ET011 (archive_in_use) und
  // ET014 (archive_has_active_children) wurden ersatzlos entfernt -- 7
  // distinkte Fehler-Slugs bleiben (ET001, ET003, ET004, ET005, ET010,
  // ET012, ET013), 10 raise-Vorkommen insgesamt (event_types_not_found
  // dreifach, event_types_name_required zweifach).
  assert.ok(slugs.length >= 7, `erwartet mindestens 7 raise-exception-Slugs in der SQL-Datei, gefunden ${slugs.length}`)
  return [...new Set(slugs)]
}

test('jeder in der SQL-Datei geworfene event_types_*-Fehler-Slug ist in actions.ts als Wert im ERRCODE-Mapping vorhanden', () => {
  const sqlSlugs = extractSqlErrorSlugs()
  for (const slug of sqlSlugs) {
    assert.ok(actionsSource.includes(`'${slug}'`), `Fehler-Slug "${slug}" fehlt im ERRCODE-Mapping von actions.ts`)
  }
})

test('jeder in der SQL-Datei geworfene event_types_*-Fehler-Slug hat eine Nutzertextmeldung in page.tsx', () => {
  const sqlSlugs = extractSqlErrorSlugs()
  for (const slug of sqlSlugs) {
    assert.ok(pageSource.includes(`${slug}:`), `Fehler-Slug "${slug}" hat keine Meldung in EVENT_TYPES_ERROR_MESSAGES (page.tsx)`)
  }
})

test('jeder ET0xx-ERRCODE aus der SQL-Datei ist im actions.ts-Mapping auf genau den passenden Slug abgebildet', () => {
  const errcodePairs = [...sqlSource.matchAll(/errcode = '(ET\d{3})',\s*\n?\s*detail[^;]*?;?\s*\n?\s*end if;/gs)]
  // Robusterer, einfacherer Ansatz: jedes "using errcode = 'ETxxx'" muss
  // im selben raise-exception-Block wie der zugehoerige Fehler-Slug stehen
  // -- hier stattdessen direkt paarweise pruefen, welcher Slug welchem
  // Code vorausgeht.
  const raiseBlocks = [...sqlSource.matchAll(/raise exception '(event_types_[a-z_]+)'\s*\n\s*using errcode = '(ET\d{3})'/g)]
  assert.ok(raiseBlocks.length >= 7, `erwartet mindestens 7 Slug/ERRCODE-Paare, gefunden ${raiseBlocks.length}`)
  for (const [, slug, code] of raiseBlocks) {
    const mappingLineRe = new RegExp(`${code}:\\s*'${slug}'`)
    assert.match(actionsSource, mappingLineRe, `ERRCODE ${code} muss in actions.ts auf '${slug}' abgebildet sein`)
  }
})
