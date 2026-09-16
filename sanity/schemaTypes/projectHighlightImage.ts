import { defineType, defineField } from 'sanity'

/**
 * A single photo in a project's highlights gallery, shown under the "Images"
 * tab on /projects/<slug>/videos.
 *
 * An object type rather than a bare `image[]` so each photo can carry its own
 * caption and alt text. The project's existing `images` field stays what it has
 * always been — the card carousel / thumbnail set — because those photos are
 * picked to work as a 16:10 cover, not as a gallery.
 */
export const projectHighlightImageSchema = defineType({
  name: 'projectHighlightImage',
  type: 'object',
  title: 'Highlight Image',
  fields: [
    defineField({
      name: 'image',
      type: 'image',
      title: 'Photo',
      options: { hotspot: true },
      description:
        'Upload the photo. Large phone photos are fine — the website resizes them automatically.',
      validation: (Rule) =>
        Rule.custom((value: { asset?: unknown } | undefined) =>
          value?.asset ? true : 'Upload a photo, or delete this empty row.'
        ),
    }),
    defineField({
      name: 'caption',
      type: 'string',
      title: 'Caption (optional)',
      description:
        'Shown under the photo on the website. Keep it to 60 characters or fewer so it fits on one line. e.g. "Entrance arch — October 2026"',
      validation: (Rule) => [
        Rule.max(60).error('Keep the caption to 60 characters or fewer so it fits under the photo.'),
      ],
    }),
    defineField({
      name: 'alt',
      type: 'string',
      title: 'Alt Text (optional)',
      description:
        'A short description of what is in the photo, read aloud by screen readers and used by Google. Leave it empty and the caption is used instead.',
      validation: (Rule) => Rule.max(120).warning('Alt text works best under about 120 characters.'),
    }),
  ],
  preview: {
    select: {
      caption: 'caption',
      alt: 'alt',
      media: 'image',
    },
    prepare({ caption, alt, media }) {
      return {
        title: caption || alt || 'Highlight photo',
        subtitle: caption ? undefined : 'No caption',
        media,
      }
    },
  },
})
