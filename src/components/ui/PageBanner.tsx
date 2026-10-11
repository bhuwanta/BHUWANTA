import React from 'react'
import { TrustStrip } from '@/components/ui/TrustStrip'

interface PageBannerProps {
  title: string | React.ReactNode
  subtitle?: string
  action?: React.ReactNode
}
export function PageBanner({ title, subtitle, action }: PageBannerProps) {
  return (
    <>
      <section className="editorial-banner">
        <div className="site-container">
          <span className="eyebrow">Your land. Your legacy.</span>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
          {action && <div className="mt-5 flex flex-col items-center gap-3">{action}</div>}
        </div>
      </section>
      <TrustStrip />
    </>
  )
}
