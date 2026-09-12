// SEO Component: JSON-LD structured data injection
// Usage: <JsonLd data={mySchemaObject} />

interface JsonLdProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any> | Record<string, any>[]
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

// ================================================
// Schema Builder Functions
// ================================================

export function buildLocalBusinessSchema(business: {
  name: string
  type?: string
  streetAddress?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  phone?: string
  email?: string
  website?: string
  latitude?: number
  longitude?: number
  priceRange?: string
  logoUrl?: string
  openingHours?: Array<{ day: string; open: string; close: string }>
  sameAsLinks?: string[]
  areaServed?: Array<{ type: 'State' | 'Place'; name: string }>
  knowsAbout?: string[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', business.type || 'RealEstateAgent'],
    name: business.name,
    ...(business.streetAddress && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: business.streetAddress,
        addressLocality: business.city,
        addressRegion: business.state,
        postalCode: business.postalCode,
        addressCountry: business.country,
      },
    }),
    ...(business.phone && { telephone: business.phone }),
    ...(business.email && { email: business.email }),
    ...(business.website && { url: business.website }),
    ...(business.latitude && business.longitude && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: business.latitude,
        longitude: business.longitude,
      },
    }),
    ...(business.priceRange && { priceRange: business.priceRange }),
    ...(business.logoUrl && { logo: business.logoUrl }),
    ...(business.sameAsLinks?.length && { sameAs: business.sameAsLinks }),
    ...(business.areaServed?.length && {
      areaServed: business.areaServed.map((a) => ({ '@type': a.type, name: a.name })),
    }),
    ...(business.knowsAbout?.length && { knowsAbout: business.knowsAbout }),
  }
}

export function buildOrganizationSchema(org: {
  name: string
  url: string
  logo?: string
  description?: string
  sameAs?: string[]
  foundingDate?: string
  founders?: string[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.name,
    url: org.url,
    ...(org.logo && { logo: org.logo }),
    ...(org.description && { description: org.description }),
    ...(org.sameAs?.length && { sameAs: org.sameAs }),
    ...(org.foundingDate && { foundingDate: org.foundingDate }),
    ...(org.founders?.length && {
      founder: org.founders.map((name) => ({
        '@type': 'Person',
        name,
      })),
    }),
  }
}

export function buildWebSiteSchema(site: {
  name: string
  url: string
  searchUrl?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: site.url,
    ...(site.searchUrl && {
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: site.searchUrl,
        },
        'query-input': 'required name=search_term_string',
      },
    }),
  }
}

export function buildBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function buildFaqSchema(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

export function buildArticleSchema(article: {
  title: string
  description: string
  url: string
  imageUrl?: string
  datePublished: string
  dateModified?: string
  authorName: string
  publisherName: string
  publisherLogo?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    url: article.url,
    ...(article.imageUrl && { image: article.imageUrl }),
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    author: {
      '@type': 'Person',
      name: article.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: article.publisherName,
      ...(article.publisherLogo && {
        logo: { '@type': 'ImageObject', url: article.publisherLogo },
      }),
    },
  }
}

export function buildJobPostingSchema(job: {
  title: string
  description: string
  datePosted: string
  employmentType: string
  location: string
  salaryMin?: number
  salaryMax?: number
  companyName: string
  applyUrl?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.datePosted,
    employmentType: job.employmentType.toUpperCase().replace('-', '_'),
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location,
      },
    },
    hiringOrganization: {
      '@type': 'Organization',
      name: job.companyName,
    },
    ...(job.salaryMin && job.salaryMax && {
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: 'INR',
        value: {
          '@type': 'QuantitativeValue',
          minValue: job.salaryMin,
          maxValue: job.salaryMax,
          unitText: 'YEAR',
        },
      },
    }),
    ...(job.applyUrl && { applicationContact: { '@type': 'ContactPoint', url: job.applyUrl } }),
  }
}

export function buildRealEstateListingSchema(listing: {
  name: string
  description: string
  url: string
  imageUrl?: string
  price?: string
  address?: string
  status?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: listing.name,
    description: listing.description,
    url: listing.url,
    ...(listing.imageUrl && { image: listing.imageUrl }),
    ...(listing.price && {
      offers: {
        '@type': 'Offer',
        price: listing.price,
        priceCurrency: 'INR',
      },
    }),
    ...(listing.address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: listing.address,
      },
    }),
  }
}

export function buildPersonSchema(person: {
  name: string
  jobTitle?: string
  image?: string
  url?: string
  sameAs?: string[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    ...(person.jobTitle && { jobTitle: person.jobTitle }),
    ...(person.image && { image: person.image }),
    ...(person.url && { url: person.url }),
    ...(person.sameAs?.length && { sameAs: person.sameAs }),
  }
}

export function buildImageGallerySchema(images: Array<{ url: string; caption?: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    image: images.map((img) => ({
      '@type': 'ImageObject',
      contentUrl: img.url,
      ...(img.caption && { caption: img.caption }),
    })),
  }
}

// One per video on /projects/<slug>/videos. This is what makes those pages
// eligible for video rich results and Google's Videos tab — without it the
// page is just an embed grid as far as search is concerned.
export function buildVideoObjectSchema(video: {
  name: string
  description?: string
  thumbnailUrl?: string
  contentUrl?: string
  embedUrl?: string
  uploadDate?: string
  pageUrl: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.name,
    description: video.description || video.name,
    // uploadDate is required by Google for video rich results; editors often
    // leave the date blank, so fall back rather than emit an invalid object.
    uploadDate: video.uploadDate || new Date().toISOString().split('T')[0],
    ...(video.thumbnailUrl ? { thumbnailUrl: [video.thumbnailUrl] } : {}),
    ...(video.contentUrl ? { contentUrl: video.contentUrl } : {}),
    ...(video.embedUrl ? { embedUrl: video.embedUrl } : {}),
    publisher: {
      '@type': 'Organization',
      name: 'Bhuwanta',
    },
    mainEntityOfPage: video.pageUrl,
  }
}
