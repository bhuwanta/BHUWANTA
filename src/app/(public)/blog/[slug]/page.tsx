import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PortableText } from '@portabletext/react'
import { ArrowLeft, Calendar, Tag } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { sanityFetch, blogPostQuery } from '@/lib/sanity'
import { JsonLd, buildBreadcrumbSchema, buildArticleSchema, buildFaqSchema } from '@/components/seo/JsonLd'
import { formatDate, calculateReadingTime } from '@/lib/utils'
import { getSiteUrl } from '@/lib/site-url'

interface BlogPostData {
  title: string
  slug: { current: string }
  body: Array<{ _type: string; children?: Array<{ text?: string }>; [key: string]: unknown }>
  mainImage?: string
  tags?: string[]
  publishDate: string
  metaTitle?: string
  metaDescription?: string
  ogImage?: string
  canonicalUrl?: string
  focusKeyword?: string
  faqs?: { question: string; answer: string }[]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  try {
    const post = await sanityFetch<BlogPostData>({
      query: blogPostQuery,
      params: { slug },
      tags: ['blog'],
    })
    if (!post) return { title: 'Post Not Found' }

    // The Sanity `canonicalUrl` field is a manually-set string that goes stale
    // whenever a post's slug changes (it isn't derived from the live route).
    // Only trust it when it actually points at this post's current URL —
    // otherwise fall back to the live slug so the canonical can never point
    // at an old/renamed URL.
    const siteUrl = getSiteUrl()
    const liveUrl = `${siteUrl}/blog/${slug}`
    const canonical = post.canonicalUrl?.endsWith(`/blog/${slug}`) ? post.canonicalUrl : liveUrl

    return {
      title: post.metaTitle || post.title,
      description: post.metaDescription || `Read "${post.title}" on Bhuwanta Blog`,
      openGraph: {
        title: post.metaTitle || post.title,
        description: post.metaDescription,
        type: 'article',
        ...(post.ogImage ? { images: [{ url: post.ogImage }] } : {}),
      },
      alternates: { canonical },
    }
  } catch {
    return { title: 'Blog Post' }
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  let post: BlogPostData | null = null

  try {
    post = await sanityFetch<BlogPostData>({
      query: blogPostQuery,
      params: { slug },
      tags: ['blog'],
    })
  } catch { /* not found */ }

  if (!post) return notFound()

  // Estimate reading time from body text
  const bodyText = post.body
    ?.map((block) =>
      block.children?.map((c) => c.text).join(' ') || ''
    )
    .join(' ') || ''
  calculateReadingTime(bodyText)

  const siteUrl = getSiteUrl()
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'Blog', url: `${siteUrl}/blog` },
    { name: post.title, url: `${siteUrl}/blog/${slug}` },
  ])

  const articleSchema = buildArticleSchema({
    title: post.title,
    description: post.metaDescription || `Read "${post.title}"`,
    url: `${siteUrl}/blog/${slug}`,
    datePublished: post.publishDate,
    authorName: 'Bhuwanta Team',
    publisherName: 'Bhuwanta',
    ...(post.ogImage ? { imageUrl: post.ogImage } : {}),
  })

  const faqSchema = post.faqs?.length ? buildFaqSchema(post.faqs) : null

  return (
    <>
      <JsonLd data={faqSchema ? [breadcrumb, articleSchema, faqSchema] : [breadcrumb, articleSchema]} />

      <article className="pt-28 sm:pt-32 section-padding pb-20 bg-[#f7f8fa]">
        <div className="max-w-4xl mx-auto bg-white border border-[#e8ecf2] shadow-sm rounded-xl overflow-hidden">
          
          {/* Hero Image */}
          {post.mainImage && (
            <div className="w-full aspect-[16/9] relative bg-[#f3f5f8]">
              <Image
                src={post.mainImage}
                alt={`${post.title} — cover image`}
                fill
                sizes="(max-width: 768px) 100vw, 900px"
                priority
                className="object-cover"
              />
            </div>
          )}

          <div className="p-8 md:p-12">
            {/* Header / Meta */}
            <header className="mb-10">
              <div className="flex flex-wrap items-center gap-3 text-sm text-[#5a6a82] mb-6 font-medium">
                <span className="flex items-center gap-1.5 text-[#c4a55a]"><Calendar className="w-4 h-4" /> <span className="text-[#5a6a82]">{formatDate(post.publishDate)}</span></span>
                <span className="text-[#e8ecf2]">•</span>
                <span className="flex items-center gap-1.5 text-[#c4a55a] font-semibold text-[#5a6a82]">Bhuwanta Team</span>
                {post.tags && post.tags.length > 0 && (
                  <>
                    <span className="text-[#e8ecf2]">•</span>
                    <span className="flex items-center gap-1.5 text-[#c4a55a]"><Tag className="w-4 h-4" /> <span className="text-[#5a6a82]">{post.tags[0]}</span></span>
                  </>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1e3a5f] leading-tight mb-8">
                {post.title}
              </h1>
            </header>

            {/* Body */}
            <div className="prose prose-lg max-w-none prose-headings:text-[#1e3a5f] prose-h3:text-[#1e3a5f] prose-h4:text-[#c4a55a] prose-h4:font-bold prose-p:text-[#5a6a82] prose-a:text-[#1e3a5f] prose-a:font-semibold hover:prose-a:text-[#c4a55a] prose-strong:text-[#0f1d33] prose-blockquote:bg-[#fef9f0] prose-blockquote:border-l-4 prose-blockquote:border-[#c4a55a] prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:text-[#5a6a82] prose-blockquote:not-italic prose-li:text-[#5a6a82] prose-ul:text-[#5a6a82] prose-ol:text-[#5a6a82]">
              {post.body && (
                <PortableText 
                  value={post.body} 
                  components={{
                    block: {
                      normal: ({ children }: { children?: React.ReactNode }) => {
                        // If the user hit enter to create an empty line, force it to take up vertical space
                        if (!children || (Array.isArray(children) && (children.length === 0 || (children.length === 1 && children[0] === '')))) {
                          return <p className="h-6"><br /></p>
                        }
                        return <p>{children}</p>
                      }
                    }
                  }}
                />
              )}
            </div>

            {/* FAQs */}
            {post.faqs && post.faqs.length > 0 && (
              <div className="mt-16 pt-8 border-t border-[#e8ecf2]">
                <h2 className="text-2xl font-bold text-[#1e3a5f] mb-6">Frequently Asked Questions</h2>
                <div className="space-y-6">
                  {post.faqs.map((faq, i) => (
                    <div key={i}>
                      <h3 className="text-lg font-bold text-[#0f1d33] mb-2">{faq.question}</h3>
                      <p className="text-[#5a6a82] leading-relaxed">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <footer className="mt-16 pt-8 border-t border-[#e8ecf2] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm text-[#5a6a82]">
                Share this article:
                <div className="flex gap-2">
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${siteUrl}/blog/${slug}`)}`} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white transition-colors text-xs font-bold">f</a>
                  <a href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(`${siteUrl}/blog/${slug}`)}&title=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white transition-colors text-[10px] font-bold">in</a>
                  <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${siteUrl}/blog/${slug}`)}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white transition-colors text-xs font-bold">x</a>
                </div>
              </div>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#c4a55a] hover:text-[#a38743] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to all blogs
              </Link>
            </footer>
          </div>
        </div>
      </article>
    </>
  )
}
