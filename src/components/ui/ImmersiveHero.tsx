'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowUpRight,
  MoveUpRight,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { SanityImage } from '@/components/ui/SanityImage'

export interface HeroHighlight {
  title: string
  image?: string
}

const AUTOPLAY_MS = 5000

/** Cinematic depth for the concept artwork; project-layout 3D is a separate feature. */
export function ImmersiveHero({
  highlights = [],
}: {
  highlights?: HeroHighlight[]
}) {
  const [selected, setSelected] = useState(0)
  const active = selected > 0 ? highlights[selected - 1] : undefined
  const rail = useRef<HTMLDivElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const count = highlights.length + 1
  const select = (index: number) => {
    const next = (index + count) % count
    setSelected(next)
    const button = rail.current?.querySelector<HTMLButtonElement>(
      `[data-slide="${next}"]`,
    )
    if (button && rail.current) {
      rail.current.scrollTo({
        left: button.offsetLeft - 10,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      })
    }
  }
  const root = useRef<HTMLElement>(null)

  // Autoplay: move to the next highlight every few seconds. The timer restarts
  // whenever the slide changes, so a manual choice gets the full interval
  // before the carousel moves on. It holds while the visitor is hovering or
  // keyboard-focused inside the hero, while the hero is off screen or the tab
  // is hidden, and never runs for visitors who prefer reduced motion.
  const [held, setHeld] = useState({ hover: false, focus: false, offscreen: false, hidden: false })
  const hold = useCallback(
    (key: 'hover' | 'focus' | 'offscreen' | 'hidden', value: boolean) =>
      setHeld((current) => (current[key] === value ? current : { ...current, [key]: value })),
    [],
  )
  const selectRef = useRef(select)
  useEffect(() => {
    selectRef.current = select
  })

  useEffect(() => {
    const section = root.current
    if (!section) return
    const onVisibility = () => hold('hidden', document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', onVisibility)
    const observer = new IntersectionObserver(([entry]) => hold('offscreen', !entry.isIntersecting), {
      threshold: 0.25,
    })
    observer.observe(section)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      observer.disconnect()
    }
  }, [hold])

  useEffect(() => {
    if (highlights.length === 0) return
    if (held.hover || held.focus || held.offscreen || held.hidden) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setTimeout(() => selectRef.current(selected + 1), AUTOPLAY_MS)
    return () => window.clearTimeout(timer)
  }, [selected, held, highlights.length])

  useEffect(() => {
    const section = root.current
    if (!section) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const desktop = window.matchMedia(
      '(min-width: 901px) and (min-height: 650px)',
    )
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    let frame = 0
    let targetX = 0
    let targetY = 0
    let x = 0
    let y = 0
    let progress = 0
    let targetProgress = 0

    const render = () => {
      frame = 0
      if (reduced.matches) return
      x += (targetX - x) * 0.085
      y += (targetY - y) * 0.085
      progress += (targetProgress - progress) * 0.12
      section.style.setProperty('--pointer-x', x.toFixed(4))
      section.style.setProperty('--pointer-y', y.toFixed(4))
      section.style.setProperty('--hero-progress', progress.toFixed(4))
      section.dataset.scene = progress > 0.45 ? 'detail' : 'intro'
      if (
        Math.abs(x - targetX) +
          Math.abs(y - targetY) +
          Math.abs(progress - targetProgress) >
        0.001
      ) {
        frame = requestAnimationFrame(render)
      }
    }
    const schedule = () => {
      if (!frame && !reduced.matches) frame = requestAnimationFrame(render)
    }
    const onScroll = () => {
      const rect = section.getBoundingClientRect()
      targetProgress = desktop.matches
        ? Math.max(
            0,
            Math.min(
              1,
              -rect.top /
                Math.max(1, section.offsetHeight - window.innerHeight),
            ),
          )
        : 0
      schedule()
    }
    const onMove = (event: PointerEvent) => {
      if (
        !finePointer.matches ||
        reduced.matches ||
        event.pointerType === 'touch'
      )
        return
      const rect = section.getBoundingClientRect()
      targetX = Math.max(
        -1,
        Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1),
      )
      targetY = Math.max(
        -1,
        Math.min(1, (event.clientY / window.innerHeight) * 2 - 1),
      )
      schedule()
    }
    const resetPointer = () => {
      targetX = 0
      targetY = 0
      schedule()
    }
    const configure = () => {
      cancelAnimationFrame(frame)
      frame = 0
      if (reduced.matches) {
        delete section.dataset.immersive
        delete section.dataset.scene
        section.style.removeProperty('--pointer-x')
        section.style.removeProperty('--pointer-y')
        section.style.removeProperty('--hero-progress')
        x = y = progress = targetProgress = 0
      } else {
        section.dataset.immersive = 'true'
        onScroll()
      }
    }
    configure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    section.addEventListener('pointermove', onMove, { passive: true })
    section.addEventListener('pointerleave', resetPointer)
    section.addEventListener('focusout', resetPointer)
    reduced.addEventListener('change', configure)
    desktop.addEventListener('change', configure)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      section.removeEventListener('pointermove', onMove)
      section.removeEventListener('pointerleave', resetPointer)
      section.removeEventListener('focusout', resetPointer)
      reduced.removeEventListener('change', configure)
      desktop.removeEventListener('change', configure)
      delete section.dataset.immersive
    }
  }, [])

  return (
    <section
      ref={root}
      className={`immersive-hero ${active ? 'hero-highlight-active' : ''}`}
      data-has-highlights={highlights.length > 0 ? 'true' : undefined}
      id="hero"
      aria-label="Explore Bhuwanta open plots"
      onMouseEnter={() => hold('hover', true)}
      onMouseLeave={() => hold('hover', false)}
      onFocus={(event) => {
        // Only keyboard focus holds the carousel; a mouse click also focuses
        // the button, and that should restart the timer rather than stop it.
        if (event.target.matches(':focus-visible')) hold('focus', true)
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) hold('focus', false)
      }}
    >
      <div className="immersive-stage">
        <div className="hero-atmosphere" aria-hidden="true" />
        <div
          className="site-container immersive-composition"
          id="hero-feature-panel"
          onTouchStart={(event) => {
            touchStart.current = {
              x: event.touches[0].clientX,
              y: event.touches[0].clientY,
            }
          }}
          onTouchEnd={(event) => {
            if (!touchStart.current || !highlights.length) return
            const dx = event.changedTouches[0].clientX - touchStart.current.x
            const dy = event.changedTouches[0].clientY - touchStart.current.y
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5)
              select(selected + (dx < 0 ? 1 : -1))
            touchStart.current = null
          }}
        >
          {active && (
            <div key={selected} className="hero-highlight-backdrop">
              {active.image && (
                <SanityImage
                  src={active.image}
                  alt={active.title}
                  fill
                  sizes="100vw"
                  className="object-cover"
                />
              )}
              <div className="hero-highlight-shade" />
              <span className="hero-image-disclaimer">
                {active.image ? 'Illustrative image' : 'Property highlight'}
              </span>
            </div>
          )}
          <div className="immersive-copy">
            <span className="eyebrow hero-entrance hero-entrance-1">
              {active ? 'Discover our highlights' : 'Your land. Your legacy.'}
            </span>
            <h1
              className="hero-entrance hero-entrance-2"
              key={`title-${selected}`}
            >
              {active ? (
                active.title
              ) : (
                <>
                  Find your plot.
                  <br />
                  <em>Plan your future.</em>
                </>
              )}
            </h1>
            <p className="hero-entrance hero-entrance-3">
              {active
                ? 'Explore the details with Bhuwanta. Ask our team about current availability and book a free site visit.'
                : 'Explore open plots around Hyderabad. Discover the location, understand the details, and take the next step with Bhuwanta.'}
            </p>
            <div className="hero-actions hero-entrance hero-entrance-4">
              <Link
                href="/#book-visit"
                id="hero-cta-primary"
                className="site-button btn-outline"
              >
                Book a Free Site Visit <ArrowUpRight size={18} />
              </Link>
              <Link href="/projects" className="site-text-link">
                Explore Projects <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
          {!active && (
            <figure className="immersive-artwork">
              <div className="artwork-orbit orbit-one" aria-hidden="true" />
              <div className="artwork-orbit orbit-two" aria-hidden="true" />
              <div className="artwork-depth">
                <Image
                  src="/images/township-concept.jpg"
                  alt="Architectural concept of tree-lined roads and open plots, presented with interactive visual depth"
                  width={1536}
                  height={1024}
                  priority
                  sizes="(max-width: 900px) 100vw, 65vw"
                  draggable={false}
                />
                <div className="artwork-marker marker-land" aria-hidden="true">
                  <span />
                  Explore Open Plots
                </div>
                <div className="artwork-marker marker-life" aria-hidden="true">
                  <span />
                  Plan Your Future Home
                </div>
              </div>
              <figcaption>
                Concept illustration · Not an actual project layout
              </figcaption>
            </figure>
          )}
          {!active && (
            <div className="hero-scroll-note" aria-hidden="true">
              <span className="eyebrow">A closer look</span>
              <p>
                Explore the location.
                <br />
                <em>Choose your plot.</em>
              </p>
              <span className="hero-note-detail">
                Discover our locations below <MoveUpRight size={16} />
              </span>
            </div>
          )}
        </div>
        {highlights.length > 0 && (
          <div className="site-container hero-highlights">
            <div className="hero-highlights-heading">
              <div>
                <h2>Discover our highlights</h2>
                <p>Select a highlight to read more</p>
              </div>
              <div className="hero-highlight-controls">
                <button
                  type="button"
                  onClick={() => select(selected - 1)}
                  aria-label="Previous hero highlight"
                >
                  <ArrowLeft size={17} />
                </button>
                <span aria-live="polite" className="sr-only">
                  {active ? active.title : 'Overview'}
                </span>
                <span aria-hidden="true">
                  {String(selected + 1).padStart(2, '0')} /{' '}
                  {String(count).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={() => select(selected + 1)}
                  aria-label="Next hero highlight"
                >
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
            <div
              className="hero-highlight-rail"
              ref={rail}
              role="group"
              aria-label="Choose a hero highlight"
            >
              {[
                { title: 'Overview', image: '/images/township-concept.jpg' },
                ...highlights,
              ].map((slide, index) => (
                <button
                  key={`${index}-${slide.title}`}
                  type="button"
                  data-slide={index}
                  aria-pressed={selected === index}
                  aria-controls="hero-feature-panel"
                  className="hero-highlight-card"
                  onClick={() => select(index)}
                >
                  {slide.image && (
                    <SanityImage
                      src={slide.image}
                      alt={`${slide.title} — Bhuwanta open plots`}
                      fill
                      sizes="(max-width: 600px) 65vw, 280px"
                      className="object-cover"
                    />
                  )}
                  <span className="hero-highlight-card-shade" />
                  {/* The photo's alt text already names the highlight, so the
                      caption is hidden from screen readers to avoid reading
                      the same words twice inside one button. */}
                  <span className="hero-highlight-card-title" aria-hidden="true">
                    {slide.title}
                  </span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="site-container immersive-bottom">
          <a
            href="#locations"
            className="hero-scroll-mouse"
            aria-label="Scroll to explore"
          >
            <span className="hero-mouse" aria-hidden="true">
              <span className="hero-mouse-wheel" />
            </span>
            <span className="hero-mouse-label" aria-hidden="true">
              Scroll
            </span>
          </a>
        </div>
        <div className="hero-timeline" aria-hidden="true">
          <span />
        </div>
      </div>
    </section>
  )
}
