'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProudleutLogo } from './ProudleutLogo';
import { Button, ButtonArrow } from '@/components/ui/Button';
import { useHeaderSlotStore } from '@/stores/headerSlotStore';
import { CTA, ChevronRightIcon, HeaderMenuLinks, MOBILE_MENU_ID, NAV_LINKS } from './HeaderMenuLinks';

function BurgerIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...props}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Menue bei Routenwechsel schliessen -- als Render-Zeit-Anpassung statt
  // Effekt (React-Empfehlung fuer "State an eine geaenderte Prop anpassen"),
  // damit kein zusaetzlicher Render-Zyklus noetig ist und kein Aufblitzen
  // des noch offenen Menues auf der neuen Seite entsteht.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
  }

  const setSlotEl = useHeaderSlotStore((st) => st.setSlotEl);
  // Kompakte Pille aktiv (Bandseiten ab 1024 px): Die normale Pille bleibt im
  // Fluss und sichtbar darunter, ist aber inert und aria-hidden; die kompakte
  // liegt opak darueber (components/band/CompactPill.tsx).
  const compact = useHeaderSlotStore((st) => st.compact);
  const pillRef = useRef<HTMLElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstMobileLinkRef = useRef<HTMLAnchorElement | null>(null);

  const activeHref = NAV_LINKS.find((l) => l.href === pathname)?.href;

  // Rein dekorative DOM-Positionierung ohne React-State: die Messung
  // schreibt transform/width/opacity direkt auf das Ref-Element. Kein
  // Re-Render fuer eine reine Optik, kein setState in einem Effekt.
  function measureIndicator(href: string) {
    const el = linkRefs.current[href];
    const container = navRef.current;
    const indicatorEl = indicatorRef.current;
    if (!el || !container || !indicatorEl) return;
    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    indicatorEl.style.transform = `translateX(${elRect.left - containerRect.left}px)`;
    indicatorEl.style.width = `${elRect.width}px`;
    indicatorEl.style.opacity = '1';
  }

  function hideIndicator() {
    const indicatorEl = indicatorRef.current;
    if (!indicatorEl) return;
    indicatorEl.style.transform = 'translateX(0px)';
    indicatorEl.style.width = '0px';
    indicatorEl.style.opacity = '0';
  }

  function resetIndicatorToActive() {
    if (activeHref) measureIndicator(activeHref);
    else hideIndicator();
  }

  // Indikator folgt dem aktiven Link (Routenwechsel) und bleibt bei
  // Fenster-Resize korrekt positioniert. Rein dekorativ (aria-hidden),
  // beeinflusst die Bedienung nicht.
  useLayoutEffect(() => {
    resetIndicatorToActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    function onResize() {
      resetIndicatorToActive();
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Nav-Hoehe als CSS-Variable bereitstellen (fuer spaetere scroll-margin-
  // Nutzung), live gemessen statt hart codiert, da sich die Pill-Hoehe
  // zwischen Mobile/Desktop und beim Oeffnen des Mobile-Menues unterscheidet.
  useLayoutEffect(() => {
    const el = pillRef.current;
    if (!el) return;
    const TOP_GAP = 24; // entspricht dem groesseren top-6-Abstand (Desktop)
    function update() {
      if (!el) return;
      document.documentElement.style.setProperty('--pl-nav-height', `${el.offsetHeight + TOP_GAP}px`);
    }
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Schliessen bei Escape, Outside-Click und Routenwechsel. Kein
  // vollstaendiger Focus-Trap, aber Fokus geht beim Schliessen per Escape
  // zurueck auf den Toggle-Button.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!menuOpen) return;
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) firstMobileLinkRef.current?.focus();
  }, [menuOpen]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-pl-accent focus:text-pl-on-accent"
      >
        Zum Inhalt springen
      </a>

      {/* data-nav-footprint: Vertrag fuer BandFloatingCta/barVisibility -- das
          Rechteck dieses <header> ist die feste Geometrie der NORMALEN Pille
          (Logo, Links, "Bands entdecken"), gegen die die Verdeckung des
          Hero-Buttons berechnet wird. Es muss immer das der normalen Pille
          sein: eine spaeter eingefuehrte kompakte Pille liegt absolut darueber
          (Slot), die normale bleibt im Fluss (visibility:hidden, inert). */}
      <header
        ref={pillRef as React.RefObject<HTMLElement>}
        data-nav-footprint
        className="fixed z-50 left-1/2 -translate-x-1/2 top-3 md:top-6 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-md md:w-auto md:max-w-none"
      >
        <div
          data-pill-normal
          inert={compact}
          aria-hidden={compact || undefined}
          className={`bg-pl-paper border border-pl-soft rounded-[1.75rem] md:rounded-full ${
            compact
              ? 'shadow-none motion-safe:transition-shadow motion-safe:duration-200'
              : 'shadow-[0_8px_30px_rgba(42,34,38,0.12)]'
          }`}
        >
          <div className="h-14 md:h-16 pl-3 pr-2 md:pl-6 md:pr-2 flex items-center justify-between gap-2 md:gap-4">
            <Link
              href="/"
              aria-label="Zur Startseite"
              className="shrink-0 flex items-center p-2 rounded-full active:scale-95 motion-safe:transition-transform"
            >
              <ProudleutLogo className="h-6 md:h-7 w-auto text-pl-text" />
            </Link>

            {/* Desktop-Navigation */}
            <nav
              ref={navRef as React.RefObject<HTMLElement>}
              className="hidden md:flex shrink-0 items-center gap-1 relative"
              aria-label="Hauptnavigation"
            >
              <span
                ref={indicatorRef}
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-9 rounded-full bg-pl-accent/20 motion-safe:transition-[transform,width,opacity] motion-safe:duration-300 motion-safe:ease-out"
                style={{ transform: 'translateX(0px)', width: '0px', opacity: 0 }}
              />
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    ref={(el) => {
                      linkRefs.current[link.href] = el;
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    onMouseEnter={() => measureIndicator(link.href)}
                    onFocus={() => measureIndicator(link.href)}
                    onMouseLeave={resetIndicatorToActive}
                    onBlur={resetIndicatorToActive}
                    className={`relative z-10 whitespace-nowrap px-4 py-2 rounded-full text-sm outline-none motion-safe:transition-colors active:scale-95 motion-safe:transition-transform hover:text-pl-accent-deep focus-visible:outline-none focus-visible:text-pl-accent-deep focus-visible:ring-2 focus-visible:ring-pl-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-pl-paper ${
                      isActive ? 'text-pl-accent-deep' : 'text-pl-text'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop-CTA: dunkel, nur im Hover lila. Hover/Klick/Fokus
                kommen jetzt einheitlich aus components/ui/Button.tsx. */}
            <Button
              href={CTA.href}
              className="hidden md:inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-5 py-2.5 rounded-full bg-pl-text text-pl-paper text-sm font-medium hover:bg-pl-accent hover:text-pl-on-accent motion-safe:transition-colors"
            >
              {CTA.label}
              <ButtonArrow>
                <ChevronRightIcon className="h-4 w-4" />
              </ButtonArrow>
            </Button>

            {/* Mobile Toggle */}
            <button
              ref={menuButtonRef}
              type="button"
              className="md:hidden shrink-0 p-2.5 rounded-full bg-pl-accent text-pl-on-accent active:scale-95 motion-safe:transition-transform"
              aria-label={menuOpen ? 'Menü schließen' : 'Menü öffnen'}
              aria-expanded={menuOpen}
              aria-controls={MOBILE_MENU_ID}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <CloseIcon /> : <BurgerIcon />}
            </button>
          </div>

          {/* Mobile: dieselbe Pill waechst nach unten (HeaderMenuLinks.tsx). */}
          <HeaderMenuLinks
            menuOpen={menuOpen}
            pathname={pathname}
            firstLinkRef={firstMobileLinkRef}
            onNavigate={() => setMenuOpen(false)}
          />
        </div>

        {/* Leerer Slot fuer seitenspezifischen Inhalt (stores/headerSlotStore.ts).
            Absolut positioniert und ohne Inhalt: keine Hoehe, kein Flex-Eintrag,
            kein Tab-Stopp, kein Landmark. */}
        <div ref={setSlotEl} data-header-slot className="pointer-events-none absolute inset-0" />
      </header>
    </>
  );
}
