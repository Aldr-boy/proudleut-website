import type { ReactNode } from 'react';

type Props = {
  text: string;
  className?: string;
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
function renderParagraph(text: string, paraIndex: number): ReactNode {
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
// Unterstützt: Absätze (\n\n), Fettschrift (**...**), Links ([text](url)), Zeilenumbrüche (\n).
export function MarkdownText({ text, className }: Props) {
  const paragraphs = text.trim().split(/\n\n+/);
  return (
    <div className={className}>
      {paragraphs.map((para, i) => renderParagraph(para, i))}
    </div>
  );
}
