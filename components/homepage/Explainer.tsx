const steps = [
  {
    number: "1",
    title: "Entdecken",
    description:
      "Entdecke Livebands aus der Region – sortiert nach Anlass, Stil und Region.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="w-7 h-7"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    number: "2",
    title: "Vergleichen",
    description:
      "Schau dir Profile, Fotos und Referenzen an – und finde die Band, die zu deinem Event passt.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="w-7 h-7"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    number: "3",
    title: "Direkt anfragen",
    description:
      "Kontaktiere die Band direkt – kein Umweg, keine Provision, kein Postfach.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="w-7 h-7"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

export default function Explainer() {
  return (
    <section className="bg-pl-canvas py-16 md:py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-12 text-center">
          So funktioniert proudleut
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="text-pl-accent">{step.icon}</span>
                <span className="text-pl-text-muted text-sm font-medium tracking-widest uppercase">
                  {step.number}
                </span>
              </div>
              <h3 className="text-pl-text font-semibold text-lg">{step.title}</h3>
              <p className="text-pl-text-muted leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
