import type { Metadata } from 'next'
import { usEnabled } from './flags'

// Per-page metadata for the public routes (lib/site.ts PUBLIC_ROUTES).
//
// Next merges metadata shallowly: a page that sets openGraph replaces the
// layout's openGraph entirely, images included. So every page builds its full
// set here, with its own canonical and og:url, instead of inheriting the
// homepage's.

/** "Switzerland and the United States" while US coverage is on */
export function coverageName(): string {
  return usEnabled() ? 'Switzerland and the United States' : 'Switzerland'
}

// The card's file name changes with its artwork: social platforms cache
// preview images by URL, so a redrawn og.png would never replace existing
// previews. og.png is the Switzerland-only card, kept for when the US is off.
export function ogImage() {
  return usEnabled()
    ? { url: '/og-v2.png', width: 1200, height: 630, alt: "Liveability — real data on where you're moving in Switzerland and the United States" }
    : { url: '/og.png', width: 1200, height: 630, alt: "Liveability — real data on where you're moving in Switzerland" }
}

export function pageMetadata({ path, title, description }: { path: string; title: string; description: string }): Metadata {
  const image = ogImage()
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: 'Liveability',
      locale: 'en_US',
      url: path,
      title,
      description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: image.url, alt: image.alt }],
    },
  }
}
