'use client'

import { useEffect, useState, useRef } from 'react'
import { useInView, useSpring } from 'framer-motion'

interface AnimatedCounterProps {
  value: string;
}

export function AnimatedCounter({ value }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  // Removed strict margin so it triggers earlier on scroll
  const isInView = useInView(ref, { once: true })
  
  const numMatch = value.match(/\d+/)
  const num = numMatch ? parseInt(numMatch[0], 10) : 0
  const suffix = value.replace(/[0-9]/g, '')
  
  const [display, setDisplay] = useState("0")
  
  const springValue = useSpring(0, {
    damping: 40,
    stiffness: 100,
  })

  useEffect(() => {
    if (isInView) {
      springValue.set(num)
    }
  }, [isInView, springValue, num])

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      setDisplay(Math.floor(latest).toString())
    })
    return unsubscribe
  }, [springValue])

  const [mounted, setMounted] = useState(false)
  useEffect(() => { queueMicrotask(() => setMounted(true)) }, [])

  return (
    <span ref={ref} className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-brand-gold via-brand-gold-light to-brand-gold">
      {!mounted ? value : `${display}${suffix}`}
    </span>
  )
}

