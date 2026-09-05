# Proudleut Hero — Bildwand-Spezifikation v3

**Stand:** 05.09.2026
**Zweck:** Nachbau der bestehenden Webflow-Hero-Bildwand (proudleut.com) im Next.js-Rebuild.
**Quelle:** Reverse Engineering im Webflow Designer + Chrome DevTools auf der Live-Seite.
**Status:** EINGEFROREN. Abschnitt 10 bleibt ein optionaler Verifikationspunkt und blockiert die Umsetzung nicht.

**Änderungen gegenüber v2:** Flex-Aufbau zurückgenommen, wieder Grid — Begründung in Abschnitt 3 und 5. Prozent-Semantik der Offsets korrigiert. Begründung für Abschnitt 10 neu gefasst. DoD in Code- und Daten-Anforderungen getrennt. Anschließend drei Formulierungskorrekturen (Hydration-Begründung, Mobile-Pool, DoD 2 Betrag).

---

## 1. Ausgangslage

Der bestehende Webflow-Hero transportiert die Vielfalt der Bands. Der Next.js-Hero bisher nicht.

Ursachen:

1. **Bildmenge.** Der Live-Hero arbeitet mit **40 Kacheln**. Der Next-Entwurf mit 12.
2. **Dichte statt Streuung.** Live: randlose Wand, 1rem-Fugen, harte Kanten, Bilder oben und unten angeschnitten. Next-Entwurf: gerundete Karten mit Schatten, große Abstände, leere dunkle Mitte. Die Bilder lesen dort als Dekoration am Rand statt als Substanz.
3. **Falscher Abdunkelungsansatz.** Im Next-Rebuild wurden radiale/elliptische Scrims mit 0.75-Decke gebaut. Live läuft eine **flache, gleichmäßige Fläche** bei 0.66. Ein radialer Verlauf über einer Kachelwand erzeugt eine sichtbare Kante und macht die Mitte zum Loch, also genau das Gegenteil des Ziels.

Die Arbeit an radialen Scrims wird verworfen.

---

## 2. Ermittelte Struktur (Webflow, Referenz)

```
section_header79 2                      position: relative
└─ padding-global 3                     Seitenpolsterung (gilt nur für Content)
   └─ header79_component                display: flex
      ├─ container-large 3              CONTENT
      │  display: block
      │  width: 100%
      │  max-width: 80rem
      │  margin-inline: auto
      │  padding: 0
      │  └─ padding-section-large       padding-block: 7rem
      │
      └─ header79_background-images 2   BILDWAND
         position: absolute
         inset: 0
         relative to: section_header79 2   ← zur Section, nicht zum Component
         z-index: 0
         overflow: hidden
         background: transparent
         │
         ├─ image-overlay-layer
         │  position: absolute
         │  inset: 0
         │  z-index: 1
         │  background: rgba(32, 32, 32, 0.66)
         │
         └─ header79_images-layout
            display: grid, grid-auto-flow: column
            gap: 1rem
            padding-inline: 1rem
            align: stretch / stretch
            │
            └─ 5 × header79_image-column       ← GRID-ITEMS
               display: flex, vertikal
               width: 100%, height: 100%
               gap: 1rem
               position: static
               margin-top: siehe Abschnitt 3
               │
               └─ 2 × header79_image-list      (Zwischenebene)
                  └─ 4 × header79_image-wrapper 2
                     position: relative
                     width: 100%, height: auto
                     padding-top: 120%          ← Ratio 5:6
                     │
                     └─ header79_image
                        position: absolute, inset: 0
                        width/height: 100%
                        object-fit: cover
```

**Kachelanzahl:** 5 × 2 × 4 = **40**. Im Webflow-Style-Panel bestätigt.

**Entscheidung zu `header79_image-list`:** Wird nicht nachgebaut. Die Ebene ist Webflow-Struktur; bei Grid-Span 1/1 ist sie funktional wirkungslos. Kein Rechercheauftrag, keine offene Frage.

---

## 3. Spaltenversatz

| Spalte | Webflow-Klasse | margin-top | entspricht Kachelhöhen |
|---|---|---|---|
| 1 | `image-column-1` | −20% | 0,167 |
| 2 | `image-column-2` | −50% | 0,417 |
| 3 | `image-column-3` | 0% | 0 |
| 4 | `image-column-4` | −30% | 0,250 |
| 5 | `image-column-5` | −20% | 0,167 |

### Warum die Prozentwerte kritisch sind

`header79_image-column` ist ein **Grid-Item**. Der Containing Block eines Grid-Items ist seine Grid-Area, also praktisch die Spaltenbreite. Prozentuale `margin-top`-Werte lösen gegen die Inline-Größe dieses Containing Blocks auf, hier also gegen die **Spaltenbreite** — nicht gegen die Breite der gesamten Wand.

