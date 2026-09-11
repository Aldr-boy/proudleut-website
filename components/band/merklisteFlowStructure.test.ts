import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die vorgeschaltete Merkliste-
// Sammlungsansicht (Auftrag "Bandfinder-Redesign -- Nachgang", Abschnitt 2;
// Mengenbegrenzung ergaenzt im Nachgang "Merkliste-Mengenbegrenzung").
// Der reale End-zu-Ende-Ablauf (frisch geoeffnet ohne Vorauswahl, bewusste
// Auswahl, Formular zeigt nur die Auswahl, Zurueck erhaelt die Auswahl,
// Entfernen wirkt auch auf die Auswahl, vollstaendiges Schliessen setzt nur
// die Auswahl zurueck, Leerzustand, Zwoelf-Baender-Merken mit Acht-Grenze-
// Auswahl) wurde real im Browser verifiziert (siehe Abschlussbericht) --
// hier nur die strukturelle Absicherung der Kernmechanik gegen
// versehentliche Regressionen.
const dir = path.dirname(fileURLToPath(import.meta.url))
const flowSource = readFileSync(path.join(dir, 'MerklisteFlow.tsx'), 'utf8')
const modalSource = readFileSync(path.join(dir, 'AnfrageModal.tsx'), 'utf8')
const storeSource = readFileSync(path.join(dir, '..', '..', 'stores', 'anfrageStore.ts'), 'utf8')

test('Auswahl ist eigener, fluechtiger Zustand (kein Store, keine Persistierung) -- nur gemerkte Baender kommen aus useAnfrageStore', () => {
  assert.match(flowSource, /const \[selectedSlugs, setSelectedSlugs\] = useState<string\[\]>\(\[\]\)/)
  assert.match(flowSource, /const bands = useAnfrageStore\(\(s\) => s\.bands\)/)
})

test('vollstaendiges Schliessen (isOpen -> false) setzt Schritt und Auswahl zurueck, ruehrt aber bands (Store) nicht an', () => {
  assert.match(flowSource, /if \(!isOpen\) \{\s*\r?\n\s*setShowForm\(false\);\s*\r?\n\s*setSelectedSlugs\(\[\]\);/)
})

test('Formularschritt erhaelt ausschliesslich die ausgewaehlten Baender, nicht die gesamte Sammlung', () => {
  assert.match(flowSource, /const selectedBands = bands\.filter\(\(b\) => selectedSlugs\.includes\(b\.slug\)\)/)
  assert.match(flowSource, /bands=\{selectedBands\}/)
})

test('Entfernen aus der Sammlung nimmt die Band auch aus der aktuellen Auswahl', () => {
  assert.match(flowSource, /function handleRemove\(slug: string\) \{\s*\r?\n\s*removeBand\(slug\);\s*\r?\n\s*setSelectedSlugs\(\(prev\) => prev\.filter\(\(s\) => s !== slug\)\);/)
})

test('nach erfolgreicher Anfrage werden nur die tatsaechlich angefragten (ausgewaehlten) Baender aus der Merkliste entfernt', () => {
  assert.match(flowSource, /function handleSuccess\(\) \{\s*\r?\n\s*for \(const slug of selectedSlugs\) removeBand\(slug\);/)
})

test('Formularschritt bietet "Zurueck" zur Sammlung, kein Entfernen mehr dort (das uebernimmt die Sammlungsansicht)', () => {
  assert.match(flowSource, /onBack=\{\(\) => setShowForm\(false\)\}/)
  assert.match(flowSource, /allowBandRemoval=\{false\}/)
})

test('"Alle auswählen" setzt die Auswahl auf alle aktuell gemerkten Baender, aber nur wenn das innerhalb der Anfragegrenze bleibt', () => {
  assert.match(flowSource, /function selectAll\(\) \{\s*\r?\n\s*if \(bands\.length > MAX_BANDS_PER_ANFRAGE\) return;\s*\r?\n\s*setSelectedSlugs\(bands\.map\(\(b\) => b\.slug\)\);/)
  assert.match(flowSource, /const canSelectAll = bands\.length > 0 && bands\.length <= MAX_BANDS_PER_ANFRAGE && !allSelected;/)
})

test('"Auswahl aufheben" setzt die Auswahl auf leer zurueck, ohne den Store anzufassen', () => {
  assert.match(flowSource, /function clearSelection\(\) \{\s*\r?\n\s*setSelectedSlugs\(\[\]\);/)
  assert.match(flowSource, /onClearSelection=\{clearSelection\}/)
})

test('Merkliste selbst ist unbegrenzt -- die Acht-Grenze gilt ausschliesslich fuer die Anfrageauswahl (dieselbe Konstante wie die Serververvalidierung)', () => {
  assert.match(flowSource, /import \{ MAX_BANDS_PER_ANFRAGE \} from ['"]@\/lib\/anfrage\/constants['"]/)
  assert.ok(!/bands\.length >= 8/.test(storeSource), 'addBand() darf gemerkte Baender nicht mehr auf 8 begrenzen')
  assert.match(storeSource, /addBand: \(band\) =>\s*\r?\n\s*set\(\(state\) => \{\s*\r?\n\s*if \(state\.bands\.some\(\(b\) => b\.slug === band\.slug\)\) return state;/)
})

test('Auswahl-Toggle ignoriert weitere Klicks, sobald die Anfragegrenze erreicht ist -- bereits ausgewaehlte Baender bleiben abwaehlbar', () => {
  assert.match(flowSource, /function toggle\(slug: string\) \{\s*\r?\n\s*setSelectedSlugs\(\(prev\) => \{\s*\r?\n\s*if \(prev\.includes\(slug\)\) return prev\.filter\(\(s\) => s !== slug\);\s*\r?\n\s*if \(prev\.length >= MAX_BANDS_PER_ANFRAGE\) return prev;/)
})

test('erreichte Anfragegrenze zeigt den vorgegebenen Hinweistext und deaktiviert nur nicht ausgewaehlte Checkboxen', () => {
  assert.match(flowSource, /Du kannst bis zu \{MAX_BANDS_PER_ANFRAGE\} Bands pro Anfrage auswählen\. Deine übrigen Bands bleiben in der Merkliste\./)
  assert.match(flowSource, /const disabled = !checked && selectionLimitReached;/)
})

test('Auswahlstand wird verstaendlich als "N von 8" angezeigt', () => {
  assert.match(flowSource, /\$\{selectedCount\} von \$\{MAX_BANDS_PER_ANFRAGE\} Bands für die Anfrage ausgewählt/)
})

test('CTA ist ohne Auswahl deaktiviert und zeigt einen Hinweistext', () => {
  assert.match(flowSource, /disabled=\{selectedCount === 0\}/)
  assert.match(flowSource, /Wähle mindestens eine Band aus, um eine Anfrage zu senden\./)
})

test('Leere Sammlung zeigt einen Weg zurueck zum Entdecken (/bands), kein Blindzustand', () => {
  assert.match(flowSource, /Noch keine Bands gemerkt/)
  assert.match(flowSource, /href="\/bands"/)
})

test('AnfrageModal: onBack ist optional (bestehende Aufrufstellen ohne Back-Button unveraendert)', () => {
  assert.match(modalSource, /onBack\?: \(\) => void;/)
  assert.match(modalSource, /\{onBack && \(/)
})

test('Initials und XIcon sind fuer die Sammlungsansicht exportiert (keine Duplizierung)', () => {
  assert.match(modalSource, /export function Initials/)
  assert.match(modalSource, /export function XIcon/)
})
