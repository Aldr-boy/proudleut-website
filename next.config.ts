import type { NextConfig } from "next";
import { deriveSupabaseImageRemotePattern } from "./lib/bandImages/supabaseImageRemotePattern";

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
      // Supabase Storage: aus NEXT_PUBLIC_SUPABASE_URL abgeleitet statt
      // fest auf einen einzelnen Produktionshost verdrahtet -- siehe
      // lib/bandImages/supabaseImageRemotePattern.ts. Damit funktionieren
      // Staging-/Ersatz-Projekte und lokale Supabase-Instanzen, ohne
      // next.config.ts jedes Mal manuell anzupassen.
      deriveSupabaseImageRemotePattern(process.env.NEXT_PUBLIC_SUPABASE_URL),
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
  async redirects() {
    return [
      // Alter Webflow-Pfad -- kanonisch ist jetzt /datenschutz (Block
      // "Impressum und Datenschutz"). Serverseitiger, permanenter Redirect
      // (308) ohne eigene Seite/Client-Rendering fuer /datenschutzhinweise,
      // damit hier nie eine zweite Textkopie entstehen kann.
      {
        source: '/datenschutzhinweise',
        destination: '/datenschutz',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
