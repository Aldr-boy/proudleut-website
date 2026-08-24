import type { Metadata } from 'next';
import Link from 'next/link';
import { BandIntroFormCore } from '@/components/bandIntro/BandIntroFormCore';

// Funktionale Formularroute, keine eigene SEO-Landingpage (Auftrag
// Abschnitt 17) -- identisches noindex-Muster wie app/admin/layout.tsx und
// app/studio/[[...tool]]/page.tsx. Bewusst NICHT in public/robots.txt
// disallowed: die Route soll crawlbar bleiben (robots-Metadata via
// noindex/nofollow reicht) und im Formular verlinkte/geteilte Aufrufe nicht
// pauschal blockieren. Keine eigene sitemap.ts im Projekt (siehe
// Rechercheergebnis im Abschlussbericht) -- daher keine gesonderte
// Sitemap-Ausschlussregel noetig.
export const metadata: Metadata = {
  title: 'Band vorstellen – proudleut',
  robots: { index: false, follow: false },
};

// Mobile-Pendant zum Desktop-Modal (components/bandIntro/BandIntroModal.tsx)
// -- exakt dieselbe Formular-Skin (dunkler Stage-Hintergrund, identische
// Input-/Label-Optik), damit der Wechsel zwischen Modal und eigener Route
// sich wie derselbe Moment anfuehlt. Teilt sich mit dem Modal denselben
// Submit-/Backend-Prozess ueber BandIntroFormCore -- keine doppelte
// Businesslogik.
export default function BandVorstellenPage() {
  return (
    <main className="bg-pl-stage min-h-[calc(100dvh-1px)] py-16 md:py-24 px-4 sm:px-6">
      <div className="pl-container-shell max-w-[640px]">
        <Link
          href="/fuer-bands"
          className="text-pl-on-stage-muted text-sm hover:text-pl-on-stage motion-safe:transition-colors mb-8 inline-block"
        >
          ← Zurück zu „Für Bands”
        </Link>

        <p className="text-xs font-semibold text-pl-accent-light uppercase tracking-wider">
          Bandseite anfragen
        </p>
        <h1 className="mt-3 text-2xl md:text-3xl font-bold text-pl-on-stage">
          Stellt eure Band kurz vor.
        </h1>
        <p className="mt-3 text-[15px] text-pl-on-stage-muted leading-relaxed max-w-[46ch]">
          Ein paar Eckdaten und Links reichen, damit ich mir einen ersten Eindruck von eurer Band
          machen kann. Kein Bewerbungsformular – einfach kurz vorstellen.
        </p>

        <div className="mt-9">
          <BandIntroFormCore />
        </div>
      </div>
    </main>
  );
}
