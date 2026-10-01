import type { ReactNode } from 'react';
import { splitLines, splitParagraphs } from '@/lib/bands/bandTextParagraphs';

type Props = {
  text: string;
  className?: string;
  // 'break' (Default): einfache \n werden zu <br />. 'spaced': jede Zeile
  // eines mehrzeiligen Absatzes wird ein eigener <p> mit kleinem Abstand
  // (space-y-3, kleiner als der Absatzabstand der Aufrufer) -- Opt-in fuer
  // Texte ohne echte Absaetze (siehe BandDescription.tsx).
  lineBreaks?: 'break' | 'spaced';
};

// Parst **bold** und [text](https://...) innerhalb eines einzelnen Textsegments.
// Gibt ein Array aus Strings und React-Elementen zurück – kein dangerouslySetInnerHTML.
function renderInline(segment: string, paraIndex: number, lineIndex: number): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let lastIndex = 0;
  let matchCount = 0;

  let match;
  while ((match = pattern.exec(segment)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(segment.slice(lastIndex, match.index));
    }
    // lineIndex ist Teil des Keys, nicht nur paraIndex+matchCount: matchCount
    // startet bei jedem Aufruf von renderInline (= jede Zeile) wieder bei 0,
    // ein mehrzeiliger Absatz (einfaches \n) mit **fett**/[Link] auf mehr als
    // einer Zeile erzeugte dadurch doppelte Keys innerhalb desselben <p>
    // (z. B. zweimal "0-0") -- React-Warnung "two children with the same
    // key", live an Donnaweda entdeckt (Bandseiten-Redesign-Verifikation).
    const key = `${paraIndex}-${lineIndex}-${matchCount++}`;
    if (match[1] !== undefined) {
      nodes.push(<strong key={key}>{match[1]}</strong>);
    } else if (match[2] && match[3]) {
      nodes.push(
        <a key={key} href={match[3]} target="_blank" rel="noopener noreferrer">
          {match[2]}
        </a>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < segment.length) {
    nodes.push(segment.slice(lastIndex));
  }

  return nodes;
}

// Rendert einen Absatz: einzelne \n werden zu <br />, Inline-Patterns werden aufgelöst.
// Im Modus 'spaced' wird jede Zeile ein eigener <p> in einem Container mit
// kleinem Abstand.
function renderParagraph(text: string, paraIndex: number, lineBreaks: 'break' | 'spaced'): ReactNode {
  if (lineBreaks === 'spaced') {
    const spacedLines = splitLines(text);
    if (spacedLines.length > 1) {
      return (
        <div key={paraIndex} className="space-y-3">
          {spacedLines.map((line, lineIndex) => (
            <p key={lineIndex}>{renderInline(line, paraIndex, lineIndex)}</p>
          ))}
        </div>
      );
    }
  }

  const lines = text.split('\n');
  const content: ReactNode[] = [];

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      content.push(<br key={`br-${paraIndex}-${lineIndex}`} />);
    }
    content.push(...renderInline(line, paraIndex, lineIndex));
  });

  return <p key={paraIndex}>{content}</p>;
}

// Einfacher Markdown-Renderer für Bandbeschreibungstexte.
// Unterstützt: Absätze (\n\n, auch als \r\n\r\n), Fettschrift (**...**), Links ([text](url)),
// Zeilenumbrüche (\n).
export function MarkdownText({ text, className, lineBreaks = 'break' }: Props) {
  const paragraphs = splitParagraphs(text);
  return (
    <div className={className}>
      {paragraphs.map((para, i) => renderParagraph(para, i, lineBreaks))}
    </div>
  );
}
