import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
