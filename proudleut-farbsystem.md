# proudleut.com — Semantisches Farbsystem

> Stand: Mai 2026 · Konzept, noch nicht implementiert
> Grundlage: Hybrid-Rhythmus (30% Bühne / 70% Feinkostladen)
> Brand-Farbe: #75518B (warmes Violett)

---

## CSS Custom Properties

```css
:root {
  /* ── Hintergrundflächen ── */
  --pl-bg-stage:          #12101a;  /* Bühne: Hero, Referenz-Events, Footer */
  --pl-bg-stage-elevated: #1e1a28;  /* Karten auf Bühnenfläche */
  --pl-bg-paper:          #f5f0e8;  /* Warmes Papier: Kategorien, Xandi, CTA */
  --pl-bg-canvas:         #f9f7f3;  /* Ruhige Leinwand: Prozess, FAQ, Testimonials */
  --pl-bg-elevated:       #fefdfb;  /* Cards auf hellem Grund (kein reines Weiß) */

  /* ── Textfarben (helle Flächen) ── */
  --pl-text-main:         #2a2226;  /* Haupttext. Warm-Schwarz, nie #000 */
  --pl-text-muted:        #6b5f65;  /* Subtitel, Beschreibungen. Warm-Grau */
  --pl-text-hint:         #84787e;  /* Meta-Infos, Bandanzahl, Timestamps */

  /* ── Textfarben (dunkle Flächen) ── */
  --pl-text-on-stage:       #ede8e3;  /* Haupttext auf Bühne. Warmes Offwhite */
  --pl-text-on-stage-muted: #8a7e84;  /* Subtexte auf Bühne */

  /* ── Textfarbe auf Akzent-Buttons ── */
  --pl-text-on-accent:    #fefdfb;  /* Text auf accent-Buttons. Kein reines #fff */

  /* ── Brand-Akzent ── */
  --pl-accent:            #75518B;  /* CTAs, aktive Links, Icons, Fokusringe */
  --pl-accent-hover:      #8a64a0;  /* Hover für Buttons */
  --pl-accent-link-hover: #5e3f72;  /* Hover für Text-Links auf hellem Grund */
  --pl-accent-subtle:     #f4f0f6;  /* Pills, Tags, Badges (Hintergrund) */
  --pl-accent-deep:       #5e3f72;  /* Text auf accent-subtle */
  --pl-accent-on-stage:   #c4a8d8;  /* Akzent auf dunklem Grund */

  /* ── Borders ── */
  --pl-border-soft:   rgba(117, 81, 139, 0.10);  /* Cards auf hellem Grund */
  --pl-border-medium: rgba(117, 81, 139, 0.20);  /* Hover, Divider, FAQ-Trennlinien */
  --pl-border-stage:  rgba(196, 168, 216, 0.15);  /* Cards/Elemente auf Bühnenfläche */

  /* ── Schatten (nur für Foto-Cards) ── */
  --pl-shadow-photo: 0 2px 8px rgba(42, 34, 38, 0.06);  /* Sehr subtil, warm */

  /* ── Bühnen-Gradienten ── */

  /* Hero: sehr dezenter violetter Hauch in der Mitte */
  --pl-gradient-stage: linear-gradient(180deg,
    #12101a 0%,
    #17122a 45%,
    #12101a 100%
  );

  /* Footer: leichtes Violett oben, verglimmt nach unten */
  --pl-gradient-footer: linear-gradient(180deg,
    #17122a 0%,
    #12101a 100%
  );

  /* Referenz-Events: Spotlight von unten, zurückhaltend */
  --pl-gradient-spotlight: radial-gradient(
    ellipse at 50% 100%,
    rgba(117, 81, 139, 0.12) 0%,
    transparent 60%
  );
}
```

---

