'use client'

import { Suspense, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import type { PostHog } from 'posthog-js'

// PostHog is loaded once the browser is idle instead of with the page. The
// library is ~85 KB compressed and nothing on screen depends on it, so paying
// for it during the first paint delayed the page for every visitor.
let client: PostHog | null = null
let loader: Promise<PostHog | null> | null = null

function loadPostHog(): Promise<PostHog | null> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return Promise.resolve(null)
  if (client) return Promise.resolve(client)
  if (!loader) {
    loader = import('posthog-js').then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: false, // captured manually for client-side navigation
        capture_pageleave: true,
        disable_surveys: true,
        disable_session_recording: true, // Sentry handles replays
      })
      client = posthog
      return posthog
    })
  }
  return loader
}

/** Runs the callback when the browser is idle, or after a short delay. */
function whenIdle(run: () => void): () => void {
  const idle = window.requestIdleCallback
  if (typeof idle === 'function') {
    const handle = idle(run, { timeout: 4000 })
    return () => window.cancelIdleCallback?.(handle)
  }
  const timer = window.setTimeout(run, 2000)
  return () => window.clearTimeout(timer)
}

/** Captures an event, loading PostHog first if it has not loaded yet. */
export function capturePostHogEvent(event: string, properties?: Record<string, unknown>) {
  void loadPostHog().then((posthog) => posthog?.capture(event, properties))
}

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return
    const query = searchParams?.toString()
    const url = window.origin + pathname + (query ? `?${query}` : '')
    return whenIdle(() => capturePostHogEvent('$pageview', { $current_url: url }))
  }, [pathname, searchParams])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>
  }

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  )
}