Weil bei Ratio 5:6 gilt `Kachelhöhe = 1,2 × Spaltenbreite`, ist der Versatz in Kachelhöhen gemessen **auf allen Breakpoints identisch**. Margin und Kachelhöhe skalieren beide mit derselben Größe. Beispiel: −50% ÷ 1,2 = 0,417 Kachelhöhen, bei 5, 3 und 2 Spalten gleichermaßen.

### Konsequenz für die Umsetzung

Würde man die Spalten stattdessen als **Flex-Items** aufbauen, wäre der Containing Block der Flex-Container, also die **gesamte Wandbreite**. Dieselben Prozentwerte hätten dann eine völlig andere Wirkung: −50% wären bei 5 Spalten rund 2,1 Kachelhöhen statt 0,417, also Faktor fünf daneben.

**Die Spalten müssen Grid-Items bleiben.** Das ist keine Stilfrage, sondern Voraussetzung dafür, dass die gemessenen Werte ihre Bedeutung behalten. Siehe auch DoD-Punkt 2.

Kein Transform, keine ungleiche Kachelanzahl pro Spalte, keine vertikale Zentrierung.

---

## 4. Breakpoints

| Viewport | Sichtbare Spalten |
|---|---|
| ab 1280px (`xl`) | 1–5 |
| 768–1279px (`md`) | 1–3 |
| unter 768px | 1–2 |

Die Kachel-Ratio ist bei **allen** Breakpoints identisch: 5:6. Auf 1920, 1440, 1280, 1231, 820 und 667px geprüft.

---

## 5. Next.js-Umsetzung

### Grundprinzip

**Fünf feste Spalten mit je acht Kacheln in einem CSS-Grid. Überzählige Spalten werden per `display:none` ausgeblendet, nicht umgruppiert.**

`display:none`-Elemente erzeugen keine Boxen und sind keine Grid-Items. Bei `grid-cols-2` und drei ausgeblendeten Kindern bleiben also genau zwei Items für zwei Tracks. Kein Umbruch, und die verbleibenden Spalten behalten die Grid-Item-Semantik aus Abschnitt 3.

### Code

```jsx
const COLUMNS = [
  { offset: '-mt-[20%]', display: 'flex'           },
  { offset: '-mt-[50%]', display: 'flex'           },
  { offset: 'mt-0',      display: 'hidden md:flex' },
  { offset: '-mt-[30%]', display: 'hidden xl:flex' },
  { offset: '-mt-[20%]', display: 'hidden xl:flex' },
];

<section className="relative min-h-[100svh] overflow-hidden">
  {/* Content */}
  <div className="relative z-20 mx-auto w-full max-w-[80rem] px-4 py-28">
    {/* H1, Subline, Chips, CTA */}
  </div>

  {/* Bildwand */}
  <div className="absolute inset-0 z-0 overflow-hidden">
    <div className="absolute inset-0 z-10 bg-[rgba(32,32,32,0.66)]" />

    <div className="grid grid-cols-2 gap-4 px-4 md:grid-cols-3 xl:grid-cols-5">
      {COLUMNS.map((col, i) => (
        <div
          key={i}
          className={`${col.display} ${col.offset} min-w-0 flex-col gap-4`}
        >
          {slots.slice(i * 8, i * 8 + 8).map((img, j) => (
            <div key={`${i}-${j}`} className="relative aspect-[5/6]">
              <Image
                src={img.url}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width:767px) 50vw, (max-width:1279px) 33vw, 20vw"
                priority={i < 2 && j < 2}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
</section>
```

### Anmerkungen

- Die Spalten-Divs sind **direkte Kinder des Grids**. Wird später ein Wrapper dazwischengeschoben, ändert sich der Containing Block und die Offsets brechen. Das ist die empfindlichste Stelle des ganzen Bauteils.
- Die Spalte ist gleichzeitig Grid-Item und Flex-Container. Ihr eigenes `display:flex` ändert ihren Containing Block nicht.
- `gap-4` = 1rem, `px-4` = 1rem, beides aus Webflow übernommen.
- `aspect-[5/6]` ersetzt den Padding-top-Trick.
- `min-w-0` verhindert, dass Items über ihre Inhaltsbreite hinauswachsen.
- **Keine feste `vh`-Höhe.** `min-h-[100svh]`; überschreitet der Content diese Höhe, wächst die Section natürlich mit. Die absolute Bildwand füllt über `inset-0` immer die vollständige Sectionhöhe.
- `alt=""` ist korrekt: die Wand ist dekorativ und trägt keine Information, die nicht im Text steht.

---

## 6. Slot-Belegung und Duplikatlogik

