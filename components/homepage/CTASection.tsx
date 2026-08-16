import Link from 'next/link';
import Image from 'next/image';

// "Abschluss" -- bewusst kompakt (Richtwert 250-310px Hoehe), kein zweiter
// Hero. Bestehendes Bild aus lib/homepage/referenzEvents.ts wiederverwendet
// statt eines neuen Assets: Donnaweda beim Gruendungsfest der FFW
// Labersricht, Mai 2025.
export default function CTASection() {
  return (
    <section className="relative overflow-hidden flex items-center justify-center text-center h-[250px] md:h-[310px] px-4 sm:px-6">
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
            'radial-gradient(ellipse 55% 70% at 50% 50%, rgba(18,16,26,0.62) 0%, rgba(18,16,26,0.30) 65%, rgba(18,16,26,0.08) 100%)',
        }}
      />
      <div className="relative z-10 max-w-xl">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-pl-on-stage" style={{ textShadow: '0 2px 20px rgba(18,16,26,0.55)' }}>
          Und was feiert ihr?
        </h2>
        <p className="mt-2 text-sm text-pl-on-stage" style={{ textShadow: '0 1px 12px rgba(18,16,26,0.55)' }}>
          Hochzeit, Firmenfeier oder Festzelt.
          Schaut euch in Ruhe um und entdeckt, welche Bands zu eurem Anlass passen.
        </p>
        <div className="mt-5">
          <Link
            href="/bands"
            className="inline-flex items-center px-6 py-3 rounded-full bg-pl-accent text-pl-on-accent text-sm font-semibold hover:bg-pl-accent-hover motion-safe:transition-colors"
          >
            Bands entdecken →
          </Link>
        </div>
      </div>
      <div className="absolute left-4 sm:left-6 bottom-3 z-10 font-mono text-[11px] text-pl-on-stage-muted">
        Donnaweda · Gründungsfest der FFW Labersricht · Mai 2025
      </div>
    </section>
  );
}
