import Link from 'next/link';
import Image from 'next/image';

export default function CTASection() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24 px-4 sm:px-6">
      <Image
        src="/images/cta-background.webp"
        alt=""
        fill
        className="object-cover object-[center_45%] pointer-events-none"
        sizes="100vw"
        quality={75}
        priority={false}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(rgba(18,16,26,0.72), rgba(30,26,40,0.78))" }}
      />
      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-pl-on-stage mb-4">
          Bereit, deine perfekte Band zu finden?
        </h2>
        <p className="text-pl-on-stage text-lg mb-10 leading-relaxed">
          Finde deine Band – oder schreib mir, und ich helfe dir bei der Auswahl.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/bands"
            className="inline-flex items-center px-6 py-3 rounded-full bg-pl-accent text-pl-on-accent font-semibold hover:bg-pl-accent-hover motion-safe:transition-colors"
          >
            Bands entdecken
          </Link>
          <a
            href="mailto:alexander.dressler@proudleut.com"
            className="inline-flex items-center px-6 py-3 rounded-full border border-pl-accent-light/30 text-pl-on-stage hover:border-pl-accent-light hover:text-pl-on-stage motion-safe:transition-colors"
          >
            Schreib mir
          </a>
        </div>
      </div>
    </section>
  );
}
