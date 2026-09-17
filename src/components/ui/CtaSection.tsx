import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface CtaSectionProps {
  title?: React.ReactNode;
  description?: string;
  primaryButtonText?: string;
  primaryButtonLink?: string;
}

export function CtaSection({
  title = <>Ready to Find Your <br className="hidden lg:block" /><span className="text-brand-accent">Perfect Plot?</span></>,
  description = "Book a free site visit today. Our experts will guide you through the layouts, verify documents, and help you make the best investment decision.",
  primaryButtonText = "Book Site Visit",
  primaryButtonLink = "/#book-visit",
}: CtaSectionProps = {}) {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 mt-auto bg-transparent">
      <section className="w-full max-w-7xl mx-auto py-12 sm:py-16 px-6 sm:px-12 bg-white relative overflow-hidden rounded-[2rem] border border-brand-border shadow-xl">
      {/* Decorative premium accents */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-gold rounded-full blur-[100px] transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-ink rounded-full blur-[120px] transform -translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          
          <div className="text-center lg:text-left flex-1">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-brand-ink mb-6 leading-tight">
              {title}
            </h2>
            
            <p className="text-brand-muted text-base sm:text-lg max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
              {description}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 shrink-0">
            {primaryButtonLink.startsWith('/') ? (
              <Link 
                href={primaryButtonLink} 
                className="inline-flex items-center justify-center gap-3 px-8 py-4 gradient-gold text-white font-bold rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto text-base group"
              >
                {primaryButtonText}
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
              </Link>
            ) : (
              <a 
                href={primaryButtonLink} 
                className="inline-flex items-center justify-center gap-3 px-8 py-4 gradient-gold text-white font-bold rounded-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto text-base group"
              >
                {primaryButtonText}
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
              </a>
            )}
          </div>

        </div>
      </div>
      </section>
    </div>
  )
}
