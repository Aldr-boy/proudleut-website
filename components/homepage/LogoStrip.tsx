import Image from 'next/image';
import Link from 'next/link';
import { bandLogos } from '@/lib/homepage/bandLogos';

export default function LogoStrip() {
  return (
    <section className="bg-pl-paper pt-10 pb-12 md:pt-14 md:pb-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-lg font-medium text-pl-text mb-1">
          Bands mit eigener Handschrift
        </h2>
        <p className="text-sm text-pl-text-muted mb-6">
          Ein kleiner Ausschnitt aus dem proudleut-Kosmos.
        </p>
        <div className="bg-pl-stage/90 rounded-2xl px-7 py-8 md:px-10 md:py-9 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-x-7 gap-y-5 md:gap-x-9 flex-wrap">
            {bandLogos.map((logo) => {
              const img = (
                <Image
                  key={logo.name}
                  src={logo.src}
                  alt={`${logo.name} Logo`}
                  width={160}
                  height={48}
                  className={`max-h-10 md:max-h-12 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity ${logo.className ?? 'max-w-36 md:max-w-44'}`}
                />
              );
              return logo.href ? (
                <Link key={logo.name} href={logo.href} aria-label={logo.name}>
                  {img}
                </Link>
              ) : (
                <span key={logo.name}>{img}</span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
