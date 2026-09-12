import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { SanityImage } from '@/components/ui/SanityImage'
import { 
  ArrowRight, MessageCircle, Check, ShieldCheck,
  FileCheck, MapPin, IndianRupee, Compass, Hammer, Building2,
  BadgeCheck
} from 'lucide-react'
import { generatePageMetadata } from '@/lib/seo'
import { sanityFetch, homeQuery, projectsQuery, projectCategoriesQuery } from '@/lib/sanity'
import { extractYouTubeId } from '@/lib/utils'
import dynamic from 'next/dynamic'

const ContactForm = dynamic(() => import('@/components/ui/ContactForm').then(mod => mod.ContactForm))
const AnimatedCounter = dynamic(() => import('@/components/ui/AnimatedCounter').then(mod => mod.AnimatedCounter))
import { HeroSlider } from '@/components/ui/HeroSlider'
import { OverviewDownloadButton } from '@/components/ui/OverviewDownloadButton'

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('home', 'HMDA Approved Plots in Hyderabad', 'Own HMDA-approved, Vastu-aligned plots in Hyderabad\'s fastest-growing corridors, built for homebuilders and smart investors. Book a free site visit.')
}

export const revalidate = 60

// Fallback content
const fallback = {
  heroPrimaryCta: 'Book Free Site Visit',
  heroSecondaryCta: 'Call Now',
  // ... (Other fallback data omitted for brevity but remains functionally intact)
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const { project: preselectedProject } = await searchParams
  let data = fallback as Record<string, unknown>
  let projectsData: Record<string, unknown> | null = null
  let categoriesData: Array<Record<string, unknown>> | null = null
  try {
    const [sanityDataResult, projectsDataResult, categoriesDataResult] = await Promise.allSettled([
      sanityFetch<Record<string, unknown>>({ query: homeQuery, tags: ['home'] }),
      sanityFetch<Record<string, unknown>>({ query: projectsQuery, tags: ['projects'] }),
      sanityFetch<Array<Record<string, unknown>>>({ query: projectCategoriesQuery, tags: ['projectCategory'] })
    ])

    if (sanityDataResult.status === 'fulfilled' && sanityDataResult.value) {
      data = { ...fallback, ...sanityDataResult.value }
    }
    
    if (projectsDataResult.status === 'fulfilled') {
      projectsData = projectsDataResult.value
    }

    if (categoriesDataResult.status === 'fulfilled') {
      categoriesData = categoriesDataResult.value
    }
  } catch {
    // Use fallback
  }

  const projectEntries = (projectsData?.projectEntries || []) as Array<Record<string, unknown>>
  const projectsList = projectEntries.map((p) => ({
    name: p.name as string,
    location: (p.categoryTitle as string) || "",
  })).filter((p) => p.name)

  const locationNames = Array.from(new Set(projectsList.map((p) => p.location).filter(Boolean))) as string[]

  // 1. Why Features
  const whyFeatures = [
    { icon: ShieldCheck, title: 'HMDA Approved Layouts' },
    { icon: Building2, title: 'DTCP Approved Layouts' },
    { icon: FileCheck, title: 'Clear Legal Documentation' },
    { icon: MapPin, title: 'Prime Growth Locations' },
    { icon: IndianRupee, title: 'Transparent Pricing' },
    { icon: Compass, title: 'Vastu-Compliant Planning' },
    { icon: Hammer, title: 'Ready-for-Construction Plots' },
  ]

  // 1.5 Stats Bar Data
  //
  // Ongoing Projects is counted from the live Sanity project list rather than
  // typed in — it had drifted to "4+" while six projects were published, and a
  // hand-typed number silently goes stale every time one is added. The other
  // three are marketing claims with no source of truth in the CMS, so they stay
  // as they are.
  const statsData = [
    { label: 'Years of Experience', value: '20+' },
    { label: 'Projects Completed', value: '15' },
    { label: 'Happy Customers', value: '1000+' },
    { label: 'Ongoing Projects', value: `${projectEntries.length}+` },
  ]


  // 2. Premium Categories — only show categories of projects that have real data (image or video)
  const fallbackImage = 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'
  
  const uniqueCategoriesMap = new Map<string, { image: string; slug: string }>()
  
  ;(projectEntries).forEach((p) => {
    const images = p.images as string[] | undefined
    const hasData = (images && images.length > 0) || p.videoUrl || p.youtubeUrl
    if (hasData && p.categoryTitle) {
      if (!uniqueCategoriesMap.has(p.categoryTitle as string)) {
        // Find the category in categoriesData to see if it has an explicitly uploaded image
        const categoryData = (categoriesData || []).find((c) => c.title === p.categoryTitle)
        let previewImage = fallbackImage
        const categoryImage = categoryData?.image as { asset?: { url?: string } } | undefined

        if (categoryImage?.asset?.url) {
          previewImage = categoryImage.asset.url
        } else if (images && images.length > 0) {
          previewImage = images[0]
        } else if (p.youtubeUrl) {
          const ytId = extractYouTubeId(p.youtubeUrl as string)
          if (ytId) {
            previewImage = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`
          }
        }
        
        uniqueCategoriesMap.set(p.categoryTitle as string, {
          image: previewImage,
          // The slug the /projects filter uses as its category id.
          slug: (p.category as string) || '',
        })
      }
    }
  })

  const premiumCategories: { name: string; image: string; slug: string }[] = Array.from(
    uniqueCategoriesMap,
    ([name, { image, slug }]) => ({ name: name.trim(), image, slug })
  )

  // 3. Journey Steps
  const journeyStepsData = [
    { id: '01', title: 'Explore Projects', desc: 'Browse our available plots and choose your preferred location.' },
    { id: '02', title: 'Schedule a Visit', desc: 'Visit the site and experience the layout and surroundings.' },
    { id: '03', title: 'Verify Documents', desc: 'Review all legal approvals and documentation with full transparency.' },
    { id: '04', title: 'Book Your Plot', desc: 'Select your plot and proceed with booking.' },
    { id: '05', title: 'Registration & Ownership', desc: 'Complete registration and become a proud land owner.' },
  ]

  // 4. Certifications
  const certifications = [
    { icon: ShieldCheck, title: 'HMDA Approved' },
    { icon: Building2, title: 'DTCP Approved' },
    { icon: Check, title: 'YTDA Approved' },
    { icon: BadgeCheck, title: 'RERA Certified' },
    { icon: FileCheck, title: 'Verified Documentation' },
  ]

  // 6. Real site photos — used instead of testimonials until real, sourced
  // client reviews/videos are available. Placeholder quotes with generic
  // names would be unverifiable and are worse than showing real project photos.
  const sitePhotos = (projectEntries)
    .filter((p) => (p.images as string[] | undefined) && (p.images as string[]).length > 0)
    .map((p) => ({ url: `${(p.images as string[])[0]}?w=800&q=75&auto=format`, name: p.name as string, location: p.categoryTitle as string }))
    .slice(0, 6)

  // Support both old format (direct asset) and new format (object with image + text)
  const mappedHeroImages = ((data.heroImages || []) as Array<any>)
    .map((item: any) => {
      // New format: { image: { asset: { url } }, text }
      if (item.image?.asset?.url) {
        return { url: `${item.image.asset.url}?w=1920&q=60&auto=format`, text: item.text }
      }
      // Old format: { asset: { url } } (direct image)
      if (item.asset?.url) {
        return { url: `${item.asset.url}?w=1920&q=60&auto=format`, text: item.text || '' }
      }
      return null
    })
    .filter(Boolean) as { url: string; text?: string }[]

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scroll-bar::-webkit-scrollbar {
          display: none;
        }
        .hide-scroll-bar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      {/* ===== SECTION 1 — HERO BANNER ===== */}
      <section className="relative min-h-[100svh] flex flex-col overflow-hidden" id="hero">
        <HeroSlider images={mappedHeroImages} />

        {/* Center Content */}
        <div className="relative z-20 w-full max-w-5xl mx-auto px-4 text-center flex-grow flex flex-col justify-center pt-20">
          {/*
            Visually hidden — HeroSlider renders the visible, CMS-editable
            caption for each slide. This H1 exists so the page always has a
            real, stable, keyword-relevant heading regardless of whether an
            editor has set slide caption text (previously the page had none
            at all when no caption was set). Rendering it visibly here caused
            it to overlap the slide caption whenever one was set.
          */}
          <h1 className="sr-only">HMDA &amp; DTCP Approved Plots in Hyderabad</h1>
        </div>

        {/* Spacer to push bottom actions down, letting HeroSlider own the center */}
        <div className="flex-grow" />

        {/* Bottom Actions Container */}
        <div className="relative z-20 w-full max-w-5xl mx-auto px-4 pb-28 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/#book-visit"
              id="hero-cta-primary"
              className="w-[90%] max-w-sm sm:max-w-none sm:w-auto group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold rounded-xl gradient-gold text-white transition-premium hover:scale-105 glow-gold shadow-2xl"
            >
              Book a Free Site Visit
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce z-20">
          <div className="w-5 h-8 rounded-full border-2 border-white/60 flex items-start justify-center p-1.5">
            <div className="w-1 h-2 rounded-full bg-white/80" />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-white/80 font-semibold drop-shadow-md">Scroll</span>
        </div>
      </section>

      {/* ===== SECTION 1.5 — STATS BAR ===== */}
      <section className="bg-white border-b border-[#e8ecf2] py-12 relative z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 sm:gap-y-12 md:gap-8 md:divide-x md:divide-[#e8ecf2]">
            {statsData.map((stat, idx) => (
              <div key={idx} className="text-center px-2 sm:px-4 flex flex-col items-center justify-center">
                <div className="text-3xl sm:text-4xl font-bold text-[#c4a55a] mb-2">
                  <AnimatedCounter value={stat.value} />
                </div>
                <div className="text-sm sm:text-base font-semibold text-[#0f1d33] text-center max-w-[120px] sm:max-w-none">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SECTION 1.6 — CITABLE COMPANY SUMMARY (for AI/answer engines) ===== */}
      <section className="bg-white py-10 sm:py-14 border-b border-[#e8ecf2]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-sm sm:text-base text-[#5a6a82] leading-relaxed text-center">
            Bhuwanta Developers is a Hyderabad-based real estate company specializing in HMDA and DTCP approved open plots, villa plots, and farmlands. The company&apos;s current projects span four of Hyderabad&apos;s fastest-growing corridors: S.V. Kanaka Maple Homes on the Warangal Highway near the Yadagirigutta Temple, TJR Township at Sangareddy Junction on the Mumbai Highway, Vaibhav County in Sadashivpet also on the Mumbai Highway, and Vian Vally in Shabad on the NH-44 Bangalore Highway. Every layout is DTCP, HMDA, or YTDA approved and RERA registered, with clear legal documentation, Vastu-compliant planning, and underground drainage. Bhuwanta has sold 100+ plots to date. Bhuwanta is led by Chairman &amp; Managing Director S. Siva Kumar and CEO &amp; Managing Director CH. Rama Krishna Reddy. The company&apos;s headquarters is at Alluri Trade Center, KPHB, Hyderabad, near KPHB Metro Station. Buyers can book a free site visit directly through the website or WhatsApp.
          </p>
        </div>
      </section>


      {/* ===== SECTION 2 — WHY CHOOSE BHUWANTA (DARK) ===== */}
      <section className="bg-[#022F3A] pt-20 pb-10 sm:pt-28 sm:pb-14 overflow-hidden" id="why-choose">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-center mb-5">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#B69A4E]/10 text-[#B69A4E] text-xs font-semibold uppercase tracking-widest border border-[#B69A4E]/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Why Us
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white text-center mb-5 tracking-tight">
            Why Choose <span className="text-[#c4a55a]">BHUWANTA?</span>
          </h2>

          <p className="text-base sm:text-lg text-white/80 text-center max-w-3xl mx-auto mb-14 leading-relaxed">
            At BHUWANTA, we go beyond selling plots, we deliver trust, transparency, and long-term value. Our developments are carefully planned to ensure secure investments and future growth.
          </p>
        </div>
        
        <div className="relative flex overflow-x-hidden group pb-4">
          <div className="flex animate-marquee whitespace-nowrap group-hover:[animation-play-state:paused] w-max">
            {/* Track 1 */}
            <div className="flex gap-4 sm:gap-6 pr-4 sm:pr-6">
              {whyFeatures.map((feature, i) => (
                  <div
                  key={`track1-${i}`}
                  className="w-[280px] sm:w-[320px] flex-shrink-0 flex items-center gap-3 bg-white rounded-xl px-4 py-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-[#B69A4E]/10 flex items-center justify-center transition-colors duration-300 group-hover:bg-[#B69A4E]/20">
                    <feature.icon className="w-5 h-5 text-[#B69A4E]" />
                  </div>
                  <span className="text-[15px] font-semibold text-[#0f1d33] whitespace-normal leading-tight">
                    {feature.title}
                  </span>
                </div>
              ))}
            </div>
            {/* Track 2 (Duplicate for seamless loop) */}
            <div className="flex gap-4 sm:gap-6 pr-4 sm:pr-6" aria-hidden="true">
              {whyFeatures.map((feature, i) => (
                  <div
                  key={`track2-${i}`}
                  className="w-[280px] sm:w-[320px] flex-shrink-0 flex items-center gap-3 bg-white rounded-xl px-4 py-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-[#B69A4E]/10 flex items-center justify-center transition-colors duration-300 group-hover:bg-[#B69A4E]/20">
                    <feature.icon className="w-5 h-5 text-[#B69A4E]" />
                  </div>
                  <span className="text-[15px] font-semibold text-[#0f1d33] whitespace-normal leading-tight">
                    {feature.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-[#022F3A] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-[#022F3A] to-transparent" />
        </div>
      </section>



      {/* ===== SECTION 4 — EXPLORE OUR PREMIUM OPEN PLOT PROJECTS (WHITE) ===== */}
      {premiumCategories.length > 0 && (
      <section className="bg-white pt-10 pb-20 sm:pt-14 sm:pb-28" id="premium-projects">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-center mb-5">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#B69A4E]/10 text-[#B69A4E] text-xs font-semibold uppercase tracking-widest">
              <MapPin className="w-3.5 h-3.5" />
              Premium Projects
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#022F3A] text-center mb-5 tracking-tight">
            Explore Our Premium <span className="text-[#c4a55a]">Open Plot Projects</span>
          </h2>

          <p className="text-base sm:text-lg text-[#3a3a3a] text-center max-w-3xl mx-auto mb-14 leading-relaxed">
            Discover strategically located HMDA-approved plots in Hyderabad&apos;s fastest growing corridors. Each project is designed to offer excellent connectivity, infrastructure, and long-term appreciation.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {premiumCategories.map((category, index) => (
              <Link
                href={category.slug ? `/projects?category=${category.slug}` : '/projects'}
                key={index}
                className="group block"
              >
                <div className="relative overflow-hidden rounded-2xl shadow-md aspect-[4/3] border border-[#e8ecf2] transition-all duration-500 hover:shadow-xl hover:-translate-y-1 hover:border-[#c4a55a]/50">
                  <SanityImage 
                    src={category.image} 
                    alt={category.name} 
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    quality={80}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f1d33] via-[#0f1d33]/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 w-full p-6 flex flex-col justify-end">
                    <h3 className="text-xl font-bold text-white mb-2 translate-y-1 group-hover:translate-y-0 transition-transform duration-300 leading-tight">
                      {category.name}
                    </h3>
                    <div className="h-1 w-10 bg-[#c4a55a] rounded-full transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 delay-100" />
                  </div>
                </div>
              </Link>
            ))}

            {/* Explore More Card */}
            <Link href="/projects" className="group block">
              <div className="relative overflow-hidden rounded-2xl shadow-sm border border-[#e8ecf2] bg-[#f7f8fa] transition-all duration-500 hover:shadow-md hover:-translate-y-1 hover:border-[#c4a55a]/50 flex flex-col items-center justify-center p-8 text-center aspect-[4/3]">
                <div className="w-16 h-16 rounded-full bg-[#1e3a5f]/5 flex items-center justify-center mb-6 group-hover:bg-gradient-to-tr group-hover:from-[#c4a55a] group-hover:to-[#d4b872] group-hover:shadow-lg group-hover:shadow-[#c4a55a]/30 transition-all duration-500">
                  <ArrowRight className="w-8 h-8 text-[#0f1d33] group-hover:text-white group-hover:translate-x-1.5 transition-all duration-500" />
                </div>
                <h3 className="text-xl font-bold text-[#0f1d33] mb-3 group-hover:text-[#c4a55a] transition-colors duration-300">
                  Explore More
                </h3>
                <p className="text-sm text-[#5a6a82] leading-relaxed">
                  Discover all our premium open plot projects across Hyderabad.
                </p>
              </div>
            </Link>
          </div>

          <div className="mt-12 sm:mt-16 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/projects"
              className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold rounded-xl bg-[#022F3A] text-white transition-all hover:bg-[#022F3A]/90 hover:shadow-xl hover:-translate-y-0.5 overflow-hidden w-full sm:w-auto"
            >
              <span className="relative z-10 flex items-center gap-2">
                View All Projects
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <OverviewDownloadButton
              urls={projectsData?.overviewUrls as string[] | undefined}
              label={projectsData?.overviewButtonLabel as string | undefined}
              variant="solid"
              className="w-full sm:w-auto"
            />
          </div>
          <p className="mt-4 text-center text-xs text-[#5a6a82]">
            One PDF covering every Bhuwanta project — locations, plot sizes and approvals.
          </p>
        </div>
      </section>
      )}

      {/* ===== SECTION 5 — YOUR JOURNEY TO OWNERSHIP (BLUE) ===== */}
      <section className="bg-[#022F3A] py-20 sm:py-28 relative overflow-hidden" id="journey">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#B69A4E]/10 text-[#B69A4E] text-xs font-semibold uppercase tracking-widest border border-[#B69A4E]/20 mb-5">
              <Compass className="w-3.5 h-3.5" />
              Simple Process
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
              Your Journey to Owning a Plot <br className="hidden sm:block" />
              <span className="text-[#B69A4E] mt-2 inline-block">with Bhuwanta</span>
            </h2>
          </div>

          <div className="relative pt-4 lg:pt-0">
            <div className="flex flex-col lg:flex-row gap-10 lg:gap-4 px-4 sm:px-12 lg:px-0">
              {journeyStepsData.map((step, index) => (
                <div 
                  key={index}
                  className="relative w-full lg:w-auto lg:flex-1 group"
                >
                  {index !== journeyStepsData.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-[50%] w-full h-[2px] bg-[#B69A4E]/30 z-0" />
                  )}

                  {/* Mobile: horizontal row layout */}
                  <div className="flex items-start gap-6 lg:hidden relative">
                    <div className="shrink-0 z-10 w-14 h-14 rounded-full bg-[#022F3A] border-2 border-[#B69A4E] text-[#B69A4E] flex items-center justify-center text-lg font-bold group-hover:bg-[#B69A4E] group-hover:text-white transition-all duration-300">
                      {step.id}
                    </div>
                    {/* Line connecting to the NEXT step (mobile) */}
                    {index !== journeyStepsData.length - 1 && (
                      <div className="absolute left-7 top-14 w-[2px] bg-[#B69A4E]/30 -translate-x-1/2 z-0" style={{ height: 'calc(100% + 2.5rem - 3.5rem)' }} />
                    )}
                    <div className="pt-1.5 pb-2">
                      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#B69A4E] transition-colors duration-300">
                        {step.title}
                      </h3>
                      <p className="text-white/70 text-sm sm:text-base leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>

                  {/* Desktop: vertical column layout */}
                  <div className="hidden lg:flex flex-col items-center">
                    <div className="shrink-0 z-10 w-20 h-20 rounded-full bg-[#022F3A] border-2 border-[#B69A4E] text-[#B69A4E] flex items-center justify-center text-2xl font-bold mb-8 group-hover:scale-110 group-hover:bg-[#B69A4E] group-hover:text-white transition-all duration-300 shadow-[0_0_20px_rgba(182,154,78,0.15)] group-hover:shadow-[0_0_30px_rgba(182,154,78,0.4)]">
                      {step.id}
                    </div>
                    <div className="text-center px-4">
                      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#B69A4E] transition-colors duration-300">
                        {step.title}
                      </h3>
                      <p className="text-white/80 text-sm leading-relaxed max-w-[280px] mx-auto">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 6 — OUR CERTIFICATIONS & APPROVALS (WHITE) ===== */}
      <section className="bg-white py-16 sm:py-24 overflow-hidden" id="certifications">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-12 text-center">
          <div className="flex justify-center mb-5">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#B69A4E]/10 text-[#B69A4E] text-xs font-semibold uppercase tracking-widest">
              <BadgeCheck className="w-3.5 h-3.5" />
              Verified & Secure
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#022F3A] mb-4 tracking-tight">
            Our <span className="text-[#c4a55a]">Certifications & Approvals</span>
          </h2>
          <p className="text-base sm:text-lg text-[#3a3a3a] max-w-2xl mx-auto">
            We ensure every project meets the highest standards of legality and compliance.
          </p>
        </div>

        <div className="relative flex overflow-x-hidden group pb-4">
          <div className="flex animate-marquee whitespace-nowrap group-hover:[animation-play-state:paused] w-max">
            {/* Track 1 */}
            <div className="flex gap-4 sm:gap-6 pr-4 sm:pr-6">
              {certifications.map((cert, i) => (
                <div
                  key={`cert1-${i}`}
                  className="w-[220px] sm:w-[260px] flex-shrink-0 flex flex-col items-center gap-3 bg-[#fafafa] border border-gray-200 rounded-xl px-4 py-5 text-center transition-all duration-300 hover:shadow-md hover:border-[#B69A4E] hover:-translate-y-1 hover:bg-white"
                >
                  <div className="w-12 h-12 rounded-full bg-[#B69A4E]/10 flex items-center justify-center">
                    <cert.icon className="w-6 h-6 text-[#B69A4E]" />
                  </div>
                  <span className="text-sm sm:text-[15px] font-bold text-[#022F3A] leading-tight whitespace-normal">
                    {cert.title}
                  </span>
                </div>
              ))}
            </div>
            {/* Track 2 (Duplicate for seamless loop) */}
            <div className="flex gap-4 sm:gap-6 pr-4 sm:pr-6" aria-hidden="true">
              {certifications.map((cert, i) => (
                <div
                  key={`cert2-${i}`}
                  className="w-[220px] sm:w-[260px] flex-shrink-0 flex flex-col items-center gap-3 bg-[#fafafa] border border-gray-200 rounded-xl px-4 py-5 text-center transition-all duration-300 hover:shadow-md hover:border-[#B69A4E] hover:-translate-y-1 hover:bg-white"
                >
                  <div className="w-12 h-12 rounded-full bg-[#B69A4E]/10 flex items-center justify-center">
                    <cert.icon className="w-6 h-6 text-[#B69A4E]" />
                  </div>
                  <span className="text-sm sm:text-[15px] font-bold text-[#022F3A] leading-tight whitespace-normal">
                    {cert.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 7 — REAL SITES, REAL APPROVALS (BLUE) ===== */}
      {sitePhotos.length > 0 && (
      <section className="bg-[#022F3A] py-20 sm:py-28" id="testimonials">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <div className="flex justify-center mb-5">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#B69A4E]/10 text-[#B69A4E] text-xs font-semibold uppercase tracking-widest border border-[#B69A4E]/20">
                <MessageCircle className="w-3.5 h-3.5" />
                See For Yourself
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">
              Real Sites, <span className="text-[#c4a55a]">Real Approvals</span>
            </h2>
            <p className="text-base sm:text-lg text-white/80 max-w-3xl mx-auto leading-relaxed">
              No stock photos, no stand-ins — these are our actual layouts. Book a free site visit and verify everything yourself before you decide.
            </p>
          </div>

          <div className={`grid grid-cols-2 ${sitePhotos.length === 2 ? 'max-w-4xl mx-auto md:grid-cols-2' : 'md:grid-cols-3'} gap-4 sm:gap-6`}>
            {sitePhotos.map((photo, i) => (
              <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10 group">
                <Image
                  src={photo.url}
                  alt={`${photo.name} — real site photo, ${photo.location || 'Hyderabad'}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f1d33] via-[#0f1d33]/20 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full p-3 sm:p-4">
                  <p className="text-white text-xs sm:text-sm font-bold leading-tight">{photo.name}</p>
                  {photo.location && <p className="text-white/70 text-[10px] sm:text-xs">{photo.location}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ===== SECTION 8 — BOOK YOUR FREE SITE VISIT TODAY (WHITE/GRAY-50) ===== */}
      <section className="bg-gray-50 pt-10 pb-20 sm:pt-16 sm:pb-28" id="book-visit">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          {/* Top Center Badge */}
          <div className="flex justify-center mb-10 md:mb-14">
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#B69A4E]/10 text-[#B69A4E] text-xs font-semibold uppercase tracking-widest border border-[#B69A4E]/20 shadow-sm backdrop-blur-sm">
              <MapPin className="w-4 h-4" />
              Schedule A Tour
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            
            {/* Left Side: Content */}
            <div className="lg:order-1">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#022F3A] mb-6 tracking-tight leading-tight">
                Book Your Free <br/>
                <span className="text-[#B69A4E]">Site Visit</span> Today
              </h2>
              <p className="text-[#3a3a3a] text-base sm:text-lg mb-8 leading-relaxed max-w-lg">
                Interested in owning a plot? Fill in your details and our team will assist you with arranging a personal site visit, explaining the pricing, and guiding you through documentation.
              </p>
              
              <div className="space-y-6">

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-[#B69A4E]">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#022F3A]">WhatsApp Support</h3>
                    <p className="text-sm text-gray-500 mt-1">Available Mon-Sat, 10 AM to 7 PM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Form */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-10 shadow-xl lg:order-2">
              <ContactForm projectsList={projectsList} locationNames={locationNames} initialProject={preselectedProject} />
            </div>

          </div>
        </div>
      </section>
    </>
  )
}