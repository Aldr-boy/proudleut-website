'use client';

// Diagnostic overlay — dev only, never ships to production.
// 1140px container is the actual Ist-Wert from the codebase (hardcoded across all pages).
// Column grid is an assumed measurement grid, NOT an existing proudleut layout system.

import { useState, useEffect } from 'react';

const CONTAINER = 1140; // Ist-Wert aus aktuellem Code (max-w-[1140px])
const PROSE     = 820;  // Ist-Wert BandDescription / BandVideo (max-w-[820px])
const COL_GAP   = 16;   // assumed column gap for diagnostic grid

function bpName(w: number): string {
  if (w >= 1536) return '2xl';
  if (w >= 1280) return 'xl';
  if (w >= 1024) return 'lg';
  if (w >= 768)  return 'md';
  if (w >= 640)  return 'sm';
  return 'xs';
}

function colCount(bp: string): number {
  if (bp === 'xs' || bp === 'sm') return 4;
  if (bp === 'md') return 8;
  return 12;
}

function gutterPx(vw: number): number {
  return vw >= 640 ? 24 : 16; // sm:px-6 (24px) / px-4 (16px)
}

// ─────────────────────────────────────────────────────────────
// Inner component — all hooks here, no early returns above them
// ─────────────────────────────────────────────────────────────
function OverlayInner() {
  const [visible, setVisible] = useState(false);
  const [vw, setVw] = useState(() =>
    typeof window === 'undefined' ? 0 : window.innerWidth
  );

  useEffect(() => {
    // Activate via URL param ?grid
    if (window.location.search.includes('grid')) setVisible(true);

    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'g') return;
      if (!e.ctrlKey && !e.metaKey) return;
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable) return;
      e.preventDefault();
      setVisible(v => !v);
    }
    function onResize() { setVw(window.innerWidth); }

    window.addEventListener('keydown', onKey);
    window.addEventListener('resize',  onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize',  onResize);
    };
  }, []);

  if (!visible) return null;

  const bp      = bpName(vw);
  const cols    = colCount(bp);
  const padding = gutterPx(vw);

  // Only draw fixed-width lines when the container is actually constrained
  const showContainerLines = vw >= CONTAINER + padding * 2;
  const showProseLines     = vw >= PROSE     + padding * 2;

  return (
    <div
      aria-hidden="true"
      style={{
        position:      'fixed',
        top: 0, right: 0, bottom: 0, left: 0,
        zIndex:        9999,
        pointerEvents: 'none',
        overflow:      'hidden',
      }}
    >

      {/* ── Column grid (assumed diagnostic measurement, not existing layout) ── */}
      <div style={{
        position:      'absolute',
        top: 0, right: 0, bottom: 0, left: 0,
        display:        'flex',
        justifyContent: 'center',
        paddingLeft:    padding,
        paddingRight:   padding,
      }}>
        <div style={{
          flex:                 `0 1 ${CONTAINER}px`,
          alignSelf:            'stretch',
          height:               '100%',
          display:              'grid',
          gridTemplateColumns:  `repeat(${cols}, 1fr)`,
          gap:                  COL_GAP,
        }}>
          {Array.from({ length: cols }).map((_, i) => (
            <div
              key={i}
              style={{
                background:  'rgba(117,81,139,0.07)',
                borderLeft:  '1px solid rgba(117,81,139,0.18)',
                borderRight: '1px solid rgba(117,81,139,0.18)',
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Padding strips (yellow) ── */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0,
        width:        padding,
        background:   'rgba(255,200,0,0.07)',
        borderRight:  '1px solid rgba(255,200,0,0.28)',
      }} />
      <div style={{
        position: 'absolute', top: 0, bottom: 0, right: 0,
        width:       padding,
        background:  'rgba(255,200,0,0.07)',
        borderLeft:  '1px solid rgba(255,200,0,0.28)',
      }} />

      {/* ── Container boundary 1140px (red solid) ── */}
      {showContainerLines && (<>
        <div style={{
          position:   'absolute', top: 0, bottom: 0,
          left:       `calc(50% - ${CONTAINER / 2}px)`,
          width:      0,
          borderLeft: '1px solid rgba(255,80,80,0.6)',
        }} />
        <div style={{
          position:    'absolute', top: 0, bottom: 0,
          right:       `calc(50% - ${CONTAINER / 2}px)`,
          width:       0,
          borderRight: '1px solid rgba(255,80,80,0.6)',
        }} />
      </>)}

      {/* ── Prose boundary 820px (blue dashed, optional) ── */}
      {showProseLines && (<>
        <div style={{
          position:      'absolute', top: 0, bottom: 0,
          left:          `calc(50% - ${PROSE / 2}px)`,
          width:         0,
          borderLeft:    '1px dashed rgba(80,160,255,0.45)',
        }} />
        <div style={{
          position:      'absolute', top: 0, bottom: 0,
          right:         `calc(50% - ${PROSE / 2}px)`,
          width:         0,
          borderRight:   '1px dashed rgba(80,160,255,0.45)',
        }} />
      </>)}

      {/* ── Info panel (fixed bottom-left) ── */}
      <div style={{
        position:       'fixed',
        bottom:         12,
        left:           12,
        background:     'rgba(18,16,26,0.92)',
        color:          '#ede8e3',
        fontFamily:     'ui-monospace, Menlo, monospace',
        fontSize:        11,
        lineHeight:      1.55,
        padding:        '7px 11px',
        borderRadius:    6,
        border:         '1px solid rgba(117,81,139,0.45)',
        backdropFilter: 'blur(4px)',
        userSelect:     'none',
      }}>
        <div style={{ color: '#c4a8d8', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 2 }}>
          DEV GRID <span style={{ fontWeight: 400, opacity: 0.55 }}>[g]</span>
        </div>
        <div>
          {bp} · {vw}px · {cols}&thinsp;Sp.
        </div>
        <div style={{ opacity: 0.55, fontSize: 10, marginTop: 4, lineHeight: 1.5 }}>
          <span style={{ color: 'rgba(255,80,80,0.9)'  }}>—</span> 1140px Ist-Container
          &ensp;
          <span style={{ color: 'rgba(80,160,255,0.9)' }}>- -</span> 820px Prose
          &ensp;
          <span style={{ color: 'rgba(255,200,0,0.8)'  }}>|</span> {padding}px Pad.
        </div>
        <div style={{ opacity: 0.38, fontSize: 10, marginTop: 3 }}>
          Messraster: 1140px Ist-Container.
          <br />
          Spalten = Diagnose-Annahme, kein Layout-System.
        </div>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Public export — outer shell with production guard.
// process.env.NODE_ENV is static at build time; Next.js/webpack
// eliminates this branch and the OverlayInner import in prod builds.
// ─────────────────────────────────────────────────────────────
export default function GridOverlay() {
  if (process.env.NODE_ENV !== 'development') return null;
  return <OverlayInner />;
}
