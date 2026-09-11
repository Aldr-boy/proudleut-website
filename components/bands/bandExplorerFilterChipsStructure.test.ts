import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die im Nachgang ergaenzten Teile
// des Bandfinder-Suchkopfs (Auftrag "Bandfinder-Redesign -- Nachgang",
// Abschnitt 4/5): einzeln entfernbare aktive Filter, konsistente
// Ausgangsbeschriftungen, mobiler "Filter"-Zugang mit Anzahl, Kontakt-Link
// im Nulltreffer-Zustand. Der reale interaktive Ablauf wurde per Browser
// verifiziert (siehe Abschlussbericht) -- hier nur strukturelle Absicherung.
const sourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'BandExplorer.tsx')
const source = readFileSync(sourcePath, 'utf8')

test('konsistente Ausgangsbeschriftungen (Alle-X-Muster) statt uneinheitlicher Leerbeschriftungen', () => {
  assert.match(source, /activeCategoryTitle \?\? 'Alle Anlässe'/)
  assert.match(source, /selectedRegion \?\? 'Alle Regionen'/)
  assert.match(source, /selectedBandtyp \?\? 'Alle Bandarten'/)
  assert.match(source, /\?\? 'Alle Stimmungen'/)
  assert.ok(!source.includes("'Anlass wählen'"))
  assert.ok(!source.includes("'Region wählen'"))
})

test('einzeln entfernbare aktive Filter-Chips fuer Suche/Anlass/Region/Bandtyp/Mood', () => {
  assert.match(source, /const activeFilterChips: \{ key: string; label: string; onRemove: \(\) => void \}\[\] = \[\];/)
  assert.match(source, /activeFilterChips\.map\(\(chip\) => \(/)
  assert.match(source, /title="Filter entfernen"/)
})

test('mobiler "Filter"-Zugang zeigt die Anzahl aktiver Verfeinerungen und blendet Segmente 2-5 ein/aus', () => {
  assert.match(source, /const \[mobileFiltersOpen, setMobileFiltersOpen\] = useState\(false\);/)
  assert.match(source, /Filter\{activeFilterChips\.length > 0 \? ` · \$\{activeFilterChips\.length\}` : ''\}/)
  const hiddenToggles = source.match(/\$\{mobileFiltersOpen \? 'flex' : 'hidden'\} lg:flex/g) ?? []
  assert.equal(hiddenToggles.length, 4, 'alle vier Segmente (Wofuer/Region/Bandtyp/Klingt nach) muessen mobil hinter dem Filter-Zugang liegen')
})

// Auftrag "Bandfinder-Redesign -- Layout-Nachgang": Suche wird bewusst
// zweimal gerendert (mobile Kopfzeile links vom Filter-Zugang, Desktop-
// Segment 6 rechts aussen) -- keine der beiden Instanzen darf Teil der
// mobilen Einklapplogik (mobileFiltersOpen) sein, siehe
// lib/bands/bandExplorerFilterBarBreakpoint.test.ts fuer die zugehoerige
// Mindestbreiten-/Sichtbarkeits-Pruefung.
test('Suche bleibt auf Mobil immer sichtbar (nicht hinter dem Filter-Zugang versteckt) -- gilt fuer beide Such-Instanzen', () => {
  const mobileStart = source.indexOf('Mobile Kopfzeile')
  const mobileEnd = source.indexOf('renderSearchField()', mobileStart)
  const mobileSegment = source.slice(mobileStart, mobileEnd)
  assert.ok(mobileStart >= 0 && mobileEnd > mobileStart, 'mobile Such-Kopfzeile nicht gefunden')
  assert.ok(!mobileSegment.includes('mobileFiltersOpen'), 'mobile Such-Instanz darf nicht Teil der mobilen Einklapplogik sein')

  const desktopStart = source.indexOf('Segment 6')
  const desktopEnd = source.indexOf('renderSearchField()', desktopStart)
  const desktopSegment = source.slice(desktopStart, desktopEnd)
  assert.ok(desktopStart >= 0 && desktopEnd > desktopStart, 'Desktop-Such-Segment nicht gefunden')
  assert.ok(!desktopSegment.includes('mobileFiltersOpen'), 'Desktop-Such-Instanz darf nicht Teil der mobilen Einklapplogik sein')
})

test('Nulltreffer-Zustand verlinkt einen bestehenden Kontaktweg (/kontakt), keine neue Seite', () => {
  assert.match(source, /href="\/kontakt"/)
  assert.match(source, /Schreib uns kurz/)
})

test('Filterleiste-Captions nutzen den kontraststaerkeren bestehenden Token (text-pl-text-muted statt text-pl-text-hint)', () => {
  assert.ok(!/text-\[11px\] font-semibold uppercase tracking-wider text-pl-text-hint/.test(source))
  const mutedCaptions = source.match(/text-\[11px\] font-semibold uppercase tracking-wider text-pl-text-muted/g) ?? []
  assert.equal(mutedCaptions.length, 4)
})