### Entscheidung

Bilder dürfen mehrfach vorkommen. Durch die Spalten-Offsets sitzt dasselbe Bild nie auf derselben Höhe.

### Verfahren

1. Kuratierte Bilder in Admin-Sortierreihenfolge als Array der Länge N.
2. Zyklisch unverändert wiederholen bis 40 Slots: `slot[s] = pool[s mod N]`.
3. Spaltenweise aufteilen: Spalte *i* erhält Slots `i*8 … i*8+7`.

**Kein Shuffle, keine Rotation, keine Zufallslogik.**

### Garantien und Grenzen

**Innerhalb einer Spalte:** Bei N ≥ 8 kann in einem 8er-Block kein Bild doppelt vorkommen. Mathematisch gesichert.

**Zwischen Spalten:** Zwei Spalten werden vollständig identisch, wenn N ein Teiler von 8k ist (k = Spaltenabstand, 1–4). Für N ≥ 8 betrifft das **8, 12, 16, 24, 32**. Davon liegen 16 und 24 mitten im geplanten Bereich von 15–25 Bildern.

Diese Werte werden **nicht hart kodiert**. Stattdessen:

> Nach Erzeugung der fünf 8er-Spalten prüft der Admin, ob zwei vollständige Spalten dieselbe Bildfolge enthalten. Ist das der Fall, erscheint eine Warnung mit der Empfehlung, ein Bild hinzuzufügen oder zu entfernen.

Die Regel ist damit direkt auf das Ergebnis formuliert und bleibt gültig, falls Slotzahl oder Spaltenzahl später geändert werden.

### Serverseitig

Die Slot-Belegung wird **serverseitig** berechnet und als Prop übergeben. Es gibt keine clientseitige Zufalls-, Shuffle- oder zustandsabhängige Belegung. Dadurch bleibt das initial gerenderte Markup deterministisch.

### Entkopplung

Die Slotzahl ist unabhängig von der Bildmenge. Ob 15, 20 oder 28 Bilder freigegeben sind, die Wand füllt immer ihre 40 Plätze. Kein Höchstwert nötig, nur die Warnung unter 10 Bildern und die Spaltengleichheitsprüfung.

---

## 7. Bildpool und Admin

### Konzept

Nicht alle 142 Bands sollen im Hero erscheinen. Kuratierte Auswahl von grob 15–25 Bildern, gepflegt über einen Admin-Bereich, nicht über SQL.

### Datenmodell

Zwei Spalten auf der bestehenden Bild-Tabelle, keine neue Tabelle:

- `hero_wall` (boolean)
- `hero_wall_position` (int)

Empfohlen: `hero_focus` (enum `top` / `center` / `bottom`). Grund: `object-fit: cover` schneidet bei Querformat-Fotos in 5:6-Slots Gesichter ab. Mobil ist eine Kachel fast die halbe Bildschirmbreite, dort fällt das stark auf.

Migration nach 2A/2B-Muster (erst TEST, dann Produktion).

### Admin-Screen „Hero-Bilder"

- **Links:** alle Bandbilder als Grid, Bandname darunter, Filter nach Band und Bildtyp. Klick toggelt rein und raus.
- **Rechts:** ausgewählte Bilder als sortierbare Liste. Die Reihenfolge bestimmt die Slot-Belegung.
- **Mobile-Pool markieren:** Die ersten **16 Slots** (Spalten 1 und 2) bilden den mobil gerenderten Pool. Diese beiden 8er-Blöcke werden gekennzeichnet. Welche davon im initialen Viewport liegen, hängt von Offset und Gerätehöhe ab und wird nicht weiter aufgeschlüsselt.
- **Warnungen:** unter 10 Bildern; bei zwei identischen Spalten.
- **Live-Vorschau** des echten Heros inkl. Overlay und Text. Wichtigster Teil: Crop-Probleme werden sofort sichtbar.

---

## 8. Performance

- **`priority` nur für Bilder, die auf allen Breakpoints sichtbar sind.** Bilder in breakpointabhängig ausgeblendeten Spalten erhalten niemals `priority`, weil Preload dem Lazy-Verhalten direkt widerspricht. Konkret: nur frühe Slots aus Spalte 1 und 2.
- Alle übrigen Kacheln normal lazy.
- Nach heutigem Browserverhalten laden Chrome, Safari und Firefox `loading="lazy"`-Bilder nicht, wenn sie selbst oder ein Elternelement `display:none` sind. Das ist genau der gewünschte Effekt, **muss in der Implementierung aber im Netzwerk-Tab verifiziert werden** und nicht als gegeben angenommen.
- `sizes` korrekt setzen (siehe Abschnitt 5), sonst lädt Next zu große Varianten.
- Kein CLS-Risiko, weil jede Kachel über `aspect-[5/6]` eine feste Box hat.

