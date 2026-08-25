// Reine Entscheidungslogik fuer das Schreiben eines Social-Links
// (social_profiles) im Band-Admin -- ausgelagert aus
// app/admin/bands/[id]/actions.ts, damit die Fall-1/2/3/A-Regeln
// unabhaengig von Supabase-Aufrufen unit-testbar sind (identisches
// Architekturmuster wie lib/moods/moodBandAssignmentsDiff.ts).
//
// Hintergrund (siehe Abschlussbericht "Mood-zentrierte Bandverwaltung" /
// "Social-Links im Band-Admin" fuer den vollstaendigen Schema-Befund):
// social_profiles.url ist NOT NULL, (band_id, platform) besitzt einen
// Unique Constraint. Ein leeres Formularfeld kann eine bestehende Zeile
// deshalb nicht einfach auf url=null setzen -- die Entscheidung haengt
// davon ab, ob die Zeile erhaltenswerte Metadaten (current_followers/
// current_following/last_checked_at) traegt.
export type ExistingSocialProfileRow = {
  id: string
  url: string
  current_followers: number | null
  current_following: number | null
  last_checked_at: string | null
}

export type SocialLinkWriteDecision =
  | { action: 'noop' }
  | { action: 'skip_duplicate' }
  | { action: 'update'; rowId: string; url: string }
  | { action: 'delete'; rowId: string }
  | { action: 'insert'; url: string }
  | { action: 'blocked_has_metadata'; rowId: string }

function hasPreservableMetadata(row: ExistingSocialProfileRow): boolean {
  return row.current_followers !== null || row.current_following !== null || row.last_checked_at !== null
}

// submittedUrl: null bedeutet "Feld wurde geleert" (bereits getrimmt und
// auf null normalisiert durch den Aufrufer, siehe nullIfEmpty in
// actions.ts). existingRows: alle aktuell fuer (band_id, platform)
// vorhandenen Zeilen -- mehr als eine bedeutet einen echten Duplikat-Fall
// (Fall A), der bewusst unveraendert bleibt.
export function resolveSocialLinkWrite(
  existingRows: ExistingSocialProfileRow[],
  submittedUrl: string | null,
): SocialLinkWriteDecision {
  if (existingRows.length > 1) {
    return { action: 'skip_duplicate' }
  }

  if (existingRows.length === 1) {
    const row = existingRows[0]

    if (submittedUrl === row.url) {
      return { action: 'noop' }
    }

    if (submittedUrl !== null) {
      return { action: 'update', rowId: row.id, url: submittedUrl }
    }

    // Feld wurde geleert.
    if (!hasPreservableMetadata(row)) {
      return { action: 'delete', rowId: row.id }
    }

    return { action: 'blocked_has_metadata', rowId: row.id }
  }

  // Keine bestehende Zeile.
  if (submittedUrl !== null) {
    return { action: 'insert', url: submittedUrl }
  }

  return { action: 'noop' }
}
