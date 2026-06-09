import type { Metadata } from 'next'
import { createBandAction } from './actions'
import { logoutAction } from '@/app/admin/actions'
import { createAdminClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Neue Band anlegen' }

type ActiveBandType = { id: string; name: string; sort_order: number }

type SearchParams = Promise<{
  name?: string
  slug?: string
  status?: string
  primary_band_type_id?: string
  e_name?: string
  e_slug?: string
  e_status?: string
  e_primary_band_type_id?: string
  e_form?: string
}>

export default async function NewBandPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams

  const client = createAdminClient()
  const { data: bandTypesRaw } = await client
    .from('band_types')
    .select('id, name, sort_order')
    .eq('status', 'active')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  const allActiveBandTypes = (bandTypesRaw ?? []) as ActiveBandType[]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-800 text-sm">proudleut Admin</span>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            Abmelden
          </button>
        </form>
      </header>

      <div className="px-6 py-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <a href="/admin/bands" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            ← Bands
          </a>
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">Neue Band anlegen</h1>
        </div>

        {sp.e_form && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5 text-red-700 text-sm">
            {sp.e_form}
          </div>
        )}

        <form action={createBandAction} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Bandname <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={sp.name ?? ''}
              maxLength={200}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            {sp.e_name && <p className="mt-1 text-xs text-red-600">{sp.e_name}</p>}
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              defaultValue={sp.slug ?? ''}
              pattern="[a-z0-9-]+"
              required
              placeholder="z. B. meine-band"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <p className="mt-0.5 text-xs text-gray-400">Nur Kleinbuchstaben, Zahlen und Bindestriche</p>
            {sp.e_slug && <p className="mt-1 text-xs text-red-600">{sp.e_slug}</p>}
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={sp.status ?? 'draft'}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="draft">Entwurf</option>
              <option value="new">Neu</option>
            </select>
            {sp.e_status && <p className="mt-1 text-xs text-red-600">{sp.e_status}</p>}
          </div>

          {/* Primäre Bandart */}
          <div>
            <label htmlFor="primary_band_type_id" className="block text-sm font-medium text-gray-700 mb-1">
              Primäre Bandart <span className="text-red-500">*</span>
            </label>
            <select
              id="primary_band_type_id"
              name="primary_band_type_id"
              defaultValue={sp.primary_band_type_id ?? ''}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">– auswählen –</option>
              {allActiveBandTypes.map((bt) => (
                <option key={bt.id} value={bt.id}>{bt.name}</option>
              ))}
            </select>
            {sp.e_primary_band_type_id && (
              <p className="mt-1 text-xs text-red-600">{sp.e_primary_band_type_id}</p>
            )}
          </div>

          {/* is_published */}
          <div className="flex items-center gap-2">
            <input
              id="is_published"
              name="is_published"
              type="checkbox"
              value="1"
              className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            <label htmlFor="is_published" className="text-sm text-gray-700">
              Veröffentlicht
            </label>
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-3">
            <button
              type="submit"
              className="px-5 py-2 bg-violet-700 text-white rounded-lg text-sm font-medium hover:bg-violet-800 transition-colors"
            >
              Band anlegen
            </button>
            <a
              href="/admin/bands"
              className="px-5 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
