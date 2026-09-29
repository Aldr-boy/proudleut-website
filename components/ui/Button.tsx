import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

type BaseProps = {
  className?: string;
  children: ReactNode;
};

type AsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & { href?: undefined };

type AsLink = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'href'> & { href: string };

type Props = AsButton | AsLink;

// mailto:/tel:-Links und echte externe URLs gehoeren nicht zum internen
// Next.js-Routing -- dafuer bleibt ein normaler <a>-Tag richtig (identisch
// zum bisherigen Verhalten, z. B. components/homepage/CuratorBlock.tsx).
// Alles andere ist eine interne Route und nutzt weiterhin next/link.
const EXTERNAL_HREF_PATTERN = /^(mailto:|tel:|https?:\/\/)/;

// Gemeinsames Interaktions-Verhalten fuer alle Buttons/Link-Buttons
// (Auftrag "Buttons vereinheitlichen"): Farbe, Groesse, Rundung und
// Schriftstaerke bleiben vollstaendig Sache der aufrufenden Stelle (siehe
// className-Prop) -- diese Klassen ergaenzen nur das Verhalten, das an
// jeder Stelle gleich sein soll: Hover-Anheben mit weichem Schatten,
// Press-Eindruecken und ein Tastaturfokus-Ring, der den schwarzen
// Browser-Standardrahmen ersetzt. `ring-offset-transparent` statt einer
// zur Umgebung passenden Offset-Farbe, damit der schmale Ring-Abstand
// automatisch die tatsaechliche Hintergrundfarbe durchscheinen laesst --
// unabhaengig davon, auf welcher Flaeche (hell/dunkel) der Button steht.
const INTERACTIVE_CLASSES =
  'group relative ' +
  'motion-safe:transition-[transform,box-shadow] motion-safe:duration-[180ms] motion-safe:ease-out ' +
  'motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-pl-button-hover ' +
  'motion-safe:active:translate-y-0 motion-safe:active:scale-95 motion-safe:active:shadow-none ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-pl-accent-light focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

export function Button({ className = '', children, href, ...rest }: Props) {
  const classes = `${INTERACTIVE_CLASSES} ${className}`.trim();

  if (href !== undefined) {
    const anchorProps = rest as Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'href'>;
    if (EXTERNAL_HREF_PATTERN.test(href)) {
      return (
        <a href={href} className={classes} {...anchorProps}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...anchorProps}>
        {children}
      </Link>
    );
  }

  const buttonProps = rest as Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>;
  return (
    <button type={buttonProps.type ?? 'button'} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}

// Wrapper fuer einen Pfeil/ein Icon, das als EIGENES Element neben dem
// Text steht (z. B. der separate "->"-Span oder das Chevron-Icon im
// Header) -- bewegt sich beim Hover 3px nach rechts. Pfeile, die Teil
// eines Textstrings sind ("Bands entdecken ->"), bekommen diesen Wrapper
// nicht und bleiben unveraendert.
export function ButtonArrow({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex motion-safe:transition-transform motion-safe:duration-[180ms] motion-safe:ease-out motion-safe:group-hover:translate-x-[3px]"
    >
      {children}
    </span>
  );
}
