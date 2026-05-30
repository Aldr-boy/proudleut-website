/**
 * Donnaweda Media Upload – Supabase Storage Mini-Pilot
 *
 * Voraussetzungen:
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local gesetzt
 *   - Dateien liegen unter scripts/seeds/donnaweda-media/
 *
 * Ausführung:
 *   node --env-file=.env.local scripts/upload-donnaweda-media.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'band-media'

if (!SUPABASE_URL) {
  console.error('NEXT_PUBLIC_SUPABASE_URL fehlt in .env.local')
  process.exit(1)
}
if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY fehlt in .env.local')
  console.error('Den Key findest du im Supabase-Dashboard unter Settings → API → service_role.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const MEDIA_DIR = join(__dirname, 'seeds', 'donnaweda-media')

// Lokale Datei → Storage-Pfad im Bucket
const FILES = [
  { local: 'donnaweda-logo.webp',       storage: 'donnaweda/logo.webp',        role: 'logo' },
  { local: 'donnaweda-hero.webp',        storage: 'donnaweda/hero.webp',         role: 'hero' },
  { local: 'donnaweda-thumbnail.webp',   storage: 'donnaweda/thumbnail.webp',    role: 'thumbnail' },
  { local: 'donnaweda-gallery-01.webp',  storage: 'donnaweda/gallery-01.webp',   role: 'gallery' },
  { local: 'donnaweda-gallery-02.webp',  storage: 'donnaweda/gallery-02.webp',   role: 'gallery' },
  { local: 'donnaweda-gallery-03.webp',  storage: 'donnaweda/gallery-03.webp',   role: 'gallery' },
]

async function ensureBucket() {
  const { data: existing } = await supabase.storage.getBucket(BUCKET)
  if (existing) {
    console.log(`✓ Bucket "${BUCKET}" existiert bereits (public: ${existing.public})`)
    return
  }
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
  if (error) {
    console.error(`Bucket-Anlage fehlgeschlagen: ${error.message}`)
    process.exit(1)
  }
  console.log(`✓ Bucket "${BUCKET}" angelegt (public: true)`)
}

async function uploadFiles() {
  const results = []

  for (const file of FILES) {
    const localPath = join(MEDIA_DIR, file.local)
    let buffer
    try {
      buffer = readFileSync(localPath)
    } catch {
      console.error(`✗ Datei nicht gefunden: ${localPath}`)
      process.exit(1)
    }

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(file.storage, buffer, {
        contentType: 'image/webp',
        upsert: true,
      })

    if (error) {
      console.error(`✗ Upload fehlgeschlagen (${file.storage}): ${error.message}`)
      process.exit(1)
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(file.storage)
    console.log(`✓ ${file.role.padEnd(10)} ${urlData.publicUrl}`)
    results.push({ role: file.role, storage: file.storage, url: urlData.publicUrl })
  }

  return results
}

console.log('=== Donnaweda Media Upload ===\n')
await ensureBucket()
console.log()
const results = await uploadFiles()
console.log('\nAlle Dateien hochgeladen.')
console.log('\nPublic-URL-Test: Öffne eine der folgenden URLs im Browser:')
console.log(' ', results[0].url)
console.log('\nFalls die URL ein Bild zeigt: Bucket ist public und URLs sind stabil.')
console.log('Dann scripts/seeds/seed-donnaweda-media.sql im Supabase SQL-Editor ausführen.')
