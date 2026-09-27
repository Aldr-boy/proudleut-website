import Image from 'next/image';
import Link from 'next/link';
import type { Band } from '@/lib/types/band';
import { buildEinschaetzenRows } from '@/lib/homepage/bandEinschaetzenRows';

// Kleines, dekoratives External-Link-Icon fuer die "Fuer Veranstalter"-Zeile
// (Auftrag "Korrektur Section 03 -- Layout und Optik") -- keine neue
// Icon-Bibliothek, sondern derselbe handgezeichnete Inline-SVG-Stil wie die
// Icons in components/band/BandContactSection.tsx (stroke-basiert,
// aria-hidden, da der Linktext selbst bereits alles Noetige sagt).
function ExternalLinkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export default function BandEinschaetzen({ band }: { band: Band }) {
  const rows = buildEinschaetzenRows(band);
  const image = band.heroImage ?? band.thumbnailImage;

  return (
    <section className="bg-pl-stage px-4 sm:px-6 py-16 md:py-24">
      <div className="pl-container-shell">
        {/* DOM-Reihenfolge bleibt Eyebrow, Ueberschrift, Einleitung, Foto,
            Zeilenliste, Link, Fussnote (Auftrag Abschnitt 1) -- ab lg
            ordnet ausschliesslich dieses Grid die drei direkten Kinder
            (Eyebrow / linke Textspalte+Foto / rechte Zeilenliste+Link+
            Fussnote) visuell an, ohne DOM-Reihenfolge oder Tabindex zu
            aendern. Unter lg bleibt es eine einfache Blockabfolge. */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-16 lg:items-start">
          <p className="text-xs font-semibold text-pl-accent-light uppercase tracking-wider lg:col-start-1 lg:row-start-1">
            03 — Eine Band einschätzen
          </p>

          <div className="lg:col-start-1 lg:row-start-2">
            <h2 className="mt-4 md:mt-5 text-3xl md:text-[40px] leading-[1.15] font-extrabold tracking-tight text-pl-on-stage max-w-[16ch]">
              Welche Band passt wirklich zu uns?
            </h2>
            <p className="mt-4 text-base md:text-lg leading-relaxed text-pl-on-stage-muted max-w-[560px]">
              Ein Foto allein beantwortet das meist nicht. Deshalb ordnet jede Bandseite auf proudleut ein:
              wie eine Band klingt, wofür sie spielt und wie sie live aussieht. Bei manchen Bands bekommst du
              außerdem einen Eindruck davon, wie sie online aufgestellt sind.
            </p>

            <div className="mt-11">
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-pl-stage-elevated">
                {image && (
                  <Image
                    src={image.url}
                    alt={image.alt}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                  />
                )}
              </div>
              <p className="mt-2.5 font-mono text-xs text-pl-on-stage-muted">
                {band.name} — live. Ein Bandprofil auf proudleut.
              </p>
            </div>
          </div>

          {/* mt-10 (mobil/md) reproduziert den fruehren gap-10 zwischen Foto
              und Zeilenliste. Ab lg ersetzt lg:mt-5 das -- exakt derselbe
              Versatz wie die Ueberschrift von ihrer Zeile (h2: md:mt-5) --
              damit die obere Trennlinie der Zeilenliste buendig mit der
              Oberkante der Ueberschrift beginnt (beide Boxen liegen in
              Zeile 2 desselben Grids und erhalten denselben Top-Versatz). */}
          <div className="mt-10 lg:mt-5 lg:col-start-2 lg:row-start-2">
            <div className="flex flex-col">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="flex flex-col sm:flex-row sm:gap-6 py-3.5 border-t border-pl-border-stage first:border-t-0 sm:first:border-t"
                >
                  <div className="font-mono text-xs uppercase tracking-wider text-pl-on-stage-muted sm:w-40 sm:shrink-0">
                    {row.label}
                  </div>

                  {row.kind === 'text' && (
                    <div className="text-[15px] font-semibold text-pl-on-stage">{row.value}</div>
                  )}

                  {row.kind === 'social' && (
                    <div className="min-w-0">
                      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-x-6 gap-y-4">
                        {row.metrics.map((metric) => (
                          <div key={metric.key}>
                            <span className="text-[15px] font-semibold text-pl-on-stage">
                              {metric.formattedCount}
                            </span>
                            <p className="mt-0.5 text-xs text-pl-on-stage-muted">
                              {metric.label} · {metric.key === 'spotify' ? 'Hörer*innen/Monat' : metric.unit}
                            </p>
                            {metric.standText && (
                              <p className="mt-0.5 text-[11px] text-pl-on-stage-muted">{metric.standText}</p>
                            )}
                          </div>
                        ))}
                      </div>
                      {row.sharedStandText && (
                        <p className="mt-3 font-mono text-xs leading-relaxed text-pl-on-stage-muted">
                          {row.sharedStandText}
                        </p>
                      )}
                    </div>
                  )}

                  {row.kind === 'document' && (
                    <div>
                      <a
                        href={row.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-pl-on-stage hover:underline"
                      >
                        Presse- & Booking-Info (PDF)
                        <ExternalLinkIcon />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Link
              href={`/band/${band.slug}`}
              className="inline-block mt-6 text-sm font-semibold text-pl-accent-light hover:text-pl-on-stage motion-safe:transition-colors"
            >
              Bandseite ansehen →
            </Link>
            <p className="mt-5 font-mono text-xs leading-relaxed text-pl-on-stage-muted">
              Ein Beispiel, keine Empfehlung – jede Band auf proudleut ist so eingeordnet.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
