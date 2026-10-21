import type { ReactNode } from 'react'
import { MapPin } from 'lucide-react'
import { ContactForm } from '@/components/ui/ContactForm'
import { displayProjectPlace } from '@/lib/project-links'

interface ProjectEnquirySectionProps {
  /** Preserve the CMS value, including spacing, for the submitted lead. */
  name: string
  displayName?: string
  location: string
  description?: ReactNode
  allowInternationalPhone?: boolean
}

export function ProjectEnquirySection({
  name,
  displayName = name,
  location,
  description,
  allowInternationalPhone = false,
}: ProjectEnquirySectionProps) {
  return (
    <section
      id="book-visit"
      aria-labelledby="project-enquiry-title"
      className="mb-8 scroll-mt-28 rounded-2xl border border-brand-gold/40 bg-brand-paper p-5 sm:p-8"
    >
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-muted">Your next step</p>
          <h2 id="project-enquiry-title" className="mt-2 text-2xl font-bold text-brand-primary">
            Request a Quote or Site Visit
          </h2>
          <p className="mt-4 font-semibold text-brand-ink">{displayName}</p>
          {location && (
            <p className="mt-2 flex items-start gap-2 text-sm text-brand-muted">
              <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" />
              {displayProjectPlace(location)}
            </p>
          )}
          <p className="mt-4 text-sm leading-relaxed text-brand-muted">
            {description || 'Ask for current pricing, plot options and project documents, or arrange a convenient time to visit.'}
          </p>
        </div>
        <div className="min-w-0">
          <ContactForm
            compact
            hideTitle
            submitLabel="Request Your Quote / Site Visit →"
            submittingLabel="Sending your enquiry..."
            initialProject={name}
            projectsList={[{ name, location }]}
            allowInternationalPhone={allowInternationalPhone}
          />
          <p className="mt-3 text-xs text-brand-muted">Our team will contact you about your enquiry.</p>
        </div>
      </div>
    </section>
  )
}
