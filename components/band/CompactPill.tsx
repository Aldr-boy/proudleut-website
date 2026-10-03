'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProudleutLogo } from '@/components/ProudleutLogo';
import { HeaderPopoverList } from '@/components/HeaderMenuLinks';
import { Button } from '@/components/ui/Button';
import { BandMerkHeart } from './BandMerkHeart';
import type { BandAnfrageEventType } from '@/lib/types/band';
import type { BandFact } from '@/lib/bands/bandFacts';
import { layoutCompactFacts, type FactKey, type FactWidths } from '@/lib/bands/compactFacts';

type Props = {
  name: string;
  slug: string;
  anfrageEventTypes: BandAnfrageEventType[];
  facts: BandFact[];
  // Die kompakte Pille ist gerade die aktive Flaeche (BandFloatingCta). Nur dann
  // sichtbar, benutzbar und im Accessibility-Tree; sonst inert und unsichtbar.
  active: boolean;
  onRequest: () => void;
};

const POPOVER_ID = 'compact-pill-menu';
const FACT_KEYS: Record<string, FactKey> = { Herkunft: 'herkunft', Besetzung: 'besetzung', Stil: 'stil' };
const ORDER: FactKey[] = ['herkunft', 'besetzung', 'stil'];

function BurgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// Kompakte Header-Pille (ab 1024 px, Bandseiten): Logo, die vorhandenen Fakten,
// Merken, "Unverbindlich anfragen" und ein Menue fuer die uebrigen
// Navigationslinks. Wird von BandFloatingCta per createPortal in den Slot des
// Headers (data-header-slot) gerendert und gehoert damit zum selben Modal- und
// Herz-Zustand. 66 px hoch (wie die normale Pille), Breite min(Viewport - 32,
// 1140), mittig, opak ueber der normalen Pille (die darunter sichtbar, aber
// inert und aria-hidden bleibt, damit das Rechteck des <header> und
// --pl-nav-height unveraendert sind).
//
// Landmark: genau ein <nav> -- nur um den Menue-Cluster (Knopf + Popover), das
// Logo steht wie in der normalen Pille ausserhalb. Ausgeblendet: invisible +
// opacity-0 + inert, sofort; nur das Einblenden laeuft als Fade (motion-safe).
export function CompactPill({ name, slug, anfrageEventTypes, facts, active, onRequest }: Props) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
  }
  // Wird die Pille inaktiv (Hero-Button wieder benutzbar, Resize unter 1024 px),
  // schliesst das Popover mit (Anpassung beim Rendern statt setState im Effekt).
  if (!active && menuOpen) setMenuOpen(false);
  const open = menuOpen && active;

  const navRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      // Escape gehoert zuerst dem Anfrage-Modal (natives <dialog>): solange eines
      // offen ist, bleibt das Popover offen.
      if (document.querySelector('dialog[open]')) return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }
    function onPointerDown(e: PointerEvent) {
      if (!navRef.current || navRef.current.contains(e.target as Node)) return;
      setMenuOpen(false);
      // Landet der Klick auf einer nicht fokussierbaren Flaeche, faellt der Fokus
      // sonst auf body: dann zurueck zum Menue-Knopf. Ein fokussierbares Ziel behaelt
      // den Fokus.
      requestAnimationFrame(() => {
        const current = document.activeElement;
        if (!current || current === document.body) menuButtonRef.current?.focus({ preventScroll: true });
      });
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) firstLinkRef.current?.focus();
  }, [open]);

  // ---- Fakten: natuerliche Breiten messen (verstecktes Messelement), verfuegbare
  // Breite aus dem Fakten-Feld; die Auswahl trifft die reine Funktion
  // layoutCompactFacts (lib/bands/compactFacts.ts). Gemessen im ResizeObserver-
  // Callback (nicht synchron im Effekt) und nach dem Laden der Schrift.
  const factsRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [widths, setWidths] = useState<FactWidths>({});
  const [available, setAvailable] = useState(0);

  useEffect(() => {
    const measure = () => {
      const next: FactWidths = {};
      measureRef.current?.querySelectorAll<HTMLElement>('[data-fact]').forEach((el) => {
        next[el.dataset.fact as FactKey] = Math.ceil(el.getBoundingClientRect().width);
      });
      setWidths((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      setAvailable(Math.floor(factsRef.current?.getBoundingClientRect().width ?? 0));
    };
    const observer = new ResizeObserver(measure);
    if (factsRef.current) observer.observe(factsRef.current);
    if (measureRef.current) observer.observe(measureRef.current);
    void document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [facts]);

  const byKey = new Map<FactKey, BandFact>();
  for (const f of facts) {
    const key = FACT_KEYS[f.label];
    if (key) byKey.set(key, f);
  }
  // Nur Fakten mit gemessener Breite zaehlen als vorhanden fuer die Auswahl.
  const measured: FactWidths = {};
  for (const key of ORDER) if (byKey.has(key) && widths[key] !== undefined) measured[key] = widths[key];
  const layout = layoutCompactFacts(available, measured);
  const shown = ORDER.filter((key) => {
    const state = layout[key];
    return state === 'shown' || state === 'full' || state === 'truncated';
  });

  const visibleClasses = 'visible opacity-100 pointer-events-auto motion-safe:transition-opacity motion-safe:duration-150';
  const hiddenClasses = 'invisible opacity-0 pointer-events-none transition-none';

  return (
    <div
      data-compact-pill
      inert={!active}
      className={`absolute z-20 top-0 left-1/2 -translate-x-1/2 h-full w-[min(calc(100vw-2rem),1140px)] ${
        active ? visibleClasses : hiddenClasses
      }`}
    >
      <div className="h-full bg-pl-paper border border-pl-soft shadow-[0_8px_30px_rgba(42,34,38,0.12)] rounded-full pl-6 pr-2 flex items-center gap-3">
        <Link
          href="/"
          aria-label="Zur Startseite"
          className="shrink-0 flex items-center p-2 rounded-full active:scale-95 motion-safe:transition-transform"
        >
          <ProudleutLogo className="h-7 w-auto text-pl-text" />
        </Link>

        <div ref={factsRef} className="relative flex-1 min-w-0 h-12 overflow-hidden">
          <dl className="flex items-center h-full">
            {shown.map((key, i) => {
              const fact = byKey.get(key)!;
              const isHerkunft = key === 'herkunft';
              const truncated = isHerkunft && layout.herkunft === 'truncated';
              return (
                <div
                  key={key}
                  className={`flex flex-col gap-0.5 shrink-0 min-w-0 ${i > 0 ? 'ml-5 pl-5 border-l border-pl-soft' : ''}`}
                  style={truncated && layout.herkunftWidth !== null ? { width: layout.herkunftWidth } : undefined}
                >
                  <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-pl-text-muted">{fact.label}</dt>
                  <dd
                    title={truncated ? fact.value : undefined}
                    className={`text-sm font-bold text-pl-text ${truncated ? 'truncate' : 'whitespace-nowrap'}`}
                  >
                    {fact.value}
                  </dd>
                </div>
              );
            })}
          </dl>
          {/* Messelement: natuerliche Breiten, unsichtbar, nicht im Accessibility-Tree */}
          <div
            ref={measureRef}
            aria-hidden="true"
            className="absolute left-0 top-0 invisible pointer-events-none flex whitespace-nowrap"
          >
            {ORDER.filter((key) => byKey.has(key)).map((key) => (
              <div key={key} data-fact={key} className="inline-flex flex-col gap-0.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em]">{byKey.get(key)!.label}</span>
                <span className="text-sm font-bold">{byKey.get(key)!.value}</span>
              </div>
            ))}
          </div>
        </div>

        <BandMerkHeart
          name={name}
          slug={slug}
          anfrageEventTypes={anfrageEventTypes}
          tone="light"
          className="w-12 h-12"
        />
        <Button
          onClick={onRequest}
          aria-label={`${name} unverbindlich anfragen`}
          className="shrink-0 inline-flex items-center justify-center h-12 px-[26px] rounded-full text-base font-bold
                     bg-pl-accent text-pl-on-accent hover:bg-pl-accent-hover"
        >
          Unverbindlich anfragen
        </Button>

        <nav ref={navRef} aria-label="Hauptnavigation" className="shrink-0">
          <button
            ref={menuButtonRef}
            type="button"
            className="w-12 h-12 inline-flex items-center justify-center rounded-full bg-pl-accent text-pl-on-accent hover:bg-pl-accent-hover active:scale-95 motion-safe:transition-transform"
            aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={open}
            aria-controls={POPOVER_ID}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {open ? <CloseIcon /> : <BurgerIcon />}
          </button>
          {/* Popover: absolut unter der Pille (Bezug: die absolut positionierte
              Pillen-Huelle), aendert die Hoehe des <header> nicht. */}
          <div
            id={POPOVER_ID}
            hidden={!open}
            className="absolute right-2 top-[calc(100%+8px)] w-72 rounded-2xl bg-pl-paper border border-pl-soft shadow-[0_8px_30px_rgba(42,34,38,0.12)] p-3"
          >
            <HeaderPopoverList pathname={pathname} firstLinkRef={firstLinkRef} onNavigate={() => setMenuOpen(false)} />
          </div>
        </nav>
      </div>
    </div>
  );
}
