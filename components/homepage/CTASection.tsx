import Link from 'next/link';

export default function CTASection() {
  return (
    <section className="bg-pl-surface py-16 md:py-24 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-4">
          Bereit, deine perfekte Band zu finden?
        </h2>
        <p className="text-pl-text-muted text-lg mb-10 leading-relaxed">
          Stöbere durch unser Angebot oder schreib mir direkt – ich helfe dir gerne.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/bands"
            className="inline-flex items-center px-6 py-3 rounded-full bg-pl-primary text-white font-semibold hover:opacity-90 motion-safe:transition-opacity"
          >
            Bands entdecken
          </Link>
          <a
            href="mailto:alexander.dressler@proudleut.com"
            className="inline-flex items-center px-6 py-3 rounded-full border border-white/15 text-pl-text-muted hover:border-pl-primary hover:text-pl-text motion-safe:transition-colors"
          >
            Schreib mir
          </a>
        </div>
      </div>
    </section>
  );
}
