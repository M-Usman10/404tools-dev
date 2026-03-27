import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://404tools.dev'

  return [
    {
      url: baseUrl,
      lastModified: new Date('2025-03-27'),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/cronvis`,
      lastModified: new Date('2025-03-27'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
