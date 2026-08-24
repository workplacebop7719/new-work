import type { MetadataRoute } from 'next';

/**
 * What a crawler may look at.
 *
 * The disallow list is not about hiding anything — it is about not asking a
 * crawler to index pages that exist for one signed-in person. A Watchlist
 * behind a session check returns a redirect to a crawler anyway; listing it
 * here saves everybody the request.
 *
 * `/api/` is excluded for the same reason: the session probe is a fact about
 * the caller, and there is nothing there to index.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bargenation.example';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/app/', '/admin/', '/api/', '/reset-password', '/verify-email'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
