import { defineType, defineField } from 'sanity'

export const homeSchema = defineType({
  name: 'home',
  type: 'document',
  title: 'Home Page',
  groups: [
    { name: 'hero', title: '1. Hero Section' },
    { name: 'whyChoose', title: '2. Why Choose Bhuwanta' },
    { name: 'featuredProjects', title: '4. Featured Projects' },
    { name: 'journey', title: '5. Journey to Ownership' },
    { name: 'certifications', title: '6. Certifications' },
    { name: 'testimonials', title: '7. YouTube Testimonials' },
    { name: 'siteVisit', title: '8. Book Site Visit CTA' },
  ],
  fields: [
    // ===== 1. HERO =====
    defineField({
      name: 'heroPrimaryCta',
      type: 'string',
      title: 'Primary CTA Button Label',
      group: 'hero',
      description: 'e.g. "Book a Free Site Visit"',
    }),
    defineField({
      name: 'heroSecondaryCta',
      type: 'string',
      title: 'Secondary CTA Button Label',
      group: 'hero',
      description: 'e.g. "Call Now"',
    }),
    defineField({
      name: 'heroImages',
      type: 'array',
      title: 'Hero Background Images with Text',
      group: 'hero',
      description: 'Upload images and their corresponding text for the hero slider.',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'image', type: 'image', title: 'Image', options: { hotspot: true } }),
            defineField({ name: 'text', type: 'string', title: 'Overlay Text', description: 'e.g. "Farm Lands in Hyderabad"' }),
          ],
          preview: {
            select: {
              title: 'text',
              media: 'image',
            },
            prepare(selection) {
              const { title, media } = selection
              return {
                title: title || 'Image without text',
                media: media,
              }
            }
          },
        },
      ],
    }),

    // ===== 2. WHY CHOOSE BHUWANTA =====
    defineField({
      name: 'whyChooseHeading',
      type: 'string',
      title: 'Section Heading',
      group: 'whyChoose',
      description: 'e.g. "Why Choose BHUWANTA?"',
    }),
    defineField({
      name: 'whyChooseSubheading',
      type: 'text',
      title: 'Section Subheading',
      group: 'whyChoose',
      rows: 3,
    }),
    defineField({
      name: 'whyChooseFeatures',
      type: 'array',
      title: 'Feature Items (Scrolling Marquee)',
      group: 'whyChoose',
      description: 'Items displayed in the auto-scrolling marquee strip',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'icon', type: 'string', title: 'Lucide Icon Name', description: 'e.g. ShieldCheck, Building2, FileCheck, MapPin, IndianRupee, Compass, Hammer' }),
            defineField({ name: 'title', type: 'string', title: 'Feature Title' }),
          ],
          preview: {
            select: { title: 'title', subtitle: 'icon' },
          },
        },
      ],
    }),

    // ===== 4. FEATURED PROJECTS =====
    defineField({
      name: 'featuredProjectsHeading',
      type: 'string',
      title: 'Section Heading',
      group: 'featuredProjects',
    }),
    defineField({
      name: 'featuredProjectsSubheading',
      type: 'text',
      title: 'Section Subheading',
      group: 'featuredProjects',
      rows: 3,
    }),
    defineField({
      name: 'featuredProjects',
      type: 'array',
      title: 'Featured Project Cards',
      group: 'featuredProjects',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'name', type: 'string', title: 'Project Name' }),
            defineField({ name: 'tag', type: 'string', title: 'Badge Tag', description: 'e.g. "High Appreciation", "Fast Selling"' }),
            defineField({
              name: 'image',
              type: 'image',
              title: 'Project Image',
              options: { hotspot: true },
            }),
          ],
          preview: {
            select: { title: 'name', subtitle: 'tag', media: 'image' },
          },
        },
      ],
    }),
    defineField({
      name: 'featuredProjectsFooterText',
      type: 'string',
      title: 'Footer Text',
      group: 'featuredProjects',
      description: 'e.g. "Plus more premium layouts in Peddapur & Sadashivpet..."',
    }),

    // ===== 5. JOURNEY TO OWNERSHIP =====
    defineField({
      name: 'journeyHeading',
      type: 'string',
      title: 'Section Heading',
      group: 'journey',
    }),
    defineField({
      name: 'journeyHeadingHighlight',
      type: 'string',
      title: 'Highlighted Text (Gold)',
      group: 'journey',
      description: 'e.g. "with Bhuwanta"',
    }),
    defineField({
      name: 'journeySteps',
      type: 'array',
      title: 'Journey Steps',
      group: 'journey',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'stepNumber', type: 'string', title: 'Step Number', description: 'e.g. "01"' }),
            defineField({ name: 'title', type: 'string', title: 'Step Title' }),
            defineField({ name: 'description', type: 'text', title: 'Step Description', rows: 2 }),
          ],
          preview: {
            select: { title: 'title', subtitle: 'stepNumber' },
            prepare({ title, subtitle }) {
              return { title: `${subtitle}. ${title}` }
            },
          },
        },
      ],
    }),

    // ===== 6. CERTIFICATIONS =====
    defineField({
      name: 'certificationsHeading',
      type: 'string',
      title: 'Section Heading',
      group: 'certifications',
    }),
    defineField({
      name: 'certificationsSubheading',
      type: 'text',
      title: 'Section Subheading',
      group: 'certifications',
      rows: 2,
    }),
    defineField({
      name: 'certifications',
      type: 'array',
      title: 'Certification Items',
      group: 'certifications',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'icon', type: 'string', title: 'Lucide Icon Name', description: 'e.g. ShieldCheck, Building2, BadgeCheck, Landmark, FileCheck' }),
            defineField({ name: 'title', type: 'string', title: 'Certification Label' }),
          ],
          preview: {
            select: { title: 'title', subtitle: 'icon' },
          },
        },
      ],
    }),

    // ===== 7. YOUTUBE TESTIMONIALS =====
    defineField({
      name: 'testimonialsHeading',
      type: 'string',
      title: 'Section Heading',
      group: 'testimonials',
    }),
    defineField({
      name: 'testimonialsSubheading',
      type: 'text',
      title: 'Section Subheading',
      group: 'testimonials',
      rows: 2,
    }),
    defineField({
      name: 'youtubeVideos',
      type: 'array',
      title: 'YouTube Video Testimonials',
      group: 'testimonials',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'title', type: 'string', title: 'Video Title' }),
            defineField({ name: 'videoId', type: 'string', title: 'YouTube Video ID', description: 'The ID from the YouTube URL (e.g. "dQw4w9WgXcQ" from youtube.com/watch?v=dQw4w9WgXcQ)' }),
          ],
          preview: {
            select: { title: 'title', subtitle: 'videoId' },
          },
        },
      ],
    }),

    // ===== 8. BOOK SITE VISIT CTA =====
    defineField({
      name: 'siteVisitHeading',
      type: 'string',
      title: 'Section Heading',
      group: 'siteVisit',
      description: 'e.g. "Book Your Free Site Visit Today"',
    }),
    defineField({
      name: 'siteVisitSubheading',
      type: 'text',
      title: 'Section Description',
      group: 'siteVisit',
      rows: 3,
    }),
    defineField({
      name: 'siteVisitPhone',
      type: 'string',
      title: 'Phone Number',
      group: 'siteVisit',
    }),
    defineField({
      name: 'siteVisitWhatsappHours',
      type: 'string',
      title: 'WhatsApp Availability Hours',
      group: 'siteVisit',
      description: 'e.g. "Available Mon-Sat, 9 AM to 6 PM"',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Home Page' }
    },
  },
})
