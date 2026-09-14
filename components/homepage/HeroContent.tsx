import Link from 'next/link'

// Hero-Content-Layer fuer den Startseiten-Hero-Redesign (verbindlicher
// Text laut Auftrag Abschnitt 3). Rendert ausschliesslich Text/CTA, keine
// eigene Grid-/Slot-/Bildlogik -- wird als children in HeroWall
// eingehaengt (components/hero/HeroWall.tsx), deren Split-Layout Position/
// Breite bereits vorgibt.
//
// Kontrast: die Textflaeche liegt jetzt auf einer durchgehend dunklen
// pl-stage-Flaeche (kein Foto im Hintergrund mehr, siehe HeroWall.tsx) --
// die bestehenden semantischen "auf Buehne"-Text-Tokens (pl-on-stage /
// pl-on-stage-muted / pl-accent-on-stage) reichen deshalb ohne
// zusaetzliche Opacity-/Textschatten-Behelfslösung aus der Vorversion.
//
// "euren Moment." nutzt bewusst eine lokale System-Serifenschrift
// (Tailwind font-serif -- ui-serif/Georgia/Times-Stack, kein Webfont-
// Import) plus italic, um die betonte Wortgruppe von der sonst fetten
// Proudleut-Displayschrift (bestehende sans-Schrift, hier ueber
// font-extrabold) abzusetzen -- keine globale Schriftumstellung.
export function HeroContent() {
  return (
    <div className="text-left">
      <p className="font-mono text-xs tracking-[0.14em] uppercase text-pl-accent-light">
        In und um Bayern
      </p>
      <h1 className="mt-4 text-[clamp(2.25rem,1rem+3.4vw,6rem)] font-extrabold leading-[1.05] tracking-tight text-pl-on-stage">
        Livebands für{' '}
        <span className="font-serif italic font-medium">euren Moment.</span>
      </h1>
      <p className="mt-5 text-base md:text-lg leading-relaxed text-pl-on-stage-muted max-w-md">
        Für eure Hochzeit, Firmenfeier oder ein Fest, das in Erinnerung bleiben soll.
      </p>

      <Link
        href="/bands"
        className="inline-flex items-center gap-2 mt-8 px-7 py-3.5 rounded-full bg-pl-accent text-pl-on-accent text-base font-semibold
                   hover:bg-pl-accent-hover motion-safe:transition-colors
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-pl-accent-light focus-visible:ring-offset-2 focus-visible:ring-offset-pl-stage"
      >
        Bands entdecken
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  )
}
