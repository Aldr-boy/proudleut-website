'use server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminSession } from '@/lib/admin/requireAdminSession'
import { isValidUrl } from '@/lib/bandIntro/validation'
import { MAX_LENGTHS } from '@/lib/bandIntro/constants'
import { slugifyPersonName } from '@/lib/people/slug'
import { canPublish, canArchive, type PersonStatus } from '@/lib/people/approvedAtRule'
import { validateMembershipDates, parseSortOrder, validateRole } from '@/lib/people/membershipValidation'
import {
  resolveInstrumentSelection,
  assignInstrumentSortOrders,
  diffInstrumentAssignments,
  type CatalogInstrument,
} from '@/lib/people/instrumentAssignment'
import { isValidHttpsUrl, isValidLinkLabel, isDuplicateOfWebsite } from '@/lib/people/linkValidation'
import { isValidCreditName } from '@/lib/people/creditValidation'

function str(fd: FormData, key: string): string {
  return ((fd.get(key) as string) ?? '').trim()
}

function nullIfEmpty(val: string): string | null {
  return val === '' ? null : val
}

// ─────────────────────────────────────────
// Stammdaten-Validierung (Person)
// ─────────────────────────────────────────

function validatePersonFields(data: { name: string; website_url: string; image_url: string }): string | null {
  if (!data.name) return 'name_required'
  if (data.name.length > 200) return 'name_too_long'
  if (data.website_url !== '' && !isValidUrl(data.website_url, MAX_LENGTHS.websiteUrl)) return 'invalid_website_url'
  if (data.image_url !== '' && !isValidUrl(data.image_url, MAX_LENGTHS.websiteUrl)) return 'invalid_image_url'
  return null
}

async function loadActiveInstruments(client: ReturnType<typeof createAdminClient>): Promise<CatalogInstrument[]> {
  const { data } = await client.from('instruments').select('id, sort_order').eq('status', 'active')
  return (data ?? []) as CatalogInstrument[]
}

// ─────────────────────────────────────────
// createPersonAction -- Person immer als draft anlegen, approved_at bleibt
// beim Anlegen unangetastet (DB-Default NULL, siehe
// supabase/people_data_foundation_v1.sql). Kein Statusfeld im Formular --
// Aktivierung laeuft ausschliesslich ueber publishPersonAction.
// ─────────────────────────────────────────

export async function createPersonAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const name = str(formData, 'name')
  const bio = str(formData, 'bio')
  const website_url = str(formData, 'website_url')
  const image_url = str(formData, 'image_url')

  const fieldError = validatePersonFields({ name, website_url, image_url })
  if (fieldError) redirect(`/admin/people/new?people_error=${fieldError}`)

  const slug = slugifyPersonName(name)
  if (!slug) redirect('/admin/people/new?people_error=name_required')

  const client = createAdminClient()

  const { data: person, error } = await client
    .from('people')
    .insert({
      name,
      slug,
      bio: nullIfEmpty(bio),
      website_url: nullIfEmpty(website_url),
      image_url: nullIfEmpty(image_url),
      status: 'draft',
    })
    .select('id')
    .single()

  if (error || !person) {
    const code = error?.code === '23505' ? 'slug_conflict' : 'db_error'
    redirect(`/admin/people/new?people_error=${code}`)
  }

  redirect(`/admin/people/${person.id}?created=1`)
}

// ─────────────────────────────────────────
// updatePersonAction -- ausschliesslich Stammdaten (Name, Bio, Website,
// Bild). Slug ist nach dem Anlegen eine stabile Identitaet (identisches
// Prinzip wie event_types/moods/repertoire_styles) -- kein p_slug-artiges
// Feld hier. Status/approved_at werden von dieser Action NIE angefasst --
// das laeuft ausschliesslich ueber publishPersonAction/archivePersonAction.
// ─────────────────────────────────────────

export async function updatePersonAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const id = str(formData, 'id')
  if (!id) redirect('/admin/people')

  const name = str(formData, 'name')
  const bio = str(formData, 'bio')
  const website_url = str(formData, 'website_url')
  const image_url = str(formData, 'image_url')

  const fieldError = validatePersonFields({ name, website_url, image_url })
  if (fieldError) redirect(`/admin/people/${id}?people_error=${fieldError}`)

  const client = createAdminClient()

  const { error } = await client
    .from('people')
    .update({
      name,
      bio: nullIfEmpty(bio),
      website_url: nullIfEmpty(website_url),
      image_url: nullIfEmpty(image_url),
    })
    .eq('id', id)

  if (error) redirect(`/admin/people/${id}?people_error=db_error`)

  redirect(`/admin/people/${id}?saved=1`)
}

