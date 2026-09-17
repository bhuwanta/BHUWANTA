'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowDown, ArrowUpRight, MoveUpRight } from 'lucide-react'
import { useEffect, useRef } from 'react'

/** Cinematic depth for the concept artwork; project-layout 3D is a separate feature. */
export function ImmersiveHero() {
  const root = useRef<HTMLElement>(null)

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
      className="immersive-hero"
      id="hero"
      aria-label="Explore Bhuwanta open plots"
    >
      <div className="immersive-stage">
        <div className="hero-atmosphere" aria-hidden="true" />
        <div className="site-container immersive-composition">
          <div className="immersive-copy">
            <span className="eyebrow hero-entrance hero-entrance-1">
              Your land. Your legacy.
            </span>
            <h1 className="hero-entrance hero-entrance-2">
              Find your plot.
              <br />
              <em>Plan your future.</em>
            </h1>
            <p className="hero-entrance hero-entrance-3">
              Explore open plots around Hyderabad. Discover the location,
              understand the details, and take the next step with Bhuwanta.
            </p>
            <div className="hero-actions hero-entrance hero-entrance-4">
              <Link
                href="/projects"
                id="hero-cta-primary"
                className="site-button"
              >
                Explore Projects <ArrowUpRight size={18} />
              </Link>
              <Link href="/#book-visit" className="site-text-link">
                Book a Free Site Visit <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
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
        </div>
        <div className="site-container immersive-bottom">
          <span className="hero-coordinate">
            Hyderabad & beyond <span>17.3850° N · 78.4867° E</span>
          </span>
          <a href="#locations" className="hero-scroll-link">
            Scroll to explore <ArrowDown size={16} />
          </a>
          <span className="hero-depth-hint">
            Move your pointer to explore the depth
          </span>
        </div>
        <div className="hero-timeline" aria-hidden="true">
          <span />
        </div>
      </div>
    </section>
  )
}
