/**
* This configuration file lets you run `$ sanity [command]` in this folder
* Go to https://www.sanity.io/docs/cli to learn more.
**/
import { defineCliConfig } from 'sanity/cli'

// Fallback: Sanity CLI lädt .env.local nicht automatisch (nur Next.js).
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? '6w0eaklc'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'

export default defineCliConfig({ api: { projectId, dataset } })
