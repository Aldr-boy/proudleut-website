import type { Metadata } from 'next'
import { loginAction } from './actions'

export const metadata: Metadata = { title: 'Login' }

type SearchParams = Promise<{ error?: string }>

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">proudleut Admin</h1>
        <p className="text-sm text-gray-500 mb-6">Internes Verwaltungswerkzeug</p>

        {error === 'invalid' && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            Falsches Passwort.
          </p>
        )}
        {error === 'not_configured' && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            ADMIN_SECRET ist nicht konfiguriert.
          </p>
        )}

        <form action={loginAction} className="space-y-4">
          <div>
            <label
              htmlFor="secret"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Passwort
            </label>
            <input
              type="password"
              id="secret"
              name="secret"
              required
              autoFocus
              className="w-full px-3 py-2 bg-white text-gray-900 placeholder-gray-400 caret-violet-600 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              placeholder="Admin-Passwort"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-violet-700 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
          >
            Anmelden
          </button>
        </form>
      </div>
    </div>
  )
}
