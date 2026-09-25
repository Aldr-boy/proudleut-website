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
  assert.match(source, /import \{ resolveBandFinderThemeNav \} from ['"]@\/lib\/bands\/bandFinderThemes['"]/)
  assert.match(source, /resolveBandFinderThemeNav\(\s*\r?\n\s*lockedOccasion,\s*\r?\n\s*selectedCategory,/)
})

test('Themen-Grid: 2 Spalten mobil, 3 Spalten Desktop (Standard-Tailwind-Grid)', () => {
  assert.match(source, /grid grid-cols-2 md:grid-cols-3/)
})

test('Themen-Links sind echte next/link-Links mit aria-current, kein reines onClick', () => {
  assert.match(source, /import Link from ['"]next\/link['"]/)
  assert.match(source, /<Link\s*\r?\n\s*key=\{theme\.key\}\s*\r?\n\s*href=\{theme\.href\}\s*\r?\n\s*aria-current=\{theme\.active \? 'page' : undefined\}/)
})

test('Schriftgewicht der Themen-Labels ist in jedem Zustand unbedingt font-semibold (kein Wechsel ueber theme.active) -- verhindert Layout-Shift/Umbruchaenderung bei den beiden langen Labels', () => {
  assert.match(source, /<span className=\{`text-sm font-semibold leading-snug \$\{theme\.active/)
})

// Aktualisiert fuer "Anlass-Kacheln Variante 1c" (grosses Bild oben, eigene
// helle Beschriftungsflaeche darunter): Auswahl-Erkennbarkeit (Rahmen +
// getoente Flaeche + Haekchen) und sichtbarer Tastaturfokus bleiben
// dieselben Anforderungen wie zuvor, nur auf die neuen Klassen/Werte
// aktualisiert -- die vorherige einzeilige Kachel (border-transparent /
// hover:bg-black) existiert nicht mehr.
test('aktive Themen-Kachel bleibt durch Rahmen und getoente Flaeche vom neutralen/Hover-Zustand unterscheidbar', () => {
  assert.match(source, /theme\.active\s*\r?\n\s*\? 'border-pl-accent bg-\[color-mix/);
  assert.match(source, /: 'border-pl-soft bg-pl-elevated md:hover:border-pl-accent\/50'/);
  assert.match(source, /\{theme\.active && \(\s*<svg[\s\S]*?aria-hidden="true"/);
})

test('Tastaturfokus der Themen-Kachel bleibt sichtbar (focus-visible-Outline auf dem Link)', () => {
  assert.match(
    source,
    /rounded-xl overflow-hidden border text-left\s*\r?\n\s*motion-safe:transition-colors focus:outline-none focus-visible:outline-2\s*\r?\n\s*focus-visible:outline-offset-2 focus-visible:outline-\[var\(--pl-accent\)\]/
  );
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
