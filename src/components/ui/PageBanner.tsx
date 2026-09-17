import React from 'react'
import Link from 'next/link'
import { TrustStrip } from '@/components/ui/TrustStrip'

interface PageBannerProps {
  title: string | React.ReactNode
  subtitle?: string
}
export function PageBanner({ title, subtitle }: PageBannerProps) {
  return (
    <>
      <section className="editorial-banner">
        <div className="site-container">
          <div className="eyebrow">
            <Link href="/">Bhuwanta</Link>
            <span aria-hidden="true"> / </span> Your land. Your legacy.
          </div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </section>
      <TrustStrip />
    </>
  )
}
