'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { buildAuswahlStateKey, type EventTypeTab } from '@/lib/homepage/eventTypeTabs';
import AuswahlBandCard, { type AuswahlBandSummary } from './AuswahlBandCard';

type Props = {
  tabs: EventTypeTab[];
  bandsByState: Record<string, AuswahlBandSummary[]>;
};

// Baut das Finder-Linkziel fuer die aktuelle Anlass-/Mood-Auswahl. Spiegelt
// bewusst dasselbe URLSearchParams-Pattern wie buildUrl() in
// components/bands/BandExplorer.tsx (dort nicht exportiert, daher hier
// nicht importiert, aber identisch gehalten) statt fragiler
// String-Konkatenation.
function buildFinderHref(anlassSlug: string, moodSlug: string | null): string {
  const p = new URLSearchParams();
  p.set('anlass', anlassSlug);
  if (moodSlug) p.set('mood', moodSlug);
  return `/bands?${p.toString()}`;
}

// Tabs + Moods + Cards fuer "01 -- Auswahl". Die drei sichtbaren Bands je
// Zustand (Anlass, optional + Mood) werden bereits serverseitig
// (app/page.tsx, lib/homepage/bandRotation.ts) deterministisch fuer den
// aktuellen Kalendertag berechnet und komplett als Props hereingereicht --
// dieser Client-Component schaltet nur zwischen den bereits fertigen
// Arrays um. Kein clientseitiges Nachladen, kein Math.random(), keine
// Hydration-Diskrepanz moeglich.
export default function AuswahlSection({ tabs, bandsByState }: Props) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key ?? '');
  const [selectedMoodSlug, setSelectedMoodSlug] = useState<string | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const activeTab = tabs.find((t) => t.key === activeKey) ?? tabs[0];
  const activeBands = activeTab
    ? (bandsByState[buildAuswahlStateKey(activeTab.key, selectedMoodSlug)] ?? [])
    : [];

  function selectTab(key: string) {
    setActiveKey(key);
    // Anlass-Wechsel darf keinen Mood-Zustand aus dem vorherigen Anlass
    // mitschleppen -- Moods sind bewusst nicht anlass-uebergreifend gedacht.
    setSelectedMoodSlug(null);
  }

  function toggleMood(slug: string) {
    setSelectedMoodSlug((current) => (current === slug ? null : slug));
  }

  function focusTab(index: number) {
    const tab = tabs[index];
    if (!tab) return;
    selectTab(tab.key);
    tabRefs.current[tab.key]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusTab((index + 1) % tabs.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusTab((index - 1 + tabs.length) % tabs.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusTab(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusTab(tabs.length - 1);
    }
  }

  if (!activeTab) return null;

  // Einmal berechnet, an zwei DOM-Stellen eingehaengt (Schritt 6/7: responsive
  // CTA-Position ausdrueckl. NICHT ueber Flex-/Grid-`order`, sondern ueber
  // zwei echte Mount-Punkte + `hidden`/`md:hidden`, damit Tastatur-
  // Fokusreihenfolge und visuelle Reihenfolge je Breakpoint uebereinstimmen
  // und immer nur ein CTA im Accessibility-/Fokus-Baum steht). Identische
  // URL-Berechnung, Wording und Styles an beiden Stellen -- keine zweite CTA-
  // Implementierung.
  const ctaLink = (
    <Link
      href={buildFinderHref(activeTab.finderAnlassSlug, selectedMoodSlug)}
      className="inline-flex items-center min-h-[44px] text-sm font-semibold text-pl-accent-deep hover:text-pl-accent-link-hover motion-safe:transition-colors"
    >
      {activeTab.finderLinkLabel} →
    </Link>
  );

  return (
    <section className="bg-pl-paper py-16 md:py-24 px-4 sm:px-6">
      <div className="pl-container-shell">
        <p className="text-xs font-semibold text-pl-accent uppercase tracking-wider">
          01 — Entdecken
        </p>
        <h2 className="mt-4 text-3xl md:text-[40px] leading-[1.15] font-extrabold tracking-tight text-pl-text">
          Livebands entdecken
        </h2>

        <div
          role="tablist"
          aria-label="Anlass wählen"
          className="flex flex-wrap gap-2 mt-9 md:mt-11"
        >
          {tabs.map((tab, index) => {
            const isActive = tab.key === activeTab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                id={`auswahl-tab-${tab.key}`}
                aria-selected={isActive}
                aria-controls={`auswahl-panel-${tab.key}`}
                tabIndex={isActive ? 0 : -1}
                ref={(el) => {
                  tabRefs.current[tab.key] = el;
                }}
                onClick={() => selectTab(tab.key)}
                onKeyDown={(e) => onKeyDown(e, index)}
                className={`cursor-pointer px-5 py-2.5 rounded-full text-sm font-semibold border
                            motion-safe:transition-[background-color,border-color,color,transform,box-shadow] motion-safe:duration-150 motion-safe:ease-out
                            motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 motion-safe:active:scale-[0.98]
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pl-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-pl-paper
                            ${
                              isActive
                                ? 'bg-pl-accent text-pl-on-accent border-pl-accent'
                                : 'bg-pl-elevated text-pl-accent-deep border-pl-border-medium hover:border-pl-accent'
                            }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`auswahl-panel-${activeTab.key}`}
          aria-labelledby={`auswahl-tab-${activeTab.key}`}
          className="mt-6"
        >
          {activeTab.moods.length > 0 && (
            <div className="mt-1 mb-6">
              <span className="block text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-2.5">
                Klingt nach
              </span>
              <div className="flex flex-wrap gap-2">
                {activeTab.moods.map((mood) => {
                  const isActive = mood.slug === selectedMoodSlug;
                  return (
                    <button
                      key={mood.slug}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => toggleMood(mood.slug)}
                      className={`cursor-pointer px-3.5 py-1.5 rounded-full text-xs border
                                  motion-safe:transition-[background-color,border-color,color,transform,box-shadow] motion-safe:duration-150 motion-safe:ease-out
                                  motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 motion-safe:active:scale-[0.98]
                                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pl-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-pl-paper
                                  ${
                                    isActive
                                      ? 'bg-pl-accent-subtle text-pl-accent-deep border-pl-accent font-semibold shadow-sm'
                                      : 'bg-transparent text-pl-text-muted border-pl-border-medium font-medium hover:border-pl-accent hover:bg-pl-accent-subtle/60'
                                  }`}
                    >
                      {mood.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mobile: Anlass -> Klingt nach -> CTA -> Bandkarten (bewusste Produktentscheidung).
              Eigenes DOM-Element statt Flex-/Grid-`order`, damit die Tastatur-Fokusreihenfolge
              der visuellen Reihenfolge entspricht. */}
          <div className="mb-7 md:hidden">{ctaLink}</div>

          {activeBands.length === 0 ? (
            <p className="text-pl-text-muted">
              Aktuell sind hier noch keine passenden Bands hinterlegt.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeBands.map((band, i) => (
                <AuswahlBandCard key={band.slug} band={band} priority={i === 0} />
              ))}
            </div>
          )}

          {/* Desktop: Anlass -> Klingt nach -> Bandkarten -> CTA. */}
          <div className="mt-7 hidden md:block">{ctaLink}</div>
        </div>
      </div>
    </section>
  );
}
