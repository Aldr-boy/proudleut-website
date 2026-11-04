'use client';

import { useEffect } from 'react';

// Blendet auf Bandseiten (nur Handy, bis 767 px) das schwebende Datenschutz-
// Symbol des Usercentrics-CMP aus. Es sitzt im Shadow-DOM von
// #usercentrics-root (Klasse .privacyButton), daher per Style-Tag im
// Shadow-Root. Der Dialog bleibt ueber den Datenschutz-Knopf in der unteren
// Leiste (BandFloatingCta, openSettings) erreichbar. Beim Verlassen der Seite
// wird der Style entfernt. Ab 768 px bleibt das Symbol unveraendert.
const STYLE_ID = 'pl-hide-privacy-button';
const CSS = '@media (max-width: 767px) { .privacyButton { display: none !important; } }';

export function HidePrivacyFloatButton() {
  useEffect(() => {
    let style: HTMLStyleElement | null = null;

    const apply = () => {
      const root = document.getElementById('usercentrics-root')?.shadowRoot;
      if (!root) return false;
      if (!root.getElementById(STYLE_ID)) {
        style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = CSS;
        root.appendChild(style);
      }
      return true;
    };

    // Der CMP-Loader laedt asynchron: bis der Shadow-Root da ist, kurz pruefen.
    let tries = 0;
    const timer = window.setInterval(() => {
      if (apply() || ++tries > 40) window.clearInterval(timer);
    }, 250);
    apply();

    return () => {
      window.clearInterval(timer);
      style?.remove();
    };
  }, []);

  return null;
}