## Tailwind-Mapping (tailwind.config.js)

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        'pl-stage':          '#12101a',
        'pl-stage-elevated': '#1e1a28',
        'pl-paper':          '#f5f0e8',
        'pl-canvas':         '#f9f7f3',
        'pl-elevated':       '#fefdfb',
        'pl-text':           '#2a2226',
        'pl-text-muted':     '#6b5f65',
        'pl-text-hint':      '#84787e',
        'pl-on-stage':       '#ede8e3',
        'pl-on-stage-muted': '#8a7e84',
        'pl-on-accent':      '#fefdfb',
        'pl-accent': {
          DEFAULT:      '#75518B',
          hover:        '#8a64a0',
          'link-hover': '#5e3f72',
          subtle:       '#f4f0f6',
          deep:         '#5e3f72',
          light:        '#c4a8d8',
        },
      },
      borderColor: {
        'pl-soft':   'rgba(117, 81, 139, 0.10)',
        'pl-medium': 'rgba(117, 81, 139, 0.20)',
        'pl-stage':  'rgba(196, 168, 216, 0.15)',
      },
      boxShadow: {
        'pl-photo': '0 2px 8px rgba(42, 34, 38, 0.06)',
      },
    },
  },
};
```

### Tailwind-Klassen in der Praxis

```
Bühnen-Section:       bg-pl-stage text-pl-on-stage
Card auf Bühne:       bg-pl-stage-elevated border-pl-stage
Warme Section:        bg-pl-paper text-pl-text
Funktionale Section:  bg-pl-canvas text-pl-text
Card auf Hell:        bg-pl-elevated border-pl-soft
Foto-Card auf Hell:   bg-pl-elevated border-pl-soft shadow-pl-photo
CTA-Button:           bg-pl-accent hover:bg-pl-accent-hover text-pl-on-accent
Pill/Badge:           bg-pl-accent-subtle text-pl-accent-deep
Text-Link (hell):     text-pl-accent hover:text-pl-accent-link-hover
Text-Link (dunkel):   text-pl-accent-light hover:text-pl-on-stage
```

---

## Section-Zuordnung (Homepage)

| # | Section              | Hintergrund          | Textfarbe           | Cards/Borders         | Rolle                     |
|---|----------------------|----------------------|---------------------|-----------------------|---------------------------|
| 1 | Hero + Mosaik + Logos | `bg-stage` + `gradient-stage` | `text-on-stage`, `accent-on-stage` | — | Emotion, Wow, Vertrauen |
| 2 | Veranstaltungstypen  | `bg-paper`           | `text-main`, `text-muted` | `bg-elevated` + `border-soft` + `shadow-photo` | Einstieg ins Stöbern |
| 3 | So funktioniert's    | `bg-canvas`          | `text-main`, `text-muted` | — | Orientierung, Klarheit |
| 4 | Referenz-Events      | `bg-stage` + `gradient-spotlight` | `text-on-stage` | `bg-stage-elevated` + `border-stage` | Dunkle Insel, Bühnengefühl |
| 5 | Xandi persönlich     | `bg-paper`           | `text-main`, `text-muted` | — | Vertrauen, Wärme, Gesicht |
| 6 | Testimonials         | `bg-canvas`          | `text-main`, `text-muted` | `bg-elevated` + `border-soft` | Sachlich, glaubwürdig |
| 7 | FAQ                  | `bg-canvas`          | `text-main`         | `border-medium` (Divider) | Funktional, SEO |
| 8 | Abschluss-CTA        | `bg-paper`           | `text-main`, `accent` (CTA) | — | Einladend, warm |
| 9 | Footer               | `bg-stage` + `gradient-footer` | `text-on-stage-muted`, `accent-on-stage` | `border-stage` | Ruhiger Abschluss |

---

## Entscheidungsregeln

### Drei Fragen vor jeder Section

1. **Fühlen?** → `bg-stage` (Bühne) — max. 2× pro Seite
2. **Vertrauen?** → `bg-paper` (Papier) — warm, persönlich
3. **Verstehen?** → `bg-canvas` (Leinwand) — ruhig, funktional

### Verbote

- **Kein `#000000`** und **kein `#ffffff`** nirgendwo — auch nicht als Textfarbe auf Buttons (dafür: `text-on-accent`)
- **Kein Accent als Flächenfarbe** — einzige Ausnahme: CTA-Buttons
- **Max. 2 Bühnen-Sections** pro Seite (Hero + eine Insel)
- **Keine Gradienten** auf hellen Sections
- **Accent nie als große Textfarbe** — nur Links, CTAs, kleine Labels

### Schatten-Regel

