'use client'

import { useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Play, ImageIcon } from 'lucide-react'
import { ProjectVideosGrid, type ProjectVideo } from '@/components/ui/ProjectVideosGrid'
import { ProjectHighlightImages, type ProjectHighlightImage } from '@/components/ui/ProjectHighlightImages'

type Tab = 'videos' | 'images'

export function ProjectHighlightsTabs({
  videos,
  images,
  projectName,
}: {
  videos: ProjectVideo[]
  images: ProjectHighlightImage[]
  projectName: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Filtered here as well as in the page query: the tab label must count what
  // actually renders, or a photo row an editor left empty shows up as
  // "Images (3)" over a grid of two.
  const usableImages = images.filter((img) => Boolean(img.url))
  const hasVideos = videos.length > 0
  const hasImages = usableImages.length > 0

  // ?tab=images is honoured only when there is something in that tab, so a
  // stale or hand-typed link lands on content instead of an empty pane.
  const requested = searchParams.get('tab')
  const requestedTab: Tab | null =
    requested === 'images' && hasImages ? 'images' : requested === 'videos' && hasVideos ? 'videos' : null

  // Derived from the URL unless the visitor has clicked a tab for this
  // particular URL — the same pattern the /projects category filter uses, so
  // the back button works and no effect writes state on render.
  const [userChoice, setUserChoice] = useState<{ forParam: string | null; tab: Tab } | null>(null)
  const activeTab: Tab =
    userChoice && userChoice.forParam === requested
      ? userChoice.tab
      : requestedTab || (hasVideos ? 'videos' : 'images')

  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ videos: null, images: null })

  const available: Tab[] = [...(hasVideos ? ['videos' as const] : []), ...(hasImages ? ['images' as const] : [])]

  const selectTab = (tab: Tab) => {
    setUserChoice({ forParam: requested, tab })
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'videos') params.delete('tab')
    else params.set('tab', tab)
    const query = params.toString()
    // replace, not push: the tabs are two views of one page, so the back button
    // should leave the page rather than walk back through every toggle.
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const idx = available.indexOf(activeTab)
    const next = available[(idx + (e.key === 'ArrowRight' ? 1 : -1) + available.length) % available.length]
    selectTab(next)
    tabRefs.current[next]?.focus()
  }

  // One tab is not a toggle — with only videos or only photos the page just
  // shows them, exactly as it did before this feature existed.
  const showTabs = hasVideos && hasImages

  const tabClass = (tab: Tab) =>
    `px-5 sm:px-7 py-3 font-semibold text-sm rounded-lg transition-premium flex items-center gap-2 ${
      activeTab === tab
        ? 'gradient-gold text-white shadow-lg shadow-[#c4a55a]/20'
        : 'bg-white border border-[#e8ecf2] text-[#1e3a5f] hover:border-[#c4a55a] hover:shadow-md'
    }`

  return (
    <div>
      {showTabs && (
        <div role="tablist" aria-label="Project highlights" onKeyDown={onKeyDown} className="flex flex-wrap gap-3 mb-8">
          <button
            type="button"
            role="tab"
            id="highlights-tab-videos"
            aria-selected={activeTab === 'videos'}
            aria-controls="highlights-panel-videos"
            tabIndex={activeTab === 'videos' ? 0 : -1}
            ref={(el) => {
              tabRefs.current.videos = el
            }}
            onClick={() => selectTab('videos')}
            className={tabClass('videos')}
          >
            <Play className={`w-4 h-4 ${activeTab === 'videos' ? 'text-white' : 'text-[#c4a55a]'}`} />
            Videos <span className="opacity-70">({videos.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            id="highlights-tab-images"
            aria-selected={activeTab === 'images'}
            aria-controls="highlights-panel-images"
            tabIndex={activeTab === 'images' ? 0 : -1}
            ref={(el) => {
              tabRefs.current.images = el
            }}
            onClick={() => selectTab('images')}
            className={tabClass('images')}
          >
            <ImageIcon className={`w-4 h-4 ${activeTab === 'images' ? 'text-white' : 'text-[#c4a55a]'}`} />
            Images <span className="opacity-70">({usableImages.length})</span>
          </button>
        </div>
      )}

      {/* The inactive panel is unmounted, not hidden: a hidden YouTube iframe
          keeps streaming, and an <video> kept alive would carry on spending
          the Sanity bandwidth quota after the visitor switched away. */}
      {activeTab === 'videos' ? (
        <div role={showTabs ? 'tabpanel' : undefined} id="highlights-panel-videos" aria-labelledby="highlights-tab-videos">
          <ProjectVideosGrid videos={videos} />
        </div>
      ) : (
        <div role={showTabs ? 'tabpanel' : undefined} id="highlights-panel-images" aria-labelledby="highlights-tab-images">
          <ProjectHighlightImages images={usableImages} projectName={projectName} />
        </div>
      )}
    </div>
  )
}
