'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { AnfrageModal } from './AnfrageModal';
import { BandMerkHeart } from './BandMerkHeart';
import { Button } from '@/components/ui/Button';
import { useAnfrageStore } from '@/stores/anfrageStore';
import type { BandAnfrageEventType } from '@/lib/types/band';
import type { BandFact } from '@/lib/bands/bandFacts';
import { computeBarVisible } from '@/lib/bands/barVisibility';
import { bottomBarActive, compactPillActive } from '@/lib/bands/compactPillActive';
import { useHeaderSlot, useHeaderSlotStore } from '@/stores/headerSlotStore';
import { CompactPill } from './CompactPill';

type Props = {
  name: string;
  slug: string;
  anfrageEventTypes: BandAnfrageEventType[];
  facts: BandFact[];
  // Id des Anfrage-Buttons im Hero (siehe HeroCTA.tsx). Existiert er nicht
  // (Band ohne Bandbild -> kurzer Kopf), sind die Leisten von Anfang an
  // sichtbar und tragen den einzigen Anfrage-Button der Seite.
  heroButtonId: string;
  hasHeroButton: boolean;
  // Id des Wrappers um den Anfrage-Button der CTA-Karte (BandCtaSection.tsx).
  ctaButtonId: string;
};

// Kompakte Header-Pille (ab 1024 px, siehe CompactPill.tsx) und untere
// Anfrageleiste (bis 1023 px), Variante E.
//
// Die Entscheidung "Leiste sichtbar" faellt in lib/bands/barVisibility.ts (reine
// Funktion, dort die Regeln und die Wertetabelle im Test): sichtbar, wenn der
// Hero-Button nicht mehr benutzbar ist (< 50 % sichtbar bzw. von der Header-
// Pill verdeckt, oberhalb) und der Button der CTA-Karte noch nicht benutzbar
// ist (unterhalb). So steht zu jedem Scrollstand hoechstens EIN benutzbarer
// "Unverbindlich anfragen"-Button, und zwischen Hero-Button und CTA-Karte gibt
// es keine Luecke.
//
// Auswertung rein ueber Geometrie bei Scroll, Resize und Layoutaenderungen
// (ResizeObserver auf body), per requestAnimationFrame gedrosselt: erst lesen
// (Rects inkl. Header-Pille, Hoehe der MerklisteBar), dann ein einziger
// Schreibvorgang. Anders als ein Observer liefert sie nach jedem
// Scroll-Sprung (Scrollbar-Drag, Pos1/Ende, interner Sprunglink, Reload mitten
// im Text) den echten Zustand statt eines veralteten.
//
// Kein Layout-Sprung: die Bottom-Bar ist position:fixed (aus dem Fluss), die
// kompakte Pille liegt absolut im Header-Slot. Der
// Steckbrief (bis 1023 px) steht statisch im Seitenfluss (BandHero.tsx). Ausgeblendet:
// visibility:hidden + inert -- nichts darin ist fokussierbar; der Fokus wird
// beim Einblenden nicht verschoben.
//
// Ausblenden ist sofort (transition-none, Opacity 0, visibility hidden und
// inert im selben Frame; der Zustand wird per flushSync noch im rAF-Callback
// committed, bevor der Frame gezeichnet wird). Nur das Einblenden laeuft mit
// der 220-ms-Transition (bei reduzierter Bewegung ohne Slide, siehe
// motion-safe:), damit die Leiste nie mit Opacity > 0 neben einem benutzbaren
// Button steht.
// Fokus bei einem Wechsel zwischen normaler und kompakter Pille. Liegt der Fokus
// auf einem Element, das beim Wechsel verschwindet (inert wird), wandert er auf
// ein sinnvolles verfuegbares Element, nie auf body:
//   normal -> kompakt: Logo -> Logo der kompakten Pille; Navigationslink oder
//     "Bands entdecken" -> Menue-Knopf der kompakten Pille.
//   kompakt -> normal: "Unverbindlich anfragen" -> Hero-Button, Herz -> Hero-Herz
//     (jeweils nur, wenn verfuegbar); sonst (Menue-Knopf, Popover-Link, Logo oder
//     Hero-Element nicht verfuegbar) Logo der normalen Pille.
// Liegt der Fokus ausserhalb der betroffenen Pille, bleibt er unberuehrt.
function moveFocusOnSwitch(previous: Element | null, toCompact: boolean, heroButtonId: string) {
  if (!previous || previous === document.body) return;
  const compactRoot = document.querySelector('[data-compact-pill]');
  const normalRoot = document.querySelector('[data-pill-normal]');
  const logoSelector = 'a[aria-label="Zur Startseite"]';
  const find = (root: Element | null, selector: string) => root?.querySelector<HTMLElement>(selector) ?? null;
  const usable = (el: HTMLElement | null): el is HTMLElement =>
    !!el && el.isConnected && !(el as HTMLButtonElement).disabled && !el.closest('[inert]') && el.getClientRects().length > 0;

  let target: HTMLElement | null = null;
  if (toCompact) {
    if (!normalRoot?.contains(previous)) return;
    target = previous.matches(logoSelector) ? find(compactRoot, logoSelector) : find(compactRoot, 'nav button[aria-controls]');
  } else {
    if (!compactRoot?.contains(previous)) return;
    const label = previous.getAttribute('aria-label') ?? '';
    const hero = document.getElementById(heroButtonId);
    if (label.endsWith('unverbindlich anfragen')) target = hero;
    else if (label.endsWith('für Anfrage merken') || label.endsWith('aus Anfrage entfernen')) target = hero?.nextElementSibling as HTMLElement | null;
    if (!usable(target)) target = find(normalRoot, logoSelector);
  }
  if (usable(target)) target.focus({ preventScroll: true });
}

