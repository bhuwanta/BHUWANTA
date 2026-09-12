import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Calendar, Tag, BookOpen } from 'lucide-react'
import { generatePageMetadata } from '@/lib/seo'
import { sanityFetch, blogListQuery, projectByNameQuery } from '@/lib/sanity'
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd'
import { formatDate } from '@/lib/utils'
import { PageBanner } from '../../../components/ui/PageBanner'
import { CtaSection } from '@/components/ui/CtaSection'
import { NewsletterForm } from '@/components/ui/NewsletterForm'
import { getSiteUrl } from '@/lib/site-url'

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('blog', 'Blog', 'Practical advice on buying land, understanding approvals, Vastu principles, and building wealth through real estate.')
}

export const revalidate = 3600

interface BlogPost {
  title: string
  slug: { current: string }
  excerpt?: string
  mainImage?: string
  tags?: string[]
  publishDate: string
}

// Common shape both CMS blog posts and hand-authored guide pages are mapped
// into, so they render as one indistinguishable blog grid rather than a
// separate "guides" section.
interface BlogCard {
  href: string
  title: string
  excerpt: string
  image: string
  tag: string
  publishDate: string
}

const ogImage = (title: string, subtitle: string) =>
  `https://bhuwanta.com/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(subtitle)}`

// Guides about a specific project use that project's real photo instead of
// the generated placeholder — more genuine, and matches how project/landing
// pages already work. General/process guides (not tied to one project) keep
// the branded /api/og image, which is entirely self-generated (the site's
// own logo + drawn text, no stock photography) so there's no copyright
// concern either way.
const staticGuides: (Omit<BlogCard, 'image'> & { fallbackImage: string })[] = [
  {
    href: '/blog/best-areas-open-plots-near-hyderabad-2026',
    title: 'Best Areas to Buy Open Plots Near Hyderabad — 2026 Guide',
    excerpt: 'A 2026 guide comparing Hyderabad\'s three main open-plot growth corridors — NH-44 South, Mumbai Highway West, and Warangal Highway East — with a due-diligence checklist for buyers.',
    fallbackImage: ogImage('Best Areas to Buy Open Plots Near Hyderabad', '2026 Guide'),
    tag: 'Investment Guide',
    publishDate: '2026-08-19',
  },
  {
    href: '/blog/nri-open-plots-hyderabad-guide',
    title: 'NRI Guide to Buying Open Plots in Hyderabad (2026)',
    excerpt: 'A general guide for NRIs buying open plots near Hyderabad — FEMA eligibility, NRE/NRO/FCNR payment routing, the Power of Attorney process, and how to verify RERA/DTCP/HMDA approval before you buy.',
    fallbackImage: ogImage('NRI Guide to Buying Open Plots in Hyderabad', '2026 Guide'),
    tag: 'NRI Guide',
    publishDate: '2026-08-19',
  },
  {
    href: '/blog/best-real-estate-investment-telangana-andhra-pradesh',
    title: 'Best Real Estate Investment Options in Telangana & Andhra Pradesh: 2026 Guide',
    excerpt: 'A 2026 guide to investing in Telangana and Andhra Pradesh real estate — why HMDA/DTCP-approved open plots near growth corridors are drawing investor interest, and what to check before you buy.',
    fallbackImage: ogImage('Best Real Estate Investment Options', 'Telangana & Andhra Pradesh — 2026 Guide'),
    tag: 'Investment Guide',
    publishDate: '2026-07-16',
  },
  {
    href: '/blog/regional-ring-road-telangana-growth-areas',
    title: 'Regional Ring Road (RRR): Which Areas in Telangana Will Benefit Most?',
    excerpt: 'A look at Telangana\'s Regional Ring Road (RRR) — its decentralization goal, which growth corridors are seeing rising investor interest, and what it means for plot buyers.',
    fallbackImage: ogImage('Regional Ring Road (RRR)', 'Which Areas in Telangana Will Benefit Most?'),
    tag: 'Market Insight',
    publishDate: '2026-07-16',
  },
  {
    href: '/blog/nri-guide-uk-open-plots-hyderabad',
    title: 'Buying Open Plots in Hyderabad from the UK: Complete NRI Guide 2026',
    excerpt: 'A complete 2026 guide for UK-based NRIs buying open plots near Hyderabad — FEMA eligibility, UK tax basics, the Notary Public + FCDO apostille Power of Attorney process, and how to buy remotely.',
    fallbackImage: ogImage('Buying Open Plots in Hyderabad from the UK', 'Complete NRI Guide 2026'),
    tag: 'NRI Guide',
    publishDate: '2026-07-16',
  },
  {
    href: '/blog/verify-hmda-dtcp-approval-telangana',
    title: 'How to Verify HMDA/DTCP Approval in Telangana: Step-by-Step (2026)',
    excerpt: 'A step-by-step guide to verifying HMDA and DTCP layout approval and RERA registration in Telangana using the official government portals, before you buy a plot.',
    fallbackImage: ogImage('How to Verify HMDA/DTCP Approval', 'Step-by-Step Guide Using Official Telangana Portals'),
    tag: 'Blog',
    publishDate: '2026-07-13',
  },
  {
    href: '/hmda-vs-dtcp-plots-hyderabad',
    title: 'HMDA vs DTCP Approved Plots in Hyderabad: Complete 2026 Comparison',
    excerpt: 'HMDA vs DTCP approved plots in Hyderabad — compare pricing, infrastructure, approval process, and appreciation potential to choose the right plot for your investment goals.',
    fallbackImage: ogImage('HMDA vs DTCP Approved Plots', 'Complete 2026 Comparison'),
    tag: 'Blog',
    publishDate: '2026-07-13',
  },
  {
    href: '/blog/open-plots-shabad-hyderabad-hmda-approved-guide',
    title: 'Open Plots in Shabad, Hyderabad: HMDA Approved Plots Near Bangalore Highway (2026 Guide)',
    excerpt: 'A complete 2026 guide to open plots in Shabad, Hyderabad — HMDA approval, what drives value on the NH-44 Bangalore Highway corridor, and how to verify a plot before you buy.',
    fallbackImage: ogImage('Open Plots in Shabad, Hyderabad', 'HMDA Approved Plots Near Bangalore Highway — 2026 Guide'),
    tag: 'Blog',
    publishDate: '2026-07-13',
  },
  {
    href: '/blog/dtcp-vs-hmda-plots-shadnagar-buyer-guide',
    title: "DTCP vs HMDA Approved Plots in Shadnagar: Complete Buyer's Guide (2026)",
    excerpt: "DTCP vs HMDA approved plots in the Shadnagar area — what applies where, how to verify either approval type, and where Bhuwanta's nearest verified project fits in.",
    fallbackImage: ogImage('DTCP vs HMDA Plots in Shadnagar', "Complete Buyer's Guide (2026)"),
    tag: 'Blog',
    publishDate: '2026-07-13',
  },
  {
    href: '/blog/shabad-vs-shadnagar-investment-comparison',
    title: 'Shabad vs Shadnagar: Which Growth Corridor Should You Invest In?',
    excerpt: "Shabad vs Shadnagar — a straight comparison of Hyderabad's NH-44 growth corridor towns, who should choose which, and where verified, HMDA-approved inventory is available today.",
    fallbackImage: ogImage('Shabad vs Shadnagar', 'Which Growth Corridor Should You Invest In?'),
    tag: 'Blog',
    publishDate: '2026-07-13',
  },
  {
    href: '/blog/open-plots-shadnagar-growth-story-2026',
    title: "Open Plots for Sale in Shadnagar: What's Driving the 2026 Growth Story",
    excerpt: "Why Shadnagar is drawing buyer interest in 2026 — micro-location context, infrastructure drivers, and the red flags to check before buying any open plot in this corridor.",
    fallbackImage: ogImage('Open Plots for Sale in Shadnagar', "What's Driving the 2026 Growth Story"),
    tag: 'Blog',
    publishDate: '2026-07-13',
  },
]

