import type { OccasionEditorial as OccasionEditorialContent } from '@/lib/content/occasionEditorial';

// Redaktioneller Text einer Anlassseite. Abschnittsfolge und Gestaltung wie
// Textabschnitte und "Häufige Fragen" auf /veranstaltung/hochzeit/oberpfalz
// (Flächen wechseln zwischen Papier und Canvas). Server Component: auch die
// Antworten der aufklappbaren Fragen stehen im ausgelieferten HTML.
export default function OccasionEditorial({ content }: { content: OccasionEditorialContent }) {
  // Der Bandbereich davor liegt auf Canvas, daher beginnt der Text auf Papier.
  const surface = (i: number) => (i % 2 === 0 ? 'bg-pl-paper' : 'bg-pl-canvas');
  const faqIndex = content.sections.length;

  return (
    <>
      {content.sections.map((section, i) => (
        <section key={section.heading} className={`${surface(i)} py-16 md:py-24 px-4 sm:px-6`}>
          <div className="pl-container-shell">
            <div className="max-w-[820px]">
              <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-6">{section.heading}</h2>
              <div className="space-y-4">
                {section.blocks.map((block, bi) =>
                  block.type === 'p' ? (
                    <p key={bi} className="text-pl-text-muted leading-relaxed">
                      {block.text}
                    </p>
                  ) : (
                    <ul
                      key={bi}
                      className="list-disc pl-5 space-y-2 text-pl-text-muted leading-relaxed marker:text-pl-text-muted"
                    >
                      {block.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>
      ))}

      {content.faq && (
        <section className={`${surface(faqIndex)} py-16 md:py-24 px-4 sm:px-6`}>
          <div className="pl-container-shell">
            <div className="max-w-[820px]">
              <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-6">{content.faq.heading}</h2>
              <div className="divide-y divide-[var(--pl-border-medium)]">
                {content.faq.items.map((faq) => (
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
                    <div className="pb-5 text-pl-text-muted leading-relaxed">{faq.answer}</div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
