import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const websiteRoot = path.resolve(__dirname, '..')
const workspaceRoot = path.resolve(websiteRoot, '..')

// Load .env.local
dotenv.config({ path: path.join(websiteRoot, '.env.local') })
dotenv.config({ path: path.join(websiteRoot, '.env') })

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'dx02e75g'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_API_TOKEN

console.log('=====================================================')
console.log('🚀 BHUWANTA SANITY MEDIA ASSET EXTRACTOR')
console.log('=====================================================')
console.log(`• Sanity Project: ${projectId}`)
console.log(`• Sanity Dataset: ${dataset}`)

const imagesRootDir = path.join(websiteRoot, 'sanity images')
const videosRootDir = path.join(websiteRoot, 'sanity videos')

fs.mkdirSync(imagesRootDir, { recursive: true })
fs.mkdirSync(videosRootDir, { recursive: true })

// Also create symlinks at workspace root for easy drag-and-drop to pendrive
const wsImagesDir = path.join(workspaceRoot, 'sanity images')
const wsVideosDir = path.join(workspaceRoot, 'sanity videos')
try {
  if (!fs.existsSync(wsImagesDir)) fs.symlinkSync(imagesRootDir, wsImagesDir, 'dir')
  if (!fs.existsSync(wsVideosDir)) fs.symlinkSync(videosRootDir, wsVideosDir, 'dir')
} catch (e) {
  // Ignore symlink errors if permissions or existing file
}

function sanitizeFolderName(name) {
  if (!name) return 'Unknown Project'
  return name.replace(/[<>:"/\\|?*]/g, '').trim()
}

function sanitizeFileName(name) {
  if (!name) return 'file'
  return name.replace(/[<>:"/\\|?*]/g, '_').trim().slice(0, 100)
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'Bhuwanta-Media-Sync/1.0' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    https.get(url, { headers }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        let errBody = ''
        res.on('data', chunk => errBody += chunk)
        res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${errBody}`)))
        return
      }
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

async function downloadFile(url, destPath) {
  if (!url) return false
  fs.mkdirSync(path.dirname(destPath), { recursive: true })

  // Check if file already exists with non-zero size
  if (fs.existsSync(destPath)) {
    const stat = fs.statSync(destPath)
    if (stat.size > 0) {
      return { skipped: true, size: stat.size }
    }
  }

  const tempPath = destPath + '.tmp'
  await new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
        // Handle redirect
        downloadFile(res.headers.location, destPath).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: HTTP ${res.statusCode}`))
        return
      }
      const fileStream = fs.createWriteStream(tempPath)
      pipeline(res, fileStream)
        .then(() => {
          fs.renameSync(tempPath, destPath)
          const stat = fs.statSync(destPath)
          resolve(stat.size)
        })
        .catch(err => {
          try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath) } catch {}
          reject(err)
        })
    })
    req.on('error', (err) => {
      try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath) } catch {}
      reject(err)
    })
  })

  const finalStat = fs.statSync(destPath)
  return { downloaded: true, size: finalStat.size }
}

