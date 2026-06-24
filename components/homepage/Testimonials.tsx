import Link from 'next/link';
import { testimonials } from '@/lib/content/testimonials';

export default function Testimonials() {
  return (
    <section className="bg-pl-canvas py-16 md:py-24 px-4 sm:px-6">
      <div className="pl-container-shell">
        <div className="mb-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-4">
            Was andere über proudleut sagen
          </h2>
          <p className="text-pl-text-muted text-lg leading-relaxed max-w-2xl mx-auto">
            Rückmeldungen von Brautpaaren, Veranstaltern und Musikern — aus echten Anfragen, Gesprächen und gemeinsamen Projekten.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <p className="text-pl-text-muted text-sm">
                  {t.role}
                  {t.band && t.bandLink && (
                    <>, <Link href={t.bandLink} className="text-pl-accent hover:underline motion-safe:transition-colors">{t.band}</Link></>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
