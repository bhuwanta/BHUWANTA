import { MetadataRoute } from 'next'
import { sanityFetch, blogListQuery, projectSlugsQuery, projectSlugsWithVideosQuery } from '@/lib/sanity'
import { getSiteUrl } from '@/lib/site-url'
import { canonicalProjectSlug } from '@/lib/project-links'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()

  const routes: MetadataRoute.Sitemap = [
    // ── Core pages ──
    { url: `${siteUrl}`, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/about`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/projects`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/gallery`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/blog`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/policies`, changeFrequency: 'yearly', priority: 0.3 },
    // /thank-you is a noindex conversion utility page.

    { url: `${siteUrl}/why-bhuwanta`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/reviews`, changeFrequency: 'monthly', priority: 0.7 },
    // ── Money pages (location landing pages) ──
    { url: `${siteUrl}/shabad-open-plots`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/shadnagar-open-plots`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/sangareddy-open-plots`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/sadashivpet-open-plots`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/yadagirigutta-open-plots`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/hmda-vs-dtcp-plots-hyderabad`, changeFrequency: 'monthly', priority: 0.8 },

    // ── Resources (gated content landing pages) ──
    { url: `${siteUrl}/resources/hyderabad-plot-buyer-legal-checklist`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteUrl}/resources/nh44-growth-corridor-investment-map`, changeFrequency: 'monthly', priority: 0.6 },

    // ── Static blog articles ──
    { url: `${siteUrl}/blog/best-real-estate-investment-telangana-andhra-pradesh`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/blog/nri-guide-uk-open-plots-hyderabad`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/blog/regional-ring-road-telangana-growth-areas`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/blog/verify-hmda-dtcp-approval-telangana`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/blog/open-plots-shabad-hyderabad-hmda-approved-guide`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/blog/dtcp-vs-hmda-plots-shadnagar-buyer-guide`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/blog/shabad-vs-shadnagar-investment-comparison`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/blog/open-plots-shadnagar-growth-story-2026`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/blog/best-areas-open-plots-near-hyderabad-2026`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/blog/nri-open-plots-hyderabad-guide`, changeFrequency: 'monthly', priority: 0.7 },
  ]

  // Hand-authored /projects/<slug> pages that exist as static routes today,
  // independent of whether the Sanity slug field has been set for these
  // projects yet (see KNOWN_PROJECT_SLUGS in ProjectsFilterClient.tsx).
  const staticProjectSlugs = ['sv-kanaka-maple-homes', 'tjr-township', 'vaibhav-county', 'vian-vally']
  staticProjectSlugs.forEach(slug => {
    routes.push({
      url: `${siteUrl}/projects/${slug}`,
      changeFrequency: 'weekly',
      priority: 0.8
    })
  })

  // Add dynamic blog slugs
  try {
    const posts = await sanityFetch<{ slug: { current: string }, publishDate?: string, _updatedAt?: string }[]>({
      query: blogListQuery,
      tags: ['blog']
    })

    if (posts) {
      posts.forEach(post => {
        if (post.slug?.current) {
          routes.push({
            url: `${siteUrl}/blog/${post.slug.current}`,
            ...(post._updatedAt || post.publishDate ? { lastModified: post._updatedAt || post.publishDate } : {}),
            changeFrequency: 'weekly',
            priority: 0.7
          })
        }
      })
    }
  } catch { /* Ignore fetching errors for sitemap */ }

  // Videos pages — only for projects that actually have videos, so empty
  // pages aren't submitted to Search Console.
  try {
    const videoSlugs = await sanityFetch<string[]>({
      query: projectSlugsWithVideosQuery,
      tags: ['projects'],
    })

    ;(videoSlugs || []).forEach((slug) => {
      if (slug) {
        routes.push({
          url: `${siteUrl}/projects/${slug}/videos`,
          changeFrequency: 'weekly',
          priority: 0.7,
        })
      }
    })
  } catch { /* Ignore fetching errors for sitemap */ }

  // Add dynamic project slugs
  try {
    const projectSlugs = await sanityFetch<string[]>({
      query: projectSlugsQuery,
      tags: ['projects']
    })

    if (projectSlugs) {
      projectSlugs.forEach(slug => {
        // Skip slugs already covered by the hand-authored static pages above
        // (an editor may eventually set a matching CMS slug for one of them).
        if (staticProjectSlugs.includes(canonicalProjectSlug(slug))) return
        routes.push({
          url: `${siteUrl}/projects/${slug}`,
          changeFrequency: 'weekly',
          priority: 0.8
        })
      })
    }
  } catch { /* Ignore fetching errors for sitemap */ }

  return Array.from(new Map(routes.map(route => [route.url, route])).values())
}