Keine starken SaaS-Shadows (`shadow-md`, `shadow-lg`). Schatten nur bei Foto-Cards erlaubt, wenn die Card sonst zu flach wirkt. Dafür `shadow-pl-photo` verwenden — sehr subtil, warm getönt. Reine Text-Cards (Testimonials, FAQ) bekommen keinen Schatten, nur `border-soft`.

### Akzent-Einsatz

| Kontext | Verwendung |
|---------|------------|
| CTA-Button | `bg-pl-accent hover:bg-pl-accent-hover text-pl-on-accent` |
| Text-Link (hell) | `text-pl-accent hover:text-pl-accent-link-hover` |
| Text-Link (dunkel) | `text-pl-accent-light hover:text-pl-on-stage` |
| Pill / Badge | `bg-pl-accent-subtle text-pl-accent-deep` |
| Icon | `text-pl-accent` (16–20px) |
| Fokusring | `ring-2 ring-pl-accent ring-offset-2` |
| Card-Hover | `hover:border-pl-medium` (von `border-soft` zu `border-medium`) |
| Gradient-Schimmer (Bühne) | Nur über CSS-Gradient, nie als flat fill |

### Hover-Verhalten: Buttons vs. Links

| Element | Hover-Richtung | Grund |
|---------|---------------|-------|
| Button (`bg-accent`) | Heller → `#8a64a0` | Einladend, öffnend |
| Text-Link (hell) | Dunkler → `#5e3f72` | Zielstrebig, klar, besserer Kontrast |
| Text-Link (dunkel) | Heller → `text-on-stage` | Sichtbarkeit auf Bühne |

### Gradienten-Einsatz

| Gradient | Wo | Intensität | Wie |
|----------|----|-----------|-----|
| `gradient-stage` | Hero-Section | Sehr dezent | Hinter dem Mosaik. Der Mittelwert `#17122a` liegt bewusst nah an `#12101a` — der violette Schimmer soll wie Bühnenlicht wirken, nicht wie eine lila Fläche. Bei Fotos darüber kaum sichtbar — genau richtig. |
| `gradient-footer` | Footer | Dezent | Violett oben, verglimmt nach unten. Abschluss-Vorhang. |
| `gradient-spotlight` | Referenz-Events | Zurückhaltend | Als Overlay über `bg-stage`. Wie ein Spot, der von unten auf die Cards fällt. Opacity 0.12, nicht mehr. |

Gradienten sind **immer Hintergrund**, nie auf Text, nie auf Cards, nie auf hellen Flächen.

---

## Kontrast-Check (WCAG AA)

| Kombination | Kontrastverhältnis | Status |
|-------------|-------------------|--------|
| `text-main` (#2a2226) auf `bg-paper` (#f5f0e8) | ~12.5:1 | ✓ AAA |
| `text-main` (#2a2226) auf `bg-canvas` (#f9f7f3) | ~13.2:1 | ✓ AAA |
| `text-muted` (#6b5f65) auf `bg-paper` (#f5f0e8) | ~5.2:1 | ✓ AA |
| `text-hint` (#84787e) auf `bg-canvas` (#f9f7f3) | ~4.5:1 | ✓ AA |
| `text-on-stage` (#ede8e3) auf `bg-stage` (#12101a) | ~14.8:1 | ✓ AAA |
| `text-on-stage-muted` (#8a7e84) auf `bg-stage` (#12101a) | ~5.4:1 | ✓ AA |
| `accent` (#75518B) auf `bg-paper` (#f5f0e8) | ~4.6:1 | ✓ AA |
| `text-on-accent` (#fefdfb) auf `accent` (#75518B) | ~5.1:1 | ✓ AA |
| `accent-link-hover` (#5e3f72) auf `bg-paper` (#f5f0e8) | ~6.8:1 | ✓ AA |

---

## Farbphilosophie

> **proudleut ist kein SaaS-Tool, kein Jobportal, kein Template.**
>
> proudleut ist ein Feinkostladen mit Bühne.
>
> Die Farben sollen sich anfühlen wie: gutes Papier, warmes Licht,
> und ab und zu ein Blick durch eine offene Tür auf eine Bühne,
> auf der gerade etwas Besonderes passiert.
>
> 30% Bühne. 70% Feinkostladen.
