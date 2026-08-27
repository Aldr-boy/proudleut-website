// Reine Validierungshelfer fuer band_memberships-Formularfelder (Paket 3).
// Kein DB-Zugriff -- Existenzpruefungen (Band/Person) bleiben in
// app/admin/people/actions.ts, da sie einen Client brauchen.

// joined_at/left_at kommen aus einem HTML <input type="date">, also bereits
// im Format YYYY-MM-DD -- fuer dieses Format ist ein lexikografischer
// String-Vergleich aequivalent zu einem chronologischen Vergleich.
export function validateMembershipDates(
  joinedAt: string,
  leftAt: string,
): 'left_before_joined' | null {
  if (joinedAt && leftAt && leftAt < joinedAt) return 'left_before_joined'
  return null
}

// sort_order: leer -> 0 (Default), sonst ganzzahlig und >= 0 (identisch zur
// DB-CHECK-Constraint band_memberships_sort_order_check). Rueckgabe null
// bedeutet ungueltig.
export function parseSortOrder(value: string): number | null {
  if (value.trim() === '') return 0
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0) return null
  return n
}

const MAX_ROLE_LENGTH = 100

export function validateRole(role: string): boolean {
  return role.length <= MAX_ROLE_LENGTH
}
