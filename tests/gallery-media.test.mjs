import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import ts from 'typescript'

// gallery-media.ts imports ./utils, which imports clsx, so the transpiled files
// are written inside the repo (not a data: URL) where node_modules resolves.
const outDir = new URL('../node_modules/.cache/gallery-media-test/', import.meta.url)
async function transpile(src, out) {
  const source = await readFile(new URL(src, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
  await writeFile(new URL(out, outDir), outputText.replace(/from '\.\/utils'/, "from './utils.mjs'"))
}
await mkdir(outDir, { recursive: true })
await transpile('../src/lib/utils.ts', 'utils.mjs')
await transpile('../src/lib/gallery-media.ts', 'gallery-media.mjs')
const { toProjectGallery, marqueeStyle, MARQUEE_SECONDS_PER_IMAGE } = await import(new URL('gallery-media.mjs', outDir))

const yt = (id) => `https://www.youtube.com/watch?v=${id}`

test('highlight photos are added after the card photos, with caption and alt', () => {
  const g = toProjectGallery({
    name: 'VIAN VALLEY',
    images: ['https://cdn/card1.jpg', 'https://cdn/card2.jpg'],
    highlightImages: [{ url: 'https://cdn/h1.jpg', caption: 'Entrance arch', alt: 'Arch at gate' }],
  })
  assert.deepEqual(g.images, [
    { url: 'https://cdn/card1.jpg' },
    { url: 'https://cdn/card2.jpg' },
    { url: 'https://cdn/h1.jpg', caption: 'Entrance arch', alt: 'Arch at gate' },
  ])
})

test('a photo uploaded to both card and highlights appears once', () => {
  const g = toProjectGallery({
    name: 'P',
    images: ['https://cdn/same.jpg'],
    highlightImages: [{ url: 'https://cdn/same.jpg', caption: 'dup' }, { url: 'https://cdn/other.jpg' }],
  })
  assert.deepEqual(g.images.map((i) => i.url), ['https://cdn/same.jpg', 'https://cdn/other.jpg'])
})

test('empty and missing photo URLs are dropped', () => {
  const g = toProjectGallery({ name: 'P', images: ['', null], highlightImages: [{}, { url: '' }] })
  assert.deepEqual(g.images, [])
})

test('YouTube highlight videos keep their title and come before legacy videos', () => {
  const g = toProjectGallery({
    name: 'P',
    youtubeUrl: yt('legacy1'),
    projectVideos: [{ title: 'Drone Tour', source: 'youtube', youtubeUrl: yt('new1') }],
  })
  assert.deepEqual(g.youtube, [{ id: 'new1', title: 'Drone Tour' }, { id: 'legacy1', title: undefined }])
})

test('the same YouTube video in legacy and highlight fields shows once, with the title', () => {
  const g = toProjectGallery({
    name: 'P',
    youtubeUrl: yt('abc'),
    youtubeUrls: [`https://youtu.be/abc`, yt('xyz')],
    projectVideos: [{ title: 'Walkthrough', source: 'youtube', youtubeUrl: `https://www.youtube.com/shorts/abc` }],
  })
  assert.deepEqual(g.youtube, [{ id: 'abc', title: 'Walkthrough' }, { id: 'xyz', title: undefined }])
})

test('uploaded highlight videos carry title and poster; legacy MP4s are deduped', () => {
  const g = toProjectGallery({
    name: 'P',
    videoUrl: 'https://cdn/a.mp4',
    videoUrls: ['https://cdn/a.mp4', 'https://cdn/b.mp4'],
    projectVideos: [{ title: 'Site Update', source: 'upload', videoUrl: 'https://cdn/a.mp4', thumbnailUrl: 'https://cdn/a.jpg' }],
  })
  assert.deepEqual(g.videos, [
    { url: 'https://cdn/a.mp4', title: 'Site Update', poster: 'https://cdn/a.jpg' },
    { url: 'https://cdn/b.mp4', title: undefined, poster: undefined },
  ])
})

test('invalid YouTube links and uploads with no file are skipped', () => {
  const g = toProjectGallery({
    name: 'P',
    youtubeUrls: ['https://example.com/not-youtube'],
    projectVideos: [{ title: 'Missing', source: 'upload' }, { title: 'No link', source: 'youtube' }],
  })
  assert.deepEqual(g.youtube, [])
  assert.deepEqual(g.videos, [])
})

test('hasHighlights is true only when the project has highlight photos or videos', () => {
  assert.equal(toProjectGallery({ name: 'P', images: ['https://cdn/x.jpg'] }).hasHighlights, false)
  assert.equal(toProjectGallery({ name: 'P', highlightImages: [{ url: 'https://cdn/h.jpg' }] }).hasHighlights, true)
  assert.equal(toProjectGallery({ name: 'P', projectVideos: [{ title: 'T', source: 'youtube', youtubeUrl: yt('a') }] }).hasHighlights, true)
})

test('name, slug and category fall back safely when missing', () => {
  const g = toProjectGallery({})
  assert.equal(g.name, 'Untitled Project')
  assert.equal(g.slug, null)
  assert.equal(g.categoryTitle, null)
  const h = toProjectGallery({ name: 'ARUDRA', slug: 'arudra', categoryTitle: 'Shabad' })
  assert.equal(h.slug, 'arudra')
  assert.equal(h.categoryTitle, 'Shabad')
})

test('marquee duration scales with photo count so every row scrolls at the same speed', () => {
  const secs = (n) => parseFloat(marqueeStyle(n).animationDuration)
  assert.equal(secs(4), 4 * MARQUEE_SECONDS_PER_IMAGE)
  assert.equal(secs(15), 15 * MARQUEE_SECONDS_PER_IMAGE)
  // Same seconds per photo => same pixels per second for equal-width cards.
  assert.equal(secs(15) / 15, secs(4) / 4)
  assert.equal(secs(0), MARQUEE_SECONDS_PER_IMAGE)
})

test('galleryQuery fetches the Project Highlights fields', async () => {
  const source = await readFile(new URL('../src/lib/sanity.ts', import.meta.url), 'utf8')
  const query = source.slice(source.indexOf('export const galleryQuery'), source.indexOf('"galleryData"'))
  for (const field of ['"slug": slug.current', 'highlightImages[defined(asset._ref)]', 'caption', 'projectVideos[]', '"videoUrl": videoFile.asset->url', '"thumbnailUrl": thumbnail.asset->url']) {
    assert.ok(query.includes(field), `galleryQuery is missing ${field}`)
  }
})
