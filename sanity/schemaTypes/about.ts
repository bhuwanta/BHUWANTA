import { defineType, defineField } from 'sanity'

export const aboutSchema = defineType({
  name: 'about',
  type: 'document',
  title: 'About Page',
  groups: [
    { name: 'banner', title: '1. Page Banner' },
    { name: 'story', title: '2. Our Story' },
    { name: 'missionVision', title: '3. Mission & Vision' },
    { name: 'values', title: '4. Core Values' },
    { name: 'leadership', title: '5. Leadership' },
    { name: 'strengths', title: '6. Our Strengths' },
    { name: 'cta', title: '7. CTA Section' },
  ],
  fields: [
    // ===== 1. BANNER =====
    defineField({
      name: 'pageHeading',
      type: 'string',
      title: 'Page Heading',
      group: 'banner',
      description: 'e.g. "About Bhuwanta Developers"',
    }),
    defineField({
      name: 'pageSubtitle',
      type: 'string',
      title: 'Page Subtitle',
      group: 'banner',
      description: 'e.g. "Land Today, Landmark Tomorrow"',
    }),

    // ===== 2. OUR STORY =====
    defineField({
      name: 'storyHeading',
      type: 'string',
      title: 'Story Section Heading',
      group: 'story',
      description: 'e.g. "The Best Real Estate Service With 12+ Years of Excellence"',
    }),
    defineField({
      name: 'storyParagraphs',
      type: 'array',
      title: 'Story Paragraphs',
      group: 'story',
      description: 'Add each paragraph as a separate item.',
      of: [{ type: 'text' }],
    }),
    defineField({
      name: 'storyImage',
      type: 'image',
      title: 'Story Section Image',
      group: 'story',
      description: 'Image shown on the right side of the Our Story section.',
      options: { hotspot: true },
    }),

    // ===== 3. MISSION & VISION =====
    defineField({
      name: 'missionTitle',
      type: 'string',
      title: 'Mission Title',
      group: 'missionVision',
      description: 'e.g. "Our Mission"',
    }),
    defineField({
      name: 'missionBody',
      type: 'text',
      title: 'Mission Description',
      group: 'missionVision',
    }),
    defineField({
      name: 'visionTitle',
      type: 'string',
      title: 'Vision Title',
      group: 'missionVision',
      description: 'e.g. "Our Vision"',
    }),
    defineField({
      name: 'visionBody',
      type: 'text',
      title: 'Vision Description',
      group: 'missionVision',
    }),

    // ===== 4. CORE VALUES =====
    defineField({
      name: 'coreValues',
      type: 'array',
      title: 'Core Values',
      group: 'values',
      description: 'Add your core values (e.g. Trust & Transparency, Quality Excellence, Customer First).',
      of: [
        {
          name: 'coreValue',
          type: 'object',
          fields: [
            defineField({ name: 'title', type: 'string', title: 'Value Title' }),
            defineField({ name: 'description', type: 'text', title: 'Value Description' }),
          ],
          preview: {
            select: { title: 'title' },
          },
        },
      ],
    }),

    // ===== 5. LEADERSHIP =====
    defineField({
      name: 'leadershipHeading',
      type: 'string',
      title: 'Leadership Section Heading',
      group: 'leadership',
      description: 'e.g. "The Minds Behind Bhuwanta Developers"',
    }),
    defineField({
      name: 'leaders',
      type: 'array',
      title: 'Leadership Profiles',
      group: 'leadership',
      of: [
        {
          name: 'leader',
          type: 'object',
          fields: [
            defineField({ name: 'name', type: 'string', title: 'Full Name' }),
            defineField({ name: 'role', type: 'string', title: 'Designation', description: 'e.g. "Managing Director"' }),
            defineField({ name: 'bio', type: 'text', title: 'Bio / Description' }),
          ],
          preview: {
            select: { title: 'name', subtitle: 'role' },
          },
        },
      ],
    }),

    // ===== 6. OUR STRENGTHS =====
    defineField({
      name: 'strengthsHeading',
      type: 'string',
      title: 'Strengths Section Heading',
      group: 'strengths',
      description: 'e.g. "Why Bhuwanta Developers Stand Out"',
    }),
    defineField({
      name: 'strengths',
      type: 'array',
      title: 'Strengths',
      group: 'strengths',
      of: [
        {
          name: 'strength',
          type: 'object',
          fields: [
            defineField({ name: 'title', type: 'string', title: 'Strength Title' }),
            defineField({ name: 'description', type: 'text', title: 'Strength Description' }),
          ],
          preview: {
            select: { title: 'title' },
          },
        },
      ],
    }),

    // ===== 7. CTA =====
    defineField({
      name: 'ctaTitle',
      type: 'string',
      title: 'CTA Heading',
      group: 'cta',
      description: 'e.g. "Ready to Invest in Your Dream Property in Hyderabad?"',
    }),
    defineField({
      name: 'ctaDescription',
      type: 'text',
      title: 'CTA Description',
      group: 'cta',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'About Page' }
    },
  },
})