async function main() {
  const groq = `
  {
    "projects": *[_type == "projects"][0].projectEntries[]{
      name,
      "slug": slug.current,
      "category": category->title,
      "cardImages": images[defined(asset._ref)]{
        "id": asset->_id,
        "url": asset->url,
        "originalFilename": asset->originalFilename,
        "extension": asset->extension,
        "mimeType": asset->mimeType,
        "size": asset->size
      },
      "highlightImages": highlightImages[defined(asset._ref)]{
        caption,
        alt,
        "id": asset->_id,
        "url": asset->url,
        "originalFilename": asset->originalFilename,
        "extension": asset->extension,
        "mimeType": asset->mimeType,
        "size": asset->size
      },
      "projectVideos": projectVideos[]{
        title,
        source,
        youtubeUrl,
        recordedAt,
        "videoAsset": videoFile.asset->{
          _id,
          url,
          originalFilename,
          extension,
          mimeType,
          size
        },
        "thumbnailAsset": thumbnail.asset->{
          _id,
          url,
          originalFilename,
          extension,
          mimeType,
          size
        }
      },
      "legacyVideoFile": videoFile.asset->{
        _id,
        url,
        originalFilename,
        extension,
        mimeType,
        size
      },
      "legacyVideoFiles": videoFiles[defined(asset._ref)].asset->{
        _id,
        url,
        originalFilename,
        extension,
        mimeType,
        size
      },
      youtubeUrl,
      youtubeUrls
    },
    "gallery": *[_type == "gallery"][0]{
      "siteVisitImages": siteVisitImages[defined(asset._ref)].asset->{
        _id, url, originalFilename, extension, mimeType, size
      },
      "siteVisitVideos": siteVisitVideos[defined(asset._ref)].asset->{
        _id, url, originalFilename, extension, mimeType, size
      },
      siteVisitYoutubeUrls,
      "generalImages": generalImages[defined(asset._ref)].asset->{
        _id, url, originalFilename, extension, mimeType, size
      },
      "generalVideos": generalVideos[defined(asset._ref)].asset->{
        _id, url, originalFilename, extension, mimeType, size
      },
      generalYoutubeUrls
    },
    "home": *[_type == "home"][0]{
      "heroImages": heroImages[]{
        "url": coalesce(image.asset->url, asset->url),
        text
      },
      "featuredProjects": featuredProjects[]{
        name,
        tag,
        "imageUrl": image.asset->url
      }
    },
    "about": *[_type == "about"][0]{
      "storyImageUrl": storyImage.asset->url
    },
    "allImages": *[_type == "sanity.imageAsset"]{
      _id,
      url,
      originalFilename,
      extension,
      size
    },
    "allVideos": *[_type == "sanity.fileAsset" && mimeType match "video*"]{
      _id,
      url,
      originalFilename,
      extension,
      size
    }
  }
  `

  console.log('\n📡 Fetching projects, galleries, images, and videos from Sanity CMS...')
  const queryUrl = `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}?query=${encodeURIComponent(groq)}`
  const response = await fetchJson(queryUrl)

  if (!response.result) {
    console.error('❌ Failed to retrieve result from Sanity API:', response)
    return
  }

  const data = response.result
  const projects = data.projects || []
  const gallery = data.gallery || {}
  const home = data.home || {}
  const about = data.about || {}
  const allSanityImages = data.allImages || []
  const allSanityVideos = data.allVideos || []

  console.log(`✅ Loaded ${projects.length} project entries from Sanity.`)
  console.log(`✅ Total image assets in dataset: ${allSanityImages.length}`)
  console.log(`✅ Total uploaded video assets in dataset: ${allSanityVideos.length}`)

  // Track downloaded asset IDs to identify any unattached assets later
  const downloadedAssetIds = new Set()
  const summaryReport = []

  let totalImagesCount = 0
  let totalImagesBytes = 0
  let totalVideosCount = 0
  let totalVideosBytes = 0
  let totalYoutubeCount = 0

  // 1. Process Project-wise Media
  for (const project of projects) {
    const projName = sanitizeFolderName(project.name || project.slug || 'Unnamed Project')
    console.log(`\n📂 Processing Project: "${projName}"`)

    const projImageDir = path.join(imagesRootDir, projName)
    const projVideoDir = path.join(videosRootDir, projName)
    fs.mkdirSync(projImageDir, { recursive: true })
    fs.mkdirSync(projVideoDir, { recursive: true })

    let pImgCount = 0
    let pImgBytes = 0
    let pVidCount = 0
    let pVidBytes = 0
    const youtubeLinks = []

    // A. Project Card Images
    if (project.cardImages && project.cardImages.length > 0) {
      let idx = 1
      for (const img of project.cardImages) {
        if (!img.url) continue
        const ext = img.extension || 'jpg'
        const baseName = img.originalFilename ? sanitizeFileName(img.originalFilename) : `card_image_${idx}.${ext}`
        const fileName = `${String(idx).padStart(2, '0')}_${baseName.endsWith(`.${ext}`) ? baseName : `${baseName}.${ext}`}`
        const dest = path.join(projImageDir, fileName)

        try {
          process.stdout.write(`   📷 Downloading card image: ${fileName}... `)
          const res = await downloadFile(img.url, dest)
          if (res) {
            pImgCount++
            pImgBytes += res.size
            if (img.id) downloadedAssetIds.add(img.id)
            console.log(res.skipped ? 'already exists' : `OK (${(res.size / 1024 / 1024).toFixed(2)} MB)`)
          }
        } catch (e) {
          console.log(`FAILED: ${e.message}`)
        }
        idx++
      }
    }

    // B. Project Highlight Images (Shown under Images tab on /projects/<slug>/videos)
    if (project.highlightImages && project.highlightImages.length > 0) {
      let idx = 1
      const highlightDir = path.join(projImageDir, 'Highlights_Gallery')
      fs.mkdirSync(highlightDir, { recursive: true })

      for (const img of project.highlightImages) {
        if (!img.url) continue
        const ext = img.extension || 'jpg'
        const label = sanitizeFileName(img.caption || img.alt || img.originalFilename || `photo_${idx}`)
        const fileName = `Highlight_${String(idx).padStart(2, '0')}_${label}.${ext}`
        const dest = path.join(highlightDir, fileName)

        try {
          process.stdout.write(`   📸 Downloading highlight photo: ${fileName}... `)
          const res = await downloadFile(img.url, dest)
          if (res) {
            pImgCount++
            pImgBytes += res.size
            if (img.id) downloadedAssetIds.add(img.id)
            console.log(res.skipped ? 'already exists' : `OK (${(res.size / 1024 / 1024).toFixed(2)} MB)`)
          }
        } catch (e) {
          console.log(`FAILED: ${e.message}`)
        }
        idx++
      }
    }

    // C. Project Videos (Uploads and Thumbnails)
    if (project.projectVideos && project.projectVideos.length > 0) {
      let idx = 1
      for (const vid of project.projectVideos) {
        const titleSanitized = sanitizeFileName(vid.title || `Video_${idx}`)

        // If thumbnail exists, save in images
        if (vid.thumbnailAsset && vid.thumbnailAsset.url) {
          const tExt = vid.thumbnailAsset.extension || 'jpg'
          const tFile = `Thumbnail_${String(idx).padStart(2, '0')}_${titleSanitized}.${tExt}`
          const tDest = path.join(projImageDir, tFile)
          try {
            const tRes = await downloadFile(vid.thumbnailAsset.url, tDest)
            if (tRes) {
              pImgCount++
              pImgBytes += tRes.size
              if (vid.thumbnailAsset._id) downloadedAssetIds.add(vid.thumbnailAsset._id)
            }
          } catch {}
        }

        // If uploaded MP4 video exists
        if (vid.videoAsset && vid.videoAsset.url) {
          const vExt = vid.videoAsset.extension || 'mp4'
          const vFile = `${String(idx).padStart(2, '0')}_${titleSanitized}.${vExt}`
          const vDest = path.join(projVideoDir, vFile)

          try {
            process.stdout.write(`   🎥 Downloading video: ${vFile}... `)
            const vRes = await downloadFile(vid.videoAsset.url, vDest)
            if (vRes) {
              pVidCount++
              pVidBytes += vRes.size
              if (vid.videoAsset._id) downloadedAssetIds.add(vid.videoAsset._id)
              console.log(vRes.skipped ? 'already exists' : `OK (${(vRes.size / 1024 / 1024).toFixed(2)} MB)`)
            }
          } catch (e) {
            console.log(`FAILED: ${e.message}`)
          }
        }

        // If YouTube link
        if (vid.youtubeUrl) {
          youtubeLinks.push({
            title: vid.title || `Video ${idx}`,
            url: vid.youtubeUrl,
            source: vid.source || 'youtube',
            recordedAt: vid.recordedAt || '-'
          })
        }
        idx++
      }
    }

    // D. Legacy Uploaded Video Files
    if (project.legacyVideoFile && project.legacyVideoFile.url) {
      const vExt = project.legacyVideoFile.extension || 'mp4'
      const vFile = `Legacy_Main_Video.${vExt}`
      const vDest = path.join(projVideoDir, vFile)
      try {
        process.stdout.write(`   🎥 Downloading legacy video: ${vFile}... `)
        const vRes = await downloadFile(project.legacyVideoFile.url, vDest)
        if (vRes) {
          pVidCount++
          pVidBytes += vRes.size
          if (project.legacyVideoFile._id) downloadedAssetIds.add(project.legacyVideoFile._id)
          console.log(vRes.skipped ? 'already exists' : `OK (${(vRes.size / 1024 / 1024).toFixed(2)} MB)`)
        }
      } catch (e) {
        console.log(`FAILED: ${e.message}`)
      }
    }

    if (project.legacyVideoFiles && project.legacyVideoFiles.length > 0) {
      let idx = 1
      for (const lf of project.legacyVideoFiles) {
        if (!lf || !lf.url) continue
        const vExt = lf.extension || 'mp4'
        const vFile = `Legacy_Additional_Video_${idx}.${vExt}`
        const vDest = path.join(projVideoDir, vFile)
        try {
          process.stdout.write(`   🎥 Downloading legacy video: ${vFile}... `)
          const vRes = await downloadFile(lf.url, vDest)
          if (vRes) {
            pVidCount++
            pVidBytes += vRes.size
            if (lf._id) downloadedAssetIds.add(lf._id)
            console.log(vRes.skipped ? 'already exists' : `OK (${(vRes.size / 1024 / 1024).toFixed(2)} MB)`)
          }
        } catch (e) {
          console.log(`FAILED: ${e.message}`)
        }
        idx++
      }
    }

    // E. Legacy YouTube URLs
    if (project.youtubeUrl) {
      youtubeLinks.push({ title: 'Main Project YouTube Video', url: project.youtubeUrl, source: 'youtube', recordedAt: '-' })
    }
    if (project.youtubeUrls && project.youtubeUrls.length > 0) {
      project.youtubeUrls.forEach((yUrl, i) => {
        if (yUrl) youtubeLinks.push({ title: `Additional YouTube Video ${i + 1}`, url: yUrl, source: 'youtube', recordedAt: '-' })
      })
    }

    // If there are YouTube links, write a neat markdown & text file
    if (youtubeLinks.length > 0) {
      totalYoutubeCount += youtubeLinks.length
      const mdContent = `# YouTube Videos for ${projName}\n\n` +
        `Total YouTube Videos: ${youtubeLinks.length}\n\n` +
        youtubeLinks.map((y, i) => `### ${i + 1}. ${y.title}\n- **URL:** ${y.url}\n- **Recorded At:** ${y.recordedAt}\n`).join('\n')
      fs.writeFileSync(path.join(projVideoDir, 'YouTube_Videos_List.md'), mdContent, 'utf8')
      fs.writeFileSync(path.join(projVideoDir, 'YouTube_Videos_List.txt'), mdContent, 'utf8')
      console.log(`   🔗 Saved ${youtubeLinks.length} YouTube video links to YouTube_Videos_List.md`)
    }

    totalImagesCount += pImgCount
    totalImagesBytes += pImgBytes
    totalVideosCount += pVidCount
    totalVideosBytes += pVidBytes

    summaryReport.push({
      project: projName,
      images: `${pImgCount} (${(pImgBytes / 1024 / 1024).toFixed(1)} MB)`,
      videos: `${pVidCount} (${(pVidBytes / 1024 / 1024).toFixed(1)} MB)`,
      youtube: youtubeLinks.length
    })
  }

  // 2. Process General Gallery & Site Visits
  console.log('\n📂 Processing General Gallery & Site Visits...')
  const galleryImgDir = path.join(imagesRootDir, 'Gallery & Site Visits')
  const galleryVidDir = path.join(videosRootDir, 'Gallery & Site Visits')
  fs.mkdirSync(galleryImgDir, { recursive: true })
  fs.mkdirSync(galleryVidDir, { recursive: true })

  const allGalleryImgs = [...(gallery.siteVisitImages || []), ...(gallery.generalImages || [])]
  let gImgCount = 0
  let gImgBytes = 0
  let gIdx = 1
  for (const img of allGalleryImgs) {
    if (!img || !img.url) continue
    const ext = img.extension || 'jpg'
    const fileName = `Gallery_${String(gIdx).padStart(2, '0')}_${img.originalFilename ? sanitizeFileName(img.originalFilename) : `image.${ext}`}`
    const dest = path.join(galleryImgDir, fileName)
    try {
      const res = await downloadFile(img.url, dest)
      if (res) {
        gImgCount++
        gImgBytes += res.size
        if (img._id) downloadedAssetIds.add(img._id)
      }
    } catch {}
    gIdx++
  }

  const allGalleryVids = [...(gallery.siteVisitVideos || []), ...(gallery.generalVideos || [])]
  let gVidCount = 0
  let gVidBytes = 0
  let gvIdx = 1
  for (const vid of allGalleryVids) {
    if (!vid || !vid.url) continue
    const ext = vid.extension || 'mp4'
    const fileName = `Gallery_Video_${String(gvIdx).padStart(2, '0')}_${vid.originalFilename ? sanitizeFileName(vid.originalFilename) : `video.${ext}`}`
    const dest = path.join(galleryVidDir, fileName)
    try {
      const res = await downloadFile(vid.url, dest)
      if (res) {
        gVidCount++
        gVidBytes += res.size
        if (vid._id) downloadedAssetIds.add(vid._id)
      }
    } catch {}
    gvIdx++
  }

  const galleryYt = [...(gallery.siteVisitYoutubeUrls || []), ...(gallery.generalYoutubeUrls || [])]
  if (galleryYt.length > 0) {
    const mdContent = `# Gallery & Site Visit YouTube Videos\n\n` +
      galleryYt.map((url, i) => `${i + 1}. ${url}`).join('\n')
    fs.writeFileSync(path.join(galleryVidDir, 'Gallery_YouTube_Links.txt'), mdContent, 'utf8')
  }

  totalImagesCount += gImgCount
  totalImagesBytes += gImgBytes
  totalVideosCount += gVidCount
  totalVideosBytes += gVidBytes
  summaryReport.push({
    project: 'Gallery & Site Visits',
    images: `${gImgCount} (${(gImgBytes / 1024 / 1024).toFixed(1)} MB)`,
    videos: `${gVidCount} (${(gVidBytes / 1024 / 1024).toFixed(1)} MB)`,
    youtube: galleryYt.length
  })

  // 3. Process Any Remaining Assets from Sanity that weren't mapped above
  console.log('\n🔍 Checking for any remaining Sanity assets...')
  const remainingImages = allSanityImages.filter(img => !downloadedAssetIds.has(img._id))
  const remainingVideos = allSanityVideos.filter(vid => !downloadedAssetIds.has(vid._id))

  if (remainingImages.length > 0) {
    const otherImgDir = path.join(imagesRootDir, 'Other Assets & Website Media')
    fs.mkdirSync(otherImgDir, { recursive: true })
    let oImgCount = 0
    let oImgBytes = 0
    let oIdx = 1
    for (const img of remainingImages) {
      if (!img.url) continue
      const ext = img.extension || 'jpg'
      const fileName = `${String(oIdx).padStart(3, '0')}_${img.originalFilename ? sanitizeFileName(img.originalFilename) : `media_${img._id}.${ext}`}`
      const dest = path.join(otherImgDir, fileName)
      try {
        const res = await downloadFile(img.url, dest)
        if (res) {
          oImgCount++
          oImgBytes += res.size
        }
      } catch {}
      oIdx++
    }
    totalImagesCount += oImgCount
    totalImagesBytes += oImgBytes
    summaryReport.push({
      project: 'Other Assets & Website Media',
      images: `${oImgCount} (${(oImgBytes / 1024 / 1024).toFixed(1)} MB)`,
      videos: `0 (0 MB)`,
      youtube: 0
    })
  }

  if (remainingVideos.length > 0) {
    const otherVidDir = path.join(videosRootDir, 'Other Videos')
    fs.mkdirSync(otherVidDir, { recursive: true })
    let oVidCount = 0
    let oVidBytes = 0
    let oIdx = 1
    for (const vid of remainingVideos) {
      if (!vid.url) continue
      const ext = vid.extension || 'mp4'
      const fileName = `${String(oIdx).padStart(3, '0')}_${vid.originalFilename ? sanitizeFileName(vid.originalFilename) : `video_${vid._id}.${ext}`}`
      const dest = path.join(otherVidDir, fileName)
      try {
        const res = await downloadFile(vid.url, dest)
        if (res) {
          oVidCount++
          oVidBytes += res.size
        }
      } catch {}
      oIdx++
    }
    totalVideosCount += oVidCount
    totalVideosBytes += oVidBytes
    summaryReport.push({
      project: 'Other Videos',
      images: `0 (0 MB)`,
      videos: `${oVidCount} (${(oVidBytes / 1024 / 1024).toFixed(1)} MB)`,
      youtube: 0
    })
  }

  // Create a README in each folder explaining the structure
  const imagesReadme = `# Bhuwanta Sanity Images (Organized Project-Wise)

This folder contains all high-resolution images pulled directly from Sanity CMS for all Bhuwanta projects.

### Folder Structure
Each project has its own dedicated directory containing:
1. **Project Card Images**: Main hero & showcase photos for the project cards.
2. **Highlights_Gallery/**: High-resolution site photos uploaded under the "Project Highlights — Images" tab (shown on \`/projects/<slug>/videos\`).
3. **Video Thumbnails**: Official poster covers for project video tours.

**Ready for Pendrive Storage:** You can copy this entire folder directly to an external flash drive or backup storage.
`
  fs.writeFileSync(path.join(imagesRootDir, 'README.md'), imagesReadme, 'utf8')

  const videosReadme = `# Bhuwanta Sanity Videos (Organized Project-Wise)

This folder contains all video assets pulled directly from Sanity CMS for all Bhuwanta projects.

### Folder Structure
Each project has its own dedicated directory containing:
1. **Uploaded MP4 Videos**: Full HD video files uploaded directly into Sanity.
2. **YouTube_Videos_List.md / .txt**: Full list of YouTube walkthroughs and drone tours configured for this project in Sanity (with direct URLs and titles).

**Ready for Pendrive Storage:** You can copy this entire folder directly to an external flash drive or backup storage.
`
  fs.writeFileSync(path.join(videosRootDir, 'README.md'), videosReadme, 'utf8')

  console.log('\n=====================================================')
  console.log('🎉 DOWNLOAD COMPLETE - SUMMARY TABLE')
  console.log('=====================================================')
  console.table(summaryReport)
  console.log('-----------------------------------------------------')
  console.log(`TOTAL IMAGES SAVED: ${totalImagesCount} (${(totalImagesBytes / 1024 / 1024).toFixed(2)} MB)`)
  console.log(`TOTAL VIDEOS SAVED: ${totalVideosCount} (${(totalVideosBytes / 1024 / 1024).toFixed(2)} MB)`)
  console.log(`TOTAL YOUTUBE LINKS: ${totalYoutubeCount}`)
  console.log(`\n📁 Images Location: "${imagesRootDir}"`)
  console.log(`📁 Videos Location: "${videosRootDir}"`)
  console.log('=====================================================')
}

main().catch(err => {
  console.error('Fatal error during media sync:', err)
  process.exit(1)
})

