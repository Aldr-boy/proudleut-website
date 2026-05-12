import { faqs } from '@/lib/content/faqs';

export default function FAQ() {
  return (
    <section className="bg-pl-bg py-16 md:py-24 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-10 text-center">
          Häufige Fragen
        </h2>
        <div className="divide-y divide-white/8">
          {faqs.map((faq, i) => (
            <details key={i} className="group py-1">
              <summary className="flex items-center justify-between gap-4 py-4 cursor-pointer list-none text-pl-text font-medium hover:text-pl-primary motion-safe:transition-colors select-none">
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
    </section>
  );
}
