import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-pl-stage border-t border-pl-stage mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <p className="text-pl-on-stage font-semibold text-base">proudleut</p>
          <p className="text-pl-on-stage-muted text-sm mt-1">
            Das Liveband-Verzeichnis für DACH
          </p>
        </div>
        <nav
          className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-pl-on-stage-muted"
          aria-label="Footer"
        >
          <Link href="/ueber-mich" className="hover:text-pl-on-stage motion-safe:transition-colors">
            Über mich
          </Link>
          <Link href="#" className="hover:text-pl-on-stage motion-safe:transition-colors">
            Für Bands
          </Link>
          <Link href="#" className="hover:text-pl-on-stage motion-safe:transition-colors">
            Kontakt
          </Link>
          <Link href="#" className="hover:text-pl-on-stage motion-safe:transition-colors">
            Impressum
          </Link>
        </nav>
        <p className="text-pl-on-stage-muted text-xs">© 2025 proudleut.com</p>
      </div>
    </footer>
  );
}
