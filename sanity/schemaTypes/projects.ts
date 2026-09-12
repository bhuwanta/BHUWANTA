import { defineType, defineField } from 'sanity'

export const projectsSchema = defineType({
  name: 'projects',
  type: 'document',
  title: 'Projects Page',
  fields: [
    defineField({
      name: 'pageHeading',
      type: 'string',
      title: 'Page Heading',
      description: 'e.g. "Our Projects"',
    }),
    defineField({
      name: 'overviewButtonLabel',
      type: 'string',
      title: 'Overview Button Label',
      description: 'Text on the download button in the filter row of the Projects page. Defaults to "Download Projects Overview".',
      initialValue: 'Download Projects Overview',
    }),
    defineField({
      name: 'overviewPdf',
      type: 'array',
      title: 'Projects Overview PDF',
      of: [{ type: 'file', options: { accept: '.pdf' } }],
      description: 'The combined overview document offered at the top of the Projects page. Visitors enter their details and verify by OTP before it opens, exactly like a project brochure. Leave empty to hide the button.',
    }),
    defineField({
      name: 'projectEntries',
      type: 'array',
      title: 'Project Entries',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'name', type: 'string', title: 'Project Name' }),
            defineField({
              name: 'category',
              type: 'reference',
              to: [{ type: 'projectCategory' }],
              title: 'Project Category',
            }),
            defineField({
              name: 'slug',
              type: 'slug',
              title: 'URL Slug',
              options: { 
                source: (doc, options: any) => {
                  const name = options?.parent?.name || '';
                  return name;
                },
                slugify: (input: string) => input
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/(^-|-$)+/g, ''),
                maxLength: 96 
              },
            }),
            defineField({ name: 'location', type: 'string', title: 'Location' }),
            defineField({ name: 'googleMapsUrl', type: 'url', title: 'Google Maps Link', description: 'Link to the project location on Google Maps' }),
            defineField({ name: 'description', type: 'text', title: 'Description', rows: 4 }),
            defineField({
              name: 'images',
              type: 'array',
              title: 'Project Images',
              of: [{ type: 'image', options: { hotspot: true } }],
              description: 'Upload multiple images for this project. The first image will be used as the primary thumbnail.'
            }),
            defineField({
              name: 'videoFile',
              type: 'file',
              title: 'Project Video (MP4)',
              options: { accept: 'video/*' },
              description: 'Upload an MP4 video if you do not have images.'
            }),
            defineField({
              name: 'youtubeUrl',
              type: 'url',
              title: 'YouTube Video URL',
              description: 'Optional: Provide a YouTube link instead of uploading a video file.'
            }),
            defineField({
              name: 'videoFiles',
              type: 'array',
              title: 'Additional Project Videos (MP4)',
              of: [{ type: 'file', options: { accept: 'video/*' } }],
              description: 'Upload multiple MP4 videos. The first video (or legacy video) will be shown on the Projects page, but all will show in the Gallery.'
            }),
            defineField({
              name: 'youtubeUrls',
              type: 'array',
              title: 'Additional YouTube Video URLs',
              of: [{ type: 'url' }],
              description: 'Provide multiple YouTube links. The first link (or legacy link) will be shown on the Projects page, but all will show in the Gallery.'
            }),
            defineField({
              name: 'projectVideos',
              type: 'array',
              title: 'Project Videos',
              of: [{ type: 'projectVideo' }],
              description: 'Videos for this project, each with its own title. They appear on the project\'s own videos page at /projects/<slug>/videos, in the order listed here — drag to reorder. A "Videos" button appears on the project automatically once there is at least one.',
            }),
            defineField({
              name: 'videosPageHeading',
              type: 'string',
              title: 'Videos Page — Heading (optional)',
              description: 'Optional heading shown above the videos. Leave empty and the page just shows the videos.',
            }),
            defineField({
              name: 'videosPageIntro',
              type: 'text',
              rows: 4,
              title: 'Videos Page — Intro Text (optional)',
              description: 'Optional paragraph shown under the heading, above the videos.',
            }),
            defineField({
              name: 'brochure',
              type: 'array',
              title: 'Project Brochures',
              of: [{ type: 'file', options: { accept: '.pdf' } }],
              description: 'Upload one or more brochure PDFs for this project.'
            }),
            defineField({
              name: 'layoutPdf',
              type: 'array',
              title: 'Project Layouts',
              of: [{ type: 'file', options: { accept: '.pdf' } }],
              description: 'Upload one or more layout map PDFs for this project.'
            }),
            defineField({
              name: 'reraCertificate',
              type: 'array',
              title: 'RERA Certificates',
              of: [{ type: 'file', options: { accept: '.pdf' } }],
              description: 'Upload one or more RERA Certificate PDFs for this project.'
            }),
            defineField({
              name: 'approvalCertificateLabel',
              type: 'string',
              title: 'Approval Certificate Button Label',
              description: 'e.g. "HMDA Approved Documents" or "DTCP Approved Documents" (Defaults to "HMDA/DTCP Approved Documents")',
            }),
            defineField({
              name: 'hmdaDtcpCertificate',
              type: 'array',
              title: 'HMDA / DTCP Certificates',
              of: [{ type: 'file', options: { accept: '.pdf' } }],
              description: 'Upload one or more HMDA or DTCP Approval Certificate PDFs for this project.'
            }),
            defineField({
              name: 'approvalBadge',
              type: 'string',
              title: 'Approval Badge Text',
              description: 'e.g. "DTCP & RERA Approved" or "HMDA Approved"',
            }),
            defineField({
              name: 'projectHighlights',
              type: 'array',
              title: 'Project Highlights',
              of: [{ type: 'string' }],
              description: 'Add bullet points like "100% Vaastu Compliant", "Underground Drainage", etc.',
              initialValue: [
                "HMDA & RERA Approved Layout",
                "100% Vaastu Compliant",
                "'60' '40' & 30' Wide Roads",
                "Grand Entrance Gate",
                "Underground Drainage",
                "Overhead Water Tank",
                "Street Lights",
                "Rainwater Harvesting",
                "Avenue Plantation",
                "Fully Secured Layout"
              ]
            }),

          ],
          preview: {
            select: { title: 'name', subtitle: 'category.title' },
          },
        },
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Projects Page' }
    },
  },
})