// ─────────────────────────────────────────
// publishPersonAction / archivePersonAction -- bewusst getrennte,
// explizite Status-Aktionen (identisches Prinzip wie
// archiveEventTypeAction/reactivateEventTypeAction in
// app/admin/event-types/actions.ts), damit ein Veroeffentlichen niemals
// nebenbei ueber das normale Bearbeiten-Formular passieren kann.
//
// approved_at-Regel (serverseitig, Auftrag "Paket 3" Abschnitt
// "approved_at -- verbindliche V1-Regel"): der aktuelle Status wird IMMER
// frisch aus der DB gelesen (nie aus einem Hidden-Formularfeld vertraut),
// bevor entschieden wird, ob der Uebergang zulaessig ist und approved_at
// neu gesetzt wird.
// ─────────────────────────────────────────

export async function publishPersonAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const id = str(formData, 'id')
  if (!id) redirect('/admin/people')

  const client = createAdminClient()

  const { data: person } = await client.from('people').select('status').eq('id', id).maybeSingle()
  if (!person) redirect('/admin/people?people_error=not_found')

  if (!canPublish(person.status as PersonStatus)) {
    redirect(`/admin/people/${id}?people_error=publish_not_allowed`)
  }

  const { error } = await client
    .from('people')
    .update({ status: 'active', approved_at: new Date().toISOString() })
    .eq('id', id)

  if (error) redirect(`/admin/people/${id}?people_error=db_error`)

  redirect(`/admin/people/${id}?published=1`)
}

export async function archivePersonAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const id = str(formData, 'id')
  if (!id) redirect('/admin/people')

  const client = createAdminClient()

  const { data: person } = await client.from('people').select('status').eq('id', id).maybeSingle()
  if (!person) redirect('/admin/people?people_error=not_found')

  if (!canArchive(person.status as PersonStatus)) {
    redirect(`/admin/people/${id}?people_error=archive_not_allowed`)
  }

  // approved_at wird in diesem Update bewusst NICHT gesetzt -- bleibt
  // erhalten (Auftrag: "active -> archived => approved_at bleibt erhalten").
  const { error } = await client.from('people').update({ status: 'archived' }).eq('id', id)

  if (error) redirect(`/admin/people/${id}?people_error=db_error`)

  redirect(`/admin/people/${id}?archived=1`)
}

// ─────────────────────────────────────────
// createMembershipAction -- is_public wird IMMER hart auf false gesetzt
// (Auftrag: "Neue Membership: is_public = false als Default. Das muss
// sowohl UI-seitig als auch serverseitig sicher sein.") -- das Formular
// bietet dafuer bewusst kein Eingabefeld an, und selbst ein
// manipulierter/zusaetzlicher Formularwert wird hier ignoriert.
// ─────────────────────────────────────────

