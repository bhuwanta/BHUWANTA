'use client'

import { useState } from 'react'
import { UploadCloud, Video, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function MediaManagerPage() {
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image')
  const [selectedPage, setSelectedPage] = useState('gallery')
  const [file, setFile] = useState<File | null>(null)
  const [altText, setAltText] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleImageUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    const formData = new FormData()
    formData.append('type', 'image')
    formData.append('page', selectedPage)
    formData.append('file', file)
    formData.append('alt', altText)

    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setSuccessMsg('Image securely uploaded and attached to Sanity!')
      setFile(null)
      setAltText('')
      
      // Attempt generic frontend revalidation of sanity
      fetch('/api/revalidate?tag=' + selectedPage, { method: 'POST' }).catch(() => {})
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleVideoUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!videoUrl) return

    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    const formData = new FormData()
    formData.append('type', 'video')
    formData.append('page', selectedPage)
    formData.append('url', videoUrl)
    formData.append('title', videoTitle)

    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setSuccessMsg('YouTube link successfully attached to Sanity!')
      setVideoUrl('')
      setVideoTitle('')
      
      // Attempt generic frontend revalidation 
      fetch('/api/revalidate?tag=' + selectedPage, { method: 'POST' }).catch(() => {})
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#002935]">Media Sync (Sanity)</h1>
        <p className="text-sm text-[#5a6a82] mt-1">Upload images to the global CDN or attach YouTube links directly into Sanity.</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#e8ecf2] shadow-sm overflow-hidden flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-[#e8ecf2]">
          <button
            onClick={() => setActiveTab('image')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all ${
              activeTab === 'image' ? 'text-[#003d4f] bg-[#003d4f]/5 border-b-2 border-[#003d4f]' : 'text-[#5a6a82] hover:bg-[#f3f5f8]'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Upload Image
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all ${
              activeTab === 'video' ? 'text-[#003d4f] bg-[#003d4f]/5 border-b-2 border-[#003d4f]' : 'text-[#5a6a82] hover:bg-[#f3f5f8]'
            }`}
          >
            <Video className="w-4 h-4" />
            Add YouTube Link
          </button>
        </div>

        <div className="p-6 lg:p-8">
          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p className="text-sm">{successMsg}</p>
            </div>
          )}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{errorMsg}</p>
            </div>
          )}

          {activeTab === 'image' ? (
            <form onSubmit={handleImageUpload} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#002935]">Target Page</label>
                <select 
                  className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-xl px-4 py-3 text-sm text-[#002935] focus:outline-none focus:border-[#003d4f]/50 transition-all"
                  value={selectedPage}
                  onChange={(e) => setSelectedPage(e.target.value)}
                >
                  <option value="gallery">Gallery (Images Grid)</option>
                  <option value="home">Home (Featured Projects)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#002935]">Select File</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-xl px-4 py-3 text-sm text-[#002935] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#003d4f]/10 file:text-[#003d4f] hover:file:bg-[#003d4f]/20"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#002935]">Alt Text (SEO/Caption)</label>
                <input 
                  type="text" 
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Beautiful living room interior..."
                  className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-xl px-4 py-3 text-sm text-[#002935] focus:outline-none focus:border-[#003d4f]/50 placeholder:text-[#5a6a82]/50"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={loading || !file}
                className="w-full py-3.5 rounded-xl gradient-gold text-white font-semibold text-sm disabled:opacity-50 transition-all hover:scale-[1.01] shadow-lg shadow-[#B69A4E]/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                {loading ? 'Uploading & Syncing...' : 'Upload to Sanity'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVideoUpload} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#002935]">Target Page</label>
                <select 
                  className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-xl px-4 py-3 text-sm text-[#002935] focus:outline-none focus:border-[#003d4f]/50 transition-all"
                  value={selectedPage}
                  onChange={(e) => setSelectedPage(e.target.value)}
                >
                  <option value="gallery">Gallery (Video Grid)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#002935]">Video Title</label>
                <input 
                  type="text" 
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Virtual Property Tour"
                  className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-xl px-4 py-3 text-sm text-[#002935] focus:outline-none focus:border-[#003d4f]/50 placeholder:text-[#5a6a82]/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#002935]">YouTube / Vimeo URL</label>
                <input 
                  type="url" 
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-xl px-4 py-3 text-sm text-[#002935] focus:outline-none focus:border-[#003d4f]/50 placeholder:text-[#5a6a82]/50"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={loading || !videoUrl}
                className="w-full py-3.5 rounded-xl gradient-gold text-white font-semibold text-sm disabled:opacity-50 transition-all hover:scale-[1.01] shadow-lg shadow-[#B69A4E]/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Video className="w-5 h-5" />}
                {loading ? 'Attaching...' : 'Attach to Sanity'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
