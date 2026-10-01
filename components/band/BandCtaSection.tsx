import type { Band } from '@/lib/types/band';
import { AnfrageButton } from './AnfrageButton';
import { MerkButton } from './MerkButton';

type Props = {
  band: Band;
};

const CONTACT_EMAIL = 'alexander.dressler@proudleut.com';

// Abschluss-CTA (Prototyp E): eigener Block in voller Containerbreite, dunkle
// Karte auf heller Section (eine einzelne Karte innerhalb einer hellen Section
// zaehlt nicht als "dunkle Buehnen-Content-Section" im Sinne von
// design-reference.md). Links Eyebrow, "Interesse?" und der Hinweis, wohin die
// Anfrage geht, darunter die kleine Zeile "Noch unsicher?"; rechts (ab md,
// 300 px) der Anfrage-Button mit dem Merken-Button darunter, mobil gestapelt.
// Der Sentinel "final-cta-sentinel" steht in page.tsx unmittelbar vor dieser
// Section -- dort blenden Faktenleiste und mobile Bottom-Bar aus.
export function BandCtaSection({ band }: Props) {
  return (
    <section className="bg-pl-paper py-12 md:py-16 px-4 sm:px-6">
      <div className="pl-container-shell">
        <div className="bg-pl-stage rounded-2xl md:rounded-[28px] px-6 py-8 sm:px-10 sm:py-10 md:px-14 md:py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8 md:gap-10">
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-semibold text-pl-on-stage-muted uppercase tracking-wider">
              Euer Abend mit {band.name}
            </p>
            <h2 className="text-4xl md:text-5xl font-extrabold leading-none tracking-[-0.035em] text-pl-on-stage">
              Interesse?
            </h2>
            <p className="text-base text-pl-on-stage-muted">
              Deine Anfrage geht direkt an {band.name}.
            </p>
            <p className="text-xs text-pl-on-stage-muted mt-3">
              Noch unsicher?{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="underline hover:text-pl-on-stage motion-safe:transition-colors"
              >
                Schreib mir kurz, wenn du Hilfe bei der Auswahl möchtest.
              </a>
            </p>
          </div>

          <div className="flex flex-col gap-3 md:w-[300px] md:shrink-0">
            <AnfrageButton
              name={band.name}
              slug={band.slug}
              anfrageEventTypes={band.anfrageEventTypes ?? []}
            />
            <MerkButton
              name={band.name}
              slug={band.slug}
              anfrageEventTypes={band.anfrageEventTypes ?? []}
              variant="dark"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