export function BandFloatingCta({
  name,
  slug,
  anfrageEventTypes,
  facts,
  heroButtonId,
  hasHeroButton,
  ctaButtonId,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  // Start-Zustand wie bisher: bei Bands mit Hero-Button zunaechst ausgeblendet
  // (nichts blitzt beim Laden auf), ohne Hero-Button von Anfang an sichtbar.
  // Zwei Flaechen, hoechstens eine aktiv: kompakte Header-Pille (ab 1024 px) oder
  // untere Anfrageleiste (bis 1023 px), siehe lib/bands/compactPillActive.ts.
  const [mode, setMode] = useState({ compact: false, bottom: !hasHeroButton });
  const modeRef = useRef(mode);
  const slotEl = useHeaderSlot();
  const [merklisteBarHeight, setMerklisteBarHeight] = useState(0);
  const merklisteBandsCount = useAnfrageStore((s) => s.bands.length);

  // Echte Kollisionsloesung statt eines hoeheren z-index: die globale
  // Merkliste-Leiste (MerklisteBar.tsx, ebenfalls "fixed bottom-0") hat per
  // id="merkliste-bar" eine feste Referenz, deren gerenderte Hoehe hier
  // gemessen und als bottom-Offset der mobilen Leiste uebernommen wird.
  // merklisteBandsCount triggert die Neumessung, wenn die Merkliste ein-/
  // ausgeblendet wird oder ihre Hoehe sich aendert.
  useEffect(() => {
    const el = document.getElementById('merkliste-bar');
    setMerklisteBarHeight(el?.offsetHeight ?? 0);
  }, [merklisteBandsCount]);

  // Beim Verlassen der Bandseite die normale Pille im Header wieder freigeben.
  useEffect(() => {
    return () => useHeaderSlotStore.getState().setCompact(false);
  }, []);

  useEffect(() => {
    let rafScheduled = false;

    const evaluate = () => {
      rafScheduled = false;

      // --- nur lesen ---
      const viewportHeight = window.innerHeight;
      const merklisteHeight = document.getElementById('merkliste-bar')?.offsetHeight ?? 0;
      const heroEl = hasHeroButton ? document.getElementById(heroButtonId) : null;
      const ctaEl = document.getElementById(ctaButtonId);
      const heroRect = heroEl?.getBoundingClientRect() ?? null;
      const ctaRect = ctaEl?.getBoundingClientRect() ?? null;

      // Verdeckung des Hero-Buttons durch die Header-Pill: rein geometrisch gegen
      // das Rechteck des Elements mit data-nav-footprint (Header.tsx, immer die
      // normale Pille), siehe isCoveredByPill in lib/bands/barVisibility.ts.
      // Keine Abhaengigkeit von Leiste, Dialogen oder der angezeigten Pillenform.
      // Gibt es das Element nicht, gilt der Hero-Button als nicht verdeckt.
      const pillRect = document.querySelector('[data-nav-footprint]')?.getBoundingClientRect() ?? null;

      const barOn = computeBarVisible({
        hasHeroButton,
        hero: heroRect,
        pill: pillRect,
        cta: ctaRect,
        viewportHeight,
        merklisteHeight,
      });

      // Welche Flaeche: breit (ab 1024 px) -> kompakte Pille, sonst Bottom-Bar.
      // Ohne Hero-Button erst, wenn der kurze Kopf (h1) aus dem Bild ist.
      const wide = window.matchMedia('(min-width: 1024px)').matches;
      const h1Bottom = document.querySelector('h1')?.getBoundingClientRect().bottom ?? null;
      const headPassed = h1Bottom === null || pillRect === null || h1Bottom <= pillRect.bottom;
      const next = {
        compact: compactPillActive({ barVisible: barOn, wide, hasHeroButton, headPassed }),
        bottom: bottomBarActive({ barVisible: barOn, wide }),
      };

      // --- ein einziger Schreibvorgang, noch vor dem Zeichnen dieses Frames ---
      if (next.compact !== modeRef.current.compact || next.bottom !== modeRef.current.bottom) {
        const previousFocus = document.activeElement;
        const compactChanged = next.compact !== modeRef.current.compact;
        modeRef.current = next;
        flushSync(() => {
          setMode(next);
          useHeaderSlotStore.getState().setCompact(next.compact);
        });
        if (compactChanged) moveFocusOnSwitch(previousFocus, next.compact, heroButtonId);
      }
    };

    const scheduleEvaluate = () => {
      if (rafScheduled) return;
      rafScheduled = true;
      requestAnimationFrame(evaluate);
    };

    scheduleEvaluate();
    window.addEventListener('scroll', scheduleEvaluate, { passive: true });
    window.addEventListener('resize', scheduleEvaluate);
    const wideQuery = window.matchMedia('(min-width: 1024px)');
    wideQuery.addEventListener('change', scheduleEvaluate);
    // Layoutaenderungen ohne Scroll (Bilder, aufgeklappte Texte, "+N weitere").
    const resizeObserver = new ResizeObserver(scheduleEvaluate);
    resizeObserver.observe(document.body);
    // Breite der normalen Pille aendert sich z. B. durch spaet geladene Schrift:
    // nur neu auswerten (das Rechteck des <header> haengt nicht vom Zustand ab).
    const footprint = document.querySelector('[data-nav-footprint]');
    if (footprint) resizeObserver.observe(footprint);

    return () => {
      resizeObserver.disconnect();
      wideQuery.removeEventListener('change', scheduleEvaluate);
      window.removeEventListener('scroll', scheduleEvaluate);
      window.removeEventListener('resize', scheduleEvaluate);
    };
  }, [heroButtonId, ctaButtonId, hasHeroButton, merklisteBandsCount]);

  const visible = mode.bottom;

  // Einblenden: 220-ms-Transition (Opacity/Slide); Ausblenden: sofort
  // (transition-none steht nur im ausgeblendeten Zustand, die Transition-
  // Eigenschaften des Zielzustands gelten).
  const visibleClasses = 'visible opacity-100 translate-y-0 pointer-events-auto';
  const hiddenClasses = 'transition-none invisible opacity-0 pointer-events-none';

  return (
    <>
      {/* Ab lg (1024 px): kompakte Header-Pille statt einer separaten Leiste. Sie
          wird in den Slot des Headers gerendert (data-header-slot), teilt aber
          den Modal- und Herz-Zustand dieser Komponente. */}
      {slotEl &&
        createPortal(
          <CompactPill
            name={name}
            slug={slug}
            anfrageEventTypes={anfrageEventTypes}
            facts={facts}
            active={mode.compact}
            onRequest={() => setModalOpen(true)}
          />,
          slotEl,
        )}

      {/* Bis 1023 px: untere Anfrageleiste (Anfrage + Herz). Die Flaeche hat
          volle Breite, der Inhalt steht ab md (768 px) zentriert in hoechstens
          640 px. Bei aktiver globaler Merkliste (MerklisteBar.tsx, ebenfalls
          "fixed bottom-0") rueckt sie per bottom-Offset (merklisteBarHeight)
          nach oben, statt sie zu verdecken -- ein hoeherer z-index allein loest
          die Kollision nicht, beide Leisten beanspruchen die volle Breite. */}
      <div
        inert={!visible}
        className={`lg:hidden fixed inset-x-0 z-40 bg-pl-elevated/95 backdrop-blur-sm border-t
                    border-pl-soft px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]
                    ${
                      visible
                        ? `transition-[opacity,transform,bottom] duration-[220ms] ease-out ${visibleClasses}`
                        : `motion-safe:translate-y-2 ${hiddenClasses}`
                    }`}
        style={{ bottom: `${merklisteBarHeight}px` }}
      >
        <div className="flex items-center gap-2 md:max-w-[640px] md:mx-auto">
          <Button
            onClick={() => setModalOpen(true)}
            aria-label={`${name} unverbindlich anfragen`}
            className="flex-1 inline-flex items-center justify-center px-6 py-3.5 rounded-full text-sm font-semibold
                       bg-pl-accent text-pl-on-accent hover:bg-pl-accent-hover"
          >
            Unverbindlich anfragen
          </Button>
          <BandMerkHeart
            name={name}
            slug={slug}
            anfrageEventTypes={anfrageEventTypes}
            tone="light"
            className="w-12 h-12"
          />
        </div>
      </div>

      <AnfrageModal
        bands={[{ slug, name, anfrageEventTypes }]}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        allowBandRemoval={false}
      />
    </>
  );
}
