import { defineType, defineField } from 'sanity'

export const siteSettingsSchema = defineType({
  name: 'siteSettings',
  type: 'document',
  title: 'Site Settings',
  groups: [
    { name: 'branding', title: 'Branding' },
    { name: 'navigation', title: 'Header / Navigation' },
    { name: 'footer', title: 'Footer' },
    { name: 'seo', title: 'Global SEO' },
    { name: 'social', title: 'Social Media' },
    { name: 'marketing', title: 'Marketing Scripts' },
  ],
  fields: [
    // ===== BRANDING =====
    defineField({
      name: 'siteName',
      type: 'string',
      title: 'Site Name',
      group: 'branding',
      initialValue: 'Bhuwanta',
    }),
    defineField({
      name: 'tagline',
      type: 'string',
      title: 'Tagline',
      group: 'branding',
      initialValue: 'Land Today. Landmark Tomorrow.',
    }),
    defineField({
      name: 'logo',
      type: 'image',
      title: 'Logo',
      group: 'branding',
      description: 'Main site logo (used in header and footer)',
      options: { hotspot: true },
    }),
    defineField({
      name: 'favicon',
      type: 'image',
      title: 'Favicon',
      group: 'branding',
      description: 'Browser tab icon (recommended: 32x32 PNG)',
    }),

    // ===== NAVIGATION =====
    defineField({
      name: 'navLinks',
      type: 'array',
      title: 'Navigation Links',
      group: 'navigation',
      description: 'Links shown in the header navigation bar',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'label', type: 'string', title: 'Label' }),
            defineField({ name: 'href', type: 'string', title: 'URL Path', description: 'e.g. /about, /projects' }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'href' },
          },
        },
      ],
    }),
    defineField({
      name: 'ctaButtonText',
      type: 'string',
      title: 'CTA Button Text',
      group: 'navigation',
      initialValue: 'Book Site Visit',
    }),
    defineField({
      name: 'ctaButtonLink',
      type: 'string',
      title: 'CTA Button Link',
      group: 'navigation',
      initialValue: '/contact',
    }),

    // ===== FOOTER =====
    defineField({
      name: 'footerAddress',
      type: 'text',
      title: 'Office Address',
      group: 'footer',
    }),
    defineField({
      name: 'footerAddressLabel',
      type: 'string',
      title: 'Address Label',
      group: 'footer',
      initialValue: 'Headquarters',
    }),
    defineField({
      name: 'googleMapsUrl',
      type: 'url',
      title: 'Google Maps Link',
      group: 'footer',
    }),
    defineField({
      name: 'footerEmail',
      type: 'string',
      title: 'Email Address',
      group: 'footer',
    }),
    defineField({
      name: 'copyrightText',
      type: 'string',
      title: 'Copyright Text',
      group: 'footer',
      description: 'The year is auto-added. e.g. "Bhuwanta. All rights reserved."',
      initialValue: 'Bhuwanta. All rights reserved.',
    }),

    // ===== GLOBAL SEO =====
    defineField({
      name: 'metaTitleTemplate',
      type: 'string',
      title: 'Meta Title Template',
      group: 'seo',
      description: 'Use %s for the page title. e.g. "%s | Bhuwanta"',
      initialValue: '%s | Bhuwanta',
    }),
    defineField({
      name: 'defaultMetaDescription',
      type: 'text',
      title: 'Default Meta Description',
      group: 'seo',
      description: 'Fallback description used when a page has none',
    }),
    defineField({
      name: 'defaultOgImage',
      type: 'image',
      title: 'Default Open Graph Image',
      group: 'seo',
      description: 'Default social sharing image (1200x630 recommended)',
    }),
    defineField({
      name: 'googleSiteVerification',
      type: 'string',
      title: 'Google Site Verification Code',
      group: 'seo',
    }),

    // ===== SOCIAL MEDIA =====
    defineField({
      name: 'socialLinks',
      type: 'object',
      title: 'Social Media Links',
      group: 'social',
      fields: [
        defineField({ name: 'linkedin', type: 'url', title: 'LinkedIn' }),
        defineField({ name: 'facebook', type: 'url', title: 'Facebook' }),
        defineField({ name: 'instagram', type: 'url', title: 'Instagram' }),
        defineField({ name: 'youtube', type: 'url', title: 'YouTube' }),
        defineField({ name: 'twitter', type: 'url', title: 'Twitter / X' }),
      ],
    }),

    // ===== MARKETING SCRIPTS =====
    defineField({
      name: 'googleAnalyticsId',
      type: 'string',
      title: 'Google Analytics ID',
      group: 'marketing',
      description: 'e.g. G-XXXXXXXXXX',
    }),
    defineField({
      name: 'googleTagManagerId',
      type: 'string',
      title: 'Google Tag Manager ID',
      group: 'marketing',
      description: 'e.g. GTM-XXXXXXX',
    }),
    defineField({
      name: 'metaPixelId',
      type: 'string',
      title: 'Meta / Facebook Pixel ID',
      group: 'marketing',
      description: 'e.g. 123456789012345',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Site Settings' }
    },
  },
})
