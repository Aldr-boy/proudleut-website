'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAnfrageStore } from '@/stores/anfrageStore';
import { MAX_BANDS_PER_ANFRAGE } from '@/lib/anfrage/constants';
import { AnfrageModal, Initials, XIcon } from './AnfrageModal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

// Vorgeschaltete Sammlungsansicht vor dem bestehenden AnfrageModal (Auftrag
// "Bandfinder-Redesign -- Nachgang"). Gewuenschter Ablauf: merken -> Sammlung
// ansehen/Profile oeffnen/entfernen -> bewusst Baender fuer EINE Anfrage
// auswaehlen -> erst ueber einen expliziten CTA zum bestehenden Formular.
//
// Kein neuer Store, keine neue Tabelle: liest/schreibt ausschliesslich den
// bestehenden useAnfrageStore (Merken selbst ist unbegrenzt, siehe
// stores/anfrageStore.ts::addBand). Die Auswahl fuer die konkrete Anfrage
// ist bewusst rein lokaler, fluechtiger UI-State dieser Komponente
// (selectedSlugs) -- keine zusaetzliche Persistierung. Nur diese Auswahl ist
// auf MAX_BANDS_PER_ANFRAGE begrenzt (dieselbe Konstante wie die
// serverseitige Validierung in lib/anfrage/validation.ts).
export function MerklisteFlow({ isOpen, onClose }: Props) {
  const bands = useAnfrageStore((s) => s.bands);
  const removeBand = useAnfrageStore((s) => s.removeBand);

  const [showForm, setShowForm] = useState(false);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

  // Vollstaendiges Schliessen (isOpen -> false, gleich auf welchem Weg)
  // setzt nur die fluechtige Anfrageauswahl zurueck -- die gemerkten
  // Baender selbst bleiben im Store unangetastet. Beim naechsten Oeffnen
  // startet die Sammlung deshalb wieder ohne Vorauswahl.
  //
  // Bewusst kein useEffect (react-hooks/set-state-in-effect): dies ist das
  // von React selbst dokumentierte Muster "Adjusting state when a prop
  // changes" (https://react.dev/learn/you-might-not-need-an-effect) --
  // setState waehrend des Renderns anhand eines Vorher/Nachher-Vergleichs
  // verwirft den aktuellen Render sofort und rendert mit dem neuen State
  // neu, statt einen zusaetzlichen Commit+Effect-Zyklus zu durchlaufen.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setShowForm(false);
      setSelectedSlugs([]);
    }
  }

  // Wird eine Band aus der Sammlung entfernt, faellt sie hier automatisch
  // auch aus der aktuellen Anfrageauswahl -- ueber die Filterung gegen die
  // (dann bereits aktualisierten) Store-Baender, keine separate Pruef-Logik
  // noetig.
  const selectedBands = bands.filter((b) => selectedSlugs.includes(b.slug));

  // Auswahl fuer EINE Anfrage bleibt auf MAX_BANDS_PER_ANFRAGE begrenzt --
  // unabhaengig davon, wie viele Baender insgesamt gemerkt sind. Bereits
  // ausgewaehlte Baender bleiben immer abwaehlbar; nur weitere Auswahl wird
  // bei Erreichen der Grenze gesperrt.
  function toggle(slug: string) {
    setSelectedSlugs((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= MAX_BANDS_PER_ANFRAGE) return prev;
      return [...prev, slug];
    });
  }

  // Nur anbieten/wirken, wenn die gesamte Sammlung innerhalb der
  // Anfragegrenze liegt -- bei groesseren Sammlungen keine willkuerliche
  // Auswahl der ersten acht. Der Button selbst wird in diesem Fall nicht
  // gerendert (siehe MerklisteCollectionDialog).
  function selectAll() {
    if (bands.length > MAX_BANDS_PER_ANFRAGE) return;
    setSelectedSlugs(bands.map((b) => b.slug));
  }

  function clearSelection() {
    setSelectedSlugs([]);
  }

  function handleRemove(slug: string) {
    removeBand(slug);
    setSelectedSlugs((prev) => prev.filter((s) => s !== slug));
  }

  // Nach erfolgreichem Versand: nur die tatsaechlich angefragten (aktuell
  // ausgewaehlten) Baender aus der Merkliste entfernen -- nicht ausgewaehlte,
  // weiterhin gemerkte Baender bleiben fuer eine spaetere Anfrage erhalten.
  function handleSuccess() {
    for (const slug of selectedSlugs) removeBand(slug);
  }

  if (showForm) {
    return (
      <AnfrageModal
        bands={selectedBands}
        isOpen={isOpen}
        onClose={onClose}
        onBack={() => setShowForm(false)}
        onSuccess={handleSuccess}
        allowBandRemoval={false}
      />
    );
  }

  return <MerklisteCollectionDialog
    isOpen={isOpen}
    onClose={onClose}
    bands={bands}
    selectedSlugs={selectedSlugs}
    onToggle={toggle}
    onSelectAll={selectAll}
    onClearSelection={clearSelection}
    onRemove={handleRemove}
    onContinue={() => setShowForm(true)}
  />;
}

type CollectionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  bands: { slug: string; name: string }[];
  selectedSlugs: string[];
  onToggle: (slug: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onRemove: (slug: string) => void;
  onContinue: () => void;
};

function MerklisteCollectionDialog({
  isOpen,
  onClose,
  bands,
  selectedSlugs,
  onToggle,
  onSelectAll,
  onClearSelection,
  onRemove,
  onContinue,
}: CollectionDialogProps) {
  const dialogRefCallback = useDialogOpenState(isOpen);
  const selectedCount = selectedSlugs.length;
  const allSelected = bands.length > 0 && selectedCount === bands.length;
  // "Alle auswaehlen" nur anbieten, wenn die gesamte Sammlung innerhalb der
  // Anfragegrenze liegt -- sonst keine willkuerliche Auswahl der ersten acht.
  const canSelectAll = bands.length > 0 && bands.length <= MAX_BANDS_PER_ANFRAGE && !allSelected;
  const selectionLimitReached = selectedCount >= MAX_BANDS_PER_ANFRAGE;

  return (
    <dialog
      ref={dialogRefCallback}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 m-auto
                 w-[min(92vw,560px)]
                 max-sm:w-full max-sm:max-w-full
                 max-sm:top-auto max-sm:right-0 max-sm:bottom-0 max-sm:left-0 max-sm:m-0
                 p-0 border-0 bg-transparent
                 backdrop:bg-black/70"
    >
      <div
        className="flex flex-col overflow-hidden
                   max-h-[90dvh] max-sm:max-h-[92dvh]
                   rounded-2xl max-sm:rounded-t-2xl max-sm:rounded-b-none
                   shadow-2xl"
        style={{ background: '#1a1818', color: 'var(--pl-text-on-stage)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[rgba(196,168,216,0.12)] shrink-0">
          <h2 className="text-base font-bold text-[#ede8e3]">
            {bands.length === 0 ? 'Deine Merkliste' : `Deine Merkliste · ${bands.length}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="text-[#8a7e84] hover:text-[#ede8e3] transition-colors rounded-md p-1 -mr-1"
          >
            <XIcon />
          </button>
        </div>

        {bands.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-[#ede8e3] mb-2">Noch keine Bands gemerkt</p>
            <p className="text-xs text-[#8a7e84] mb-6 leading-relaxed">
              Tippe beim Stöbern auf das Herz einer Bandkarte – hier sammelst du deine Favoriten
              und wählst später aus, wen du anfragen möchtest.
            </p>
            <Link
              href="/bands"
              onClick={onClose}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-semibold
                         motion-safe:transition-colors"
              style={{ background: 'var(--pl-accent)', color: 'var(--pl-text-on-accent)' }}
            >
              Bands entdecken →
            </Link>
          </div>
        ) : (
          <>
            {/* Scrollbare Bandliste */}
            <div className="overflow-y-auto flex-1 px-6 py-4">
              <div className="flex items-center justify-between mb-1 gap-3">
                <p className="text-xs font-semibold text-[#8a7e84] uppercase tracking-wide">
                  {selectedCount === 0
                    ? 'Für die Anfrage auswählen'
                    : `${selectedCount} von ${MAX_BANDS_PER_ANFRAGE} Bands für die Anfrage ausgewählt`}
                </p>
                <div className="flex items-center gap-3 shrink-0">
                  {canSelectAll && (
                    <button
                      type="button"
                      onClick={onSelectAll}
                      className="text-xs font-semibold underline underline-offset-2"
                      style={{ color: 'var(--pl-accent-on-stage)' }}
                    >
                      Alle auswählen
                    </button>
                  )}
                  {selectedCount > 0 && (
                    <button
                      type="button"
                      onClick={onClearSelection}
                      className="text-xs font-semibold underline underline-offset-2 text-[#8a7e84] hover:text-[#ede8e3]"
                    >
                      Auswahl aufheben
                    </button>
                  )}
                </div>
              </div>
              {selectionLimitReached && (
                <p className="text-xs text-[#8a7e84] mb-3 leading-relaxed">
                  Du kannst bis zu {MAX_BANDS_PER_ANFRAGE} Bands pro Anfrage auswählen. Deine übrigen Bands bleiben in der Merkliste.
                </p>
              )}
              <ul className="space-y-2 mt-3">
                {bands.map((b) => {
                  const checked = selectedSlugs.includes(b.slug);
                  const disabled = !checked && selectionLimitReached;
                  return (
                    <li
                      key={b.slug}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{
                        background: checked ? 'rgba(117,81,139,0.18)' : 'rgba(255,255,255,0.03)',
                        opacity: disabled ? 0.5 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => onToggle(b.slug)}
                        aria-label={`${b.name} für diese Anfrage auswählen`}
                        className="shrink-0 w-4 h-4 rounded cursor-pointer accent-[#75518b] disabled:cursor-not-allowed"
                      />
                      <Initials name={b.name} />
                      <Link
                        href={`/band/${b.slug}`}
                        className="flex-1 min-w-0 truncate text-sm font-medium text-[#ede8e3] hover:text-[#c4a8d8] transition-colors"
                      >
                        {b.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => onRemove(b.slug)}
                        aria-label={`${b.name} aus Merkliste entfernen`}
                        className="shrink-0 text-[#8a7e84] hover:text-[#ede8e3] transition-colors p-1"
                      >
                        <XIcon />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-4 border-t border-[rgba(196,168,216,0.12)] shrink-0 space-y-2">
              {selectedCount === 0 && (
                <p className="text-xs text-[#8a7e84]">Wähle mindestens eine Band aus, um eine Anfrage zu senden.</p>
              )}
              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={onContinue}
                className="w-full px-6 py-3 rounded-full text-sm font-semibold motion-safe:transition-colors disabled:cursor-not-allowed"
                style={{
                  background: selectedCount === 0 ? 'rgba(117,81,139,0.25)' : 'var(--pl-accent)',
                  color: 'var(--pl-text-on-accent)',
                }}
              >
                {selectedCount === 0
                  ? 'Bands auswählen, um anzufragen'
                  : selectedCount === 1
                  ? '1 Band unverbindlich anfragen'
                  : `${selectedCount} Bands unverbindlich anfragen`}
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

// Identisches Oeffnen-/Schliessen-Muster wie AnfrageModal (dialog.showModal()/
// close() ueber isOpen, statt display:none) -- als eigener Hook, da diese
// Datei zwei <dialog>-Elemente mit demselben Verhalten benoetigt (Sammlung
// und, ueber AnfrageModal, das Formular), aber nie gleichzeitig geoeffnet.
function useDialogOpenState(isOpen: boolean) {
  const [node, setNode] = useState<HTMLDialogElement | null>(null);
  useEffect(() => {
    if (!node) return;
    if (isOpen) {
      if (!node.open) node.showModal();
    } else if (node.open) {
      node.close();
    }
  }, [isOpen, node]);
  return setNode;
}
