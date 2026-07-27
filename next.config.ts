import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default in Next.js 16.2.5 ist 1 MB (siehe node_modules/next/dist/server/app-render/action-handler.js).
      // Fachliche Bilddatei-Obergrenze ist exakt 4 MB (lib/bandImages/validateImageFile.ts,
      // dort weiterhin strikt durchgesetzt, korrigiert auf das feste Request-Limit der
      // Vercel-Production-Umgebung) -- dieses Request-Limit liegt bewusst etwas darueber,
      // weil der Multipart-/FormData-Request neben der Datei noch Boundary- und
      // Feld-Overhead traegt (band_id-Hidden-Field, Multipart-Header). Kein exaktes "4mb",
      // um Requests mit gueltigen 4-MB-Dateien nicht knapp am Overhead scheitern zu lassen.
      bodySizeLimit: '4.2mb',
    },
  },
  images: {
    // TEMPORÄR Phase 1A – Airtable Attachment URLs sind keine stabile Bildquelle.
    // Finale Bildstrategie wird nach erfolgreichem Durchstich entschieden.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.airtableusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'dl.airtable.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
      {
        protocol: 'https',
        hostname: 'uploads-ssl.webflow.com',
      },
      {
        protocol: 'https',
        hostname: 'bfyucjjyarvqeftqqihm.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: '.*\\.vercel\\.app',
          },
        ],
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
