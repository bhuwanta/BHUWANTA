import { Metadata } from 'next'
import { Eye, Target, ShieldCheck, Award, Heart, Lightbulb, Users, Navigation } from 'lucide-react'
import { generatePageMetadata } from '@/lib/seo'
import { sanityFetch, aboutQuery } from '@/lib/sanity'
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd'

import { PageBanner } from '@/components/ui/PageBanner'
import { CtaSection } from '@/components/ui/CtaSection'
import { getSiteUrl } from '@/lib/site-url'

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata(
    'about',
    'About Us | HMDA & DTCP Approved Plots Hyderabad',
    'Bhuwanta Developers — Hyderabad\'s trusted real estate company, 20+ years of experience in HMDA & DTCP approved plots, villa plots, and farmlands.'
  )
}

export const revalidate = 300

// Default / fallback content
const defaults = {
  pageHeading: 'About Bhuwanta Developers',
  pageSubtitle: '',
  storyHeading: 'The Best Real Estate Service With 20+ Years of Excellence',
  storyParagraphs: [
    'Bhuwanta Developers is a Hyderabad based real estate company with 20+ years of experience in delivering HMDA & DTCP approved open plots, villa plots and farmlands. Built on trust, transparency and integrity, we simplify the property buying journey for first time buyers, growing families and NRI investors alike — offering premium clear title properties across Hyderabad\'s fastest growing locations.'
  ],
  missionTitle: 'Our Mission',
  missionBody: 'To empower homebuyers and investors with secure, high-value real estate opportunities across Hyderabad through HMDA & DTCP approved plots, villa plots, and farmlands — ensuring transparency, trust, and excellence in every step of the property-buying journey.',
  visionTitle: 'Our Vision',
  visionBody: 'To be Hyderabad\'s most trusted real estate developer, known for delivering consistent value and premium properties while shaping a future where every buyer — whether local or NRI — experiences confidence, stability, and long-term prosperity through strategic real estate investments.',
  coreValues: [
    { title: 'Trust & Transparency', description: 'We believe in honest dealings and complete transparency in every real estate transaction — from plot selection to registration.' },
    { title: 'Quality Excellence', description: 'Uncompromising quality in every project we undertake — from infrastructure to documentation, we never cut corners.' },
    { title: 'Customer First', description: 'Our customers are at the heart of everything we do. Every decision we make is driven by your satisfaction and long-term benefit.' },
  ],
  leadershipHeading: 'The Minds Behind Bhuwanta Developers',
  leaders: [
    { name: 'Mr. S.Siva Kumar', role: 'Chairman & Managing Director', bio: 'Driving the vision of Bhuwanta Developers with strong and decisive leadership, Mr. Siva Kumar brings a proven track record of delivering successful real estate projects across Hyderabad. His expertise in identifying strategic locations, securing HMDA & DTCP approvals, and building customer-first developments has been the cornerstone of the company\'s 20+ year journey and rapid growth in Hyderabad\'s competitive real estate market.' },
    { name: 'Mr. CH.Rama Krishna Reddy', role: 'CEO & Managing Director', bio: 'With deep domain knowledge of the Hyderabad real estate market, Mr. Rama Krishna Reddy oversees end-to-end project execution and customer experience at Bhuwanta Developers. His unwavering commitment to quality infrastructure, clear-title documentation, and timely delivery has earned the trust of thousands of satisfied homebuyers, families, and NRI investors across Hyderabad.' },
  ],
  strengthsHeading: 'Why Bhuwanta Developers Stands Out',
  strengths: [
    { title: 'Strong Vision', description: 'Driven by a long-term commitment towards customers and Hyderabad\'s growing real estate market.' },
    { title: 'Experienced Leadership', description: 'Management with 20+ years of deep expertise in plots, villa plots, and farmlands across Hyderabad.' },
    { title: 'Domain Knowledge', description: 'Deep understanding of HMDA & DTCP approvals, strategic locations, and Hyderabad\'s real estate landscape.' },
    { title: 'Innovative Thinking', description: 'Thinking ahead with strategic and analytical strengths to identify the best investment opportunities for our customers.' },
  ],
  ctaTitle: 'Ready to Invest in Your Dream Property in Hyderabad?',
  ctaDescription: 'Get in touch with our experts for personalized assistance on plots, villa plots, and farmlands.',
}

