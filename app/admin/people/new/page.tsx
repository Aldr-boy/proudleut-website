import type { Metadata } from 'next'
import Link from 'next/link'
import { createPersonAction } from '../actions'

export const metadata: Metadata = { title: 'Person anlegen' }

const PEOPLE_ERROR_MESSAGES: Record<string, string> = {
  name_required: 'Name ist erforderlich.',
  name_too_long: 'Name: max. 200 Zeichen.',
  invalid_website_url: 'Website-URL ist ungültig (nur http/https).',
  invalid_image_url: 'Bild-URL ist ungültig (nur http/https).',
  slug_conflict: 'Eine Person mit diesem Namen (bzw. Slug) existiert bereits.',
  db_error: 'Datenbankfehler – bitte erneut versuchen.',
}

type SearchParams = Promise<{ people_error?: string }>

export default async function AdminPersonNewPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const errorMsg = sp.people_error
    ? (PEOPLE_ERROR_MESSAGES[sp.people_error] ?? 'Unbekannter Fehler – bitte erneut versuchen.')
    : null

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">proudleut Admin</span>
        <Link href="/admin/people" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
          Zurück
        </Link>
      </header>

      <div className="px-6 py-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Person anlegen</h1>
        <p className="text-sm text-gray-500 mb-6">
          Wird zunächst als Entwurf angelegt — sichtbar erst nach bewusster Veröffentlichung.
        </p>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">{errorMsg}</div>
        )}

        <form action={createPersonAction} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={200}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
              Bio (optional)
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label htmlFor="website_url" className="block text-sm font-medium text-gray-700 mb-1">
              Website URL (optional)
            </label>
            <input
              id="website_url"
              name="website_url"
              type="text"
              placeholder="https://…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 mb-1">
              Bild-URL (optional)
            </label>
            <input
              id="image_url"
              name="image_url"
              type="text"
              placeholder="https://… (kein Upload in diesem Paket)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
          >
            Anlegen
          </button>
        </form>
      </div>
    </div>
  )
}
