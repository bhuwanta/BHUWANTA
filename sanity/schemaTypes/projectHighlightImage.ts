import { defineType, defineField } from 'sanity'

/**
 * A single photo in a project's highlights gallery, shown under the "Images"
 * tab on /projects/<slug>/videos.
 *
 * Declared as `type: 'image'` with extra fields rather than as an object that
 * contains an image. That distinction is the whole reason this file exists:
 * Studio only offers the multi-file drop zone ("Select" several photos at once,
 * or drag a folder in) when the array member is itself an image or file type.
 * An array of plain objects can only be filled one "Add item" at a time, which
 * is unusable for a gallery of twenty site photos.
 *
 * The caption and alt fields live under "Edit details" on each uploaded photo,
 * so bulk upload stays a single drag and captions are added afterwards, only
 * where they are wanted.
 */
export const projectHighlightImageSchema = defineType({
  name: 'projectHighlightImage',
  type: 'image',
  title: 'Highlight Photo',
  options: { hotspot: true },
  fields: [
    defineField({
      name: 'caption',
      type: 'string',
      title: 'Caption (optional)',
      description:
        'Shown under the photo on the website. Keep it to 60 characters or fewer so it fits on one line. e.g. "Entrance arch — October 2026"',
      validation: (Rule) =>
        Rule.max(60).error('Keep the caption to 60 characters or fewer so it fits under the photo.'),
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
      media: 'asset',
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
