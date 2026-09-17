import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Enquiry received',
  robots: { index: false, follow: true },
}

export default function ThankYouLayout({ children }: { children: React.ReactNode }) {
  return children
}
