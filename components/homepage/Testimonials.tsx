import { testimonials } from '@/lib/content/testimonials';

export default function Testimonials() {
  return (
    <section className="bg-pl-canvas py-16 md:py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-12 text-center">
          Stimmen von Veranstaltern &amp; Bands
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="bg-pl-elevated rounded-xl p-6 flex flex-col gap-4"
            >
              <span className="text-4xl leading-none text-pl-accent select-none" aria-hidden="true">
                &ldquo;
              </span>
              <p className="text-pl-text leading-relaxed flex-1">{t.quote}</p>
              <div className="border-t border-pl-soft pt-4">
                <p className="text-pl-text font-semibold text-sm">{t.author}</p>
                <p className="text-pl-text-muted text-sm">{t.role}</p>
                {t.event && (
                  <p className="text-pl-text-muted text-xs mt-0.5">{t.event}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
