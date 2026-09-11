import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/lib/site-url'

// Builds full title/description/canonical/OG/Twitter metadata for hand-authored
// static pages (articles, comparison pages, lead magnets) that have no
// per-page photo of their own — falls back to the branded /api/og generator
// so every page still gets a real preview image on WhatsApp/social shares.
export function buildStaticOgMetadata({
  title,
  description,
  url,
  ogTitle,
  ogSubtitle,
  image,
}: {
  title: string
  description: string
  url: string
  ogTitle: string
  ogSubtitle: string
  /** Real photo to use instead of the generated placeholder, when the page is about a specific project. */
  image?: string
}): Metadata {
  const ogImage = image || `https://bhuwanta.com/api/og?title=${encodeURIComponent(ogTitle)}&subtitle=${encodeURIComponent(ogSubtitle)}`

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

// Types for SEO settings
interface SeoSettings {
  page_slug: string
  meta_title: string | null
  meta_description: string | null
  og_image: string | null
  canonical_url: string | null
  noindex: boolean
  focus_keyword: string | null
  secondary_keywords: string | null
}
interface SeoGlobal {
  site_name: string
  title_template: string
  default_description: string
  default_og_image: string | null
  twitter_card_type: string
  google_verification: string | null
  bing_verification: string | null
}


// Fallback values when Supabase tables aren't set up yet
const DEFAULT_GLOBAL: SeoGlobal = {
  site_name: 'Bhuwanta',
  title_template: '{page_title} | Bhuwanta',
  default_description: 'Premium real estate solutions by Bhuwanta. Discover luxury properties, residential projects, and commercial spaces.',
  default_og_image: null,
  twitter_card_type: 'summary_large_image',
  google_verification: null,
  bing_verification: null,
}

// Get global SEO defaults
async function getSeoGlobal(): Promise<SeoGlobal> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('seo_global')
      .select('*')
      .single()
    return data || DEFAULT_GLOBAL
  } catch {
    return DEFAULT_GLOBAL
  }
}

// Get per-page SEO overrides
async function getSeoSettings(pageSlug: string): Promise<SeoSettings | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('seo_settings')
      .select('*')
      .eq('page_slug', pageSlug)
      .single()
    return data
  } catch {
    return null
  }
}

// Main metadata generator used by every page
export async function generatePageMetadata(
  pageSlug: string,
  defaultTitle: string,
  defaultDescription?: string
): Promise<Metadata> {
  const global = await getSeoGlobal()
  const settings = await getSeoSettings(pageSlug)

  // `absolute` bypasses the root layout's `%s | Bhuwanta` title template — this
  // string already has the site name appended, so without `absolute` Next.js
  // appends it a second time (e.g. "... | Bhuwanta | Bhuwanta").
  const title = {
    absolute: settings?.meta_title || global.title_template.replace('{page_title}', defaultTitle),
  }
  const description = settings?.meta_description || defaultDescription || global.default_description
  const ogImage = settings?.og_image || global.default_og_image
  const siteUrl = getSiteUrl()

  const metadata: Metadata = {
    title,
    description,
    openGraph: {
      title: settings?.meta_title || defaultTitle,
      description,
      type: 'website',
      siteName: global.site_name,
      url: settings?.canonical_url || `${siteUrl}/${pageSlug === 'home' ? '' : pageSlug}`,
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: global.twitter_card_type as 'summary_large_image' | 'summary',
      title: settings?.meta_title || defaultTitle,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    robots: settings?.noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  }

  metadata.alternates = { 
    canonical: settings?.canonical_url || `${siteUrl}/${pageSlug === 'home' ? '' : pageSlug}`
  }

  if (global.google_verification) {
    metadata.verification = {
      ...metadata.verification,
      google: global.google_verification,
    }
  }

  if (global.bing_verification) {
    metadata.verification = {
      ...metadata.verification,
      other: { 'msvalidate.01': global.bing_verification },
    }
  }

  return metadata
}

// Get LocalBusiness schema data from Supabase
export async function getLocalBusinessSchema() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('local_business')
      .select('*')
      .single()
    return data
  } catch {
    return null
  }
}

// Get Organization entity data from Supabase
export async function getOrganizationSchema() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('entity_markup')
      .select('*')
      .eq('type', 'Organization')
      .single()
    return data
  } catch {
    return null
  }
}

// Get FAQ entries for a specific page
export async function getFaqEntries(pageSlug: string) {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('faq_entries')
      .select('*')
      .eq('page_slug', pageSlug)
      .order('sort_order', { ascending: true })
    return data || []
  } catch {
    return []
  }
}
