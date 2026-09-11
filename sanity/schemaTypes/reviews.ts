import { defineType, defineField } from 'sanity'

export const reviewsSchema = defineType({
  name: 'reviews',
  type: 'document',
  title: 'Customer Reviews Page',
  fields: [
    defineField({
      name: 'pageHeading',
      type: 'string',
      title: 'Page Heading',
      description: 'e.g. "Customer Reviews"',
      initialValue: 'Customer Reviews',
    }),
    defineField({
      name: 'reviewVideos',
      type: 'array',
      title: 'Customer Review Videos (MP4)',
      of: [{ type: 'file', options: { accept: 'video/*' } }],
      description: 'Upload MP4 videos of customer reviews.'
    }),
    defineField({
      name: 'reviewYoutubeUrls',
      type: 'array',
      title: 'Customer Review YouTube URLs',
      of: [{ type: 'url' }],
      description: 'Provide YouTube links for customer reviews.'
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Customer Reviews Page Configuration' }
    },
  },
})
