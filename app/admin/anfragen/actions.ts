'use server'
import { redirect } from 'next/navigation'
import { requireAdminSession } from '@/lib/admin/requireAdminSession'
import { retryBandSend, retryConfirmation } from '@/lib/anfrage/service'

function str(fd: FormData, key: string): string {
  return ((fd.get(key) as string) ?? '').trim()
}

// Server Action fuer den gezielten Retry EINER fehlgeschlagenen/ungeklaerten
// Band-Mail. requireAdminSession() ist buchstaeblich die erste Anweisung
// (siehe lib/admin/actionsAuthGuardOrder.test.ts-Muster, hier gespiegelt in
// lib/admin/anfrageActionsAuthGuardOrder.test.ts). Die eigentliche
// Retry-Logik (Snapshot-Wiederverwendung, Schutz bereits gesendeter Mails,
// 24h-Schutzzeitraum fuer 'ungeklaert') liegt vollstaendig in
// lib/anfrage/service.ts, nicht hier.
export async function retryBandSendAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const anfrageId = str(formData, 'anfrage_id')
  const anfrageBandId = str(formData, 'anfrage_band_id')
  if (!anfrageId || !anfrageBandId) redirect('/admin/anfragen')

  const result = await retryBandSend(anfrageBandId)
  if (!result.ok) redirect(`/admin/anfragen/${anfrageId}?retry_error=${result.reason}`)

  redirect(`/admin/anfragen/${anfrageId}?retry_ok=1`)
}

export async function retryConfirmationAction(formData: FormData): Promise<never> {
  await requireAdminSession()

  const anfrageId = str(formData, 'anfrage_id')
  if (!anfrageId) redirect('/admin/anfragen')

  const result = await retryConfirmation(anfrageId)
  if (!result.ok) redirect(`/admin/anfragen/${anfrageId}?retry_error=${result.reason}`)

  redirect(`/admin/anfragen/${anfrageId}?retry_ok=1`)
}
