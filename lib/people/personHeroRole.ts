import type { PublicPerson } from './normalizePerson'

// Exakter Nachbau der Rollen-Berechnung aus app/musiker/[slug]/page.tsx
// (dort bewusst inline und unangetastet -- siehe Auftrag "Musikerübersicht
// unter /musiker anlegen", Abschnitt "Explizit nicht ändern": die
// Musikerprofilseiten selbst duerfen nicht geaendert werden, echte
// Code-Wiederverwendung zwischen beiden Stellen ist deshalb nicht moeglich).
// Eindeutige, nicht-leere Rollen aus allen sichtbaren Memberships, ohne
// Instrumente vermischt, nur die primaere Rolle vor einem "&" (z. B.
// "Bassist" statt "Bassist & Bandleader"). Beide Stellen muessen bei
// kuenftigen Aenderungen der Hero-Rollenlogik synchron gehalten werden.
export function derivePersonHeroRole(person: Pick<PublicPerson, 'memberships'>): string | undefined {
  const roles = [
    ...new Set(
      person.memberships
        .map((m) => m.role)
        .filter((r): r is string => !!r)
        .map((r) => r.split(' & ')[0]),
    ),
  ]
  return roles.length > 0 ? roles.join(' · ') : undefined
}
