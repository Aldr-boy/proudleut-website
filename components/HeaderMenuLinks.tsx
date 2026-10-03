import type { Ref } from 'react';
import Link from 'next/link';
import { Button, ButtonArrow } from '@/components/ui/Button';

export const NAV_LINKS = [
  { label: 'Über proudleut', href: '/ueber-mich' },
  { label: 'Für Bands', href: '/fuer-bands' },
  { label: 'Kontakt', href: '/kontakt' },
] as const;

export const CTA = { label: 'Bands entdecken', href: '/bands' };
export const MOBILE_MENU_ID = 'pill-mobile-menu';

export function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

type Props = {
  menuOpen: boolean;
  pathname: string | null;
  firstLinkRef: Ref<HTMLAnchorElement>;
  onNavigate: () => void;
};

// Handy-Menue der Header-Pill (unter 768 px), aus Header.tsx extrahiert:
// dieselbe Pill waechst nach unten -- kein Overlay, kein Drawer, kein Portal,
// kein Scroll-Lock. Oeffnungsanimation ueber CSS Grid (0fr -> 1fr) statt
// max-height. Geschlossen ist das Menue inert und aria-hidden. Zustand
// (menuOpen), Escape, Outside-Click und Routenwechsel verwaltet Header.tsx.
export function HeaderMenuLinks({ menuOpen, pathname, firstLinkRef, onNavigate }: Props) {
  return (
    <div
      id={MOBILE_MENU_ID}
      className="md:hidden grid motion-safe:transition-[grid-template-rows] motion-safe:duration-300 motion-safe:ease-out"
      style={{ gridTemplateRows: menuOpen ? '1fr' : '0fr' }}
      aria-hidden={!menuOpen}
      inert={!menuOpen}
    >
      <div className="overflow-hidden min-h-0">
        <nav className="flex flex-col px-4 pb-4 pt-1 gap-1" aria-label="Hauptnavigation mobil">
          {NAV_LINKS.map((link, i) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                ref={i === 0 ? firstLinkRef : undefined}
                aria-current={isActive ? 'page' : undefined}
                tabIndex={menuOpen ? undefined : -1}
                onClick={onNavigate}
                className={`px-3 py-2.5 rounded-xl text-base outline-none motion-safe:transition-colors active:scale-95 motion-safe:transition-transform hover:bg-pl-accent/20 hover:text-pl-accent-deep focus-visible:outline-none focus-visible:bg-pl-accent/20 focus-visible:text-pl-accent-deep focus-visible:ring-2 focus-visible:ring-pl-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-pl-paper ${
                  isActive ? 'bg-pl-accent/20 text-pl-accent-deep' : 'text-pl-text'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Button
            href={CTA.href}
            tabIndex={menuOpen ? undefined : -1}
            onClick={onNavigate}
            className="mt-2 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-pl-accent text-pl-on-accent text-sm font-medium"
          >
            {CTA.label}
            <ButtonArrow>
              <ChevronRightIcon className="h-4 w-4" />
            </ButtonArrow>
          </Button>
        </nav>
      </div>
    </div>
  );
}

type PopoverListProps = {
  pathname: string | null;
  firstLinkRef: Ref<HTMLAnchorElement>;
  onNavigate: () => void;
};

// Liste der Navigationslinks im Popover der kompakten Pille
// (components/band/CompactPill.tsx, ab 1024 px): dieselben Links und derselbe
// Button "Bands entdecken" wie im Handy-Menue. Die Huelle (Position, Hintergrund,
// nav-Landmark, Auf-/Zuklappen) liegt in CompactPill.tsx.
export function HeaderPopoverList({ pathname, firstLinkRef, onNavigate }: PopoverListProps) {
  return (
    <ul className="flex flex-col gap-1 list-none m-0 p-0">
      {NAV_LINKS.map((link, i) => {
        const isActive = pathname === link.href;
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              ref={i === 0 ? firstLinkRef : undefined}
              aria-current={isActive ? 'page' : undefined}
              onClick={onNavigate}
              className={`block px-3 py-2.5 rounded-xl text-base outline-none motion-safe:transition-colors active:scale-95 motion-safe:transition-transform hover:bg-pl-accent/20 hover:text-pl-accent-deep focus-visible:outline-none focus-visible:bg-pl-accent/20 focus-visible:text-pl-accent-deep focus-visible:ring-2 focus-visible:ring-pl-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-pl-paper ${
                isActive ? 'bg-pl-accent/20 text-pl-accent-deep' : 'text-pl-text'
              }`}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
      <li className="mt-2">
        <Button
          href={CTA.href}
          onClick={onNavigate}
          className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-pl-accent text-pl-on-accent text-sm font-medium"
        >
          {CTA.label}
          <ButtonArrow>
            <ChevronRightIcon className="h-4 w-4" />
          </ButtonArrow>
        </Button>
      </li>
    </ul>
  );
}