export async function createMembershipAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const person_id = str(formData, 'person_id')
  const band_id = str(formData, 'band_id')
  const role = str(formData, 'role')
  const joined_at = str(formData, 'joined_at')
  const left_at = str(formData, 'left_at')
  const sortOrderRaw = str(formData, 'sort_order')
  const instrument_ids = (formData.getAll('instrument_id') as string[]).map((v) => v.trim()).filter(Boolean)

  if (!person_id) redirect('/admin/people')
  if (!band_id) redirect(`/admin/people/${person_id}?membership_error=band_required`)
  if (!validateRole(role)) redirect(`/admin/people/${person_id}?membership_error=role_too_long`)

  const dateError = validateMembershipDates(joined_at, left_at)
  if (dateError) redirect(`/admin/people/${person_id}?membership_error=${dateError}`)

  const sort_order = parseSortOrder(sortOrderRaw)
  if (sort_order === null) redirect(`/admin/people/${person_id}?membership_error=invalid_sort_order`)

  const client = createAdminClient()

  const { data: person } = await client.from('people').select('id').eq('id', person_id).maybeSingle()
  if (!person) redirect('/admin/people?membership_error=invalid_person')

  const { data: band } = await client.from('bands').select('id').eq('id', band_id).maybeSingle()
  if (!band) redirect(`/admin/people/${person_id}?membership_error=invalid_band`)

  const activeInstruments = await loadActiveInstruments(client)
  const selection = resolveInstrumentSelection(instrument_ids, activeInstruments)
  if (!selection.ok) {
    redirect(`/admin/people/${person_id}?membership_error=invalid_instrument`)
  }

  const { data: membership, error: insertError } = await client
    .from('band_memberships')
    .insert({
      band_id,
      person_id,
      role: nullIfEmpty(role),
      joined_at: nullIfEmpty(joined_at),
      left_at: nullIfEmpty(left_at),
      is_public: false,
      sort_order,
    })
    .select('id')
    .single()

  if (insertError || !membership) {
    const code = insertError?.code === '23505' ? 'membership_duplicate' : 'db_error'
    redirect(`/admin/people/${person_id}?membership_error=${code}`)
  }

  if (selection.instrumentIds.length > 0) {
    const rows = assignInstrumentSortOrders(selection.instrumentIds).map((r) => ({
      membership_id: membership.id,
      instrument_id: r.instrument_id,
      sort_order: r.sort_order,
    }))
    const { error: instrumentError } = await client.from('band_membership_instruments').insert(rows)
    if (instrumentError) {
      // Membership ist bereits erfolgreich angelegt -- dieser Fehler
      // verwirft sie NICHT, sondern wird sichtbar zurueckgemeldet
      // (identisches Prinzip wie die Social-Link-Fehlerbehandlung in
      // app/admin/bands/[id]/actions.ts::updateBandAction: bereits
      // erfolgreiche Writes werden durch einen nachgelagerten Fehler nicht
      // stillschweigend verworfen). Instrumente koennen ueber das
      // Bearbeiten-Formular der neuen Membership nachgetragen werden.
      redirect(`/admin/people/${person_id}?membership_created=1&membership_error=instruments_partial`)
    }
  }

  redirect(`/admin/people/${person_id}?membership_created=1`)
}

// ─────────────────────────────────────────
// updateMembershipAction -- Band bleibt nach dem Anlegen unveraendert
// (stabile Identitaet der Zeile, wie band_id/person_id insgesamt ueber den
// UNIQUE-Constraint). is_public ist hier -- anders als beim Anlegen --
// bewusst ein regulaeres, editierbares Feld.
// ─────────────────────────────────────────

export async function updateMembershipAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const membership_id = str(formData, 'membership_id')
  const person_id = str(formData, 'person_id')
  const role = str(formData, 'role')
  const joined_at = str(formData, 'joined_at')
  const left_at = str(formData, 'left_at')
  // formData.get() liefert bei Mehrfachwerten (hidden Fallback + Checkbox
  // teilen sich den Namen "is_public") den ERSTEN Eintrag -- bei
  // aktiviertem Haekchen submitted der Browser BEIDE Werte in DOM-
  // Reihenfolge (hidden zuerst), .get() wuerde also faelschlich immer '0'
  // liefern. getAll().includes('1') ist unabhaengig von der Feld-
  // Reihenfolge korrekt: nur der Hidden-Fallback -> ['0'] -> false; mit
  // aktiviertem Haekchen -> ['0','1'] -> true. Identisches Prinzip wie
  // updatePersonLinkAction (Paket 4C-B).
  const is_public = formData.getAll('is_public').includes('1')
  const sortOrderRaw = str(formData, 'sort_order')
  const instrument_ids = (formData.getAll('instrument_id') as string[]).map((v) => v.trim()).filter(Boolean)

  if (!person_id) redirect('/admin/people')
  if (!membership_id) redirect(`/admin/people/${person_id}`)

  if (!validateRole(role)) redirect(`/admin/people/${person_id}?membership_error=role_too_long`)

  const dateError = validateMembershipDates(joined_at, left_at)
  if (dateError) redirect(`/admin/people/${person_id}?membership_error=${dateError}`)

  const sort_order = parseSortOrder(sortOrderRaw)
  if (sort_order === null) redirect(`/admin/people/${person_id}?membership_error=invalid_sort_order`)

  const client = createAdminClient()

  // Ownership-Pruefung: Membership laden und person_id aus DB gegen
  // Form-Wert pruefen (identisches Prinzip wie updateContactAction in
  // app/admin/bands/[id]/actions.ts).
  const { data: existing } = await client
    .from('band_memberships')
    .select('person_id')
    .eq('id', membership_id)
    .maybeSingle()
  if (!existing || existing.person_id !== person_id) {
    redirect(`/admin/people/${person_id}?membership_error=invalid_membership`)
  }

  const activeInstruments = await loadActiveInstruments(client)
  const selection = resolveInstrumentSelection(instrument_ids, activeInstruments)
  if (!selection.ok) {
    redirect(`/admin/people/${person_id}?membership_error=invalid_instrument`)
  }

  const { error: updateError } = await client
    .from('band_memberships')
    .update({
      role: nullIfEmpty(role),
      joined_at: nullIfEmpty(joined_at),
      left_at: nullIfEmpty(left_at),
      is_public,
      sort_order,
    })
    .eq('id', membership_id)

  if (updateError) redirect(`/admin/people/${person_id}?membership_error=db_error`)

  const { data: currentRows, error: currentError } = await client
    .from('band_membership_instruments')
    .select('instrument_id')
    .eq('membership_id', membership_id)
  if (currentError) redirect(`/admin/people/${person_id}?membership_saved=1&membership_error=instruments_partial`)

  const currentIds = (currentRows ?? []).map((r) => (r as { instrument_id: string }).instrument_id)
  const { toAdd, toRemove } = diffInstrumentAssignments(currentIds, selection.instrumentIds)

  if (toRemove.length > 0) {
    const { error } = await client
      .from('band_membership_instruments')
      .delete()
      .eq('membership_id', membership_id)
      .in('instrument_id', toRemove)
    if (error) redirect(`/admin/people/${person_id}?membership_saved=1&membership_error=instruments_partial`)
  }

  if (toAdd.length > 0) {
    const sortOrderByInstrumentId = new Map(
      assignInstrumentSortOrders(selection.instrumentIds).map((r) => [r.instrument_id, r.sort_order]),
    )
    const rows = toAdd.map((instrument_id) => ({
      membership_id,
      instrument_id,
      sort_order: sortOrderByInstrumentId.get(instrument_id) ?? 0,
    }))
    const { error } = await client.from('band_membership_instruments').insert(rows)
    if (error) redirect(`/admin/people/${person_id}?membership_saved=1&membership_error=instruments_partial`)
  }

  redirect(`/admin/people/${person_id}?membership_saved=1`)
}

