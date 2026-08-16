import Image from 'next/image';
import Link from 'next/link';

export default function CuratorBlock() {
  return (
    <section className="bg-pl-paper py-16 md:py-24 px-4 sm:px-6">
      <div className="pl-container-shell">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="order-2 md:order-1">
            <p className="text-xs font-semibold text-pl-accent uppercase tracking-wider">
              04 — Persönliche Hilfe
            </p>
            <h2 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-pl-text leading-[1.1] max-w-[15ch]">
              Wenn du beim Finden nicht weiterkommst, bin ich da.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-pl-text-muted max-w-[480px]">
              Ich bin Alex. Ich arbeite seit vielen Jahren mit Livebands und Veranstaltern —
              Booking, Bandmanagement und alles, was zwischen Zusage und Auftritt passiert.
            </p>
            <p className="mt-3.5 text-base leading-relaxed text-pl-text-muted max-w-[480px]">
              Wenn du bei der Auswahl hängst, erzähl mir kurz, was du planst: Anlass, Ort, Datum,
              Gästezahl. Oft reichen ein paar Eckdaten und ich schlage dir zwei, drei Bands vor,
              die passen könnten.
            </p>
            <div className="flex items-center gap-6 mt-7 flex-wrap">
              <a
                href="mailto:alexander.dressler@proudleut.com"
                className="inline-flex items-center px-7 py-3.5 rounded-full bg-pl-accent text-pl-on-accent font-semibold hover:bg-pl-accent-hover motion-safe:transition-colors"
              >
                Schreib mir
              </a>
              <Link
                href="/ueber-mich"
                className="text-sm font-semibold text-pl-accent-deep hover:text-pl-accent-link-hover motion-safe:transition-colors"
              >
                Mehr über proudleut →
              </Link>
            </div>
          </div>

          <div className="order-1 md:order-2 max-w-sm md:max-w-none mx-auto">
            <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden">
              <Image
                src="/images/alexander-dressler.webp"
                alt="Alexander Dressler"
                fill
                className="object-cover"
                sizes="(min-width: 768px) 50vw, 384px"
              />
            </div>
            <p className="mt-2.5 font-mono text-xs text-pl-text-hint">
              Alex — Booking, Bandmanagement, proudleut.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
