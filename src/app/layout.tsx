import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './public-theme.css'
import { PostHogProvider } from '@/lib/posthog'
import { Toaster } from 'sonner'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"
import { getSiteUrl } from '@/lib/site-url'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'Bhuwanta | Open Plots near Hyderabad',
    template: '%s | Bhuwanta',
  },
  description: 'Explore open plots in Shabad, Sangareddy, Sadashivpet and Yadagirigutta with Bhuwanta. Request project details, current prices and a site visit.',
  metadataBase: new URL(getSiteUrl()),
  openGraph: {
    type: 'website',
    siteName: 'Bhuwanta',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
      { url: '/favicon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className="scroll-pt-20 sm:scroll-pt-24">
      <head>
        <link rel="preconnect" href="https://cdn.sanity.io" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.sanity.io" />
        <link rel="preconnect" href="https://us.i.posthog.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://us.i.posthog.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </head>
      <body className={`${inter.variable} font-sans antialiased flex flex-col min-h-screen overflow-x-hidden`}>
        <PostHogProvider>
          {children}
          <Toaster richColors position="top-right" />
          <SpeedInsights />
          <Analytics />
        </PostHogProvider>
      </body>
    </html>
  )
}
