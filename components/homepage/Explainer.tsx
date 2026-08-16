import Link from 'next/link';

const steps = [
  {
    number: '01',
    title: 'Entdecken',
    description:
      'Starte mit deinem Anlass und grenz ein, was zu deinem Abend passt: Stil, Region, „Klingt nach".',
  },
  {
    number: '02',
    title: 'Band ansehen',
    description:
      'Jede Bandseite zeigt mit Fotos, Videos und Einordnung, was die Band ausmacht und wofür sie steht.',
  },
  {
    number: '03',
    title: 'Direkt anfragen',
    description: 'Deine Anfrage geht ohne Umweg an die Band — mit direktem Kontakt für alles Weitere.',
  },
];

export default function Explainer() {
  return (
    <section className="bg-pl-canvas py-16 md:py-24 px-4 sm:px-6">
      <div className="pl-container-shell grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
        <div>
          <p className="text-xs font-semibold text-pl-accent uppercase tracking-wider">
            02 — So funktioniert&apos;s
          </p>
          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-pl-text leading-[1.1]">
            Entdecken, ansehen, anfragen.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-pl-text-muted max-w-[400px]">
            Mehr Schritte sind es nicht. proudleut ist keine Agentur und kein Buchungsportal.
            Deine Anfrage landet direkt bei der Band.
          </p>
          <Link
            href="/bands"
            className="inline-block mt-7 text-sm font-semibold text-pl-accent-deep hover:text-pl-accent-link-hover motion-safe:transition-colors"
          >
            Bands entdecken →
          </Link>
        </div>

        <div className="flex flex-col">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex gap-5 py-5 border-t border-pl-border-medium last:border-b"
            >
              <div className="font-mono text-sm text-pl-accent pt-0.5">{step.number}</div>
              <div>
                <div className="text-lg font-bold text-pl-text">{step.title}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-pl-text-muted">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