// ─────────────────────────────────────────
// deleteMembershipAction -- band_membership_instruments-Zeilen verschwinden
// per FK ON DELETE CASCADE (supabase/people_data_foundation_v1.sql), kein
// manueller Zusatz-Delete noetig. Die Person selbst bleibt unangetastet.
// ─────────────────────────────────────────

export async function deleteMembershipAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const membership_id = str(formData, 'membership_id')
  const person_id = str(formData, 'person_id')

  if (!person_id) redirect('/admin/people')
  if (!membership_id) redirect(`/admin/people/${person_id}`)

  const client = createAdminClient()

  const { data: existing } = await client
    .from('band_memberships')
    .select('person_id')
    .eq('id', membership_id)
    .maybeSingle()
  if (!existing || existing.person_id !== person_id) {
    redirect(`/admin/people/${person_id}?membership_error=invalid_membership`)
  }

  const { error } = await client
    .from('band_memberships')
    .delete()
    .eq('id', membership_id)
    .eq('person_id', person_id)

  if (error) redirect(`/admin/people/${person_id}?membership_error=db_error`)

  redirect(`/admin/people/${person_id}?membership_deleted=1`)
}

// ─────────────────────────────────────────
// createPersonLinkAction -- is_public wird IMMER hart auf false gesetzt
// (identisches Prinzip wie createMembershipAction: "Neue Links muessen
// serverseitig zwingend is_public=false starten. Nicht auf Hidden Field
// oder Clientzustand verlassen."). Dieselbe URL wie people.website_url
// wird abgelehnt (Admin-/Server-Regel, kein Security-Thema, siehe
// lib/people/linkValidation.ts::isDuplicateOfWebsite).
// ─────────────────────────────────────────

export async function createPersonLinkAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const person_id = str(formData, 'person_id')
  const label = str(formData, 'label')
  const url = str(formData, 'url')
  const sortOrderRaw = str(formData, 'sort_order')

  if (!person_id) redirect('/admin/people')
  if (!isValidLinkLabel(label)) redirect(`/admin/people/${person_id}?link_error=invalid_label`)
  if (!isValidHttpsUrl(url)) redirect(`/admin/people/${person_id}?link_error=invalid_url`)

  const sort_order = parseSortOrder(sortOrderRaw)
  if (sort_order === null) redirect(`/admin/people/${person_id}?link_error=invalid_sort_order`)

  const client = createAdminClient()

  const { data: person } = await client
    .from('people')
    .select('id, website_url')
    .eq('id', person_id)
    .maybeSingle()
  if (!person) redirect('/admin/people?link_error=invalid_person')

  if (isDuplicateOfWebsite(url, person.website_url as string | null)) {
    redirect(`/admin/people/${person_id}?link_error=duplicate_website`)
  }

  const { error } = await client.from('person_links').insert({
    person_id,
    label: label.trim(),
    url,
    sort_order,
    is_public: false,
  })

  if (error) {
    const code = error.code === '23505' ? 'link_duplicate' : 'db_error'
    redirect(`/admin/people/${person_id}?link_error=${code}`)
  }

  redirect(`/admin/people/${person_id}?link_created=1`)
}

