import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer den neuen Themen-Suchkopf und die
// Merkliste-Ergebniszeile in BandExplorer (Auftrag "Bandfinder-Redesign").
// Die eigentliche Href-/Aktiv-Logik wird bereits real gegen echte Daten in
// lib/bands/bandFinderThemes.test.ts geprueft -- hier nur die Verdrahtung.
const sourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'BandExplorer.tsx')
const source = readFileSync(sourcePath, 'utf8')

test('nutzt resolveBandFinderThemeNav() statt eigener Routing-Logik', () => {
  assert.match(source, /import \{ resolveBandFinderThemeNav, resolveThemeTileActive, reduceTilePendingKey \} from ['"]@\/lib\/bands\/bandFinderThemes['"]/)
  assert.match(source, /resolveBandFinderThemeNav\(\s*\r?\n\s*lockedOccasion,\s*\r?\n\s*selectedCategory,/)
})

test('Themen-Grid: 2 Spalten mobil, 3 Spalten Desktop (Standard-Tailwind-Grid)', () => {
  assert.match(source, /grid grid-cols-2 md:grid-cols-3/)
})

test('Themen-Links sind echte next/link-Links mit aria-current, kein reines onClick', () => {
  assert.match(source, /import Link, \{ useLinkStatus \} from ['"]next\/link['"]/)
  assert.match(source, /<Link\s*\r?\n\s*key=\{theme\.key\}\s*\r?\n\s*href=\{theme\.href\}\s*\r?\n\s*aria-current=\{isActive \? 'page' : undefined\}/)
})

// Auftrag "Klick-/Aktivzustand im Bandfinder": isActive kombiniert
// theme.active (weiterhin die fachliche Wahrheit, siehe
// resolveBandFinderThemeNav/resolveThemeTileActive-Tests) mit einem rein
// clientseitigen pendingTileKey fuer sofortiges Klick-Feedback. Optik im
// Ruhe-/Hover-/Aktivzustand bleibt dadurch unveraendert -- nur der
// Aktivzustand selbst wechselt jetzt sofort statt erst nach Navigation/
// Server-Datenladen. Rahmen/Hintergrund/Haekchen bleiben bewusst am
// <Link> (nicht in der ThemeTileMedia-Kind-Komponente), damit sich am
// Erscheinungsbild nichts verschiebt.
test('isActive ersetzt theme.active als Render-Bedingung, berechnet ueber resolveThemeTileActive() aus lib/bands/bandFinderThemes', () => {
  assert.match(source, /import \{ resolveBandFinderThemeNav, resolveThemeTileActive, reduceTilePendingKey \} from ['"]@\/lib\/bands\/bandFinderThemes['"]/)
  assert.match(source, /const isActive = resolveThemeTileActive\(pendingTileKey, theme\.key, theme\.active\)/)
})

test('Schriftgewicht der Themen-Labels ist in jedem Zustand unbedingt font-semibold (kein Wechsel ueber isActive) -- verhindert Layout-Shift/Umbruchaenderung bei den beiden langen Labels', () => {
  assert.match(source, /<span className=\{`text-sm font-semibold leading-snug \$\{isActive/)
})

test('aktive Themen-Kachel bleibt durch Rahmen und Haekchen vom neutralen Hover unterscheidbar (Klassen unveraendert am <Link>, nur isActive statt theme.active)', () => {
  assert.match(source, /isActive \? 'border-pl-accent bg-\[color-mix/);
  assert.match(source, /: 'border-transparent hover:bg-black\/\[0\.03\]'/);
  assert.match(source, /\{isActive && \(\s*<svg[\s\S]*?aria-hidden="true"/);
})

test('ThemeTileMedia liest useLinkStatus() als Kind von <Link> und meldet den Pending-Status nach oben (BandExplorer haelt pendingTileKey, nicht die Kind-Komponente)', () => {
  assert.match(source, /function ThemeTileMedia\(/)
  assert.match(source, /const \{ pending \} = useLinkStatus\(\)/)
  assert.match(source, /onPendingChange\(themeKey, pending\)/)
  assert.match(source, /<ThemeTileMedia\s*\r?\n\s*image=\{theme\.image\}\s*\r?\n\s*label=\{theme\.label\}\s*\r?\n\s*isActive=\{isActive\}\s*\r?\n\s*themeKey=\{theme\.key\}\s*\r?\n\s*onPendingChange=\{onTilePendingChange\}/)
})

test('pendingTileKey wird ueber reduceTilePendingKey() aktualisiert und beim Wechsel von Pathname/lockedOccasion zurueckgesetzt (nicht per Remount)', () => {
  assert.match(source, /setPendingTileKey\(\(current\) => reduceTilePendingKey\(current, key, isPending\)\)/)
  assert.match(source, /const routeKey = `\$\{pathname\}::\$\{lockedOccasion \?\? ''\}`/)
  assert.match(source, /if \(routeKey !== pendingTileRouteKey\) \{\s*\r?\n\s*setPendingTileRouteKey\(routeKey\);\s*\r?\n\s*setPendingTileKey\(null\);\s*\r?\n\s*\}/)
})

// Nachgang "Bandfinder-Redesign": oeffnet nicht mehr direkt AnfrageModal,
// sondern die vorgeschaltete Sammlungsansicht MerklisteFlow (siehe
// components/band/merklisteFlowStructure.test.ts fuer deren eigene
// Struktur-/Logikpruefung, Abschlussbericht fuer den real verifizierten
// Ablauf) -- weiterhin derselbe bestehende globale Store, keine zweite
// Merkliste.
test('Merkliste-Zugang in der Ergebniszeile oeffnet die vorgeschaltete Sammlungsansicht (MerklisteFlow), nutzt den bestehenden globalen Store', () => {
  assert.match(source, /import \{ useAnfrageStore \} from ['"]@\/stores\/anfrageStore['"]/)
  assert.match(source, /import \{ MerklisteFlow \} from ['"]@\/components\/band\/MerklisteFlow['"]/)
  assert.match(source, /anfrageBands\.length > 0 &&/)
  assert.match(source, /<MerklisteFlow isOpen=\{merklisteOpen\} onClose=\{\(\) => setMerklisteOpen\(false\)\} \/>/)
})

test('BandCard wird mit showMerkButton aktiviert', () => {
  assert.match(source, /<BandCard key=\{band\.id\} band=\{band\} priority=\{index < 6\} showMerkButton \/>/)
})