// Icon mapping for core values
const valueIcons = [ShieldCheck, Award, Heart, Lightbulb, Users, Target]
// Icon mapping for strengths
const strengthIcons = [Target, Users, Navigation, Lightbulb, Award, ShieldCheck]

export default async function AboutPage() {
  let data: any = null
  try {
    data = await sanityFetch({ query: aboutQuery, tags: ['about'] })
  } catch (error) {
    console.error("Error fetching about page data:", error)
  }

  // Merge Sanity data with defaults (only overwrite if Sanity has a truthy value)
  const d = {
    pageHeading: data?.pageHeading?.trim() || defaults.pageHeading,
    pageSubtitle: data?.pageSubtitle?.trim() || defaults.pageSubtitle,
    storyHeading: data?.storyHeading?.trim() || defaults.storyHeading,
    storyParagraphs: (data?.storyParagraphs?.length ? data.storyParagraphs : defaults.storyParagraphs) as string[],
    missionTitle: data?.missionTitle?.trim() || defaults.missionTitle,
    missionBody: data?.missionBody?.trim() || defaults.missionBody,
    visionTitle: data?.visionTitle?.trim() || defaults.visionTitle,
    visionBody: data?.visionBody?.trim() || defaults.visionBody,
    coreValues: (data?.coreValues?.length ? data.coreValues : defaults.coreValues) as typeof defaults.coreValues,
    leadershipHeading: data?.leadershipHeading?.trim() || defaults.leadershipHeading,
    leaders: (data?.leaders?.length ? data.leaders : defaults.leaders) as typeof defaults.leaders,
    strengthsHeading: data?.strengthsHeading?.trim() || defaults.strengthsHeading,
    strengths: (data?.strengths?.length ? data.strengths : defaults.strengths) as typeof defaults.strengths,
    ctaTitle: data?.ctaTitle?.trim() || defaults.ctaTitle,
    ctaDescription: data?.ctaDescription?.trim() || defaults.ctaDescription,
    storyImage: data?.storyImage
  }

  const siteUrl = getSiteUrl()
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'About Us', url: `${siteUrl}/about` },
  ])

  const { storyParagraphs, coreValues, leaders, strengths } = d

  return (
    <>
      <JsonLd data={breadcrumb} />

      <PageBanner 
        title={<>About <span className="text-[#c4a55a]">Bhuwanta Developers</span></>} 
        subtitle={d.pageSubtitle}
      />
      
      <div className="flex-1 bg-white">
        
        {/* 2. Our Story */}
        <section className="py-12 sm:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12 sm:mb-16">
              <span className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] text-xs font-semibold uppercase tracking-widest mb-4 border border-[#1e3a5f]/20">
                Our Story
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.2rem] xl:text-[2.6rem] 2xl:text-5xl font-bold text-[#0f1d33] leading-tight mx-auto w-full xl:whitespace-nowrap tracking-tight">
                The Best Real Estate Service With <span className="text-[#c4a55a]">20+ Years of Excellence</span>
              </h2>
            </div>

            <div className="max-w-4xl mx-auto">
              {/* Content */}
              <div className="space-y-6 text-base sm:text-lg text-[#5a6a82] leading-relaxed text-justify sm:text-center">
                {storyParagraphs.map((p: string, i: number) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Mission & Vision */}
        <section className="bg-[#022F3A] py-12 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <span className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-[#B69A4E]/10 text-[#B69A4E] text-xs font-semibold uppercase tracking-widest mb-4 border border-[#B69A4E]/20">
                Our Guiding Principles
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">Our <span className="text-[#c4a55a]">Vision & Mission</span></h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
              {/* Mission */}
              <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-all">
                <div className="w-14 h-14 bg-[#1e3a5f]/10 rounded-xl flex items-center justify-center mb-6 text-[#1e3a5f] group-hover:scale-110 group-hover:bg-[#1e3a5f] group-hover:text-white transition-all duration-300">
                  <Target className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-[#0f1d33] mb-4">Our <span className="text-[#c4a55a]">Mission</span></h3>
                <p className="text-[#5a6a82] leading-relaxed">
                  {d.missionBody}
                </p>
              </div>

              {/* Vision */}
              <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-all">
                <div className="w-14 h-14 bg-[#c4a55a]/10 rounded-xl flex items-center justify-center mb-6 text-[#c4a55a] group-hover:scale-110 group-hover:bg-[#c4a55a] group-hover:text-white transition-all duration-300">
                  <Eye className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-[#0f1d33] mb-4">Our <span className="text-[#c4a55a]">Vision</span></h3>
                <p className="text-[#5a6a82] leading-relaxed">
                  {d.visionBody}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Our Core Values */}
        <section className="bg-[#f7f8fa] py-12 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <span className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] text-xs font-semibold uppercase tracking-widest mb-4 border border-[#1e3a5f]/20">
                Our Core Values
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0f1d33]">What <span className="text-[#c4a55a]">Drives Us</span></h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {coreValues.map((value: { title: string; description: string }, i: number) => {
                const Icon = valueIcons[i % valueIcons.length]
                return (
                  <div key={i} className="text-center group">
                    <div className="w-20 h-20 mx-auto bg-white shadow-sm border border-[#e8ecf2] rounded-full flex items-center justify-center mb-6 text-[#c4a55a] group-hover:bg-[#c4a55a] group-hover:text-white transition-all duration-300">
                      <Icon className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-[#0f1d33] mb-3">{value.title}</h3>
                    <p className="text-[#5a6a82] leading-relaxed">{value.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* 5. Leadership Profile */}
        <section className="bg-[#022F3A] py-12 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <span className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-[#B69A4E]/10 text-[#B69A4E] text-xs font-semibold uppercase tracking-widest mb-4 border border-[#B69A4E]/20">
                Our Leadership
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">The Minds Behind <span className="text-[#c4a55a]">Bhuwanta Developers</span></h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
              {leaders.map((leader: { name: string; role: string; bio: string }, i: number) => (
                <div key={i} className="bg-white/5 p-8 sm:p-10 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-white mb-1">{leader.name}</h3>
                    <p className="text-[#B69A4E] font-medium">{leader.role}</p>
                  </div>
                  <p className="text-white/80 leading-relaxed text-justify sm:text-left">
                    {leader.bio}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Our Strengths */}
        <section className="bg-white py-12 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <span className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] text-xs font-semibold uppercase tracking-widest mb-4 border border-[#1e3a5f]/20">
                Our Strengths
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0f1d33]">Why Bhuwanta Developers <span className="text-[#c4a55a]">Stands Out</span></h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {strengths.map((item: { title: string; description: string }, i: number) => {
                const Icon = strengthIcons[i % strengthIcons.length]
                return (
                  <div key={i} className="bg-white p-8 rounded-xl border border-[#e8ecf2] shadow-sm hover:shadow-md transition-all hover:-translate-y-1 group">
                    <Icon className="w-8 h-8 text-[#c4a55a] mb-4 group-hover:scale-110 transition-transform duration-300" />
                    <h3 className="text-lg font-bold text-[#0f1d33] mb-2">{item.title}</h3>
                    <p className="text-sm text-[#5a6a82] leading-relaxed">{item.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

      </div>
      
      {/* 7. CTA Banner */}
      <CtaSection 
        title={<>Ready to Invest in Your <br className="hidden lg:block" /><span className="text-[#c4a55a]">Dream Property in Hyderabad?</span></>}
        description={d.ctaDescription}
        primaryButtonText="Contact Us"
        primaryButtonLink="/#book-visit"
      />
    </>
  )
}