// ─────────────────────────────────────────
// updatePersonLinkAction -- is_public ist hier -- anders als beim Anlegen
// -- ein regulaeres, editierbares Feld (Auftrag: "Edit darf Sichtbarkeit
// bewusst aendern.").
// ─────────────────────────────────────────

export async function updatePersonLinkAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const link_id = str(formData, 'link_id')
  const person_id = str(formData, 'person_id')
  const label = str(formData, 'label')
  const url = str(formData, 'url')
  const sortOrderRaw = str(formData, 'sort_order')
  // formData.get() liefert bei Mehrfachwerten (hidden Fallback + Checkbox
  // teilen sich den Namen "is_public") den ERSTEN Eintrag -- bei
  // aktiviertem Haekchen submitted der Browser BEIDE Werte in DOM-
  // Reihenfolge (hidden zuerst), .get() wuerde also faelschlich immer '0'
  // liefern. getAll().includes('1') ist unabhaengig von der Feld-
  // Reihenfolge korrekt: nur der Hidden-Fallback -> ['0'] -> false; mit
  // aktiviertem Haekchen -> ['0','1'] -> true.
  const is_public = formData.getAll('is_public').includes('1')

  if (!person_id) redirect('/admin/people')
  if (!link_id) redirect(`/admin/people/${person_id}`)
  if (!isValidLinkLabel(label)) redirect(`/admin/people/${person_id}?link_error=invalid_label`)
  if (!isValidHttpsUrl(url)) redirect(`/admin/people/${person_id}?link_error=invalid_url`)

  const sort_order = parseSortOrder(sortOrderRaw)
  if (sort_order === null) redirect(`/admin/people/${person_id}?link_error=invalid_sort_order`)

  const client = createAdminClient()

  // Ownership-Pruefung: Link laden und person_id aus DB gegen Form-Wert
  // pruefen (identisches Prinzip wie updateMembershipAction).
  const { data: existing } = await client
    .from('person_links')
    .select('person_id')
    .eq('id', link_id)
    .maybeSingle()
  if (!existing || existing.person_id !== person_id) {
    redirect(`/admin/people/${person_id}?link_error=invalid_link`)
  }

  const { data: person } = await client
    .from('people')
    .select('website_url')
    .eq('id', person_id)
    .maybeSingle()
  if (!person) redirect('/admin/people?link_error=invalid_person')

  if (isDuplicateOfWebsite(url, person.website_url as string | null)) {
    redirect(`/admin/people/${person_id}?link_error=duplicate_website`)
  }

  const { error } = await client
    .from('person_links')
    .update({ label: label.trim(), url, sort_order, is_public })
    .eq('id', link_id)

  if (error) {
    const code = error.code === '23505' ? 'link_duplicate' : 'db_error'
    redirect(`/admin/people/${person_id}?link_error=${code}`)
  }

  redirect(`/admin/people/${person_id}?link_saved=1`)
}

// ─────────────────────────────────────────
// deletePersonLinkAction
// ─────────────────────────────────────────

export async function deletePersonLinkAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const link_id = str(formData, 'link_id')
  const person_id = str(formData, 'person_id')

  if (!person_id) redirect('/admin/people')
  if (!link_id) redirect(`/admin/people/${person_id}`)

  const client = createAdminClient()

  const { data: existing } = await client
    .from('person_links')
    .select('person_id')
    .eq('id', link_id)
    .maybeSingle()
  if (!existing || existing.person_id !== person_id) {
    redirect(`/admin/people/${person_id}?link_error=invalid_link`)
  }

  const { error } = await client
    .from('person_links')
    .delete()
    .eq('id', link_id)
    .eq('person_id', person_id)

  if (error) redirect(`/admin/people/${person_id}?link_error=db_error`)

  redirect(`/admin/people/${person_id}?link_deleted=1`)
}

