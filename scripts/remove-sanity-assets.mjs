import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from 'next-sanity'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const websiteRoot = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(websiteRoot, '.env.local') })
dotenv.config({ path: path.join(websiteRoot, '.env') })

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'dx02e75g'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_API_TOKEN

if (!token) {
  console.error('❌ SANITY_API_TOKEN is required to delete assets.')
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})

const filesToDelete = [
  '004_2.jpg',
  '013_website_logo.png',
  '016_1.png',
  '017_2.png',
  '020_WhatsApp Image 2026-09-26 at 14.46.50.jpeg',
]

const localDir = path.join(websiteRoot, 'sanity images', 'Other Assets & Website Media')

async function main() {
  console.log('=====================================================')
  console.log('🗑️  BHUWANTA SANITY ASSET DELETION SCRIPT')
  console.log('=====================================================')
  console.log(`• Sanity Project: ${projectId}`)
  console.log(`• Sanity Dataset: ${dataset}`)

  // 1. Fetch all image assets from Sanity
  console.log('\n📡 Fetching all image assets from Sanity...')
  const assets = await client.fetch(`*[_type == "sanity.imageAsset"]{
    _id,
    url,
    originalFilename,
    size,
    extension
  }`)

  console.log(`Total image assets currently in Sanity: ${assets.length}`)

  // Match assets by size and filename
  const targets = []
  for (const fileName of filesToDelete) {
    const filePath = path.join(localDir, fileName)
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Local file not found: ${fileName}`)
      continue
    }

    const stat = fs.statSync(filePath)
    const localSize = stat.size
    // Remove index prefix like '004_' to get original base name
    const rawName = fileName.replace(/^\d{3}_/, '')

    // Match in Sanity
    const matched = assets.filter(a => {
      if (a.size === localSize) return true
      if (a.originalFilename && a.originalFilename === rawName) return true
      return false
    })

    if (matched.length === 0) {
      console.warn(`⚠️ Could not find matching asset in Sanity for: ${fileName} (${localSize} bytes)`)
    } else {
      for (const m of matched) {
        targets.push({
          localFile: fileName,
          localPath: filePath,
          assetId: m._id,
          originalFilename: m.originalFilename,
          size: m.size,
          url: m.url
        })
      }
    }
  }

  console.log(`\nFound ${targets.length} Sanity asset(s) to remove:`)
  for (const t of targets) {
    console.log(`• [${t.assetId}] "${t.originalFilename}" (${(t.size / 1024).toFixed(1)} KB) -> Local: ${t.localFile}`)
  }

  // 2. Check for references & remove from Sanity
  console.log('\n🗑️ Removing from Sanity CMS...')
  for (const t of targets) {
    try {
      // Check if any document references this asset
      const refs = await client.fetch(`*[references($id)]{ _id, _type }`, { id: t.assetId })
      if (refs.length > 0) {
        console.log(`   ℹ️ Asset ${t.assetId} is referenced by ${refs.length} document(s):`, refs.map(r => `${r._type} (${r._id})`).join(', '))
        // Unset reference from referring documents if needed
        for (const ref of refs) {
          console.log(`   Unsetting reference in ${ref._type} (${ref._id})...`)
          // Deep clean reference
          const doc = await client.getDocument(ref._id)
          // Look for fields containing this asset id
          const unsetPaths = []
          function findPaths(obj, currPath = '') {
            if (!obj || typeof obj !== 'object') return
            for (const [key, val] of Object.entries(obj)) {
              const p = currPath ? `${currPath}.${key}` : key
              if (val && typeof val === 'object') {
                if (val._ref === t.assetId || (val.asset && val.asset._ref === t.assetId)) {
                  unsetPaths.push(p)
                } else {
                  findPaths(val, p)
                }
              }
            }
          }
          findPaths(doc)
          if (unsetPaths.length > 0) {
            console.log(`   Unsetting paths: ${unsetPaths.join(', ')}`)
            await client.patch(ref._id).unset(unsetPaths).commit()
          }
        }
      }

      // Delete the asset from Sanity
      process.stdout.write(`   Deleting Sanity asset ${t.assetId} ("${t.originalFilename}")... `)
      await client.delete(t.assetId)
      console.log('✅ DELETED FROM SANITY')
    } catch (err) {
      console.error(`❌ Failed to delete asset ${t.assetId} from Sanity:`, err.message)
    }
  }

  // 3. Delete from local folder
  console.log('\n🧹 Removing local files from "sanity images/Other Assets & Website Media/"...')
  for (const t of targets) {
    try {
      if (fs.existsSync(t.localPath)) {
        fs.unlinkSync(t.localPath)
        console.log(`   ✅ Deleted local file: ${t.localFile}`)
      }
    } catch (err) {
      console.error(`   ❌ Failed to delete local file ${t.localFile}:`, err.message)
    }
  }

  // Double check if any of filesToDelete still remain locally
  for (const fileName of filesToDelete) {
    const p = path.join(localDir, fileName)
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p)
        console.log(`   ✅ Deleted remaining local file: ${fileName}`)
      } catch {}
    }
  }

  console.log('\n=====================================================')
  console.log('🎉 ASSET REMOVAL COMPLETE!')
  console.log('=====================================================')
}

main().catch(err => {
  console.error('Fatal error during asset deletion:', err)
  process.exit(1)
})