// Guides directly about the Shabad/Shadnagar corridor use Vian Vally's real
// photo — everything else keeps its own fallbackImage.
const VIAN_VALLY_HREFS = new Set([
  '/blog/open-plots-shabad-hyderabad-hmda-approved-guide',
  '/blog/dtcp-vs-hmda-plots-shadnagar-buyer-guide',
  '/blog/shabad-vs-shadnagar-investment-comparison',
  '/blog/open-plots-shadnagar-growth-story-2026',
])

export default async function BlogPage() {
  let posts: BlogPost[] = []
  let vianVallyImage: string | null = null

  try {
    const data = await sanityFetch<BlogPost[]>({ query: blogListQuery, tags: ['blog'] })
    if (data) posts = data
  } catch { /* fallback */ }

  try {
    const vianVally = await sanityFetch<{ images?: string[] } | null>({
      query: projectByNameQuery,
      params: { name: 'VIAN VALLY' },
      tags: ['projects'],
    })
    vianVallyImage = vianVally?.images?.[0] || null
  } catch { /* fallback */ }

  const siteUrl = getSiteUrl()
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'Blog', url: `${siteUrl}/blog` },
  ])

  const postCards: BlogCard[] = posts
    .filter((post) => post.slug?.current)
    .map((post) => ({
      href: `/blog/${post.slug.current}`,
      title: post.title,
      excerpt: post.excerpt || 'Read this article to learn more about our latest real estate updates and insights.',
      image: post.mainImage || ogImage(post.title, 'Bhuwanta Developers'),
      tag: post.tags?.[0] || 'Blog',
      publishDate: post.publishDate,
    }))

  const guideCards: BlogCard[] = staticGuides.map(({ fallbackImage, ...guide }) => ({
    ...guide,
    image: (VIAN_VALLY_HREFS.has(guide.href) && vianVallyImage) || fallbackImage,
  }))

  // Two CMS documents can carry the same slug — publishing the same article
  // twice is a couple of clicks in Studio — which produced two cards with the
  // same href and a duplicate-key warning from React. The first card for a
  // given href wins: posts are ordered newest first, and they come ahead of
  // the hand-authored guides here.
  const seenHrefs = new Set<string>()
  const allCards = [...postCards, ...guideCards].filter((card) => {
    if (seenHrefs.has(card.href)) return false
    seenHrefs.add(card.href)
    return true
  })

  return (
    <>
      <JsonLd data={breadcrumb} />

      <PageBanner
        title={<>Latest <span className="text-[#c4a55a]">Blogs</span></>}
      />

      {/* Blog Grid Section */}
      <section className="py-20 bg-[#f7f8fa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {allCards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {allCards.map((card) => (
                <Link key={card.href} href={card.href} className="block h-full group">
                  <article className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
                    <div className="w-full aspect-[16/9] relative overflow-hidden bg-[#f7f8fa]">
                      <Image
                        src={card.image}
                        alt={`${card.title} — cover image`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex items-center gap-2 text-sm text-[#5a6a82] mb-4 font-medium">
                        <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-[#c4a55a]" /> {formatDate(card.publishDate)}</span>
                        <span className="text-[#e8ecf2]">•</span>
                        <span className="flex items-center gap-1.5"><Tag className="w-4 h-4 text-[#c4a55a]" /> {card.tag}</span>
                      </div>
                      <h3 className="text-xl md:text-2xl font-bold text-[#1e3a5f] mb-3 group-hover:text-[#c4a55a] transition-colors line-clamp-2 leading-snug">
                        {card.title}
                      </h3>
                      <p className="text-[#5a6a82] text-base mb-6 line-clamp-3 flex-grow">
                        {card.excerpt}
                      </p>
                      <div className="inline-flex items-center gap-2 text-base font-bold text-[#c4a55a] group-hover:text-[#a38743] transition-colors mt-auto">
                        Read More <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-[#c4a55a] mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-[#0f1d33] mb-2">No blogs found</h3>
              <p className="text-[#5a6a82]">Check back later for new insights and updates.</p>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 bg-white border-t border-[#e8ecf2]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <NewsletterForm />
        </div>
      </section>

      <CtaSection />
    </>
  )
}