// ─────────────────────────────────────────
// createPersonCreditAction -- is_public wird IMMER hart auf false gesetzt
// (identisches Prinzip wie createPersonLinkAction). Referenzenliste
// "Zusammengearbeitet mit" -- reiner Anzeigename, keine URL.
// ─────────────────────────────────────────

export async function createPersonCreditAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const person_id = str(formData, 'person_id')
  const name = str(formData, 'name')
  const sortOrderRaw = str(formData, 'sort_order')

  if (!person_id) redirect('/admin/people')
  if (!isValidCreditName(name)) redirect(`/admin/people/${person_id}?credit_error=invalid_name`)

  const sort_order = parseSortOrder(sortOrderRaw)
  if (sort_order === null) redirect(`/admin/people/${person_id}?credit_error=invalid_sort_order`)

  const client = createAdminClient()

  const { data: person } = await client.from('people').select('id').eq('id', person_id).maybeSingle()
  if (!person) redirect('/admin/people?credit_error=invalid_person')

  const { error } = await client.from('person_credits').insert({
    person_id,
    name: name.trim(),
    sort_order,
    is_public: false,
  })

  if (error) {
    const code = error.code === '23505' ? 'credit_duplicate' : 'db_error'
    redirect(`/admin/people/${person_id}?credit_error=${code}`)
  }

  redirect(`/admin/people/${person_id}?credit_created=1`)
}

// ─────────────────────────────────────────
// updatePersonCreditAction -- is_public ist hier -- anders als beim
// Anlegen -- ein regulaeres, editierbares Feld (identisches Prinzip wie
// updatePersonLinkAction).
// ─────────────────────────────────────────

export async function updatePersonCreditAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const credit_id = str(formData, 'credit_id')
  const person_id = str(formData, 'person_id')
  const name = str(formData, 'name')
  const sortOrderRaw = str(formData, 'sort_order')
  // formData.get() liefert bei Mehrfachwerten (hidden Fallback + Checkbox
  // teilen sich den Namen "is_public") den ERSTEN Eintrag -- siehe
  // updatePersonLinkAction/updateMembershipAction. getAll().includes('1')
  // ist unabhaengig von der Feld-Reihenfolge korrekt.
  const is_public = formData.getAll('is_public').includes('1')

  if (!person_id) redirect('/admin/people')
  if (!credit_id) redirect(`/admin/people/${person_id}`)
  if (!isValidCreditName(name)) redirect(`/admin/people/${person_id}?credit_error=invalid_name`)

  const sort_order = parseSortOrder(sortOrderRaw)
  if (sort_order === null) redirect(`/admin/people/${person_id}?credit_error=invalid_sort_order`)

  const client = createAdminClient()

  // Ownership-Pruefung: Eintrag laden und person_id aus DB gegen Form-Wert
  // pruefen (identisches Prinzip wie updatePersonLinkAction).
  const { data: existing } = await client
    .from('person_credits')
    .select('person_id')
    .eq('id', credit_id)
    .maybeSingle()
  if (!existing || existing.person_id !== person_id) {
    redirect(`/admin/people/${person_id}?credit_error=invalid_credit`)
  }

  const { error } = await client
    .from('person_credits')
    .update({ name: name.trim(), sort_order, is_public })
    .eq('id', credit_id)

  if (error) {
    const code = error.code === '23505' ? 'credit_duplicate' : 'db_error'
    redirect(`/admin/people/${person_id}?credit_error=${code}`)
  }

  redirect(`/admin/people/${person_id}?credit_saved=1`)
}

// ─────────────────────────────────────────
// deletePersonCreditAction
// ─────────────────────────────────────────

export async function deletePersonCreditAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const credit_id = str(formData, 'credit_id')
  const person_id = str(formData, 'person_id')

  if (!person_id) redirect('/admin/people')
  if (!credit_id) redirect(`/admin/people/${person_id}`)

  const client = createAdminClient()

  const { data: existing } = await client
    .from('person_credits')
    .select('person_id')
    .eq('id', credit_id)
    .maybeSingle()
  if (!existing || existing.person_id !== person_id) {
    redirect(`/admin/people/${person_id}?credit_error=invalid_credit`)
  }

  const { error } = await client
    .from('person_credits')
    .delete()
    .eq('id', credit_id)
    .eq('person_id', person_id)

  if (error) redirect(`/admin/people/${person_id}?credit_error=db_error`)

  redirect(`/admin/people/${person_id}?credit_deleted=1`)
}
