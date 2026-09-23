import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die neue Split-Hero-Komponente
// (Auftrag "Startseiten-Hero-Redesign"). Es gibt in diesem Repo keine
// React-Testing-Infrastruktur (kein jsdom, keine @testing-library-
// Abhaengigkeit) -- die echte Quelldatei wird per readFileSync gelesen
// und strukturell geprueft, identisches Muster wie die uebrigen
// *Structure.test.ts-Dateien in diesem Repo. Der reale interaktive/
// visuelle Ablauf (Rotation, Pendeln, Pause, Breakpoints) wurde per
// Browser verifiziert (siehe Abschlussbericht) -- hier nur strukturelle
// Absicherung der Kernmechanik.
const sourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'HeroWall.tsx')
const source = readFileSync(sourcePath, 'utf8')

test('Section: relative, overflow-hidden, bg-pl-stage -- keine feste vh-Hoehe auf der Section selbst', () => {
  const sectionStart = source.indexOf('<section')
  const sectionEnd = source.indexOf('>', sectionStart)
  const sectionTag = source.slice(sectionStart, sectionEnd)
  assert.match(sectionTag, /\brelative\b/)
  assert.match(sectionTag, /overflow-hidden/)
  assert.match(sectionTag, /bg-pl-stage/)
  assert.doesNotMatch(sectionTag, /\bh-\[/, 'keine feste Hoehe auf der Section erlaubt')
  assert.doesNotMatch(sectionTag, /\bh-screen\b/)
})

test('xl:min-h-[...100svh...] sitzt auf der Flex-Zeile (waechst mit Inhalt/Textvergroesserung, keine Deckel-Hoehe) -- erst ab Desktop erzwungen, Tablet bleibt inhaltsbestimmt ohne kuenstliche Leerflaeche', () => {
  // Review-Fix #1 (PR #107): der svh-Wert steckt jetzt in einem
  // max(<svh>, var(--pl-hero-content-min-h)) -- die Zeile darf ueber den
  // svh-Wert HINAUSWACHSEN, wenn der Inhalt mehr Platz braucht, aber der
  // svh-Wert selbst (68/80/100) bleibt je Breakpoint unveraendert.
  assert.match(source, /xl:min-h-\[max\(100svh,var\(--pl-hero-content-min-h,0px\)\)\]/)
  assert.doesNotMatch(source, /\bmd:min-h-\[max\(100svh/, 'volle Viewporthoehe darf nicht schon ab Tablet erzwungen werden (Leerflaechen-Risiko bei weniger Tracks)')
  assert.doesNotMatch(source, /max-h-\[100svh\]/, 'keine Hoehenbegrenzung nach oben auf der Hero-Section')
})

test('Textflaeche steht im Dokumentfluss vor der Bilderwelt (Mobile: Text zuerst, danach Bilder)', () => {
  const textIdx = source.indexOf('{children}')
  const wallIdx = source.indexOf('<HeroImageWall')
  assert.ok(textIdx >= 0 && wallIdx >= 0, 'Text- oder Bildwelt-Marker nicht gefunden')
  assert.ok(textIdx < wallIdx, 'children (HeroContent) muss vor HeroImageWall im JSX stehen')
})

// Nachgang "Komposition & weiche Übergänge": Text und Bildwelt sind ab md
// bewusst zwei sich überlappende absolute Ebenen in einem gemeinsamen
// Szenencontainer (löst die harte Flex-Spalten-Kante ab) -- auf Mobile
// bleibt die Bildwelt weiterhin ein normaler Flow-Block ohne jede
// absolute/fixed Positionierung (unpräfigierte Basisklassen).
test('Bilderwelt-Wrapper: auf Mobile normaler Flow-Block mit eigener Mindesthoehe (kein unpräfigiertes absolute/fixed), ab md bewusst absolute (überlappende Ebene)', () => {
  const wallWrapperMatch = source.match(/<div className="relative order-1 md:order-none w-full min-h-\[42svh\][^"]*">/)
  assert.ok(wallWrapperMatch, 'Bilderwelt-Wrapper-Div nicht gefunden')
  const classes = wallWrapperMatch[0]
  assert.match(classes, /min-h-\[42svh\]/, 'Bilderwelt braucht eine eigene Mindesthoehe auf Mobile (Dokumentfluss statt fester Position)')
  // Keine UNPRAEFIGIERTE (Mobile-wirksame) absolute/fixed-Klasse.
  assert.doesNotMatch(classes, /(^|\s)absolute\b|(^|\s)fixed\b/)
  // Ab md bewusst absolute -- Kernbestandteil der Ueberlappungs-/Gradient-Loesung.
  assert.match(classes, /md:absolute/)
  assert.match(classes, /md:inset-y-0/)
  // Nachbesserung "Feinschliff Bandzeile": auf Mobile per CSS `order`
  // VOR der Textflaeche (Mosaik oben, Text darunter), ab md wirkungslos.
  assert.match(classes, /order-1/)
  assert.match(classes, /md:order-none/)
})

test('children (HeroContent) wird unveraendert als Slot eingehaengt -- HeroWall selbst rendert keinen eigenen Text', () => {
  assert.match(source, /\{children\}/)
  assert.doesNotMatch(source, /Livebands für|Bands entdecken/, 'HeroWall darf keinen eigenen Hero-Text enthalten -- das ist Aufgabe von HeroContent')
})

test('Bildplatz-Zuordnung nutzt ausschliesslich die gemeinsame Komposition (buildHeroWallTracks) -- keine zweite Implementierung', () => {
  assert.match(source, /import \{[^}]*buildHeroWallTracks[^}]*\} from '@\/lib\/heroWall\/heroWallComposition'/)
  assert.match(source, /buildHeroWallTracks\(images, breakpoint\)/)
  assert.doesNotMatch(source, /Math\.random\(\)|\.shuffle\(|sort\(\(\) =>/i, 'keine Zufalls-/Shuffle-Logik erlaubt')
  assert.doesNotMatch(source, /% pool\.length|% images\.length/, 'kein Modulo-Wrap mehr -- das war die abgeloeste Logik')
})

test('alle vier Breakpoint-Kompositionen werden serverseitig gerendert und ausschliesslich per CSS ein-/ausgeblendet, keine clientseitige Breitenermittlung', () => {
  for (const bp of ['mobile', 'tablet', 'tabletWide', 'desktop']) {
    assert.match(source, new RegExp(`<TrackSet images=\\{images\\} breakpoint="${bp}"`), `TrackSet fuer Breakpoint "${bp}" nicht gefunden`)
  }
  assert.doesNotMatch(source, /window\.innerWidth|matchMedia|useMediaQuery/, 'keine clientseitige Viewport-Ermittlung erlaubt')
})

test('hero_focus: NULL -> center ueber resolveHeroFocus, alle drei Werte auf object-position-Klassen abgebildet', () => {
  assert.match(source, /import \{ resolveHeroFocus \} from '@\/lib\/heroWall\/resolveHeroFocus'/)
  assert.match(source, /resolveHeroFocus\(slot\.image\.heroFocus\)/)
  assert.match(source, /'top'.*'object-top'/)
  assert.match(source, /'object-bottom'/)
  assert.match(source, /'object-center'/)
})

test('fehlendes Poolbild (Platzhalter) zeigt einen erkennbaren, aber nicht poetischen Hinweistext -- kein Bildduplikat, kein Fehler', () => {
  assert.match(source, /function PlaceholderTile/)
  assert.match(source, /Motiv fehlt/)
  assert.match(source, /if \(!slot\.image\) return <PlaceholderTile/)
})

test('Rotation der gesamten Bildwand sitzt auf einem eigenen Vorfahren-Element, getrennt von der Pendel-Bewegung pro Track', () => {
  const rotateMatch = source.match(/transform: 'rotate\(-6deg\)'/)
  assert.ok(rotateMatch, 'Rotation nicht gefunden')
  // Die Pendel-Klasse (pl-hero-float) darf nicht auf demselben Element wie die Rotation sitzen.
  const rotateLineStart = source.lastIndexOf('<div', source.indexOf("transform: 'rotate(-6deg)'"))
  const rotateLineEnd = source.indexOf('>', source.indexOf("transform: 'rotate(-6deg)'"))
  const rotateTag = source.slice(rotateLineStart, rotateLineEnd)
  assert.doesNotMatch(rotateTag, /pl-hero-float/)
  assert.match(source, /pl-hero-float/, 'Pendel-Klasse muss an anderer Stelle (pro Track) vorkommen')
})

test('Pause-Button: aria-pressed, verstaendlicher aria-label, steuert data-hero-wall-paused', () => {
  assert.match(source, /aria-pressed=\{paused\}/)
  // Nachgang "Hero-Logozeile": Pause-Button steuert jetzt zusaetzlich die
  // Logozeile (dieselbe Instanz, kein zweiter Regler) -- aria-label
  // benennt beide Bewegungen.
  assert.match(source, /aria-label=\{paused \? 'Bewegung der Bildwand und Logozeile fortsetzen' : 'Bewegung der Bildwand und Logozeile pausieren'\}/)
  assert.match(source, /data-hero-wall-paused=\{paused\}/)
  // Nachbesserung "Feinschliff Bandzeile Runde 2": onClick sitzt jetzt in
  // der geteilten PauseButton-Funktion (onClick={onToggle}), beide
  // Renderstellen reichen denselben Toggle-Handler als `onToggle` durch.
  assert.match(source, /onClick=\{onToggle\}/)
  assert.match(source, /onToggle=\{\(\) => setPaused\(\(p\) => !p\)\}/g)
  const toggleCount = source.match(/onToggle=\{\(\) => setPaused\(\(p\) => !p\)\}/g) ?? []
  assert.equal(toggleCount.length, 2, 'beide Pause-Button-Instanzen (Mobile auf dem Mosaik, ab md am Szenencontainer) muessen denselben Toggle-Handler bekommen')
})

test('Pause-Button ist per Tastatur erreichbar (<button>) und hat sichtbaren Fokus (focus-visible:ring)', () => {
  const buttonStart = source.indexOf('aria-pressed={paused}')
  const buttonTagStart = source.lastIndexOf('<button', buttonStart)
  assert.ok(buttonTagStart >= 0)
  assert.match(source.slice(buttonTagStart, buttonStart + 600), /focus-visible:ring-2/)
})

test('next/image: preload nur gezielt (reale LCP-Messung: Bildkachel ab Tablet, H1 auf Mobile), lazy fuer alle uebrigen Kacheln', () => {
  assert.match(source, /preload=\{breakpoint !== 'mobile' && t < 2 && p === 0\}/)
  assert.match(source, /loading=\{preload \? undefined : 'lazy'\}/)
})

test('kein pauschales overflow-x:hidden auf body/html -- Clipping bleibt lokal am Szenencontainer gekapselt', () => {
  assert.doesNotMatch(source, /document\.body|document\.documentElement/)
})

// ── Nachgang "Komposition & weiche Übergänge" ──────────────────────────

test('Textfläche: ab md eine eigene absolute Ebene links, unabhängig von der Bildwelt-Position (löst die harte Flex-Spalten-Kante ab)', () => {
  const textDivMatch = source.match(/<div className="relative z-20 order-2 md:order-none w-full md:absolute[^"]*">/)
  assert.ok(textDivMatch, 'Text-Ebene mit md:absolute nicht gefunden')
  // Nachbesserung "Feinschliff Bandzeile": auf Mobile per CSS `order`
  // NACH der Bildwelt (Mosaik oben, Text darunter), ab md wirkungslos.
  assert.match(textDivMatch[0], /order-2/)
  assert.match(textDivMatch[0], /md:order-none/)
  // Nachgang "Hero-Logozeile": statt voller Hoehe (md:inset-y-0) reserviert
  // die Textflaeche jetzt bewusst NICHT den unteren Streifen (md:bottom-14
  // = 56px = Hoehe von HeroLogoMarquee), damit die vertikal zentrierte
  // Textflaeche die Logozeile auf keinem Viewport ueberlappen kann.
  assert.match(textDivMatch[0], /md:top-0/)
  assert.match(textDivMatch[0], /md:bottom-14/)
  assert.doesNotMatch(textDivMatch[0], /md:inset-y-0/, 'volle Hoehe wuerde mit der Logozeile kollidieren')
  assert.match(textDivMatch[0], /md:left-0/)
})

test('Gradient-Ebene: ungedreht, über der Bildwelt und unter dem Text (z-10), pointer-events-none, nur ab md aktiv', () => {
  const start = source.indexOf('function GradientOverlay')
  assert.ok(start >= 0, 'GradientOverlay nicht gefunden')
  const body = source.slice(start, start + 900)
  assert.match(body, /pointer-events-none/)
  assert.match(body, /absolute inset-0 z-10/)
  assert.match(body, /hidden md:block/, 'Gradient darf Mobile nicht abdecken (dort keine seitliche Kante zu kaschieren)')
  assert.doesNotMatch(body, /rotate/, 'Verlaufsebene darf nicht mitrotieren')
})

test('Gradient-Farben aus dem vorhandenen --pl-bg-stage abgeleitet (rgb 18,16,26), nicht die Studio-Originalfarbe #281e2c', () => {
  assert.match(source, /rgba\(18,16,26,/)
  // Gezielt nur die tatsaechlichen Gradient-Style-Bloecke pruefen (nicht
  // den gesamten Dateitext) -- ein erklaerender Kommentar darf legitim
  // die verbotene Farbe *nennen* ("NICHT #281e2c uebernehmen"), ohne dass
  // das als tatsaechliche Verwendung zaehlt.
  const gradientStart = source.indexOf('function GradientOverlay')
  const gradientEnd = source.indexOf('function HeroImageWall')
  const gradientBlock = source.slice(gradientStart, gradientEnd)
  assert.doesNotMatch(gradientBlock, /background:[\s\S]*#281e2c/i, 'Studio-Originalfarbe darf im tatsaechlichen Gradient-Wert nicht vorkommen')
})

test('Mobile-Randauslauf (MobileEdgeFade) ist das Gegenstück zur Gradient-Ebene -- nur unterhalb md aktiv, ebenfalls pointer-events-none', () => {
  const start = source.indexOf('function MobileEdgeFade')
  assert.ok(start >= 0, 'MobileEdgeFade nicht gefunden')
  const body = source.slice(start, start + 500)
  assert.match(body, /pointer-events-none/)
  assert.match(body, /md:hidden/)
})

test('Rotationscontainer: transform-origin 50% 60% (verifizierter Studio-Referenzwert)', () => {
  assert.match(source, /transformOrigin: '50% 60%'/)
})

test('Bildwelt hat ab md kein eigenes overflow-hidden mehr -- Clipping nur am äußeren Szenencontainer (Auftrag Abschnitt 2A)', () => {
  const start = source.indexOf('function HeroImageWall')
  const body = source.slice(start, start + 1200)
  assert.match(body, /overflow-hidden md:overflow-visible/)
})

test('sechs Seitenverhältnisse (reale Studio-Referenzwerte) statt vier -- sichtbar mehr Formatvielfalt', () => {
  const start = source.indexOf('const ASPECT_BY_POSITION = [')
  const end = source.indexOf('\n]', start)
  const arrBlock = source.slice(start, end)
  const entries = arrBlock.match(/aspect-\[/g) ?? []
  assert.equal(entries.length, 6)
})

test('Pause-Button: EINE gemeinsame Implementierung (PauseButton), unabhängig von der Anzahl sichtbarer Breakpoint-Ebenen', () => {
  const buttonMatches = source.match(/aria-pressed=\{paused\}/g) ?? []
  assert.equal(buttonMatches.length, 1, 'erwartet genau eine Pause-Button-Implementierung (geteilte Funktion), unabhängig von der Anzahl sichtbarer Breakpoint-Ebenen')
  assert.match(source, /function PauseButton\(/)
  assert.match(source, /const \[paused, setPaused\] = useState\(false\)/)
})

// Nachbesserung "Feinschliff Bandzeile Runde 2", Abschnitt 2: Der
// Pause-Button stand auf Mobile bisher am Szenencontainer, direkt neben
// CTA/Logozeile. Jetzt zwei Renderstellen derselben PauseButton-Funktion
// -- je eine per CSS-Breakpoint sichtbar, nie beide gleichzeitig --,
// Zustand/Handler/Label bleiben aus EINER Quelle.
test('Pause-Button: Mobile-Instanz auf dem Mosaik (oberhalb des dunklen Auslaufs), ab md unveraendert am Szenencontainer -- nie beide gleichzeitig sichtbar', () => {
  const mobileClassName = 'absolute top-[32%] right-4 z-30 flex md:hidden'
  const desktopClassName = 'absolute bottom-20 right-4 z-30 hidden md:flex'
  const mobileIdx = source.indexOf(mobileClassName)
  const desktopIdx = source.indexOf(desktopClassName)
  assert.ok(mobileIdx >= 0, 'Mobile-Pause-Button (auf dem Mosaik, ab md ausgeblendet) nicht gefunden')
  assert.ok(desktopIdx >= 0, 'Desktop-Pause-Button (unveraenderte Position, auf Mobile ausgeblendet) nicht gefunden')
  // Beide Positionsklassen muessen tatsaechlich an einer <PauseButton
  // .../>-Stelle haengen, nicht irgendwo sonst im Text vorkommen.
  assert.match(source.slice(Math.max(0, mobileIdx - 200), mobileIdx), /<PauseButton/)
  assert.match(source.slice(Math.max(0, desktopIdx - 200), desktopIdx), /<PauseButton/)
  // Die Mobile-Instanz ist Kind der Bildspalte (siehe MobileEdgeFade-Kind-
  // Kommentar) -- `top-[32%]` bezieht sich dadurch auf deren tatsaechliche
  // Hoehe, nicht auf den ganzen Szenencontainer. Die Desktop-Instanz bleibt
  // danach, am Szenencontainer verankert.
  const imageColumnStart = source.indexOf('<HeroImageWall')
  assert.ok(mobileIdx > imageColumnStart, 'Mobile-Pause-Button muss Kind der Bildspalte sein')
  assert.ok(desktopIdx > mobileIdx, 'Desktop-Instanz bleibt danach, am Szenencontainer verankert')
})

// Regressionsschutz fuer einen real aufgetretenen Bug: die PauseButton-
// Funktion setzte zuvor selbst ein unbedingtes `inline-flex`, das mit
// dem unbedingten `hidden` einer Aufrufstelle um dieselbe display-
// Eigenschaft konkurrierte -- mit von der Tailwind-internen Utility-
// Reihenfolge abhaengigem Ausgang (real beobachtet: Desktop-Instanz
// blieb dadurch auch auf Mobile sichtbar). Jede Aufrufstelle muss die
// display-Utility deshalb selbst und vollstaendig mitbringen.
test('PauseButton setzt selbst kein unbedingtes flex/inline-flex -- display kommt ausschliesslich von der Aufrufstelle', () => {
  const start = source.indexOf('function PauseButton(')
  const end = source.indexOf('\n}', source.indexOf('return (', start))
  const body = source.slice(start, end)
  assert.doesNotMatch(body, /className=\{`(?:(?!\$\{className\})[\s\S])*\b(?:inline-flex|flex)\b/, 'PauseButton darf display nur ueber die uebergebene className setzen')
})
