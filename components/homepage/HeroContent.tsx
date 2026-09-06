import Link from 'next/link'

// Hero-Content-Layer fuer die neue Hero-Bildwand (Paket 2, SCHRITT 2D).
// Text/Claim/CTA 1:1 aus der bisherigen HeroMosaic-Integration
// (components/homepage/HeroMosaic.tsx) uebernommen -- keine neuen
// Wording-Experimente, keine neue Struktur. Wird als children in
// HeroWall eingehaengt, deren eigener Content-Layer (relative z-20,
// max-w-[80rem], px-4, py-28) Position/Breite/Z-Index bereits vorgibt --
// hier ausschliesslich der reine Text-/Button-Inhalt, einmal (nicht mehr
// separat fuer Desktop/Mobil), da HeroWalls Content-Layer bereits
// breakpoint-uebergreifend einheitlich ist.
const ANLASS_PILLS: { label: string; href: string }[] = [
  { label: 'Hochzeit', href: '/veranstaltung/hochzeit' },
  { label: 'Firmenfeier & Business Event', href: '/veranstaltung/firmenfeier' },
  { label: 'Festzelt', href: '/veranstaltung/festzelt' },
]

export function HeroContent() {
  return (
    // A-Fix Header-Sichtbarkeit: reale Vermessung zeigte, dass der Content
    // im bisherigen Next.js-Hero direkt unter dem Header klebt (Webflow-
    // Referenz hat deutlich mehr Abstand: ~33% der Viewporthoehe auf
    // Desktop/Tablet, ~14% auf Mobile). HeroWall.tsx (py-28-Padding,
    // Section-Geometrie) bleibt dafuer bewusst unangetastet -- stattdessen
    // erhaelt dieser Wrapper einen zusaetzlichen, an der Viewporthoehe
    // (svh) statt an einem festen Pixelwert orientierten oberen Abstand.
    // Skaliert dadurch mit der tatsaechlichen Fensterhoehe statt eines
    // willkuerlichen Pixel-Werts. (Eine reine Flex-Zentrierung in einer
    // Mindesthoehe wurde zuerst versucht, wirkte real gemessen aber kaum,
    // weil der eigentliche Content-Block bereits fast so hoch ist wie die
    // getestete Mindesthoehe -- direktes svh-Padding trifft den
    // gemessenen Zielabstand zuverlässiger.)
    // A-Fix Feinschliff: Contentblock optisch naeher an die vertikale
    // Mitte gerueckt -- von 14svh/27svh auf 12svh/23svh reduziert (Mobile
    // leicht, Tablet/Desktop ~4svh nach oben). Ausschliesslich dieser
    // eine Wert angepasst, alle anderen Abstaende innerhalb des Blocks
    // unangetastet.
    //
    // A-Fix Short-Viewport: 23svh ist bei normaler Fensterhoehe passend,
    // saugt den Block auf breiten, aber niedrigen Notebook-Viewports
    // (z. B. 1866x870) zu weit nach unten -- Ursache ist ausschliesslich
    // die geringe Viewporthoehe, kein neuer Breakpoint/kein Geraete-
    // Sniffing. Arbitrary-Media-Override (min-width:768px UND
    // max-height:900px) senkt den Wert dort gezielt auf 15svh; `!`
    // erzwingt Vorrang vor der normalen md:-Regel unabhaengig von der
    // internen Tailwind-Reihenfolge beider gleich-spezifischen Klassen.
    // Mobile-Regel (12svh) und normale Desktop-/Tablet-Regel (23svh ab
    // 900px Hoehe) bleiben unveraendert.
    <div className="pt-[12svh] text-center max-w-2xl mx-auto md:pt-[23svh] [@media(min-width:768px)_and_(max-height:900px)]:pt-[15svh]!">
      {/* A-Fix Hero-Textkontrast: sekundaere Texte liefen bei hellen/
          unruhigen Bildmotiven der Paternoster-Wand zu kontrastarm --
          von den gedaempften pl-on-stage(-muted)-Tokens auf eine reine
          Weiss-Deckkraft-Skala (Hierarchie H1 > Subtext > Eyebrow/Label/
          Link) plus einen sehr dezenten dunklen Textschatten umgestellt.
          H1 und Pills bewusst unangetastet -- Overlay/HeroWall/Header
          ebenfalls unveraendert. */}
      <p className="font-mono text-xs tracking-[0.14em] uppercase text-white/75 [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">
        In und um Bayern
      </p>
      <h1 className="mt-4 text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight text-pl-on-stage">
        Livebands für dein Event.
      </h1>
      <p className="mt-4 text-base md:text-lg leading-relaxed text-white/80 max-w-md mx-auto [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">
        Echte Bands, echte Abende.
        <br />
        Von der Trauung bis zum vollen Festzelt.
      </p>

      <p className="mt-9 font-mono text-[11px] tracking-[0.14em] uppercase text-white/65 [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">
        Was hast du vor?
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-3.5">
        {ANLASS_PILLS.map((pill) => (
          <Link
            key={pill.href}
            href={pill.href}
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full border border-pl-accent-light/30 bg-pl-stage-elevated/60 text-pl-on-stage text-[15px] font-semibold whitespace-nowrap
                       hover:border-pl-accent-light hover:bg-pl-accent-on-stage/15 hover:text-pl-elevated motion-safe:transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pl-accent-light/70 focus-visible:ring-offset-2 focus-visible:ring-offset-pl-stage"
          >
            {pill.label}
            <span aria-hidden="true" className="text-pl-accent-light">→</span>
          </Link>
        ))}
      </div>

      <Link
        href="/bands"
        className="inline-block mt-6 font-mono text-xs tracking-[0.08em] text-white/75 hover:text-white motion-safe:transition-colors [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]"
      >
        Alle Bands ansehen →
      </Link>
    </div>
  )
}
