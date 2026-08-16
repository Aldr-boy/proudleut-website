import Link from 'next/link';
import Image from 'next/image';

// "Abschluss" -- an die visuelle Referenz app/ueber-mich/page.tsx (letzte
// Section dort, San2-Livefoto) angeglichen: gleiche Layoutlogik
// (inhaltsgetriebene Hoehe ueber Padding statt fixer Pixelwert),
// Headline-/Text-/Button-Typografie und Caption. Bestehendes Bild aus
// lib/homepage/referenzEvents.ts wiederverwendet statt eines neuen
// Assets: Donnaweda beim Gruendungsfest der FFW Labersricht, Mai 2025.
// Overlay-Staerke bewusst NICHT 1:1 uebernommen -- das Donnaweda-Foto ist
// heller und unruhiger als das San2-Foto, ein identisches (schwaecheres)
// Overlay wuerde Text/Caption hier schlechter lesbar machen.
export default function CTASection() {
  return (
    <section className="relative overflow-hidden pt-24 md:pt-36 pb-16 md:pb-24 px-4 sm:px-6 text-center">
      <Image
        src="/images/referenz-events/donnaweda-gruendungsfest-stimmung.webp"
        alt=""
        fill
        className="object-cover object-[center_55%] pointer-events-none"
        sizes="100vw"
        quality={75}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 62% 78% at 50% 42%, rgba(18,16,26,0.78) 0%, rgba(18,16,26,0.52) 55%, rgba(18,16,26,0.22) 100%)',
        }}
      />
      <div className="relative z-10 max-w-[620px] mx-auto">
        <h2
          className="text-4xl md:text-6xl font-extrabold tracking-tight text-pl-on-stage"
          style={{ textShadow: '0 2px 24px rgba(18,16,26,0.6)' }}
        >
          Und was feiert ihr so?
        </h2>
        <p
          className="mt-8 text-lg leading-relaxed text-pl-on-stage-muted max-w-[480px] mx-auto"
          style={{ textShadow: '0 1px 16px rgba(18,16,26,0.6)' }}
        >
          Hochzeit, Firmenfeier oder Festzelt.
          Schaut euch in Ruhe um und entdeckt, welche Bands zu eurem Anlass passen.
        </p>
        <div className="mt-11 flex items-center justify-center">
          <Link
            href="/bands"
            className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-pl-accent text-pl-on-accent text-base font-semibold hover:bg-pl-accent-hover motion-safe:transition-colors"
          >
            Bands entdecken →
          </Link>
        </div>
      </div>
      <p
        className="absolute left-4 sm:left-6 bottom-3 z-10 font-mono text-[11px] font-normal text-pl-on-stage/70"
        style={{ textShadow: '0 1px 8px rgba(18,16,26,0.6)' }}
      >
        Donnaweda · Gründungsfest der FFW Labersricht · Mai 2025
      </p>
    </section>
  );
}
