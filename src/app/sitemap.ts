import { MetadataRoute } from 'next'
import { sanityFetch, blogListQuery, projectSlugsQuery } from '@/lib/sanity'
import { getSiteUrl } from '@/lib/site-url'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()

  const routes: MetadataRoute.Sitemap = [
    // ── Core pages ──
    { url: `${siteUrl}`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/about`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/projects`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/gallery`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/policies`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    // /thank-you is intentionally excluded — it's disallowed in robots.txt
    // (a conversion-tracking utility page, not something to index), and
    // listing a disallowed URL in the sitemap just produces a
    // "blocked by robots.txt" warning in Search Console for no benefit.

    // ── Money pages (location landing pages) ──
    { url: `${siteUrl}/shabad-open-plots`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/shadnagar-open-plots`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/sangareddy-open-plots`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/sadashivpet-open-plots`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/yadagirigutta-open-plots`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/hmda-vs-dtcp-plots-hyderabad`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },

    // ── Resources (gated content landing pages) ──
    { url: `${siteUrl}/resources/hyderabad-plot-buyer-legal-checklist`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteUrl}/resources/nh44-growth-corridor-investment-map`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },

    // ── Static blog articles ──
    { url: `${siteUrl}/blog/verify-hmda-dtcp-approval-telangana`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/blog/open-plots-shabad-hyderabad-hmda-approved-guide`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/blog/dtcp-vs-hmda-plots-shadnagar-buyer-guide`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/blog/shabad-vs-shadnagar-investment-comparison`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/blog/open-plots-shadnagar-growth-story-2026`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/blog/best-areas-open-plots-near-hyderabad-2026`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/blog/nri-open-plots-hyderabad-guide`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ]

  // Hand-authored /projects/<slug> pages that exist as static routes today,
  // independent of whether the Sanity slug field has been set for these
  // projects yet (see KNOWN_PROJECT_SLUGS in ProjectsFilterClient.tsx).
  const staticProjectSlugs = ['sv-kanaka-maple-homes', 'tjr-township', 'vaibhav-county', 'vian-vally']
  staticProjectSlugs.forEach(slug => {
    routes.push({
      url: `${siteUrl}/projects/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8
    })
  })

  // Add dynamic blog slugs
  try {
    const posts = await sanityFetch<{ slug: { current: string }, publishDate: string }[]>({
      query: blogListQuery,
      tags: ['blog']
    })

    if (posts) {
      posts.forEach(post => {
        if (post.slug?.current) {
          routes.push({
            url: `${siteUrl}/blog/${post.slug.current}`,
            lastModified: new Date(post.publishDate || Date.now()),
            changeFrequency: 'weekly',
            priority: 0.7
          })
        }
      })
    }
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
        if (staticProjectSlugs.includes(slug)) return
        routes.push({
          url: `${siteUrl}/projects/${slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.8
        })
      })
    }
  } catch { /* Ignore fetching errors for sitemap */ }

  return routes
}
