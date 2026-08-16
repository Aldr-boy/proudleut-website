'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import type { Band } from '@/lib/types/band';
import type { EventTypeTab } from '@/lib/homepage/eventTypeTabs';
import AuswahlBandCard from './AuswahlBandCard';

type Props = {
  tabs: EventTypeTab[];
  bandsByTab: Record<string, Band[]>;
};

// Tabs + Cards fuer "01 -- Auswahl". Die drei sichtbaren Bands je Tab
// werden bereits serverseitig (app/page.tsx, lib/homepage/bandRotation.ts)
// deterministisch fuer den aktuellen Kalendertag berechnet und komplett
// als Props hereingereicht -- dieser Client-Component schaltet nur
// zwischen den vier bereits fertigen Arrays um. Kein clientseitiges
// Nachladen, kein Math.random(), keine Hydration-Diskrepanz moeglich.
export default function AuswahlSection({ tabs, bandsByTab }: Props) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key ?? '');
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const activeTab = tabs.find((t) => t.key === activeKey) ?? tabs[0];
  const activeBands = activeTab ? (bandsByTab[activeTab.key] ?? []) : [];

  function focusTab(index: number) {
    const tab = tabs[index];
    if (!tab) return;
    setActiveKey(tab.key);
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
                onClick={() => setActiveKey(tab.key)}
                onKeyDown={(e) => onKeyDown(e, index)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold border motion-safe:transition-colors
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

          <div className="mt-7 text-right">
            <Link
              href={`/bands?anlass=${activeTab.finderAnlassSlug}`}
              className="text-sm font-semibold text-pl-accent-deep hover:text-pl-accent-link-hover motion-safe:transition-colors"
            >
              {activeTab.finderLinkLabel} →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
