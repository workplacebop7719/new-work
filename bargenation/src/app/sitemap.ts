import type { MetadataRoute } from 'next';
import { getDeals, getRetailers } from '@/data/repository';
import { CATEGORIES } from '@/domain/types';

/**
 * Every page worth finding.
 *
 * Built from the DATA, not from a hand-kept list, so a new deal or retailer
 * appears without anybody remembering to add it — and a page that no longer
 * exists disappears for the same reason. A hand-written sitemap is a second
 * source of truth that quietly stops matching the first.
 *
 * `lastModified` on a deal is the moment we last verified its price, which is
 * the only honest answer: that is when the page's content actually changed.
 *
 * Nothing behind a session appears here. Those pages exist for one person.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bargenation.example')
    .replace(/\/$/, '');

  const [deals, retailers] = await Promise.all([getDeals(), getRetailers()]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/today`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/categories`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/stores`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/search`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/how-it-works`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/edit`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/contact`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/disclosures`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  return [
    ...staticPages,
    ...CATEGORIES.map((category) => ({
      url: `${base}/categories/${category.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
    ...retailers.map((retailer) => ({
      url: `${base}/stores/${retailer.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
    ...deals.map((deal) => ({
      url: `${base}/deals/${deal.offer.product.slug}`,
      lastModified: new Date(deal.offer.lastVerifiedAt),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  ];
}