---

## 9. Definition of Done

### Code

1. **Auf keinem Breakpoint brechen Hero-Spalten in eine zweite Zeile um. Es existieren visuell exakt 5 / 3 / 2 vertikale Bildspalten.**
2. **Die Spalten-Divs sind direkte Grid-Items** (kein Wrapper zwischen Grid und Spalte, kein Flex-Container als Elternelement). Prüfbar: Der **Betrag** des `margin-top` von Spalte 2 entspricht in DevTools rund 42% einer Kachelhöhe, nicht dem Mehrfachen davon.
3. Jede sichtbare Spalte enthält exakt 8 Kacheln.
4. Kein Bild kommt innerhalb einer Spalte doppelt vor.
5. **Der Admin erkennt zuverlässig vollständig identische 8er-Spalten und zeigt eine eindeutige Warnung.**
6. Der Overlay ist eine flache Fläche `rgba(32,32,32,0.66)`, kein Verlauf.
7. Die Section hat keine feste `vh`-Höhe; die Bildwand füllt immer die tatsächliche Sectionhöhe.
8. `priority` liegt auf keinem Bild einer ausgeblendeten Spalte. Im Netzwerk-Tab verifiziert: auf Mobile werden keine Bilder aus Spalte 3–5 geladen.
9. Die Slot-Belegung ist serverseitig berechnet. Keine clientseitige Zufalls-, Shuffle- oder zustandsabhängige Belegung.

### Daten

10. Für den produktiven Hero besteht keine Spaltengleichheits-Warnung.
11. Mindestens 10 kuratierte Bilder freigegeben.

---

## 10. Optionaler Verifikationspunkt

**Haben Tablet und Mobile in Webflow explizite Offset-Overrides?**

Nach der Analyse in Abschnitt 3 wären Overrides nicht nötig, weil die Prozentwerte im Grid bereits proportional zur jeweiligen Spaltenbreite skalieren. Die Erwartung ist also, dass keine gesetzt sind.

Prüfen lässt es sich in einer halben Minute: im Designer auf Tablet und Mobile umschalten, `header79_image-column` 1–3 anklicken, Margin-top vergleichen. Falls dort abweichende Werte stehen, werden sie übernommen und `COLUMNS` bekommt breakpointabhängige Offset-Klassen.

Das Risiko beim Auslassen ist gering und am fertigen Ergebnis beurteilbar.

**Ausdrücklich nicht Teil dieses Pakets:**

- **Anlass-spezifische Hero-Wände.** V1 arbeitet mit einem global kuratierten Pool. Eine spätere Anlass-Zuordnung wird bei tatsächlichem Bedarf separat modelliert, kein Vorgriff auf ein Schema.
- **Chips-Verhalten auf Mobile.** Eigenständige UX-Frage, unabhängig von der Bildwand.

---

## 11. Vorgehen

1. Spec einfrieren.
2. **Paket 1:** Migration (2–3 Spalten) + Admin-Bereich „Hero-Bilder".
3. **Paket 2:** Frontend-Hero. Kann zwischenzeitlich auf den bestehenden 12 Bildern laufen, es wird nur die Datenquelle getauscht.

Ein Design-Prototyp ist nicht nötig. Die Geometrie ist vollständig bestimmt, es handelt sich um ein Implementierungspaket.

---

## Anhang: Werte auf einen Blick

| Wert | |
|---|---|
| Kacheln gesamt | 40 |
| Kacheln pro Spalte | 8, auf allen Breakpoints |
| Kachel-Ratio | 5:6 |
| Spalten sichtbar | 5 / 3 / 2 |
| Breakpoints | `xl` 1280 / `md` 768 |
| Layout | CSS Grid, Spalten sind Grid-Items |
| Gap | 1rem (zwischen Spalten und innerhalb) |
| Padding Wand | 1rem inline |
| Overlay | `rgba(32, 32, 32, 0.66)`, flach, inset 0, z-index 1 |
| Content max-width | 80rem |
| Content padding-block | 7rem |
| Section min-height | `100svh`, keine feste Höhe |
| Offsets | −20% / −50% / 0% / −30% / −20% der **Spaltenbreite** |
| Offsets in Kachelhöhen | 0,167 / 0,417 / 0 / 0,250 / 0,167, breakpointunabhängig |
| object-fit | cover |
| Wand-Positionierung | absolute, inset 0, relativ zur Section, overflow hidden |
| Slot-Belegung | `pool[s mod N]`, serverseitig |
| Problematische N (≥8) | 8, 12, 16, 24, 32 — nicht kodiert, per Gleichheitsprüfung abgefangen |
