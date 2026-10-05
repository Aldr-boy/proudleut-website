import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo/metadata'

// Ersetzt public/robots.txt (gleiche Regeln), damit der Sitemap-Verweis aus
// der zentralen SITE_URL kommt.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/studio' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
