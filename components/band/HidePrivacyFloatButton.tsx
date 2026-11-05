'use client';

import { useEffect } from 'react';

// Blendet auf Bandseiten (nur Handy, bis 767 px) das schwebende Datenschutz-
// Symbol des Usercentrics-CMP aus. Es ist Teil der CMP-Oberflaeche (Klasse
// .privacyButton) und liegt im offenen Shadow-DOM des Elements
// #usercentrics-cmp-ui (aktuelle CMP-Version; #usercentrics-root hiess es in
// aelteren Versionen, daher beide). Der Stil kommt als adoptedStyleSheet in den
// Shadow-Root: er bleibt erhalten, auch wenn der CMP seine Oberflaeche neu
// aufbaut (aeltere Browser: Style-Tag). Der Dialog bleibt ueber den Datenschutz-
// Knopf in der unteren Leiste (BandFloatingCta, openSettings) und den Footer-
// Link erreichbar. Beim Verlassen der Seite wird der Stil entfernt. Ab 768 px
// bleibt das Symbol unveraendert.
const HOST_IDS = ['usercentrics-cmp-ui', 'usercentrics-root'];
const CSS = '@media (max-width: 767px) { .privacyButton { display: none !important; } }';

export function HidePrivacyFloatButton() {
  useEffect(() => {
    const canAdopt = typeof CSSStyleSheet !== 'undefined' && 'adoptedStyleSheets' in Document.prototype;
    let sheet: CSSStyleSheet | null = null;
    if (canAdopt) {
      sheet = new CSSStyleSheet();
      sheet.replaceSync(CSS);
    }
    let styleEl: HTMLStyleElement | null = null;
    let appliedTo: ShadowRoot | null = null;

    const apply = () => {
      for (const id of HOST_IDS) {
        const root = document.getElementById(id)?.shadowRoot;
        if (!root) continue;
        if (sheet) {
          if (!root.adoptedStyleSheets.includes(sheet)) {
            root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
          }
        } else if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.textContent = CSS;
          root.appendChild(styleEl);
        }
        appliedTo = root;
        return true;
      }
      return false;
    };

    // Der CMP-Loader laedt asynchron: bis der Shadow-Root da ist, bis zu 60 s pruefen.
    let tries = 0;
    const timer = window.setInterval(() => {
      if (apply() || ++tries > 120) window.clearInterval(timer);
    }, 500);
    apply();

    return () => {
      window.clearInterval(timer);
      styleEl?.remove();
      if (sheet && appliedTo) {
        const adopted = sheet;
        appliedTo.adoptedStyleSheets = appliedTo.adoptedStyleSheets.filter((s) => s !== adopted);
      }
    };
  }, []);

  return null;
}
