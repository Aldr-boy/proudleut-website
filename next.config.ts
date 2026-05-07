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
    ],
  },
};

export default nextConfig;
