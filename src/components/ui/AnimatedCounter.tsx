'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedCounterProps {
  value: string
}

const DURATION_MS = 1200

/**
 * Counts up to the number in `value` the first time it scrolls into view,
 * keeping any surrounding characters ("20+", "1000+").
 *
 * Written by hand rather than with framer-motion's spring: this is the only
 * thing that pulled that library into the homepage's initial JavaScript, and
 * a count-up needs neither gestures nor layout animation.
 */
export function AnimatedCounter({ value }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const target = parseInt(value.match(/\d+/)?.[0] || '0', 10)
  const suffix = value.replace(/[0-9]/g, '')
  // Server and first client render must match, so both show the final value;
  // the count-up starts once the element is actually seen.
  const [display, setDisplay] = useState<number | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    let start = 0
    const step = (now: number) => {
      if (!start) start = now
      const progress = Math.min((now - start) / DURATION_MS, 1)
      // Ease-out: fast at first, settling on the final number.
      setDisplay(Math.floor(target * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) frame = requestAnimationFrame(step)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        frame = requestAnimationFrame(step)
      },
      { threshold: 0.2 },
    )
    observer.observe(element)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [target])

  return (
    <span ref={ref} className="inline-block">
      {display === null ? value : `${display}${suffix}`}
    </span>
  )
}
