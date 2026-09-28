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
    /rounded-xl overflow-hidden border text-left[\s\S]*?focus:outline-none focus-visible:outline-2\s*\r?\n\s*focus-visible:outline-offset-2 focus-visible:outline-\[var\(--pl-accent\)\]/
  );
})

// Auftrag "Kacheln druecken sich wie Bands entdecken": haptisches
// Press-Feedback fuer die Themen-Kacheln, in der Staerke an die
// grossflaechigen Kacheln angepasst (active:scale-[0.98] statt des
// Buttons active:scale-95, siehe components/Header.tsx CTA).
test('Themen-Kachel: Hover hebt minimal an (motion-safe) + staerkerer Schatten (nur Desktop)', () => {
  assert.match(source, /motion-safe:md:hover:-translate-y-0\.5 md:hover:shadow-md/)
})

test('Themen-Kachel: Active/Tap sinkt leicht ein (motion-safe:scale-[0.98], angepasst an die Buttonstaerke 0.95) + kleinerer Schatten -- wirkt auch ohne vorherigen Hover (mobile Tap)', () => {
  assert.match(source, /motion-safe:active:scale-\[0\.98\] active:shadow-sm/)
})

test('Themen-Kachel: md:active:shadow-sm zusaetzlich zum einfachen active:shadow-sm, damit der Schatten auch bei einem echten Desktop-Klick (gleichzeitig :hover UND :active) kleiner wird -- sonst gewinnt md:hover:shadow-md den Kaskadenkonflikt (per getComputedStyle verifiziert)', () => {
  assert.match(source, /motion-safe:active:scale-\[0\.98\] active:shadow-sm md:active:shadow-sm/)
})

test('Themen-Kachel: prefers-reduced-motion unterbindet nicht nur die Animation, sondern auch die Bewegung selbst (motion-safe: steht direkt vor -translate-y/scale, nicht nur vor transition) -- Codex-Review-Fund PR #133', () => {
  assert.match(source, /motion-safe:md:hover:-translate-y-0\.5/)
  assert.match(source, /motion-safe:active:scale-\[0\.98\]/)
  assert.match(source, /motion-safe:md:group-hover:scale-105/)
})

test('Themen-Kachel: sanfte Transition (~150ms, ease-out) deckt Transform UND Schatten/Farben ab (motion-safe:transition, nicht nur -colors/-transform)', () => {
  assert.match(source, /motion-safe:transition motion-safe:duration-150 motion-safe:ease-out/)
})

test('Themen-Kachel: kein blauer Tap-Highlight-Kasten auf mobilen Browsern', () => {
  assert.match(source, /\[-webkit-tap-highlight-color:transparent\]/)
})

test('Themen-Kachel-Bild zoomt beim Hover leicht (group-hover, nur Desktop), Bildflaeche bleibt overflow-hidden', () => {
  assert.match(source, /relative block w-full h-20 md:h-24 overflow-hidden shrink-0 bg-pl-stage/)
  assert.match(source, /object-cover motion-safe:md:group-hover:scale-105 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out/)
})

test('Themen-Kachel traegt group-Klasse, damit nur das eigene Bild auf den eigenen Hover reagiert (kein Leck auf Nachbarkacheln)', () => {
  assert.match(source, /className=\{`group flex flex-col rounded-xl overflow-hidden border text-left/)
})

test('prefers-reduced-motion: alle neuen Bewegungs-Utilities stehen hinter motion-safe:, kein manueller motion-reduce:-Override noetig', () => {
  const tileBlockStart = source.indexOf('group flex flex-col rounded-xl overflow-hidden border text-left')
  const tileBlockEnd = source.indexOf('</Link>', tileBlockStart)
  const tileBlock = source.slice(tileBlockStart, tileBlockEnd)
  assert.doesNotMatch(tileBlock, /(?<!motion-safe:)\btransition(?:-transform|-colors)?\b(?!-)/, 'jede transition-* Utility im Kachelblock muss motion-safe: vorangestellt sein')
})

test('ausgewaehlter Zustand (theme.active: Rahmen/Flaeche/Haekchen) bleibt von den neuen Press-Klassen unberuehrt', () => {
  const activeIdx = source.indexOf("border-pl-accent bg-[color-mix")
  assert.ok(activeIdx > 0)
  assert.doesNotMatch(source.slice(activeIdx, activeIdx + 60), /scale-|translate-y|shadow-/, 'die Auswahl-Klassen selbst duerfen keine der neuen Press-/Hover-Werte enthalten -- die gelten unveraendert zusaetzlich fuer beide Zustaende')
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
