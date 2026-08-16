import { faqGroups } from '@/lib/content/faqs';

export default function FAQ() {
  return (
    <section className="bg-pl-canvas py-16 md:py-24 px-4 sm:px-6">
      <div className="pl-container-shell">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-12 md:gap-16">

          {/* Intro-Spalte */}
          <div className="md:pt-1">
            <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-4">
              Häufige Fragen
            </h2>
            <p className="text-pl-text-muted leading-relaxed mb-6">
              Du hast Fragen zur Bandsuche, zur Plattform oder zum Ablauf?
              Hier findest du Antworten und wenn nicht, schreib mir einfach.
            </p>
            <a
              href="mailto:alexander.dressler@proudleut.com"
              className="text-pl-accent text-sm hover:underline motion-safe:transition-colors"
            >
              Schreib mir kurz →
            </a>
          </div>

          {/* FAQ-Gruppen */}
          <div className="space-y-8">
            {faqGroups.map((group) => (
              <div key={group.label}>
                <p className="text-xs tracking-widest text-pl-text-muted font-medium mb-3">
                  {group.label}
                </p>
                <div className="divide-y divide-[var(--pl-border-medium)]">
                  {group.items.map((faq) => (
                    <details key={faq.question} className="group py-1">
                      <summary className="flex items-center justify-between gap-4 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden [&::marker]:hidden text-pl-text font-medium hover:text-pl-accent motion-safe:transition-colors select-none">
                        <span>{faq.question}</span>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          className="w-4 h-4 shrink-0 text-pl-text-muted motion-safe:transition-transform group-open:rotate-180"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </summary>
                      <div className="pb-5 text-pl-text-muted leading-relaxed">
                        {faq.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
