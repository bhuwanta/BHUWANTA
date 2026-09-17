import Link from 'next/link'
import { Calendar, Tag } from 'lucide-react'
import { JsonLd, buildBreadcrumbSchema, buildArticleSchema, buildFaqSchema } from '@/components/seo/JsonLd'
import { CtaSection } from '@/components/ui/CtaSection'
import { WhatsAppInlineCta } from '@/components/ui/WhatsAppInlineCta'

export interface ArticleFaq {
  question: string
  answer: string
}

export function ArticleLayout({
  slug,
  title,
  description,
  tag,
  publishDate,
  children,
  faqs,
  relatedLinks,
  whatsappContext,
  disclaimer,
}: {
  slug: string
  title: string
  description: string
  tag: string
  publishDate: string
  children: React.ReactNode
  faqs: ArticleFaq[]
  relatedLinks: { href: string; label: string }[]
  whatsappContext: string
  disclaimer?: string
}) {
  const siteUrl = 'https://bhuwanta.com'
  const pageUrl = `${siteUrl}/blog/${slug}`

  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'Blog', url: `${siteUrl}/blog` },
    { name: title, url: pageUrl },
  ])
  const articleSchema = buildArticleSchema({
    title,
    description,
    url: pageUrl,
    datePublished: publishDate,
    authorName: 'Bhuwanta Team',
    publisherName: 'Bhuwanta',
  })
  const faqSchema = faqs.length > 0 ? buildFaqSchema(faqs) : null

  return (
    <>
      <JsonLd data={faqSchema ? [breadcrumb, articleSchema, faqSchema] : [breadcrumb, articleSchema]} />

      <article className="editorial-article pt-28 sm:pt-32 section-padding pb-20 bg-brand-paper">
        <div className="max-w-4xl mx-auto bg-white border border-brand-border shadow-sm rounded-xl overflow-hidden">
          <div className="p-8 md:p-12">
            <header className="mb-10"><Link href="/blog" className="eyebrow">← All Articles</Link>
              <div className="flex flex-wrap items-center gap-3 text-sm text-brand-muted mb-6 font-medium">
                <span className="flex items-center gap-1.5 text-brand-accent">
                  <Calendar className="w-4 h-4" /> <span className="text-brand-muted">{publishDate}</span>
                </span>
                <span className="text-brand-border">•</span>
                <span className="text-brand-muted font-semibold">Bhuwanta Team</span>
                <span className="text-brand-border">•</span>
                <span className="flex items-center gap-1.5 text-brand-accent">
                  <Tag className="w-4 h-4" /> <span className="text-brand-muted">{tag}</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-brand-primary leading-tight">{title}</h1>
            </header>

            <div className="prose prose-lg max-w-none prose-headings:text-brand-primary prose-h2:text-2xl prose-h3:text-xl prose-p:text-brand-muted prose-a:text-brand-primary prose-a:font-semibold hover:prose-a:text-brand-accent prose-strong:text-brand-ink prose-li:text-brand-muted prose-ul:text-brand-muted prose-ol:text-brand-muted">
              {children}
            </div>

            <div className="mt-10 flex justify-center">
              <WhatsAppInlineCta context={whatsappContext} label="Ask Us on WhatsApp" />
            </div>

            {faqs.length > 0 && (
              <div className="mt-16 pt-8 border-t border-brand-border">
                <h2 className="text-2xl font-bold text-brand-primary mb-6">Frequently Asked Questions</h2>
                <div className="space-y-6">
                  {faqs.map((faq, i) => (
                    <div key={i}>
                      <h3 className="text-lg font-bold text-brand-ink mb-2">{faq.question}</h3>
                      <p className="text-brand-muted leading-relaxed">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {disclaimer && (
              <p className="mt-10 text-sm text-brand-muted italic border-t border-brand-border pt-6">
                {disclaimer}
              </p>
            )}

            {relatedLinks.length > 0 && (
              <footer className="mt-16 pt-8 border-t border-brand-border flex flex-wrap gap-x-2 gap-y-1 text-sm text-brand-muted">
                <span>Related:</span>
                {relatedLinks.map((link, i) => (
                  <span key={link.href}>
                    <Link href={link.href} className="font-semibold text-brand-primary hover:text-brand-accent">{link.label}</Link>
                    {i < relatedLinks.length - 1 ? ',' : ''}
                  </span>
                ))}
              </footer>
            )}
          </div>
        </div>
      </article>

      <CtaSection />
    </>
  )
}
