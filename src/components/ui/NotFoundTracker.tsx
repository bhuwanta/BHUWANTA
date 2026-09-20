'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { capturePostHogEvent } from '@/lib/posthog'

// Fires a distinct, filterable event for 404 hits (broken ad links, old
// shares, typos) separate from the generic $pageview PostHog already
// captures on every route, so they surface cleanly in reporting.
export function NotFoundTracker() {
  const pathname = usePathname()

  useEffect(() => {
    capturePostHogEvent('404_not_found', { path: pathname })
  }, [pathname])

  return null
}
