import type { Metadata } from 'next';
import { NextStudio } from 'next-sanity/studio';
import { metadata as studioMetadata } from 'next-sanity/studio';
import config from '../../../sanity.config';
import { isSanityConfigured } from '@/sanity/env';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  ...studioMetadata,
  robots: { index: false, follow: false },
};

export { viewport } from 'next-sanity/studio';

export default function StudioPage() {
  if (!isSanityConfigured) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="text-lg font-semibold">Sanity Studio</h1>
          <p className="text-sm text-neutral-600">
            Bitte{' '}
            <code className="text-xs">NEXT_PUBLIC_SANITY_PROJECT_ID</code> und{' '}
            <code className="text-xs">NEXT_PUBLIC_SANITY_DATASET</code> in der
            Umgebung setzen.
          </p>
        </div>
      </div>
    );
  }

  return <NextStudio config={config} />;
}
