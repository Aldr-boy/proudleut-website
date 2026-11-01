import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Seite nicht verfügbar',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <section className="bg-pl-paper py-24 sm:py-32 px-4 sm:px-6">
      <div className="max-w-xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl font-semibold text-pl-text mb-6">
          Diese Seite ist leider nicht mehr verfügbar.
        </h1>
        <p className="text-pl-text-muted text-lg leading-relaxed">
          Vielleicht findest du hier eine passende Band.
        </p>
        <div className="mt-10">
          <Button
            href="/bands"
            className="inline-flex items-center justify-center px-7 py-3.5 rounded-full text-base font-semibold
                       bg-[var(--pl-accent)] text-[var(--pl-text-on-accent)]
                       hover:bg-[var(--pl-accent-hover)] motion-safe:transition-colors"
          >
            Bands entdecken
          </Button>
        </div>
      </div>
    </section>
  );
}
