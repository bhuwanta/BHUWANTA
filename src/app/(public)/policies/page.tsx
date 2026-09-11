import { Metadata } from 'next'
import { Shield, FileText } from 'lucide-react'
import { generatePageMetadata } from '@/lib/seo'
import { JsonLd, buildBreadcrumbSchema } from '@/components/seo/JsonLd'
import { getSiteUrl } from '@/lib/site-url'

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('policies', 'Terms & Privacy', 'Privacy policy and terms of service for Bhuwanta.')
}

export default function PoliciesPage() {
  const lastUpdated = 'April 2026'
  const siteUrl = getSiteUrl()
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'Terms & Privacy', url: `${siteUrl}/policies` },
  ])

  return (
    <main className="min-h-screen bg-[#f8f9fb] pt-32 pb-20">
      <JsonLd data={breadcrumb} />
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-[#B69A4E] mb-3 tracking-wider uppercase">Legal</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#002935] mb-4">Terms & Privacy</h1>
          <p className="text-sm text-[#5a6a82]">Last updated: {lastUpdated}</p>
        </div>

        {/* Quick Nav */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <a href="#privacy" className="flex items-center gap-4 p-6 bg-white rounded-2xl border border-[#e8ecf2] hover:border-[#B69A4E]/30 transition-premium group shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[#B69A4E]/10 flex items-center justify-center text-[#B69A4E] group-hover:scale-110 transition-premium">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-[#002935]">Privacy Policy</h3>
              <p className="text-xs text-[#5a6a82]">How we protect your data</p>
            </div>
          </a>
          <a href="#terms" className="flex items-center gap-4 p-6 bg-white rounded-2xl border border-[#e8ecf2] hover:border-[#B69A4E]/30 transition-premium group shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[#002935]/5 flex items-center justify-center text-[#002935] group-hover:scale-110 transition-premium">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-[#002935]">Terms of Service</h3>
              <p className="text-xs text-[#5a6a82]">Conditions of use</p>
            </div>
          </a>
        </div>

        <div className="space-y-12">
          {/* Privacy Policy */}
          <section id="privacy" className="bg-white rounded-3xl p-8 md:p-12 border border-[#e8ecf2] shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <Shield className="w-5 h-5 text-[#B69A4E]" />
              <h2 className="text-2xl font-bold text-[#002935]">Privacy Policy</h2>
            </div>

            <div className="space-y-6 text-sm text-[#5a6a82] leading-relaxed">
              <div>
                <h3 className="text-lg font-semibold text-[#002935] mb-2">1. Information We Collect</h3>
                <p>We collect only the information you voluntarily provide through our contact forms — your name, email, phone number, and message. We do not collect data without your knowledge.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[#002935] mb-2">2. How We Use It</h3>
                <p>Your information is used solely to respond to your enquiries and provide requested services related to our properties. We do not sell, rent, or share your personal data with third parties for marketing purposes.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[#002935] mb-2">3. Data Protection</h3>
                <p>We use industry-standard security measures to protect your personal information from unauthorised access, alteration, or disclosure.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[#002935] mb-2">4. Cookies</h3>
                <p>This website may use cookies to improve your browsing experience. You can disable cookies through your browser settings at any time.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[#002935] mb-2">5. Your Rights</h3>
                <p>You may request access to, correction of, or deletion of your personal data at any time by contacting us.</p>
              </div>
            </div>
          </section>

          {/* Terms of Service */}
          <section id="terms" className="bg-white rounded-3xl p-8 md:p-12 border border-[#e8ecf2] shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <FileText className="w-5 h-5 text-[#002935]" />
              <h2 className="text-2xl font-bold text-[#002935]">Terms of Service</h2>
            </div>

            <div className="space-y-6 text-sm text-[#5a6a82] leading-relaxed">
              <div>
                <h3 className="text-lg font-semibold text-[#002935] mb-2">1. Acceptance & General Disclaimer</h3>
                <p>By accessing and using this website, you agree to these terms and acknowledge that the information provided is subject to change without notice. The information, images, plans, layouts, pricing, specifications, amenities, and other materials displayed on this website are provided for general informational and marketing purposes only. They do not constitute a legal offer, contract, warranty, or guarantee of any kind.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[#002935] mb-2">2. Intellectual Property</h3>
                <p>All content on this website — including text, images, logos, and design — is the property of Bhuwanta Developers. Reproduction without written permission is strictly prohibited.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[#002935] mb-2">3. Marketing Representations & Accuracy</h3>
                <p>Illustrations, photographs, maps, renderings, and lifestyle images are artistic impressions and may not accurately represent the final product. Actual development may vary. All project details, prices, availability, approvals, specifications, and timelines are subject to change without prior notice at the sole discretion of the developer or as required by applicable laws and regulatory authorities.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[#002935] mb-2">4. Independent Verification & Advice</h3>
                <p>Prospective buyers are advised to independently verify all project approvals, title documents, specifications, dimensions, availability, pricing, payment terms, and other relevant information before making any investment decision. Nothing contained on this website shall be construed as legal, financial, tax, or investment advice. Visitors should consult their own professional advisors before making any purchase or investment.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[#002935] mb-2">5. Limitation of Liability</h3>
                <p>The company shall not be liable for any direct, indirect, incidental, or consequential loss arising from reliance on the information provided on this website.</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[#002935] mb-2">6. Governing Law</h3>
                <p>These terms are governed by the applicable laws of India. Any disputes arising out of the use of this website shall be subject to the exclusive jurisdiction of the competent courts in Hyderabad, Telangana.</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Note */}
      </div>
    </main>
  )
}
