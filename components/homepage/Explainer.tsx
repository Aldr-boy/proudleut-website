import Link from 'next/link';

const steps = [
  {
    number: "01",
    title: "Stöbern",
    description: "Entdecke Bands nach Anlass, Stil und Atmosphäre.",
  },
  {
    number: "02",
    title: "Direkt anfragen",
    description: "Du kontaktierst die Bands direkt — ohne Buchungsportal dazwischen.",
  },
  {
    number: "03",
    title: "Persönlich helfen lassen",
    description: "Du bist unsicher? Schreib mir kurz dein Event — ich denke mit.",
  },
];

export default function Explainer() {
  return (
    <section className="bg-pl-canvas py-10 md:py-14 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto bg-pl-paper rounded-2xl px-6 sm:px-10 md:px-14 py-12 md:py-16">
        <div className="mb-12 md:mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-pl-text mb-5 leading-tight max-w-2xl">
            Nicht sicher, welche Band passt?
          </h2>
          <p className="text-pl-text-muted text-lg leading-relaxed max-w-xl">
            Stöbere selbst durch ausgewählte Livebands — oder schreib mir kurz, was du planst.
            Ich helfe dir gern beim Sortieren.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {steps.map((step) => (
            <div
              key={step.number}
              className="border-t-2 border-pl-accent/30 pt-8 pb-4"
            >
              <span className="block text-5xl font-bold text-pl-accent mb-4 tabular-nums">
                {step.number}
              </span>
              <h3 className="text-pl-text font-bold text-xl mb-3">{step.title}</h3>
              <p className="text-pl-text-muted leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap gap-4 justify-center">
          <Link
            href="/bands"
            className="inline-flex items-center px-8 py-3.5 rounded-full bg-pl-accent text-pl-on-accent font-semibold hover:bg-pl-accent-hover motion-safe:transition-colors"
          >
            Bands entdecken
          </Link>
          <a
            href="mailto:alexander.dressler@proudleut.com"
            className="inline-flex items-center px-6 py-3 rounded-full border border-pl-accent-light/30 text-pl-text hover:border-pl-accent-light motion-safe:transition-colors"
          >
            Schreib mir kurz
          </a>
        </div>
      </div>
    </section>
  );
}
