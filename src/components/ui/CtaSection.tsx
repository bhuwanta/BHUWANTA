import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
interface CtaSectionProps {
  title?: React.ReactNode
  description?: string
  primaryButtonText?: string
  primaryButtonLink?: string
}
export function CtaSection({
  title = (
    <>
      See the location.
      <br />
      <em>Get the details.</em>
    </>
  ),
  description = 'Visit the project, explore available plots, and ask our team about pricing and documentation.',
  primaryButtonText = 'Book a Free Site Visit',
  primaryButtonLink = '/#book-visit',
}: CtaSectionProps = {}) {
  return (
    <section className="editorial-cta">
      <div className="site-container">
        <div>
          <span className="eyebrow">Take the next step</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <Link href={primaryButtonLink} className="site-button">
          {primaryButtonText}
          <ArrowUpRight size={18} />
        </Link>
      </div>
    </section>
  )
}
