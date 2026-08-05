import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-pl-gradient-footer border-t border-pl-stage">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <Link href="/" aria-label="Zur Startseite">
            <Image
              src="/images/proudleut-logo-white.png"
              alt="proudleut – Livebands entdecken"
              width={1004}
              height={185}
              className="h-6 w-auto"
            />
          </Link>
          <p className="text-pl-on-stage-muted text-sm mt-1">
            Livebands für besondere Momente.
          </p>
        </div>
        <nav
          className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-pl-on-stage-muted"
          aria-label="Footer"
        >
          <Link href="/ueber-mich" className="hover:text-pl-on-stage motion-safe:transition-colors">
            Über Proudleut
          </Link>
          <Link href="/fuer-bands" className="hover:text-pl-on-stage motion-safe:transition-colors">
            Für Bands
          </Link>
          <Link href="#" className="hover:text-pl-on-stage motion-safe:transition-colors">
            Kontakt
          </Link>
          <Link href="/impressum" className="hover:text-pl-on-stage motion-safe:transition-colors">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-pl-on-stage motion-safe:transition-colors">
            Datenschutz
          </Link>
        </nav>
        <p className="text-pl-on-stage-muted text-xs">© 2025 proudleut.com</p>
      </div>
    </footer>
  );
}
