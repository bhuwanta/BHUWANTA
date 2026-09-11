import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { DynamicClientComponents } from '@/components/ui/DynamicClientComponents'
import { JsonLd, buildWebSiteSchema, buildLocalBusinessSchema } from '@/components/seo/JsonLd'
import Script from 'next/script'
import { sanityFetch, siteSettingsQuery, projectsQuery } from '@/lib/sanity'
import { getSiteUrl } from '@/lib/site-url'

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const siteUrl = getSiteUrl()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let settings: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let projectsData: Record<string, unknown> | null = null
  try {
    settings = (await sanityFetch({ query: siteSettingsQuery, tags: ['siteSettings'] })) as any
    projectsData = await sanityFetch({ query: projectsQuery, tags: ['projects'] })
  } catch { /* fallback */ }

  const projectEntries = (projectsData?.projectEntries || []) as Array<Record<string, unknown>>
  const projectsList = projectEntries.map((p) => ({
    name: p.name as string,
    location: (p.categoryTitle as string) || '',
  })).filter((p) => p.name)

  const uniqueLocations = Array.from(new Set(projectsList.map((p) => p.location).filter(Boolean))) as string[]

  const websiteSchema = buildWebSiteSchema({
    name: 'Bhuwanta',
    url: siteUrl,
  })

  const localBusinessSchema = buildLocalBusinessSchema({
    name: settings?.siteName || 'Bhuwanta Developers',
    type: 'RealEstateAgent',
    streetAddress: settings?.footerAddress || 'Alluri Trade Center, Floor #5, Unit #406, KPHB, Near KPHB Metro Station',
    city: 'Hyderabad',
    state: 'Telangana',
    postalCode: '500072',
    country: 'IN',
    ...(settings?.footerPhone && settings.footerPhone !== '+91 XXXXX XXXXX' ? { phone: settings.footerPhone } : {}),
    email: settings?.footerEmail || 'info@bhuwanta.com',
    website: siteUrl,
    sameAsLinks: [
      settings?.socialLinks?.linkedin || 'https://www.linkedin.com/in/bhuwanta-developer-043591405/',
      settings?.socialLinks?.facebook || 'https://www.facebook.com/bhuwantadevelopers',
      settings?.socialLinks?.instagram || 'https://www.instagram.com/bhuwantadevelopers/',
      settings?.socialLinks?.youtube || 'https://www.youtube.com/@BhuwantaDevelopers',
    ],
    areaServed: [
      { type: 'State', name: 'Telangana' },
      { type: 'Place', name: 'Shabad, Telangana' },
      { type: 'Place', name: 'Yadagirigutta, Telangana' },
      { type: 'Place', name: 'Sangareddy, Telangana' },
      { type: 'Place', name: 'Sadashivpet, Telangana' },
    ],
    knowsAbout: [
      'HMDA approved open plots',
      'DTCP approved plots',
      'RERA registered real estate',
      'Open plot investment Telangana',
      'Regional Ring Road growth corridors',
    ],
  })

  return (
    <>
      <JsonLd data={[websiteSchema, localBusinessSchema]} />

      {/* Google Analytics + Google Ads — one gtag.js loader shared by both
          IDs, per Google's own guidance ("don't add more than one Google
          tag" means don't load gtag.js twice, not that you can't config
          multiple products through the same loader). */}
      {(() => {
        const gaId = settings?.googleAnalyticsId || 'G-98QJJZ5DCG';
        const googleAdsId = 'AW-18267535069';
        return (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="lazyOnload"
            />
            <Script id="google-analytics" strategy="lazyOnload">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){window.dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
                gtag('config', '${googleAdsId}');
              `}
            </Script>
          </>
        );
      })()}

      {settings?.googleTagManagerId && (
        <Script id="google-tag-manager" strategy="lazyOnload">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${settings.googleTagManagerId}');
          `}
        </Script>
      )}

      {settings?.metaPixelId && (
        <Script id="meta-pixel" strategy="lazyOnload">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${settings.metaPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      <Navbar />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
      <DynamicClientComponents projectsList={projectsList} locationNames={uniqueLocations} />
    </>
  )
}
