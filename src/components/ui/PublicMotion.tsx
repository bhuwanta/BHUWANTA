'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/** Progressive enhancement: server content stays visible without JS or when motion is reduced. */
export function PublicMotion() {
  const pathname = usePathname()
  const progress = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const site = document.querySelector<HTMLElement>('.public-site')
    const main = document.getElementById('main-content')
    if (!site || !main) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const tracked = new Set<HTMLElement>()
    let observer: IntersectionObserver | undefined
    let mutation: MutationObserver | undefined
    let frame = 0

    const reveal = (element: HTMLElement) => {
      element.dataset.reveal = 'visible'
      observer?.unobserve(element)
    }
    const collect = () => {
      const candidates = main.querySelectorAll<HTMLElement>(
        '.section-heading, .location-card, .principle, .journey-grid > div, .booking-grid > div, .editorial-cta .site-container > div, .editorial-banner .site-container, section > div > h2, section > div > p, article header, .project-directory section > div > div, section .grid > div, section .grid > a, article h2, [data-scroll-reveal]',
      )
      candidates.forEach((element) => {
        if (
          tracked.has(element) ||
          element.closest('.immersive-hero, form, [role=dialog]')
        )
          return
        if (element.parentElement?.closest('[data-reveal]')) return
        tracked.add(element)
        // Do not hide visible content on hydration, fragment navigation or filter updates.
        if (element.getBoundingClientRect().top < window.innerHeight * 0.95)
          return
        element.dataset.reveal = 'pending'
        const index = Array.from(element.parentElement?.children || []).indexOf(
          element,
        )
        element.style.setProperty(
          '--reveal-delay',
          `${Math.min(index % 4, 3) * 65}ms`,
        )
        observer?.observe(element)
      })
    }
    const update = () => {
      frame = 0
      const height = document.documentElement.scrollHeight - window.innerHeight
      if (progress.current)
        progress.current.style.transform = `scaleX(${height > 0 ? Math.max(0, Math.min(1, window.scrollY / height)) : 0})`
      site.dataset.scrolled = window.scrollY > 30 ? 'true' : 'false'
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const focus = (event: FocusEvent) => {
      const target = event.target
      if (target instanceof HTMLElement) {
        const parent = target.closest<HTMLElement>('[data-reveal="pending"]')
        if (parent) reveal(parent)
      }
    }
    const clear = () => {
      observer?.disconnect()
      mutation?.disconnect()
      tracked.forEach((element) => {
        delete element.dataset.reveal
        element.style.removeProperty('--reveal-delay')
      })
      tracked.clear()
      delete site.dataset.motion
    }
    const configure = () => {
      clear()
      if (preference.matches || !('IntersectionObserver' in window)) return
      site.dataset.motion = 'enabled'
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) reveal(entry.target as HTMLElement)
          })
        },
        { threshold: 0, rootMargin: '0px 0px -35px 0px' },
      )
      collect()
      mutation = new MutationObserver(collect)
      mutation.observe(main, { childList: true, subtree: true })
      update()
    }
    configure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    main.addEventListener('focusin', focus)
    preference.addEventListener('change', configure)
    return () => {
      clear()
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      main.removeEventListener('focusin', focus)
      preference.removeEventListener('change', configure)
      delete site.dataset.scrolled
    }
  }, [pathname])

  return (
    <div ref={progress} className="site-reading-progress" aria-hidden="true" />
  )
}
