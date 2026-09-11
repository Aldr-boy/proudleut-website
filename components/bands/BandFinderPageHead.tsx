import Link from 'next/link';

type Props = {
  eyebrow?: string;
  h1: string;
  intro?: string | null;
  backHref?: string;
  backLabel?: string;
};

// Kompakter, gemeinsamer Suchkopf-Text fuer /bands und die Veranstaltungs-
// Uebersichtsseiten (Auftrag "Bandfinder-Redesign") -- ersetzt den
// bisherigen grossen Bild-Hero. Rein praesentational (kein "use client"
// noetig), H1/Intro bleiben pro Seite unterschiedlich und weiterhin
// serverseitig gerendert (SEO/H1 unveraendert erhalten, siehe Auftrag
// Abschnitt 9).
export function BandFinderPageHead({ eyebrow, h1, intro, backHref, backLabel }: Props) {
  return (
    // Warm getoenter Suchbereich-Hintergrund (Auftrag "Bandfinder-Redesign
    // -- Layout-Nachgang"): die aeussere Flaeche traegt bg-pl-paper und hat
    // bewusst keine eigene Breitenbegrenzung (Section/main sind bereits
    // breitenoffen) -- so spannt die Farbe ueber die gesamte Seitenbreite,
    // waehrend der Inhalt weiterhin im bestehenden 1140px-Container
    // (pl-container-shell) bleibt. Setzt sich nahtlos in der direkt
    // anschliessenden Themenraster-/Filterleisten-Flaeche in
    // components/bands/BandExplorer.tsx fort (identischer Farbton, kein
    // sichtbarer Bruch zwischen den beiden Komponenten).
    <div className="bg-pl-paper">
      {/* pt-28 (112px) haelt die H1 zuverlaessig unter der schwebenden Pill-
          Navigation frei (Header.tsx, fixed/top-3..top-6) -- derselbe
          Abstandswert wie andere Sections, deren Inhalt direkt am
          Seitenanfang beginnt (z. B. components/hero/HeroWall.tsx: py-28).
          Real per Screenshot geprueft: der bisherige, kleinere Wert liess
          die H1 hinter der Navigation verschwinden. */}
      <div className="pl-container-shell px-4 sm:px-6 pt-28 md:pt-32 pb-1">
        {backHref && (
          <Link
            href={backHref}
            className="text-pl-text-muted text-sm hover:text-pl-text motion-safe:transition-colors mb-4 inline-block"
          >
            {backLabel ?? '← Zurück zur Bandübersicht'}
          </Link>
        )}
        {eyebrow && (
          <p className="text-pl-accent text-xs font-semibold tracking-wider uppercase mb-2">{eyebrow}</p>
        )}
        <h1 className="text-2xl md:text-3xl font-bold text-pl-text mb-2 leading-tight">{h1}</h1>
        {intro && (
          <p className="text-pl-text-muted text-sm md:text-base leading-relaxed max-w-2xl mb-6">{intro}</p>
        )}
      </div>
    </div>
  );
}
