import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://404tools.dev'

  return [
    {
      url: baseUrl,
      lastModified: new Date('2026-03-30'),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/cronvis`,
      lastModified: new Date('2026-03-30'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/confusion-matrix`,
      lastModified: new Date('2026-03-30'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/regex`,
      lastModified: new Date('2026-03-30'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/ocr-api`,
      lastModified: new Date('2026-08-06'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date('2026-08-06'),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date('2026-08-06'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
