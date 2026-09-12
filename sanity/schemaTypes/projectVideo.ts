import { defineType, defineField } from 'sanity'

/**
 * A single titled video belonging to a project, rendered on
 * /projects/<slug>/videos with its title shown directly beneath the player.
 *
 * Deliberately an object type rather than a bare file/url array (which is what
 * the legacy `videoFiles` / `youtubeUrls` fields are): a video without a title
 * can only ever be listed as "Video 1", which is what the page must avoid.
 *
 * YouTube is the default source on purpose. Uploaded MP4s are served from the
 * Sanity asset CDN and count against the project's monthly bandwidth quota,
 * which is the binding limit on the current plan — a single 70MB walkthrough
 * played ~1,400 times would exhaust it on its own. YouTube costs nothing.
 */
export const projectVideoSchema = defineType({
  name: 'projectVideo',
  type: 'object',
  title: 'Project Video',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      title: 'Video Title',
      description: 'Shown on the website directly below this video. e.g. "Drone Tour — October 2026"',
      validation: (Rule) =>
        Rule.required().error('Every video needs a title — it is displayed under the video on the website.'),
    }),
    defineField({
      name: 'source',
      type: 'string',
      title: 'Where is this video from?',
      options: {
        list: [
          { title: 'YouTube link (recommended — does not use site bandwidth)', value: 'youtube' },
          { title: 'Upload an MP4 file', value: 'upload' },
        ],
        layout: 'radio',
      },
      initialValue: 'youtube',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'youtubeUrl',
      type: 'url',
      title: 'YouTube URL',
      description: 'Paste the full YouTube link. Normal links, youtu.be links and Shorts all work.',
      hidden: ({ parent }) => parent?.source !== 'youtube',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as { source?: string } | undefined
          if (parent?.source === 'youtube' && !value) return 'Add the YouTube link, or switch the source to "Upload an MP4 file".'
          return true
        }),
    }),
    defineField({
      name: 'videoFile',
      type: 'file',
      title: 'Video File (MP4)',
      options: { accept: 'video/*' },
      hidden: ({ parent }) => parent?.source !== 'upload',
      validation: (Rule) =>
        Rule.custom((value: { asset?: unknown } | undefined, context) => {
          const parent = context.parent as { source?: string } | undefined
          if (parent?.source === 'upload' && !value?.asset) return 'Upload the MP4, or switch the source to "YouTube link".'
          return true
        }),
    }),
    defineField({
      name: 'thumbnail',
      type: 'image',
      title: 'Thumbnail Image',
      options: { hotspot: true },
      description:
        'The still image shown before the video is played. Required for uploaded MP4s — without it the page would have to start loading every video as soon as someone opens it.',
      hidden: ({ parent }) => parent?.source !== 'upload',
      validation: (Rule) =>
        Rule.custom((value: { asset?: unknown } | undefined, context) => {
          const parent = context.parent as { source?: string } | undefined
          if (parent?.source === 'upload' && !value?.asset) return 'Uploaded videos need a thumbnail image.'
          return true
        }),
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
      title: 'Short Description (optional)',
      description: 'An optional line shown under the title.',
    }),
    defineField({
      name: 'recordedAt',
      type: 'date',
      title: 'Date Recorded (optional)',
      description: 'Shown alongside the title. Does not affect ordering — drag the videos to reorder them.',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      source: 'source',
      recordedAt: 'recordedAt',
      media: 'thumbnail',
    },
    prepare({ title, source, recordedAt, media }) {
      const parts = [source === 'upload' ? 'Uploaded MP4' : 'YouTube']
      if (recordedAt) parts.push(recordedAt)
      return {
        title: title || '(Untitled video — add a title)',
        subtitle: parts.join(' · '),
        media,
      }
    },
  },
})
