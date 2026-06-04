'use client'
import { deleteContactAction } from './actions'

export function DeleteContactButton({ contactId, bandId }: { contactId: string; bandId: string }) {
  return (
    <form
      action={deleteContactAction}
      onSubmit={(e) => {
        if (!confirm('Kontakt wirklich löschen?')) e.preventDefault()
      }}
    >
      <input type="hidden" name="contact_id" value={contactId} />
      <input type="hidden" name="band_id" value={bandId} />
      <button
        type="submit"
        className="text-xs text-red-500 hover:text-red-700 transition-colors"
      >
        Löschen
      </button>
    </form>
  )
}
