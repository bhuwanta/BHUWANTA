import { getSiteUrl } from '@/lib/site-url'
import { MetadataRoute } from 'next'

const AI_CRAWLER_AGENTS = [
  'GPTBot',
  'ChatGPT-User',
  'Google-Extended',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Perplexity-User',
  'CCBot',
  'Bingbot',
]

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()

  const allowRules = ['/', '/api/og']
  const disallowRules = ['/dashboard', '/api', '/studio', '/crm', '/REALESTATE_SOFTWARE']

  return {
    rules: [
      { userAgent: '*', allow: allowRules, disallow: disallowRules },
      ...AI_CRAWLER_AGENTS.map((userAgent) => ({
        userAgent,
        allow: allowRules,
        disallow: disallowRules,
      })),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
