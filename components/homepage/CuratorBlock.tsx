import Image from 'next/image';

export default function CuratorBlock() {
  return (
    <section className="bg-pl-bg py-16 md:py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          {/* Text – links auf Desktop, darunter auf Mobile */}
          <div className="order-2 md:order-1">
            <p className="text-pl-primary text-sm font-medium tracking-wide uppercase mb-3">
              Persönliche Unterstützung bei der Bandsuche
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-6 leading-snug">
              Wenn du eine Band brauchst – bin ich da.
            </h2>
            <div className="text-pl-text-muted leading-relaxed space-y-4">
              <p>
                Manchmal wird&apos;s kurzfristig. Die Band ist krank, abgesprungen, oder du
                brauchst einfach schnell eine ehrliche Empfehlung. Genau dafür bin ich da.
              </p>
              <p>
                Ich kenne die Bands persönlich, weiß wer zu welchem Event passt und helfe
                dir, die richtige Entscheidung zu treffen – auch spontan. Du bekommst
                gezielte Vorschläge mit direktem Kontakt zur Band, kein Callcenter, keine
                Warteschleife.
              </p>
              <p>
                Auch im Notfall: Ich vermittle dir kurzfristig Ersatz, wenn nötig noch am
                selben Tag.
              </p>
            </div>
            <a
              href="mailto:alexander.dressler@proudleut.com"
              className="inline-flex items-center mt-8 px-6 py-3 rounded-full bg-pl-primary text-white font-semibold hover:opacity-90 motion-safe:transition-opacity"
            >
              Schreib mir direkt
            </a>
          </div>

          {/* Foto – rechts auf Desktop, oben auf Mobile */}
          <div className="order-1 md:order-2">
            <div className="relative w-full max-w-sm mx-auto md:max-w-none aspect-[4/5] rounded-2xl overflow-hidden">
              <Image
                src="/images/alexander-dressler.webp"
                alt="Alexander Dressler – Gründer von proudleut"
                fill
                className="object-cover"
                sizes="(min-width: 768px) 50vw, 384px"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
