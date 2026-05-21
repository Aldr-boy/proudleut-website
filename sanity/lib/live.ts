// Querying with "sanityFetch" will keep content automatically updated
// Before using it, import and render "<SanityLive />" in your layout, see
// https://github.com/sanity-io/next-sanity#live-content-api for more information.
import { createClient } from 'next-sanity'
import { defineLive } from 'next-sanity/live'

import { apiVersion, dataset, isSanityConfigured, projectId } from '../env'

const liveClient = createClient({
  projectId: isSanityConfigured ? projectId : 'unconfigured',
  dataset: isSanityConfigured ? dataset : 'production',
  apiVersion,
  useCdn: true,
})

export const { sanityFetch, SanityLive } = defineLive({
  client: liveClient,
})
