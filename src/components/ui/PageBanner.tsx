import React from 'react'
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
          <span className="eyebrow">Your land. Your legacy.</span>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </section>
      <TrustStrip />
    </>
  )
}
